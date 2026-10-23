# G-Force IT: project handoff

Updated 23 October 2026. The active Astro application is `new-site/`; root HTML
is the preserved legacy website. Read current source before reusing older
review scores or implementation descriptions.

## Current brief

Serve Toronto businesses needing managed IT, cybersecurity, cloud/backup and
consulting, and learners exploring practical IT training. The three-page PDF
supplies the feature brief. Later user decisions govern branding and what is
published.

Air on Refero supplies the photographic clouds, clear glass, dawn atmosphere,
white sheets and scroll choreography. The latest user instruction restores the
original supplied G-Force logo and crimson `#cb1f45` → `#89001e`. The earlier
no-red and script-wordmark choices are superseded. Archivo carries the interface.

## Current implementation

- `Logo.astro` displays `/brand/gforce-original.png`, retaining its original
  artwork and lettering. A crimson ground makes the supplied white logo readable.
- The glass name uses original wordmark outlines, with the entire G-FORCE
  visible. `hero-scene.ts` selects `gforce-glass-original-*` geometry;
  `hero-poster-original-*` supplies the initial and fallback images.
- The opening follows Air's actual scroll behaviour. A fixed sculpture turns
  once, shrinks and lifts toward the header as subsequent copy enters normal
  flow. It stays still at rest. There is no timed arrival turn or idle loop.
- WebGL starts only after visitor intent on an eligible device. Quantized
  geometry and a prepared environment atlas replace runtime font extrusion and
  environment baking. Reduced motion, Save-Data and failed WebGL retain posters.
- Headings remain readable until their reveal observer is installed. Already
  reached, restored-scroll and focused content is shown immediately. Check the
  “Build your career in IT” section in real desktop/mobile scrolling.
- Public sample statistics, testimonials, case studies and unconfirmed client
  logos are omitted. Their data/components remain available for future verified
  content. The dawn tabs describe service workflows; they do not simulate client
  outcomes or expose Example/Replay controls.
- Services, training filters, health check, downtime calculator, resources,
  contact paths, consent, dark mode and licensed media remain in the application.
- Headings and revised business/training/contact copy use upright Archivo and
  professional English. The glass has a slight initial pitch and restrained
  blue attenuation for readability; posters are rendered from the full viewport
  and cropped to match that composition.

## Integration and hosting

`PUBLIC_FORM_ENDPOINT` enables JSON form delivery. Without it, forms clearly open
an email draft. `PUBLIC_BOOKING_URL` enables scheduling; otherwise booking opens
an email draft. Confirm provider delivery before claiming these integrations
work end to end.

The root Git repository points to `https://github.com/koushik-bot44/gforce.git`.
Root `vercel.json` builds the Astro application and publishes `new-site/dist`.
Keep Vercel's Root Directory at `./`; root `README.md` documents the commands.
Use Node.js 24.x for local and Vercel builds, matching `package.json` engines.
Check Git and Vercel directly for push/deployment status.

Client inputs still include confirmed support hours/phone, course schedules,
fees/status, a form endpoint and booking URL. Publish customer proof only after
receiving real substantiated material and permission.

## Review and provenance

The user expects demanding visual and motion reviews plus Lighthouse work.
Assess the latest rendered code; previous scores and measurements do not certify
later changes. `REVIEW.md` contains review history/evidence. Required checks are
build, token lint and relevant browser/motion checks; record the viewport,
device/network emulation and run conditions for performance results.

The original context was recovered from
`~/.claude/projects/-Users-saigogineni-Documents-gforce/edc960e8-5b84-4a20-821f-1a8500a60b48.jsonl`.
Recovered chats and abandoned scripts are historical material. A pre-takeover
source snapshot was saved at `/tmp/gforce-claude-context/before-changes.tar.gz`.
