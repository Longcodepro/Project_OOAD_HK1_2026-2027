import type { View } from '../../types'
import { Logo } from '../common/Logo'

interface FooterProps {
  setView?: (v: View) => void
}

export function Footer({ setView }: FooterProps) {
  return (
    <footer className="relative border-t border-white/10 bg-[#090e26] text-slate-200 py-12 px-5 lg:px-8 mt-20">
      <div className="mx-auto max-w-[1320px] grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        {/* Brand info */}
        <div className="space-y-4">
          <Logo />
          <p className="text-xs leading-relaxed text-slate-300">
            Hệ thống đặt vé xe khách trực tuyến công nghệ cao. Trải nghiệm hành trình êm ái, tiện nghi và đúng giờ với đội xe hiện đại.
          </p>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span className="text-slate-300">Hệ thống vận hành 24/7</span>
          </div>
        </div>

        {/* Quick links */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white tracking-wider uppercase">Tuyến đường phổ biến</h4>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li>
              <button
                type="button"
                onClick={() => setView?.('home')}
                className="hover:text-white transition text-left"
              >
                TP. Hồ Chí Minh ↔ Đà Lạt
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setView?.('home')}
                className="hover:text-white transition text-left"
              >
                TP. Hồ Chí Minh ↔ Nha Trang
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setView?.('home')}
                className="hover:text-white transition text-left"
              >
                TP. Hồ Chí Minh ↔ Cần Thơ
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setView?.('home')}
                className="hover:text-white transition text-left"
              >
                TP. Hồ Chí Minh ↔ Phan Thiết
              </button>
            </li>
          </ul>
        </div>

        {/* Policies */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white tracking-wider uppercase">Chính sách & Hỗ trợ</h4>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li><span className="hover:text-white cursor-pointer transition">Chính sách hoàn / đổi vé</span></li>
            <li><span className="hover:text-white cursor-pointer transition">Quy định hành lý & vận chuyển</span></li>
            <li><span className="hover:text-white cursor-pointer transition">Điều khoản sử dụng dịch vụ</span></li>
            <li><span className="hover:text-white cursor-pointer transition">Chính sách bảo mật thông tin</span></li>
          </ul>
        </div>

        {/* Contact & Hotline */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white tracking-wider uppercase">Tổng đài hỗ trợ</h4>
          <div className="hotline-card rounded-2xl border border-white/15 bg-white/5 p-4 space-y-2">
            <p className="text-xs text-slate-300">Hotline đặt vé & chăm sóc khách hàng:</p>
            <p className="hotline-num font-mono text-2xl font-bold text-amber-400">1900 6868</p>
            <p className="hotline-email text-xs text-slate-400">Email: hotro@violetline.vn</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1320px] border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs footer-copyright">
        <p className="text-slate-400">© 2026 VIOLETLINE Express. Dự án môn Phân tích Thiết kế Hướng đối tượng (OOAD).</p>
        <div className="flex items-center gap-4 text-slate-400 font-mono text-xs">
          <span>Tiện nghi & Đúng giờ</span>
          {setView && (
            <button
              type="button"
              onClick={() => setView('scan')}
              className="text-[11px] text-slate-500 hover:text-slate-300 underline transition"
              title="Cổng soát vé dành riêng cho phụ xe / kiểm soát viên"
            >
              [Crew Portal]
            </button>
          )}
        </div>
      </div>
    </footer>
  )
}
