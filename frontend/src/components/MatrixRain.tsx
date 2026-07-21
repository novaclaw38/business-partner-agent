import { useEffect, useRef } from 'react'

const GLYPHS = 'アイウエオカキクケコサシスセソ0123456789ﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓ+=<>/\\|'

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const fontSize = 16
    let columns = 0
    let drops: number[] = []

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
      columns = Math.floor(canvas!.width / fontSize)
      drops = Array.from({ length: columns }, () => Math.random() * -50)
    }
    resize()
    window.addEventListener('resize', resize)

    if (reduceMotion) {
      // Static single frame, no animation loop.
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = `${fontSize}px monospace`
      ctx.fillStyle = 'rgba(0, 255, 65, 0.25)'
      for (let i = 0; i < columns; i++) {
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        ctx.fillText(glyph, i * fontSize, Math.random() * canvas.height)
      }
      return () => window.removeEventListener('resize', resize)
    }

    let frame: number
    function draw() {
      ctx!.fillStyle = 'rgba(0, 0, 0, 0.08)'
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height)
      ctx!.font = `${fontSize}px monospace`

      for (let i = 0; i < columns; i++) {
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        const y = drops[i] * fontSize
        // Leading glyph brighter, trail dimmer green — classic code-rain look.
        ctx!.fillStyle = 'rgba(210, 255, 230, 0.85)'
        ctx!.fillText(glyph, i * fontSize, y)
        ctx!.fillStyle = 'rgba(0, 255, 65, 0.35)'
        ctx!.fillText(glyph, i * fontSize, y - fontSize)

        if (y > canvas!.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="rain-canvas" aria-hidden="true" />
}
