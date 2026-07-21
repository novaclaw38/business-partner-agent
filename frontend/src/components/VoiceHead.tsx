import { useEffect, useRef } from 'react'

export type VoiceHeadState = 'idle' | 'thinking' | 'speaking'

const GLYPHS = 'アイウエオカ0123456789+='

interface Particle {
  x: number
  y: number
  phase: number
  role: 'outline' | 'eye' | 'mouth'
}

// A broad, triangular wedge — the head shape that distinguishes vipers from
// round-headed snakes — sampled into points along its perimeter, plus two
// eye points and a mouth row that can spread apart when speaking.
function buildParticles(): Particle[] {
  const particles: Particle[] = []
  const outline: [number, number][] = [
    [18, 22], [50, 12], [82, 22], // back of jaw
    [78, 40], [68, 60], [58, 78], [50, 92], // right jaw -> snout
    [42, 78], [32, 60], [22, 40], [18, 22], // snout -> left jaw
  ]
  for (let i = 0; i < outline.length - 1; i++) {
    const [x1, y1] = outline[i]
    const [x2, y2] = outline[i + 1]
    const steps = 6
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      particles.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, phase: Math.random() * Math.PI * 2, role: 'outline' })
    }
  }
  particles.push({ x: 38, y: 38, phase: 0, role: 'eye' })
  particles.push({ x: 62, y: 38, phase: 0, role: 'eye' })
  for (let x = 42; x <= 58; x += 4) {
    particles.push({ x, y: 64, phase: Math.random() * Math.PI * 2, role: 'mouth' })
  }
  return particles
}

export function VoiceHead({ state, analyser }: { state: VoiceHeadState; analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef(state)
  const particlesRef = useRef<Particle[]>(buildParticles())
  stateRef.current = state

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const size = 56
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const freqData = new Uint8Array(analyser?.frequencyBinCount ?? 0)

    function audioLevel(): number {
      if (!analyser || stateRef.current !== 'speaking') return 0
      analyser.getByteFrequencyData(freqData)
      let sum = 0
      for (let i = 0; i < freqData.length; i++) sum += freqData[i]
      return freqData.length ? sum / freqData.length / 255 : 0
    }

    let frame: number
    let t = 0

    function draw() {
      const s = size
      ctx!.clearRect(0, 0, s, s)
      const currentState = stateRef.current
      const level = audioLevel()
      t += currentState === 'thinking' ? 0.12 : 0.05

      const jitterAmp = currentState === 'idle' ? 1 : currentState === 'thinking' ? 2.5 : 1 + level * 3
      const scale = s / 100

      for (const p of particlesRef.current) {
        let { x, y } = p
        const jx = Math.sin(t + p.phase) * jitterAmp
        const jy = Math.cos(t * 1.3 + p.phase) * jitterAmp

        if (p.role === 'mouth') {
          const spread = currentState === 'speaking' ? level * 10 : 0
          const dir = y > 64 ? 1 : -1
          y += dir * spread * 0.5 + (y - 64) * spread * 0.05
        }

        const drawX = (x + jx) * scale
        const drawY = (y + jy) * scale

        let color = 'rgba(0, 255, 65, 0.75)'
        if (p.role === 'eye') {
          const glow = currentState === 'speaking' ? 0.6 + level * 0.4 : 0.7 + Math.sin(t * 2) * 0.15
          color = `rgba(127, 255, 224, ${glow})`
        } else if (p.role === 'mouth') {
          color = `rgba(255, 32, 121, ${0.5 + level * 0.5})`
        }

        ctx!.fillStyle = color
        if (reduceMotion) {
          ctx!.fillRect(drawX, drawY, 1.6, 1.6)
        } else {
          ctx!.font = `${5 * scale}px monospace`
          const glyph = GLYPHS[Math.floor((t * 3 + p.phase * 10) % GLYPHS.length)]
          ctx!.fillText(glyph, drawX, drawY)
        }
      }

      if (!reduceMotion) frame = requestAnimationFrame(draw)
    }

    draw() // first frame always renders; the loop above only continues if motion is allowed

    return () => cancelAnimationFrame(frame)
  }, [analyser])

  return (
    <div className="voice-head-wrap">
      <canvas ref={canvasRef} style={{ width: 56, height: 56 }} aria-hidden="true" />
    </div>
  )
}
