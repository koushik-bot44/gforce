// Site motion and small interactions (DESIGN.md "Motion", tuned with the Air motion verdict).
// Every effect enhances content that is already visible; .motion-ok (set in <head>) gates the start states.
import Lenis from 'lenis';

const root = document.documentElement;
const motionOK = root.classList.contains('motion-ok');
const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const easeOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(1 - t, 4)); // close to cubic-bezier(.22,1,.36,1) for counts

/* ---------- Smooth scroll: wheel/trackpad only, settles in ~0.7 s; touch keeps native scrolling ---------- */
let lenis: Lenis | null = null;
if (motionOK && finePointer) {
  lenis = new Lenis({ lerp: 0.15, smoothWheel: true, anchors: { offset: -80 }, autoRaf: true });
  (window as Window & { __lenis?: Lenis }).__lenis = lenis;
}
const onScroll = (fn: () => void) => (lenis ? lenis.on('scroll', fn) : addEventListener('scroll', fn, { passive: true }));

/* ---------- Reveals ---------- */
document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
  Array.from(group.children).forEach((child, i) => (child as HTMLElement).style.setProperty('--i', String(i)));
});

const revealTargets = Array.from(
  document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal="load"]), [data-reveal-mask]:not([data-reveal-mask="load"]), [data-stagger]'),
);
if (motionOK) {
  const revealImmediately = (el: HTMLElement) => {
    el.classList.add('is-instant', 'is-in');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('is-instant')));
  };
  // A heading must never depend on this module downloading to become readable.
  // CSS only masks targets after their observer is installed. Anything already
  // reached (including a restored scroll position or deep link) stays visible.
  const vh = innerHeight;
  const pending: HTMLElement[] = [];
  for (const el of revealTargets) {
    const r = el.getBoundingClientRect();
    if (r.top < vh - 24) {
      revealImmediately(el);
    } else pending.push(el);
  }

  // Trigger near the viewport edge, before the visitor starts reading the block.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -24px 0px', threshold: 0 },
  );
  pending.forEach((el) => {
    io.observe(el);
    el.classList.add('is-reveal-ready');
  });
  // Restoring a page, following an anchor or focusing into content must not wait
  // for an observer tick. This also covers delayed layout after fonts hydrate.
  const showReached = () => {
    pending.forEach((el) => {
      if (el.classList.contains('is-in')) return;
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight - 24) {
        revealImmediately(el);
        io.unobserve(el);
      }
    });
  };
  addEventListener('pageshow', showReached);
  addEventListener('hashchange', showReached);
  document.addEventListener('focusin', (event) => {
    const target = event.target as Element;
    const reveal = target.closest<HTMLElement>('.is-reveal-ready');
    if (reveal) {
      revealImmediately(reveal);
      io.unobserve(reveal);
    }
  });
  window.setTimeout(showReached, 3000);
} else {
  revealTargets.forEach((el) => el.classList.add('is-in'));
}

/* ---------- Counters (final value is in the HTML; motion only replays it) ---------- */
const formatCount = (el: HTMLElement, v: number) => {
  const decimals = Number(el.dataset.decimals ?? 0);
  el.textContent = v.toLocaleString('en-CA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};
const counters = document.querySelectorAll<HTMLElement>('[data-count]');
if (motionOK && counters.length) {
  const cio = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        cio.unobserve(el);
        const to = Number(el.dataset.count);
        const from = Number(el.dataset.countFrom ?? 0);
        const dur = Number(el.dataset.duration ?? 700);
        const delay = Number(el.dataset.delay ?? 0);
        setTimeout(() => {
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - t0) / dur);
            formatCount(el, from + (to - from) * easeOut(p));
            if (p < 1) requestAnimationFrame(tick);
            else formatCount(el, to);
          };
          formatCount(el, from);
          requestAnimationFrame(tick);
        }, delay);
      }
    },
    // Count only once the figure is fully in the upper 70% of the viewport, where the eye is, not as it peeks in.
    { threshold: 1, rootMargin: '0px 0px -30% 0px' },
  );
  counters.forEach((el) => cio.observe(el));
}

/* ---------- Scroll-linked progress: writes --p (0..1) on [data-scroll-progress] ---------- */
const progressEls = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-progress]'));
const shifts = new Map(progressEls.filter((el) => el.hasAttribute('data-dawn-stage')).map((el) => [el, {
  steps: Array.from(el.querySelectorAll<HTMLElement>('[data-shift-step]')),
}]));
const updateProgress = () => {
  const vh = innerHeight;
  for (const el of progressEls) {
    const r = el.getBoundingClientRect();
    const mode = el.dataset.scrollProgress;
    let p: number;
    if (mode === 'sticky') p = -r.top / Math.max(1, r.height - vh); // tall wrapper with a sticky child
    else if (mode === 'leave') p = -r.top / Math.max(1, r.height); // 0 at top of viewport, 1 when fully scrolled past
    else if (mode === 'enter') p = (vh - r.top) / vh; // 0 as it enters, 1 when its top reaches the top
    else p = (vh - r.top) / (vh + r.height); // through
    const progress = Math.min(1, Math.max(0, p));
    el.style.setProperty('--p', progress.toFixed(4));
    const shift = shifts.get(el);
    if (shift) {
      const elapsed = Math.min(1, Math.max(0, (progress - 0.12) / 0.55));
      const milestones = [0, 0.27, 0.54, 1];
      shift.steps.forEach((step, index) => { step.dataset.complete = String(elapsed >= milestones[index]); });
    }
  }
};
if (progressEls.length) {
  if (motionOK) {
    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        updateProgress();
      });
    };
    // Lenis emits its scroll event inside its own rAF, so --p is written in that same frame; a nested rAF would land a frame late.
    // Native scroll events arrive before the frame's rAF callbacks, so that path still coalesces into one rAF.
    if (lenis) lenis.on('scroll', updateProgress);
    else addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule, { passive: true });
    updateProgress();
  } else progressEls.forEach((el) => el.style.setProperty('--p', el.dataset.restP ?? '1'));
}

/* ---------- Header: transparent over the night hero, then takes the tone of the section beneath it ---------- */
const header = document.querySelector<HTMLElement>('[data-site-header]');
if (header) {
  const setHeader = () => {
    header.classList.toggle('is-scrolled', scrollY > 24);
    const probe = document.elementFromPoint(innerWidth / 2, header.offsetHeight + 2);
    const overHero = probe?.closest<HTMLElement>('[data-night-hero]');
    // Only full-bleed sections set the tone; a dark card passing under the header does not.
    // An explicit tone on a wrapper (e.g. a band class on a div around several sections) wins over the section inside it.
    const toned = probe?.closest<HTMLElement>('[data-header-tone]');
    const section = toned ?? probe?.closest<HTMLElement>('section, footer');
    const overNight = !overHero && section && (section.classList.contains('band-night') || section.dataset.headerTone === 'night');
    // Inner pages' night heroes: a solid bar once content scrolls under it, so text never prints through.
    // The home .hero keeps its transparent bar (the glass name hands off to the header logo there).
    const heroScrolled = !!overHero && !overHero.classList.contains('hero') && scrollY > 24;
    header.classList.toggle('is-over-night', Boolean(overHero || overNight));
    header.classList.toggle('is-solid-night', Boolean(overNight || heroScrolled));
    header.classList.toggle('is-over-dawn', Boolean(probe?.closest('[data-dawn-hero]')));
  };
  setHeader();
  onScroll(setHeader);
  addEventListener('resize', setHeader, { passive: true });
}

/* ---------- Video ---------- */
const attachSources = (video: HTMLVideoElement) => {
  if (video.dataset.attached) return;
  video.dataset.attached = '1';
  const small = innerWidth < 768 && video.dataset.srcMobile;
  const add = (src: string | undefined, type: string) => {
    if (!src) return;
    const s = document.createElement('source');
    s.src = src;
    s.type = type;
    video.appendChild(s);
  };
  if (small) add(video.dataset.srcMobile, 'video/mp4');
  else {
    add(video.dataset.srcWebm, 'video/webm');
    add(video.dataset.srcMp4, 'video/mp4');
  }
  video.load();
};
const inView = new WeakSet<HTMLVideoElement>();
const play = (video: HTMLVideoElement) => {
  if (document.hidden) return;
  attachSources(video);
  const p = video.play();
  if (p) p.then(() => video.classList.add('is-playing')).catch(() => {});
};
const allowVideo = motionOK && !saveData;
const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('video[data-video-mode]'));
videos.forEach((video) => {
  if (!allowVideo) return; // posters only
  const mode = video.dataset.videoMode;
  if (mode === 'hero') {
    inView.add(video);
    const start = () => play(video);
    if (document.readyState === 'complete') setTimeout(start, 150);
    else addEventListener('load', () => setTimeout(start, 150), { once: true });
    new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          inView.add(video);
          play(video);
        } else {
          inView.delete(video);
          video.pause();
        }
      }
    }).observe(video);
    return;
  }
  // In-view films fetch ahead. Desktop service previews wait for hover/focus: their five overlapping
  // rectangles all intersect together, so observing all of them fetched and decoded five films at once.
  // Each retains its responsive poster while inactive.
  if (!(mode === 'hover' && finePointer)) {
    const prefetch = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          attachSources(video);
          video.preload = 'auto';
          prefetch.disconnect();
        }
      },
      { rootMargin: '100% 0px' },
    );
    prefetch.observe(video);
  }
  const vio = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) inView.add(video);
        else inView.delete(video);
        if (mode === 'hover' && finePointer) {
          if (!e.isIntersecting) video.pause();
          continue;
        }
        if (e.isIntersecting) play(video);
        else video.pause();
      }
    },
    { threshold: 0.4 },
  );
  vio.observe(video);
  if (mode === 'hover' && finePointer) {
    const scope = video.closest<HTMLElement>('[data-hover-scope]') ?? video.parentElement!;
    scope.addEventListener('pointerenter', () => play(video));
    scope.addEventListener('pointerleave', () => video.pause());
    scope.addEventListener('focusin', () => play(video));
    scope.addEventListener('focusout', () => video.pause());
  }
});
document.addEventListener('visibilitychange', () => {
  for (const v of videos) {
    if (document.hidden) v.pause();
    else if (allowVideo && inView.has(v) && v.dataset.videoMode !== 'hover' && v.dataset.attached) play(v);
  }
});

/* ---------- Support workflow: automatically reveals its steps once, then stays readable ---------- */
document.querySelectorAll<HTMLElement>('[data-ticket]').forEach((card) => {
  if (!motionOK) return; // static: the whole story is visible
  const steps = Array.from(card.querySelectorAll<HTMLElement>('.ticket-steps li'));
  if (!steps.length) return;
  card.dataset.workflowReady = '';
  let i = 0;
  let timer = 0;
  let running = false;
  let done = false;
  let visible = false;
  const STEP = 1000; // four steps complete in under five seconds; no persistent loop or extra controls
  const tick = () => {
    steps[i].classList.add('is-on');
    i++;
    if (i === steps.length) {
      card.classList.add('is-resolved');
      running = false;
      done = true;
      return;
    }
    timer = window.setTimeout(tick, STEP);
  };
  const start = () => {
    if (running || done || !visible || document.hidden || card.hidden || card.inert) return;
    running = true;
    timer = window.setTimeout(tick, i === 0 ? 600 : STEP);
  };
  const stop = () => {
    running = false;
    clearTimeout(timer);
  };
  new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) start();
    else stop();
  }, { threshold: 0.35 }).observe(card);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
});

/* ---------- Theme toggle ---------- */
const applyThemeLabels = () => {
  const dark = root.dataset.theme === 'dark';
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((b) => {
    // The label names the action, so the button is not also a toggle ("Switch to light theme, pressed" reads as a contradiction).
    b.removeAttribute('aria-pressed');
    b.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  });
};
document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((b) =>
  b.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('gf-theme', next);
    } catch {}
    applyThemeLabels();
  }),
);
applyThemeLabels();

/* ---------- Mobile menu ---------- */
const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.getElementById('mobile-menu');
if (menuBtn && menu) {
  const setOpen = (open: boolean) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    root.classList.toggle('menu-open', open);
    if (open) {
      lenis?.stop();
      menu.querySelector<HTMLElement>('a, button')?.focus();
    } else lenis?.start();
  };
  menuBtn.addEventListener('click', () => setOpen(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      menuBtn.focus();
    }
  });
  matchMedia('(min-width: 1024px)').addEventListener('change', (m) => m.matches && setOpen(false));
}

/* ---------- Marquee pause (WCAG 2.2.2) ---------- */
document.querySelectorAll<HTMLButtonElement>('[data-marquee-toggle]').forEach((btn) => {
  const target = document.getElementById(btn.getAttribute('aria-controls') ?? '');
  btn.removeAttribute('aria-pressed'); // the visible label carries the state
  btn.addEventListener('click', () => {
    const paused = !target?.classList.contains('is-paused');
    target?.classList.toggle('is-paused', paused);
    const label = btn.querySelector('[data-label]');
    if (label) label.textContent = paused ? 'Play' : 'Pause';
    btn.setAttribute('aria-label', paused ? 'Play logo animation' : 'Pause logo animation');
  });
});

/* ---------- Toronto local time ---------- */
const clocks = document.querySelectorAll<HTMLElement>('[data-toronto-time]');
if (clocks.length) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit' });
  const tick = () => clocks.forEach((c) => (c.textContent = fmt.format(new Date()).replace(/\./g, '').toUpperCase()));
  tick();
  setInterval(tick, 30_000);
}

/* ---------- Year ---------- */
document.querySelectorAll<HTMLElement>('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())));
