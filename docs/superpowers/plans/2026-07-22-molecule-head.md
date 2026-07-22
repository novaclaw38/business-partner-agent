# Molecule Head Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the small 56px Matrix-glyph `VoiceHead` with a hero-placed 3D Three.js talking molecule head (jaw hinges open/closed with speech amplitude), and restyle the composer/message bubbles to match its new violet/cyan/magenta palette.

**Architecture:** A new `MoleculeHead.tsx` component owns a Three.js scene (spheres = atoms, cylinders = bonds, one tagged jaw cluster) rendered into a `<canvas>` via `WebGLRenderer`, driven by the same `{ state, analyser }` props `VoiceHead` used today. `ChatView.tsx` swaps the import and wraps it in a new `.hero` container above the existing `.topbar`. `styles.css` gains new violet/cyan/magenta CSS vars used by the hero container, message bubbles, and composer; the old green-tinted bubble/composer rules are replaced in place. `VoiceHead.tsx` and `.voice-head-wrap` are deleted.

**Tech Stack:** React 18 + TypeScript, Vite, Three.js (new dependency), existing Web Audio `AnalyserNode` plumbing in `ChatView.tsx`.

## Global Constraints

- Frontend-only change; no backend/vault/agent code touched (per spec's "Non-goals" and CLAUDE.md's constraint on the agent's Claude Code brain, which this doesn't touch).
- Must respect `prefers-reduced-motion`: render one static frame, no animation loop — same guarantee `VoiceHead` provides today (`frontend/src/components/VoiceHead.tsx:59,106-118`).
- `MoleculeHead` must accept exactly `{ state: 'idle' | 'thinking' | 'speaking', analyser: AnalyserNode | null }` so `ChatView.tsx`'s existing analyser wiring (lines 23-41) needs no changes beyond the import swap.
- App's existing green identity (`--phosphor`, wordmark, rain backdrop, `--border`) stays as-is — only the head and composer/bubbles pick up the new accent colors.
- No drag/zoom interaction — rotation is fully automatic.

---

## File Structure

- **Create:** `frontend/src/components/MoleculeHead.tsx` — Three.js scene, molecule geometry, state-driven animation loop.
- **Modify:** `frontend/src/components/ChatView.tsx` — swap `VoiceHead` import/usage for `MoleculeHead`, add `.hero` wrapper.
- **Modify:** `frontend/src/styles.css` — new palette vars, `.hero` layout, restyled `.msg-bubble`/`.composer` rules, remove `.voice-head-wrap`.
- **Modify:** `frontend/package.json` — add `three` + `@types/three`.
- **Delete:** `frontend/src/components/VoiceHead.tsx`.

---

### Task 1: Add Three.js dependency

**Files:**
- Modify: `frontend/package.json`

**Interfaces:**
- Produces: `three` importable as `import * as THREE from 'three'` in Task 2.

- [ ] **Step 1: Install the dependency**

Run: `cd frontend && npm install three && npm install --save-dev @types/three`

Expected: `package.json` gains `"three": "^0.17x.x"` under `dependencies` and `"@types/three": "^0.17x.x"` under `devDependencies`; `package-lock.json` updates.

- [ ] **Step 2: Verify it resolves**

Run: `cd frontend && node -e "require('three/package.json').version"`
Expected: prints a version string like `0.170.0`, no error.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add package.json package-lock.json
git commit -m "Add three.js dependency for molecule head"
```

---

### Task 2: Build `MoleculeHead` component (static geometry, idle rotation)

**Files:**
- Create: `frontend/src/components/MoleculeHead.tsx`

**Interfaces:**
- Consumes: `three` (Task 1).
- Produces: `export type MoleculeHeadState = 'idle' | 'thinking' | 'speaking'` and `export function MoleculeHead({ state, analyser }: { state: MoleculeHeadState; analyser: AnalyserNode | null })` — a `<div className="molecule-head-wrap">` containing a `<canvas>`. Later tasks (3, 4) extend this same file's animation loop; Task 5 imports `MoleculeHead`/`MoleculeHeadState` from here.

This step lays down the scene, camera, renderer, molecule geometry (atoms + bonds + a separately-tracked jaw group), and ambient idle rotation — no audio-reactivity yet (that's Task 3).

- [ ] **Step 1: Write the component**

```tsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export type MoleculeHeadState = 'idle' | 'thinking' | 'speaking'

interface AtomSpec {
  x: number
  y: number
  z: number
  radius: number
  jaw: boolean
}

// Loosely head-shaped point cloud: a rounded cranium cluster plus a
// separate lower-front jaw cluster that can hinge independently.
const CRANIUM_ATOMS: AtomSpec[] = [
  { x: 0, y: 1.1, z: 0, radius: 0.34, jaw: false },
  { x: 0.55, y: 0.85, z: 0.4, radius: 0.26, jaw: false },
  { x: -0.55, y: 0.85, z: 0.4, radius: 0.26, jaw: false },
  { x: 0.55, y: 0.85, z: -0.4, radius: 0.26, jaw: false },
  { x: -0.55, y: 0.85, z: -0.4, radius: 0.26, jaw: false },
  { x: 0.9, y: 0.3, z: 0.5, radius: 0.22, jaw: false },
  { x: -0.9, y: 0.3, z: 0.5, radius: 0.22, jaw: false },
  { x: 0.9, y: 0.3, z: -0.5, radius: 0.22, jaw: false },
  { x: -0.9, y: 0.3, z: -0.5, radius: 0.22, jaw: false },
  { x: 0, y: 0.2, z: 0.9, radius: 0.3, jaw: false },
  { x: 0, y: 0.2, z: -0.9, radius: 0.3, jaw: false },
  { x: 0.4, y: -0.1, z: 0.7, radius: 0.2, jaw: false },
  { x: -0.4, y: -0.1, z: 0.7, radius: 0.2, jaw: false },
]

const JAW_ATOMS: AtomSpec[] = [
  { x: 0, y: -0.7, z: 0.55, radius: 0.24, jaw: true },
  { x: 0.35, y: -0.55, z: 0.4, radius: 0.18, jaw: true },
  { x: -0.35, y: -0.55, z: 0.4, radius: 0.18, jaw: true },
  { x: 0, y: -0.95, z: 0.2, radius: 0.16, jaw: true },
]

const ALL_ATOMS = [...CRANIUM_ATOMS, ...JAW_ATOMS]

// Bonds by atom index into ALL_ATOMS.
const BONDS: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4],
  [1, 5], [2, 6], [3, 7], [4, 8],
  [1, 9], [2, 9], [3, 10], [4, 10],
  [9, 11], [9, 12], [10, 11], [10, 12],
  [9, 13], [10, 13],
  [13, 14], [13, 15], [13, 16],
]

const JAW_HINGE_ORIGIN = new THREE.Vector3(0, -0.4, 0.3)

function buildBondMesh(a: THREE.Vector3, b: THREE.Vector3, material: THREE.Material): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a)
  const length = dir.length()
  const geometry = new THREE.CylinderGeometry(0.045, 0.045, length, 8)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(a).add(dir.clone().multiplyScalar(0.5))
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
  return mesh
}

export function MoleculeHead({ state, analyser }: { state: MoleculeHeadState; analyser: AnalyserNode | null }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const size = 260
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    camera.position.set(0, 0, 5)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(size, size)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x8888ff, 0.6))
    const key = new THREE.PointLight(0x7fd7ff, 1.4, 20)
    key.position.set(2, 2, 3)
    scene.add(key)

    const atomMaterial = new THREE.MeshStandardMaterial({ color: 0x8a5cff, emissive: 0x3a1a80, emissiveIntensity: 0.6, roughness: 0.35, metalness: 0.2 })
    const jawMaterial = new THREE.MeshStandardMaterial({ color: 0x7fe0ff, emissive: 0x1a4a80, emissiveIntensity: 0.6, roughness: 0.35, metalness: 0.2 })
    const bondMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2fbf, emissive: 0x1a0f40, emissiveIntensity: 0.4, roughness: 0.5 })

    const root = new THREE.Group()
    const craniumGroup = new THREE.Group()
    const jawGroup = new THREE.Group()
    root.add(craniumGroup)
    root.add(jawGroup)
    scene.add(root)

    const atomMeshes: THREE.Mesh[] = []
    ALL_ATOMS.forEach((atom) => {
      const geometry = new THREE.SphereGeometry(atom.radius, 16, 16)
      const mesh = new THREE.Mesh(geometry, atom.jaw ? jawMaterial : atomMaterial)
      mesh.position.set(atom.x, atom.y, atom.z)
      atomMeshes.push(mesh)
      ;(atom.jaw ? jawGroup : craniumGroup).add(mesh)
    })

    BONDS.forEach(([ai, bi]) => {
      const a = ALL_ATOMS[ai]
      const b = ALL_ATOMS[bi]
      const bondMesh = buildBondMesh(
        new THREE.Vector3(a.x, a.y, a.z),
        new THREE.Vector3(b.x, b.y, b.z),
        bondMaterial,
      )
      const targetGroup = a.jaw || b.jaw ? jawGroup : craniumGroup
      targetGroup.add(bondMesh)
    })

    jawGroup.position.copy(JAW_HINGE_ORIGIN)
    JAW_ATOMS.forEach((atom, i) => {
      const mesh = jawGroup.children[i] as THREE.Mesh
      mesh.position.set(atom.x - JAW_HINGE_ORIGIN.x, atom.y - JAW_HINGE_ORIGIN.y, atom.z - JAW_HINGE_ORIGIN.z)
    })

    let frame: number
    let t = 0

    function render() {
      renderer.render(scene, camera)
    }

    function tick() {
      t += 0.01
      const currentState = stateRef.current
      const rotSpeed = currentState === 'thinking' ? 0.012 : currentState === 'speaking' ? 0.006 : 0.004
      root.rotation.y += rotSpeed

      render()
      if (!reduceMotion) frame = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      cancelAnimationFrame(frame)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div className="molecule-head-wrap" ref={mountRef} aria-hidden="true" />
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/components/MoleculeHead.tsx
git commit -m "Add MoleculeHead component with static geometry and idle rotation"
```

---

### Task 3: Add audio-reactive jaw hinge and thinking/speaking glow

**Files:**
- Modify: `frontend/src/components/MoleculeHead.tsx`

**Interfaces:**
- Consumes: `analyser: AnalyserNode | null` prop (already declared in Task 2).
- Produces: no new exports — extends the existing `tick()`/effect body in place.

- [ ] **Step 1: Extend the effect to sample amplitude and drive the jaw + glow**

Inside the `useEffect` body from Task 2, replace the `tick()` function and add an `audioLevel()` helper, plus track `analyser` via a ref so the effect doesn't need to re-run on every prop change:

```tsx
```

Concretely, apply this diff to `MoleculeHead.tsx`:

1. Add near the top of the component, alongside `stateRef`:

```tsx
  const analyserRef = useRef(analyser)
  analyserRef.current = analyser
```

2. Change the `useEffect` dependency array from `[]` to `[]` (still empty — the effect reads `analyserRef.current` each frame, so it never needs to re-mount when `analyser` changes after the initial connect).

3. Inside the effect, before `let frame: number`, add:

```tsx
    const freqData = new Uint8Array(analyserRef.current?.frequencyBinCount ?? 128)

    function audioLevel(): number {
      const a = analyserRef.current
      if (!a || stateRef.current !== 'speaking') return 0
      a.getByteFrequencyData(freqData)
      let sum = 0
      for (let i = 0; i < freqData.length; i++) sum += freqData[i]
      return freqData.length ? sum / freqData.length / 255 : 0
    }
```

4. Replace the `tick()` function body with:

```tsx
    function tick() {
      t += 0.01
      const currentState = stateRef.current
      const level = audioLevel()

      const rotSpeed = currentState === 'thinking' ? 0.012 : currentState === 'speaking' ? 0.006 : 0.004
      root.rotation.y += rotSpeed

      const hingeTarget = currentState === 'speaking' ? level * 0.5 : 0
      jawGroup.rotation.x += (hingeTarget - jawGroup.rotation.x) * 0.3

      const glowPulse = currentState === 'thinking'
        ? 0.5 + Math.sin(t * 4) * 0.3
        : currentState === 'speaking'
          ? 0.5 + level * 0.7
          : 0.5 + Math.sin(t * 1.5) * 0.15
      atomMaterial.emissiveIntensity = 0.4 + glowPulse * 0.4
      bondMaterial.emissiveIntensity = 0.2 + glowPulse * 0.3
      jawMaterial.emissiveIntensity = currentState === 'speaking' ? 0.4 + level * 1.2 : 0.4 + glowPulse * 0.3
      jawMaterial.color.set(currentState === 'speaking' && level > 0.15 ? 0xff2ea0 : 0x7fe0ff)

      render()
      if (!reduceMotion) frame = requestAnimationFrame(tick)
    }
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/components/MoleculeHead.tsx
git commit -m "Drive jaw hinge and glow from audio amplitude and state"
```

---

### Task 4: Wire `MoleculeHead` into `ChatView` and remove `VoiceHead`

**Files:**
- Modify: `frontend/src/components/ChatView.tsx:6,102,107`
- Delete: `frontend/src/components/VoiceHead.tsx`

**Interfaces:**
- Consumes: `MoleculeHead`, `MoleculeHeadState` from `./MoleculeHead` (Task 2/3).

- [ ] **Step 1: Swap the import**

In `frontend/src/components/ChatView.tsx`, change:

```tsx
import { VoiceHead, type VoiceHeadState } from './VoiceHead'
```

to:

```tsx
import { MoleculeHead, type MoleculeHeadState } from './MoleculeHead'
```

- [ ] **Step 2: Rename the local state variable and add the hero wrapper**

Change:

```tsx
  const voiceHeadState: VoiceHeadState = speaking ? 'speaking' : pending ? 'thinking' : 'idle'

  return (
    <div className="app-shell">
      <div className="topbar">
        <VoiceHead state={voiceHeadState} analyser={analyserRef.current} />
        <div className="topbar-meta">
          <div className="wordmark">VIPER</div>
          <div className="topbar-right mono">{voiceHeadState}</div>
        </div>
      </div>
```

to:

```tsx
  const moleculeState: MoleculeHeadState = speaking ? 'speaking' : pending ? 'thinking' : 'idle'

  return (
    <div className="app-shell">
      <div className="hero">
        <MoleculeHead state={moleculeState} analyser={analyserRef.current} />
      </div>

      <div className="topbar">
        <div className="topbar-meta">
          <div className="wordmark">VIPER</div>
          <div className="topbar-right mono">{moleculeState}</div>
        </div>
      </div>
```

- [ ] **Step 3: Delete the old component**

Run: `rm frontend/src/components/VoiceHead.tsx`

- [ ] **Step 4: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors (no remaining references to `VoiceHead`/`VoiceHeadState`).

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/ChatView.tsx
git rm src/components/VoiceHead.tsx
git commit -m "Replace VoiceHead with hero MoleculeHead in ChatView"
```

---

### Task 5: New palette vars + hero layout CSS

**Files:**
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Produces: `--mol-violet`, `--mol-cyan`, `--mol-magenta` CSS vars (consumed by Task 6) and `.hero` / `.molecule-head-wrap` layout rules.

- [ ] **Step 1: Add new palette vars to `:root`**

In `frontend/src/styles.css`, inside the existing `:root { ... }` block (around line 3-16), add three new vars after `--glitch: #ff2079;`:

```css
  --mol-violet: #8a5cff;
  --mol-cyan: #7fe0ff;
  --mol-magenta: #ff2ea0;
```

- [ ] **Step 2: Replace the old voice-head CSS with hero + molecule-head-wrap rules**

Replace the existing block:

```css
/* --- Voice head canvas --- */

.voice-head-wrap {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
}
```

with:

```css
/* --- Molecule head hero --- */

.hero {
  display: flex;
  justify-content: center;
  padding: 18px 0 4px;
}

.molecule-head-wrap {
  width: 260px;
  height: 260px;
}

.molecule-head-wrap canvas {
  width: 100%;
  height: 100%;
  display: block;
}

@media (max-width: 480px) {
  .molecule-head-wrap {
    width: 160px;
    height: 160px;
  }
}
```

- [ ] **Step 3: Visually verify in dev server**

Run: `cd frontend && npm run dev` (leave running), open the printed local URL in a browser.
Expected: a 260px rotating violet/cyan molecule renders centered above the "VIPER" wordmark; no console errors.

Stop the dev server (`Ctrl+C`) once confirmed.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/styles.css
git commit -m "Add molecule palette vars and hero layout for MoleculeHead"
```

---

### Task 6: Restyle message bubbles and composer to the new palette

**Files:**
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: `--mol-violet`, `--mol-cyan`, `--mol-magenta` (Task 5).

- [ ] **Step 1: Restyle message bubbles**

Replace:

```css
.msg-bubble.agent {
  background: var(--panel);
  border: 1px solid var(--border);
  border-left: 2px solid var(--phosphor-dim);
}

.msg-bubble.user {
  background: rgba(127, 255, 224, 0.06);
  border: 1px solid rgba(127, 255, 224, 0.3);
  border-right: 2px solid var(--ghost);
}
```

with:

```css
.msg-bubble.agent {
  background: var(--panel);
  border: 1px solid rgba(138, 92, 255, 0.25);
  border-left: 2px solid var(--mol-violet);
}

.msg-bubble.user {
  background: rgba(127, 224, 255, 0.06);
  border: 1px solid rgba(127, 224, 255, 0.3);
  border-right: 2px solid var(--mol-cyan);
}
```

And replace:

```css
.msg-bubble.agent .msg-label {
  color: var(--phosphor);
  opacity: 0.8;
}

.msg-bubble.user .msg-label {
  color: var(--ghost);
  opacity: 0.8;
}
```

with:

```css
.msg-bubble.agent .msg-label {
  color: var(--mol-violet);
  opacity: 0.9;
}

.msg-bubble.user .msg-label {
  color: var(--mol-cyan);
  opacity: 0.9;
}
```

- [ ] **Step 2: Restyle the thinking-dots indicator**

Replace:

```css
.thinking span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--phosphor);
  animation: blink 1.2s infinite ease-in-out;
}
```

with:

```css
.thinking span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--mol-violet);
  animation: blink 1.2s infinite ease-in-out;
}
```

- [ ] **Step 3: Restyle the composer textarea and buttons**

Replace:

```css
.composer textarea:focus {
  border-color: var(--border-strong);
  box-shadow: 0 0 0 3px rgba(0, 255, 65, 0.12);
}
```

with:

```css
.composer textarea:focus {
  border-color: var(--mol-violet);
  box-shadow: 0 0 0 3px rgba(138, 92, 255, 0.18);
}
```

Replace:

```css
.composer .send-btn,
.composer .mic-btn {
  width: 42px;
  height: 42px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--panel-solid);
  color: var(--phosphor);
```

with:

```css
.composer .send-btn,
.composer .mic-btn {
  width: 42px;
  height: 42px;
  border-radius: var(--radius);
  border: 1px solid rgba(138, 92, 255, 0.25);
  background: var(--panel-solid);
  color: var(--mol-cyan);
```

Replace:

```css
.composer .send-btn:hover,
.composer .mic-btn:hover {
  border-color: var(--border-strong);
  box-shadow: 0 0 12px rgba(0, 255, 65, 0.35);
}
```

with:

```css
.composer .send-btn:hover,
.composer .mic-btn:hover {
  border-color: var(--mol-violet);
  box-shadow: 0 0 12px rgba(138, 92, 255, 0.4);
}
```

Replace:

```css
.composer .mic-btn.recording {
  background: var(--glitch);
  color: #1a0009;
  border-color: var(--glitch);
  box-shadow: 0 0 16px rgba(255, 32, 121, 0.5);
  animation: blink 1s ease-in-out infinite;
}
```

with:

```css
.composer .mic-btn.recording {
  background: var(--mol-magenta);
  color: #1a0009;
  border-color: var(--mol-magenta);
  box-shadow: 0 0 16px rgba(255, 46, 160, 0.5);
  animation: blink 1s ease-in-out infinite;
}
```

Replace the shared focus-visible selector:

```css
.login-form button:focus-visible,
.primary-btn:focus-visible,
.composer textarea:focus-visible,
.composer .send-btn:focus-visible,
.composer .mic-btn:focus-visible {
  outline: 2px solid var(--ghost);
  outline-offset: 2px;
}
```

with:

```css
.login-form button:focus-visible,
.primary-btn:focus-visible {
  outline: 2px solid var(--ghost);
  outline-offset: 2px;
}

.composer textarea:focus-visible,
.composer .send-btn:focus-visible,
.composer .mic-btn:focus-visible {
  outline: 2px solid var(--mol-cyan);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Visually verify in dev server**

Run: `cd frontend && npm run dev`, open the app, send a message.
Expected: agent bubble has a violet left border, user bubble has a cyan right border, thinking dots pulse violet, composer focus ring is violet, mic recording state glows magenta — no green (`--phosphor`/`--border-strong`/`--ghost`-as-focus) remaining in these elements.

Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/styles.css
git commit -m "Restyle message bubbles and composer to molecule-head palette"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1-4 cover the MoleculeHead component + jaw hinge + hero wiring (spec sections "Architecture", "State → visual behavior", "Layout changes"). Task 5-6 cover "Palette" and "Composer & message bubble restyle". `VoiceHead.tsx` deletion is in Task 4. Reduced-motion handling is built into Task 2/3's `tick()`/effect (mirrors the spec's requirement and the original `VoiceHead` guarantee). No task touches the rain backdrop, auth screen, or backend, matching the spec's non-goals.
- **Placeholder scan:** no TBD/TODO; all steps include full code or exact before/after CSS blocks.
- **Type consistency:** `MoleculeHeadState` name and the `{ state, analyser }` prop shape are declared in Task 2 and reused verbatim in Task 3 (same file) and Task 4 (`ChatView.tsx` import). CSS var names (`--mol-violet`, `--mol-cyan`, `--mol-magenta`) declared in Task 5 are the only ones referenced in Task 6.
