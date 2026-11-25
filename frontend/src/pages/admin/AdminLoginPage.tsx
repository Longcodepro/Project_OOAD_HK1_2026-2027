/**
 * @file AdminLoginPage.tsx
 * @description Màn hình Đăng nhập Dành riêng cho Cổng Quản trị & Nhân viên bán vé (#/admin).
 *
 * ĐẶC TÍNH BẢO MẬT:
 * 1. Đăng nhập vào cổng `admin` thông qua `authApi.login('admin', phone, password)`:
 *    - Xác thực vai trò: Backend chỉ chấp thuận các tài khoản có vai trò 'ADMIN' hoặc 'NHAN_VIEN_BAN_VE'.
 *    - Tài khoản khách hàng thường nếu cố tình đăng nhập tại đây sẽ bị từ chối và thu hồi token ngay lập tức.
 * 2. Lưu trữ phiên độc lập (`vexe_admin_token`):
 *    - Không gây ảnh hưởng hay ghi đè lên phiên đặt vé khách hàng (`vexe_token`).
 * 3. Phân luồng điều hướng sau đăng nhập:
 *    - Nhân viên bán vé ('clerk'): Chuyển thẳng vào màn hình Quầy bán vé POS (`admin-counter`).
 *    - Quản trị viên ('admin'): Chuyển vào Bảng điều khiển trung tâm (`admin-dashboard`).
 */

import { useState, type FormEvent } from 'react'
import type { User } from '../../types'
import { authApi, apiErrorMessage } from '../../services/api'
import { Logo } from '../../components/common/Logo'
import { DongSonDrum } from '../../components/dongson/DongSonDrum'

export interface AdminLoginPageProps {
  onLoginSuccess: (user: User) => void
  onBack: () => void
}

export function AdminLoginPage({ onLoginSuccess, onBack }: AdminLoginPageProps) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!phone.trim() || !password) {
      setError('Vui lòng nhập tên đăng nhập / số điện thoại và mật khẩu')
      return
    }
    setLoading(true)
    setError('')
    try {
      onLoginSuccess(await authApi.login('admin', phone, password))
    } catch (err) {
      setError(apiErrorMessage(err, 'Không đăng nhập được, vui lòng thử lại'))
      setLoading(false)
    }
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 text-paper"
      style={{ background: 'radial-gradient(circle at 50% 30%, #2B241D, #14110E 70%)' }}
    >
      <div className="pointer-events-none absolute -right-60 -top-60">
        <DongSonDrum size={760} opacity={0.08} />
      </div>

      <button
        type="button"
        onClick={onBack}
        className="absolute left-6 top-6 z-10 cursor-pointer text-[13px] text-paper/60 transition hover:text-paper"
      >
        ← Về trang đặt vé
      </button>

      <div
        className="relative z-10 w-full max-w-md rounded-md border border-bronze bg-card p-8 text-ink"
        style={{ boxShadow: '0 0 0 4px var(--card), 0 0 0 5px var(--bronze), 0 24px 60px rgba(0,0,0,.5)' }}
      >
        <Logo size="md" />
        <span className="eyebrow mt-6 block text-bronze">Nội bộ</span>
        <h1 className="mt-1 text-2xl font-bold">Cổng quản trị VéXe Việt</h1>
        <p className="mt-1.5 text-[13px] text-ink-soft">
          Dành cho quản trị viên và nhân viên bán vé. Khách hàng đăng nhập tại trang đặt vé.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="admin-phone" className="field-label">Tên đăng nhập hoặc Số điện thoại</label>
            <input
              id="admin-phone"
              type="text"
              autoComplete="username"
              placeholder="admin, nv_miendong hoặc 0903123456"
              className="w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="field-label">Mật khẩu</label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="w-full pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-2 top-1/2 flex -translate-y-1/2 cursor-pointer items-center p-1 text-ink-soft hover:text-ink"
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded border border-terracotta/40 bg-terracotta/10 px-3 py-2 text-[13px] font-semibold text-terracotta">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </main>
  )
}
