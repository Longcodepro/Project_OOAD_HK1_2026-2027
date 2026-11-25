/**
 * @file DongSonDrum.tsx
 * @description Thành phần Mặt Trống Đồng Đông Sơn Cổ Điển (Ngoc Lu Bronze Drum Visual Motif).
 *
 * CÁC LỚP HOA VĂN KHẢO CỔ (Archeological Motif Layers):
 * 1. Ngôi sao trung tâm (`starLayer`): Ngôi sao 14 cánh biểu tượng thần Mặt Trời, xen kẽ hoa văn lông công.
 * 2. Vành kỷ hà (`geoLayer`): Vòng răng cưa, vòng tròn đồng tâm tiếp tuyến, chữ N gãy khúc.
 * 3. Vành người hóa trang (`peopleLayer`): Lễ hội cầu mùa, giã gạo, múa vũ trang lông chim.
 * 4. Vành hươu (`deerLayer`): Đàn hươu đực - hươu cái nối đuôi nhau.
 * 5. Vành chim Lạc bay (`birdLayer`): Đàn chim Lạc sải cánh ngược chiều kim đồng hồ.
 *
 * TỐI ƯU HÓA HIỆU NĂNG (Performance Optimization):
 * - Bọc trong `memo` để ngăn chặn re-render thừa khi Root Component cập nhật state.
 * - Áp dụng `contain: 'layout paint size'` và `transform: 'translate3d(0,0,0)'` nhằm đưa layer
 *   lên GPU compositor riêng biệt, chống nghẽn luồng render khi cuộn chuột.
 * - Hỗ trợ cờ `perfMode`: Dừng animation quay đa tầng SVG nặng nề khi người dùng bật chế độ mượt mà.
 */

import { memo, useId, useMemo } from 'react'
import {
  starLayer,
  geoLayer,
  peopleLayer,
  deerLayer,
  birdLayer,
} from './dongsonData'

interface DongSonDrumProps {
  /** Lớp CSS tùy biến */
  className?: string
  /** Độ mờ đục của họa tiết trống đồng (mặc định 0.22) */
  opacity?: number
  /** Kích thước đường kính trống (px hoặc chuỗi CSS, mặc định 1500px) */
  size?: number | string
  /** Neo cố định vị trí làm hình nền toàn trang */
  fixed?: boolean
  /** Chế độ mượt mà / Giảm tải GPU (tắt xoay đa tầng SVG để tránh giật lag máy) */
  perfMode?: boolean
}

/**
 * Thành phần Mặt Trống đồng Đông Sơn Ngọc Lũ tạo bản sắc văn hóa Việt Nam.
 */
export const DongSonDrum = memo(function DongSonDrum({
  className = '',
  opacity = 0.22,
  size = 1500,
  fixed = false,
  perfMode = false,
}: DongSonDrumProps) {
  const compId = useId()

  const { star, geo, people, deer, birds } = useMemo(() => {
    return {
      star: starLayer(),
      geo: geoLayer(),
      people: peopleLayer(),
      deer: deerLayer(),
      birds: birdLayer(),
    }
  }, [])

  const drumContent = (
    <div
      className={`drum select-none text-bronze pointer-events-none ${perfMode ? 'drum-static' : ''} ${className}`}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        opacity,
        contain: 'layout paint size',
        transform: 'translate3d(0, 0, 0)',
        willChange: perfMode ? 'auto' : 'transform',
      }}
      aria-hidden="true"
    >
      <svg
        key={`${compId}-star`}
        viewBox="-400 -400 800 800"
        className="ring l-star"
        dangerouslySetInnerHTML={{ __html: star }}
      />
      <svg
        key={`${compId}-geo`}
        viewBox="-400 -400 800 800"
        className="ring l-geo"
        dangerouslySetInnerHTML={{ __html: geo }}
      />
      <svg
        key={`${compId}-people`}
        viewBox="-400 -400 800 800"
        className="ring l-people"
        dangerouslySetInnerHTML={{ __html: people }}
      />
      <svg
        key={`${compId}-deer`}
        viewBox="-400 -400 800 800"
        className="ring l-deer"
        dangerouslySetInnerHTML={{ __html: deer }}
      />
      <svg
        key={`${compId}-birds`}
        viewBox="-400 -400 800 800"
        className="ring l-birds"
        dangerouslySetInnerHTML={{ __html: birds }}
      />
    </div>
  )

  if (fixed) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center"
        style={{ contain: 'strict' }}
      >
        <div className="translate-x-[15%] md:translate-x-[22%] translate-y-[5%]">
          {drumContent}
        </div>
      </div>
    )
  }

  return drumContent
})
