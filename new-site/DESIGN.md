# G-Force IT: design system

Current direction, 23 October 2026. Latest explicit user instructions supersede
earlier experiments: preserve the original G-Force logo and crimson palette;
retain Air's clouds, clear glass, white sheets and scroll choreography.

## Identity and composition

- `Logo.astro` displays the supplied `/brand/gforce-original.png`. Preserve its
  artwork, proportions, white lettering and complete name. A crimson ground
  keeps the white artwork readable on light surfaces.
- The hero sculpture uses outlines traced from the original wordmark. It is not
  Sacramento, Satisfy, Pacifico or another substitute script. The full G-FORCE
  must fit in the opening composition. Geometry is baked as
  `/3d/gforce-glass-original-{desktop,mobile}`.
- Follow [Air on Refero](https://styles.refero.design/style/d3289fe7-a85e-42d8-96b7-eb7faa62a104)
  for photographic clouds, transparent sculptural depth and a pale blue-to-apricot
  atmosphere. The opening artwork is fixed over a scroll spacer; the headline,
  description and two actions follow in normal flow as it retreats.
- Service and learning content alternates sky/dawn with white sheets. Keep
  professional hierarchy, varied section spacing and real licensed imagery.
  Avoid generic decorative dots, repeated ornamental kickers and dark flat blocks.

## Colour and surfaces

| Role | Current value | Use |
|---|---|---|
| Original crimson | `#cb1f45` | Primary actions, links and brand accents |
| Crimson hover | `#af1234` | Hover state |
| Deep crimson | `#89001e` | Press state and original brand gradient end |
| Ink | `#1b1b1b` | Light-surface headings/body |
| Haze / white | `#f5f5f5` / `#ffffff` | Inputs, cards and sheets |
| Deep sky | `#123e73` | Photographic inner-page bands and footer |
| Dawn | `#90bad7` → `#b3d4e7` → `#bfd2d3` → `#d2d2bf` → `#e3d2ad` → `#f5d6a2` | Hero/dawn atmosphere |

Use semantic tokens in `global.css`; the `crimson-*` tokens now contain the
original crimson values. Light surfaces use crimson primary pills and outlined
secondary actions. Sky bands use white actions and light text. Dark mode uses
opaque deep-sky surfaces; the hero retains its light dawn art direction.
Verify contrast against the actual rendered background.

## Typography, space and controls

Archivo is self-hosted and carries upright headings, body, buttons and accents. The
compressed display is a width-axis cut of Archivo, not another family. The logo's
original lettering is artwork, not a replacement interface font.

| Role | Size | Weight / tracking |
|---|---|---|
| Display | `clamp(2.6rem, 1.5rem + 4.6vw, 5.5rem)` | 560 / −0.035em |
| H2 | `clamp(2rem, 1.3rem + 2.8vw, 3.5rem)` | 560 / −0.03em |
| H3 | `clamp(1.375rem, 1.1rem + 1vw, 1.875rem)` | 600 / −0.02em |
| Body | 1.0625rem | 400 |

The hero has its own responsive heading scale. Balance headings and constrain
body line length. The container is 1240px with fluid gutters. Standard/dense
section padding varies using the existing tokens. Inputs use 4px radii, cards
12px and buttons pills. Prefer surface contrast and hairlines over decorative
shadows. Use the existing z-index scale for sticky, overlay and modal content.

## Motion and performance

Air's live opening is scroll-driven. It is not an automatic arrival spin.

| Moment | Current behaviour |
|---|---|
| Opening | Matching responsive `hero-poster-original-*` AVIF/WebP paints first. The complete original name has a slight initial pitch and stays still until scrolling. |
| Scroll handoff | Progress drives one full Y rotation, exponential shrinking and upward travel toward the header logo. Copy enters in normal flow. The artwork fades as the handoff completes. |
| Live scene | Only eligible visitor intent starts the deferred renderer. No eager WebGL probe, runtime font extrusion or environment baking. Quantized geometry and a prepared CubeUV environment atlas load as assets. Draw on scroll/resize/visibility changes, not a perpetual idle loop. |
| Fallbacks | Reduced motion uses the static readable composition. Save-Data, constrained devices or failed WebGL retain the poster. With motion enabled, the poster follows the spatial scroll transition while the renderer loads. |
| Headings | Default content is visible. Masked reveals are armed only after the observer exists; already-reached content, restored scroll, anchors and focus reveal immediately. The learner heading must never depend on a late animation to be readable. |
| Dawn panel | Photographic film plus keyboard-accessible tabs describing overnight care and support workflows. No simulated clock/outcome, Example badge or Replay control. A film pause control remains where autoplay needs it. |
| Services/media | Desktop previews attach on hover/focus; touch/in-view films follow visibility. Posters remain underneath. Films pause off-screen/when hidden; reduced motion and Save-Data retain posters. |
| Process/micro | Scroll progress explains the ordered business process. Buttons/links give brief colour/position feedback; keyboard focus stays visible. |

Use the established ease-out curve `cubic-bezier(.22,1,.36,1)` for entrances,
brief faster exits and direct scroll mapping. Desktop wheel/trackpad may use
Lenis (`lerp: .15`); touch remains native and reduced motion disables it. Avoid
bounce, delayed interaction and gratuitous continuous movement. Keep expensive
effects bounded and verify actual frames and initial load, including Lighthouse.

## Content and asset integrity

Sample stats, testimonials, case studies and client logos are archived and
omitted publicly. Publish proof only after verification and permission. Exam
names describe course preparation. Stock imagery does not establish a team or
customer relationship. Credits remain in `MEDIA_LICENSES.md` and
`MEDIA_LICENSES-air.md`.

Use verb-led actions and specific professional English. Forms and booking must
describe their configured endpoint or email-draft fallback accurately. Regenerate
matching posters whenever the original-outline geometry, lighting or framing
changes. Clear glass uses restrained blue attenuation for legibility; render the
full viewport before cropping posters so refraction/framing stay aligned.
Source and evidence should establish current quality; older scores are
not certification of the latest revision.
