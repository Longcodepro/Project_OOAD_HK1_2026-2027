/**
 * @file NonLaHat.tsx
 * @description Biểu tượng Nón Lá Việt Nam Cách Điệu kèm Hoạt Họa Nét Vẽ (Animated Conical Hat Motif).
 *
 * TÍNH NĂNG:
 * - Tự động vẽ từng nét đan nan nón (`hat.draw` animation) theo chu kỳ `intervalMs`.
 * - Hỗ trợ hiển thị dạng tối giản hoặc đầy đủ (`full={true}`).
 */

import { useEffect, useRef, useState, useMemo } from 'react'
import { hatSvg } from './dongsonData'

interface NonLaHatProps {
  /** Hiển thị toàn bộ cấu trúc nan nón hay chỉ phần đường viền */
  full?: boolean
  /** Vẽ lại tuần hoàn theo chu kỳ */
  periodic?: boolean
  /** Thời gian lặp lại hoạt họa nét vẽ (ms) */
  intervalMs?: number
  /** Lớp CSS tùy biến */
  className?: string
  /** Chiều rộng SVG */
  width?: number | string
  /** Chiều cao SVG */
  height?: number | string
}

/**
 * Thành phần Biểu tượng Nón lá truyền thống cách điệu trong Logo VéXe Việt.
 */
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
