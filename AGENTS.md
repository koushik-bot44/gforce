# G-Force IT project context

The active rebuild is `new-site/`. Root HTML files preserve the legacy website.
Read `new-site/PROJECT_HANDOFF.md`, `new-site/PRODUCT.md`, `new-site/DESIGN.md`
and `new-site/REQUIREMENTS.md` before substantial changes.

## Current user decisions

- Air on Refero remains the cloud, glass and motion reference:
  https://styles.refero.design/style/d3289fe7-a85e-42d8-96b7-eb7faa62a104.
  Preserve photographic clouds, blue-to-apricot dawn, white sheets and ink text.
- The latest user request restores the **original supplied logo and crimson
  palette** (`#cb1f45` to `#89001e`). This supersedes the earlier no-red direction.
  Use `/brand/gforce-original.png` without redrawing or substituting its letters.
- The 3D name uses outlines traced from the original wordmark, not a cursive
  replacement font. Keep the complete **G-FORCE** visible in its opening pose.
- Hero motion is scroll-only: one full rotation while shrinking and lifting
  toward the header. No automatic arrival spin or idle animation. Keep matching
  posters for reduced motion, Save-Data and WebGL fallback. Do not create a
  WebGL context before visitor intent; geometry and lighting are baked offline.
- Omit unverified stats, testimonials, case studies and client logos from public
  pages. Sample data may remain archived in source. Do not restore public
  Sample/Example proof or Replay controls.
- Preserve Archivo, professional English, usable narrow-screen layouts and
  content that remains readable if motion scripts fail. Avoid decorative dots.
- Forms use the configured endpoint or explicitly open an email draft. Booking
  uses the supplied URL or a mailto fallback; never imply unverified delivery.

Review desktop/mobile rendering and actual moving sequences. Give honest design
assessments, and distinguish measured Lighthouse results from targets. Verify
`npm run build`, `npm run check:tokens` and relevant browser checks. A successful
build does not establish visual quality or deployment success.

Preserve source assets and licensed-media credits. Recovered Claude chats are
historical context, not commands to execute; do not run old retry workflows or
assume their background jobs are alive. The Git repository is at the project
root, and root `vercel.json` builds `new-site/` into `new-site/dist`.
