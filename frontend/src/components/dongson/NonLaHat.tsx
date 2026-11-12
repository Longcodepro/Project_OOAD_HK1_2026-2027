import { useEffect, useRef, useState, useMemo } from 'react'
import { hatSvg } from './dongsonData'

interface NonLaHatProps {
  full?: boolean
  periodic?: boolean
  intervalMs?: number
  className?: string
  width?: number | string
  height?: number | string
}

export function NonLaHat({
  full = false,
  periodic = true,
  intervalMs = 8500,
  className = '',
  width = 36,
  height = 24,
}: NonLaHatProps) {
  const [isDrawing, setIsDrawing] = useState(true)
  const timerRef = useRef<number | null>(null)

  const innerSvg = useMemo(() => hatSvg(full), [full])
  const viewBox = full ? '0 0 240 206' : '0 0 240 150'

  useEffect(() => {
    if (!periodic) return

    const cycle = () => {
      setIsDrawing(false)
      // Force reflow and restart draw animation
      requestAnimationFrame(() => {
        setIsDrawing(true)
      })
    }

    timerRef.current = window.setInterval(cycle, intervalMs)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [periodic, intervalMs])

  return (
    <svg
      viewBox={viewBox}
      width={width}
      height={height}
      className={`hat ${isDrawing ? 'draw' : ''} ${className}`}
      dangerouslySetInnerHTML={{ __html: innerSvg }}
      aria-hidden="true"
    />
  )
}
