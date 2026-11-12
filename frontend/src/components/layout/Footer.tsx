import { useEffect, useState } from 'react'
import type { RouteOffer, View } from '../../types'
import { routesApi } from '../../services/api'
import { Logo } from '../common/Logo'

interface FooterProps {
  setView?: (v: View) => void
}

export function Footer({ setView }: FooterProps) {
  // Tuyến thật đang mở bán; lỗi tải thì ẩn mục này thay vì hiện số liệu giả
  const [routes, setRoutes] = useState<RouteOffer[]>([])
  useEffect(() => {
    routesApi
      .offers()
      .then((r) => setRoutes(r.slice(0, 4)))
      .catch(() => setRoutes([]))
  }, [])

  return (
    <footer className="relative border-t border-hairline bg-paper-deep/70 text-ink mt-20">
      {/* DẢI HỌA TIẾT MÂY XOẮN ĐÔNG SƠN THUẦN HÌNH (SVG) */}
      <div className="w-full h-8 border-b border-hairline flex items-center justify-center overflow-hidden bg-paper/60 text-bronze opacity-70">
        <svg
          viewBox="0 0 1200 24"
          width="100%"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="w-full h-full"
          aria-hidden="true"
        >
          <path d="M0,12 Q30,0 60,12 T120,12 T180,12 T240,12 T300,12 T360,12 T420,12 T480,12 T540,12 T600,12 T660,12 T720,12 T780,12 T840,12 T900,12 T960,12 T1020,12 T1080,12 T1140,12 T1200,12" />
          <circle cx="60" cy="12" r="2" fill="currentColor" />
          <circle cx="180" cy="12" r="2" fill="currentColor" />
          <circle cx="300" cy="12" r="2" fill="currentColor" />
          <circle cx="420" cy="12" r="2" fill="currentColor" />
          <circle cx="540" cy="12" r="2" fill="currentColor" />
          <circle cx="660" cy="12" r="2" fill="currentColor" />
          <circle cx="780" cy="12" r="2" fill="currentColor" />
          <circle cx="900" cy="12" r="2" fill="currentColor" />
          <circle cx="1020" cy="12" r="2" fill="currentColor" />
          <circle cx="1140" cy="12" r="2" fill="currentColor" />
        </svg>
      </div>

      <div className="max-w-[1080px] mx-auto px-4 md:px-6 py-12 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {/* Brand info */}
        <div className="space-y-4">
          <Logo size="md" />
          <p className="text-xs leading-relaxed text-ink-soft">
            Hệ thống đặt vé xe khách liên tỉnh trực tuyến. Mang hồn di sản Đông Sơn vào từng hành trình: chọn tuyến, chọn đúng ghế và quản lý vé của bạn ngay trên một trang.
          </p>
        </div>

        {/* Tuyến đang mở bán (dữ liệu thật) */}
        {routes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-ink tracking-widest uppercase">Tuyến đang mở bán</h4>
            <ul className="space-y-2 text-xs text-ink-soft">
              {routes.map((r) => (
                <li key={`${r.origin}-${r.destination}`}>
                  <button type="button" onClick={() => setView?.('home')} className="hover:text-terracotta transition text-left cursor-pointer">
                    {r.origin} → {r.destination}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tài khoản */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-ink tracking-widest uppercase">Dành cho khách hàng</h4>
          <ul className="space-y-2 text-xs text-ink-soft">
            <li><button type="button" onClick={() => setView?.('lookup')} className="hover:text-terracotta transition cursor-pointer">Tra cứu vé của tôi</button></li>
            <li><button type="button" onClick={() => setView?.('profile')} className="hover:text-terracotta transition cursor-pointer">Hành trình của tôi</button></li>
            <li><button type="button" onClick={() => setView?.('login')} className="hover:text-terracotta transition cursor-pointer">Đăng nhập</button></li>
          </ul>
        </div>
      </div>

      <div className="max-w-[1080px] mx-auto px-4 md:px-6 border-t border-hairline py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-soft">
        <p>© 2026 VéXe Việt. Đồ án Phân tích Thiết kế Hướng đối tượng (OOAD).</p>
        <div className="flex items-center gap-3 font-semibold text-bronze">
          <span>Khởi hành trọn vẹn · Kết nối non sông</span>
        </div>
      </div>
    </footer>
  )
}
