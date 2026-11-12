import { useEffect } from 'react'

export function DrumRippleListener() {
  useEffect(() => {
    // 1. Ink ripple on CTA buttons
    const handleCtaClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.cta-terracotta') as HTMLElement
      if (!target) return

      const rect = target.getBoundingClientRect()
      const ink = document.createElement('i')
      ink.className = 'ink'
      ink.style.left = `${e.clientX - rect.left}px`
      ink.style.top = `${e.clientY - rect.top}px`
      target.appendChild(ink)

      setTimeout(() => ink.remove(), 650)
    }

    // 2. Drum soundwave ripple on background clicks
    const handleBackgroundClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button, a, input, select, textarea, [role="button"]')) return

      const rip = document.createElement('div')
      rip.className = 'drum-ripple'
      rip.style.left = `${e.clientX}px`
      rip.style.top = `${e.clientY}px`
      document.body.appendChild(rip)

      setTimeout(() => rip.remove(), 750)
    }

    window.addEventListener('pointerdown', handleCtaClick)
    window.addEventListener('pointerdown', handleBackgroundClick)

    return () => {
      window.removeEventListener('pointerdown', handleCtaClick)
      window.removeEventListener('pointerdown', handleBackgroundClick)
    }
  }, [])

  return null
}
