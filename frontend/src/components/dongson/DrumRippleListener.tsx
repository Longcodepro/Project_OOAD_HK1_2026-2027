/**
 * @file DrumRippleListener.tsx
 * @description Trình Lắng nghe Hiệu ứng Tương tác Toàn cục (Global Interactive Ripple Effect).
 *
 * HAI HIỆU ỨNG THỊ GIÁC ĐẶC SẮC:
 * 1. Hiệu ứng Giọt mực loang (Ink Ripple) khi nhấp chuột vào các nút bấm chính (`.cta-terracotta`).
 * 2. Hiệu ứng Sóng âm Trống đồng lan tỏa (Drum Soundwave Ripple) khi nhấp chuột vào nền trống của trang web.
 *
 * TỐI ƯU HIỆU NĂNG:
 * - Giới hạn tối đa 3 hiệu ứng đồng thời để tránh dồn ứ DOM node và rác bộ nhớ (Garbage Collection).
 * - Tự động bỏ qua hiệu ứng nền khi kích hoạt Chế độ mượt mà (`perfMode`).
 */

import { memo, useEffect } from 'react'

interface DrumRippleListenerProps {
  /** Cờ chế độ mượt mà (bỏ qua hiệu ứng sóng âm trên background để tối ưu hiệu năng) */
  perfMode?: boolean
}

/**
 * Thành phần vô hình lắng nghe sự kiện nhấp chuột trên `window` để kích hoạt hiệu ứng sóng âm và mực loang.
 */
export const DrumRippleListener = memo(function DrumRippleListener({
  perfMode = false,
}: DrumRippleListenerProps) {
  useEffect(() => {
    let activeRipples = 0
    const MAX_CONCURRENT_RIPPLES = 3

    // 1. Ink ripple on CTA buttons
    const handleCtaClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.('.cta-terracotta') as HTMLElement | null
      if (!target) return

      const rect = target.getBoundingClientRect()
      const ink = document.createElement('i')
      ink.className = 'ink'
      ink.style.left = `${e.clientX - rect.left}px`
      ink.style.top = `${e.clientY - rect.top}px`
      target.appendChild(ink)

      setTimeout(() => {
        ink.remove()
      }, 650)
    }

    // 2. Drum soundwave ripple on background clicks
    const handleBackgroundClick = (e: MouseEvent) => {
      if (perfMode) return // Bỏ qua sóng âm nền khi bật chế độ mượt mà
      if (activeRipples >= MAX_CONCURRENT_RIPPLES) return

      const target = e.target as HTMLElement | null
      if (!target || target.closest('button, a, input, select, textarea, [role="button"], .seat-item, .modal-card')) {
        return
      }

      activeRipples++
      const rip = document.createElement('div')
      rip.className = 'drum-ripple'
      rip.style.left = `${e.clientX}px`
      rip.style.top = `${e.clientY}px`
      document.body.appendChild(rip)

      setTimeout(() => {
        rip.remove()
        activeRipples = Math.max(0, activeRipples - 1)
      }, 750)
    }

    window.addEventListener('pointerdown', handleCtaClick, { passive: true })
    window.addEventListener('pointerdown', handleBackgroundClick, { passive: true })

    return () => {
      window.removeEventListener('pointerdown', handleCtaClick)
      window.removeEventListener('pointerdown', handleBackgroundClick)
    }
  }, [perfMode])

  return null
})
