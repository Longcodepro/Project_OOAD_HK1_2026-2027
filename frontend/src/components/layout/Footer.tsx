import type { View } from '../../types'
import { Logo } from '../common/Logo'

interface FooterProps {
  setView?: (v: View) => void
}

export function Footer({ setView }: FooterProps) {
  return (
    <footer className="relative border-t border-white/10 bg-[#070b22]/90 backdrop-blur-xl text-white/70 py-12 px-5 lg:px-8 mt-20">
      <div className="mx-auto max-w-[1320px] grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        {/* Brand info */}
        <div className="space-y-4">
          <Logo />
          <p className="text-xs leading-relaxed text-white/50">
            Hệ thống đặt vé xe khách trực tuyến công nghệ cao. Trải nghiệm hành trình êm ái, tiện nghi và đúng giờ với đội xe hiện đại.
          </p>
          <div className="flex items-center gap-2 text-xs font-mono text-violet-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Hệ thống vận hành 24/7</span>
          </div>
        </div>

        {/* Quick links */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white tracking-wider uppercase">Tuyến đường phổ biến</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                type="button"
                onClick={() => setView?.('home')}
                className="hover:text-violet-300 transition"
              >
                TP. Hồ Chí Minh ↔ Đà Lạt
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setView?.('home')}
                className="hover:text-violet-300 transition"
              >
                TP. Hồ Chí Minh ↔ Nha Trang
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setView?.('home')}
                className="hover:text-violet-300 transition"
              >
                TP. Hồ Chí Minh ↔ Cần Thơ
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setView?.('home')}
                className="hover:text-violet-300 transition"
              >
                TP. Hồ Chí Minh ↔ Phan Thiết
              </button>
            </li>
          </ul>
        </div>

        {/* Policies */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white tracking-wider uppercase">Chính sách & Hỗ trợ</h4>
          <ul className="space-y-2 text-xs">
            <li><span className="hover:text-white cursor-pointer transition">Chính sách hoàn / đổi vé</span></li>
            <li><span className="hover:text-white cursor-pointer transition">Quy định hành lý & vận chuyển</span></li>
            <li><span className="hover:text-white cursor-pointer transition">Điều khoản sử dụng dịch vụ</span></li>
            <li><span className="hover:text-white cursor-pointer transition">Chính sách bảo mật thông tin</span></li>
          </ul>
        </div>

        {/* Contact & Hotline */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white tracking-wider uppercase">Tổng đài hỗ trợ</h4>
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-2">
            <p className="text-xs text-white/60">Hotline đặt vé & chăm sóc khách hàng:</p>
            <p className="font-mono text-xl font-bold text-violet-300">1900 6868</p>
            <p className="text-[11px] text-white/40">Email: hotro@violetline.vn</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1320px] border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
        <p>© 2026 VIOLETLINE Express. Dự án môn Phân tích Thiết kế Hướng đối tượng (OOAD).</p>
        <p className="font-mono text-[11px]">Designed with Premium Violet Theme</p>
      </div>
    </footer>
  )
}
