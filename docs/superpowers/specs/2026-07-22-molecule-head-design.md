# Molecule Head Redesign — Design Spec

Date: 2026-07-22

## Goal

Replace the current 56px Matrix-glyph "viper head" (`VoiceHead.tsx`) with a
large, hero-placed 3D talking molecule head, built with Three.js, and restyle
the chat composer/message bubbles so they match the new visual language
instead of clashing with it.

## Background

The current voice indicator (`frontend/src/components/VoiceHead.tsx`) is a
56x56 canvas particle system: outline/eye/mouth points sampled from a
triangular viper-head silhouette, rendered as jittering Matrix glyphs, driven
by `state` (`idle | thinking | speaking`) and a Web Audio `AnalyserNode` for
real playback amplitude. It's wired into `ChatView.tsx`'s topbar next to the
"VIPER" wordmark.

The rest of the UI (`frontend/src/styles.css`) uses a Matrix/terminal palette:
black void background, neon green (`--phosphor: #00ff41`), a cyan-ish "ghost"
accent (`#7fffe0`), and a magenta "glitch" accent (`#ff2079`), JetBrains Mono
+ IBM Plex Sans. Message bubbles and the composer textarea currently use
green-tinted borders/focus rings pulled from this same palette.

## Scope

1. New `MoleculeHead` component (Three.js), replacing `VoiceHead` entirely.
2. Hero placement in the app layout, above the existing topbar/chat.
3. New palette for the head (violet/cyan/magenta bioluminescent), distinct
   from but coexisting with the app's existing green terminal identity.
4. Restyle of message bubbles and composer to match the new palette (visual
   only — no layout or behavioral changes to chat/composer).
5. Removal of `VoiceHead.tsx` and its dedicated CSS.

Out of scope: changes to the Matrix rain backdrop, wordmark, auth screen,
notification prompt, or any backend/vault/agent logic.

## Architecture

### `MoleculeHead.tsx`

- Renders a ball-and-stick 3D molecule via `three.js`, loosely arranged into
  a head/skull silhouette: ~20-30 sphere "atoms" (varying radius) connected
  by cylinder "bonds."
- One atom cluster is tagged as the "jaw" — positioned at the lower-front of
  the structure — and can hinge open/closed independently of the rest of the
  structure's rotation.
- Props match the existing `VoiceHead` contract so the swap in `ChatView.tsx`
  is a near drop-in replacement:
  ```ts
  { state: 'idle' | 'thinking' | 'speaking', analyser: AnalyserNode | null }
  ```
- Internally reuses the amplitude-sampling approach from the current
  `audioLevel()` (average of `analyser.getByteFrequencyData`) to drive both
  jaw hinge angle and bond/atom brightness while `speaking`.
- Respects `prefers-reduced-motion`: renders one static frame, no render
  loop, matching the current `VoiceHead` guarantee.

### State → visual behavior

| State     | Rotation speed | Jaw          | Bonds/atoms                                   |
|-----------|-----------------|--------------|------------------------------------------------|
| idle      | slow, ambient   | closed       | gentle breathing glow                          |
| thinking  | faster          | closed       | color/hue sweep across bonds                   |
| speaking  | slow (baseline) | hinges open/closed with amplitude | vibrate + brighten with amplitude, jaw atoms flash magenta-hot |

### Palette

New CSS custom properties (or Three.js material constants, TBD at
implementation time — likely both, so the JS and CSS agree on the same
values) for the head only:

- Bond lines: deep violet base, cyan highlight on glow pulses.
- Atom spheres: cyan/violet base, magenta-hot when the jaw is active
  (speaking).
- Background: stays void-black (`--void`) — the head sits on the same
  black canvas as the rest of the app, no separate backdrop.

The app's existing green identity (`--phosphor`, wordmark, rain backdrop,
`--border`) is untouched — only the head itself and the composer/bubbles (see
below) pick up the new accent colors, so the new palette reads as an
intentional richer "face" rather than a full theme replacement.

### Layout changes (`ChatView.tsx` / `styles.css`)

- Add a `.hero` container above `.topbar`, centered, holding the
  `MoleculeHead` canvas at roughly 260px (responsive: scale down on narrow
  viewports, minimum ~160px).
- `.topbar` keeps the "VIPER" wordmark and state label, now below the hero
  rather than inline with a small canvas.
- `.chat-scroll` and `.composer` structure unchanged.
- Delete `.voice-head-wrap` and the `VoiceHead` import/usage; delete
  `VoiceHead.tsx`.

### Composer & message bubble restyle

Visual-only changes in `styles.css`:

- `.msg-bubble.agent` / `.msg-bubble.user`: replace green-tinted
  borders/backgrounds with violet/cyan accents consistent with the new head
  palette.
- `.composer textarea`: replace green focus-ring/border-strong with the new
  accent; keep existing sizing/padding/transitions.
- `.send-btn` / `.mic-btn`: same accent swap, no structural change.
- `.thinking` dots: swap to match (currently `var(--phosphor)`).

No new dependencies for this part — plain CSS var changes.

## Dependencies

- Add `three` (and `@types/three` if not bundled) to `frontend/package.json`.
  This is a frontend-only, presentation-layer dependency — unrelated to the
  CLAUDE.md constraint against reintroducing `@anthropic-ai/sdk` or a custom
  tool-use loop in the agent backend (`src/agent/claudeCode.ts`), which this
  does not touch.

## Testing / Verification

No existing automated test suite covers canvas/WebGL visual components.
Verification is manual via `npm run dev` inside `frontend/`:

- Confirm idle/thinking/speaking states render distinctly and the jaw
  hinges with real TTS playback amplitude.
- Confirm `prefers-reduced-motion` yields a static frame (no spinning, no
  rAF loop).
- Confirm hero head scales sensibly at mobile widths and doesn't crowd out
  the chat panel.
- Visual check of restyled message bubbles/composer for contrast/legibility
  against the void-black background.

## Non-goals / explicitly deferred

- No changes to the Matrix rain canvas, auth screen, or notification prompt
  styling.
- No interactive controls (drag-to-rotate, zoom) for the molecule head —
  rotation is fully automatic.
- No backend changes.
