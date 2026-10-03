import { useState, useEffect } from 'react'
import type { View, User } from '../types'
import { authApi } from '../services/api'
import { Button } from '../components/common/Button'

export interface GoogleSignupPageProps {
  setView: (v: View) => void
  onLoginSuccess: (user: User) => void
}

export function GoogleSignupPage({
  setView,
  onLoginSuccess,
}: GoogleSignupPageProps) {
  const [email, setEmail] = useState('minhanh.nguyen@gmail.com')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Đếm ngược thời gian gửi lại mã OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Gửi mã OTP xác thực về Gmail
  const handleSendGmailOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ Gmail hợp lệ')
      return
    }

    setLoading(true)
    setErrorMsg('')
    try {
      const cleanEmail = email.trim().toLowerCase()
      const res = await authApi.sendOtp(cleanEmail)
      setOtpSent(true)
      setCountdown(60)
      setStatusMsg(
        res.message || `Mã OTP xác thực 6 chữ số đã được gửi về Gmail: ${cleanEmail}. Mã kiểm thử: 123456`,
      )
    } catch {
      setErrorMsg('Lỗi gửi mã OTP về Gmail. Vui lòng kiểm tra lại kết nối.')
    } finally {
      setLoading(false)
    }
  }

  // Xác thực mã OTP và Đăng nhập
  const handleVerifyGmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!otp.trim()) {
      setErrorMsg('Vui lòng nhập mã OTP 6 chữ số')
      return
    }

    setLoading(true)
    setErrorMsg('')
    try {
      const cleanEmail = email.trim().toLowerCase()
      const res = await authApi.verifyOtp(cleanEmail, otp.trim())
      if (res.success && res.user) {
        const isAdmin = cleanEmail.includes('admin')
        const verifiedUser: User = {
          ...res.user,
          email: cleanEmail,
          role: isAdmin ? 'admin' : 'customer',
        }
        onLoginSuccess(verifiedUser)
        setView(isAdmin ? 'admin-dashboard' : 'profile')
      } else {
        setErrorMsg('Mã xác thực OTP không chính xác hoặc đã hết hạn.')
      }
    } catch {
      setErrorMsg('Lỗi xác thực mã OTP. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page min-h-screen px-5 py-8 flex flex-col items-center justify-center">
      <button
        type="button"
        onClick={() => setView('login')}
        className="auth-back flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-4 cursor-pointer"
      >
        ← Quay lại trang đăng nhập
      </button>

      <section className="google-card relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 sm:p-10 shadow-2xl max-w-md w-full text-slate-900">
        <div className="flex items-center gap-3">
          <div className="google-g big shadow-sm">G</div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 block">
              GMAIL AUTHENTICATION
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              Đăng nhập bằng Gmail & OTP
            </h1>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-600 font-medium">
          Hệ thống sẽ gửi mã OTP xác nhận trực tiếp về hòm thư Gmail của bạn để đảm bảo an toàn và bảo mật tài khoản.
        </p>

        {/* Form tương tác */}
        <form onSubmit={otpSent ? handleVerifyGmailOtp : (e) => { e.preventDefault(); handleSendGmailOtp(); }} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              ĐỊA CHỈ GMAIL CỦA BẠN <span className="text-rose-600">*</span>
            </label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tenban@gmail.com"
              disabled={otpSent && countdown > 0}
              required
            />
          </div>

          {/* Ô nhập mã OTP sau khi đã gửi */}
          {otpSent && (
            <div className="animate-fadeIn space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  MÃ XÁC THỰC OTP (6 CHỮ SỐ) <span className="text-rose-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setOtp('123456')}
                  className="text-[11px] font-semibold text-orange-600 hover:underline cursor-pointer"
                >
                  ⚡ Điền nhanh 123456
                </button>
              </div>
              <input
                className="auth-input font-mono text-center tracking-widest text-xl font-bold text-slate-900"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="• • • • • •"
                maxLength={6}
                autoFocus
                required
              />
            </div>
          )}

          {/* Thông báo lỗi hoặc thành công */}
          {errorMsg && (
            <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium animate-fadeIn">
              ⚠ {errorMsg}
            </p>
          )}
          {statusMsg && (
            <div className="text-xs text-emerald-900 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-medium animate-fadeIn space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span>✓</span> {statusMsg}
              </p>
              <p className="text-[11px] text-emerald-700">
                Vui lòng kiểm tra hộp thư đến hoặc thư mục Spam/Quảng cáo.
              </p>
            </div>
          )}

          {/* Nút hành động chính */}
          {!otpSent ? (
            <Button
              type="button"
              onClick={handleSendGmailOtp}
              disabled={loading}
              className="w-full mt-2 cursor-pointer shadow-sm"
            >
              {loading ? 'Đang gửi mã...' : 'Gửi mã OTP về Gmail'} →
            </Button>
          ) : (
            <div className="space-y-3 pt-1">
              <Button
                type="submit"
                disabled={loading}
                className="w-full cursor-pointer shadow-sm bg-orange-600 hover:bg-orange-500 text-white font-bold"
              >
                {loading ? 'Đang xác thực...' : 'Xác nhận OTP & Đăng nhập'} →
              </Button>

              <div className="text-center">
                {countdown > 0 ? (
                  <span className="text-xs text-slate-400 font-medium">
                    Gửi lại mã mới sau <b className="text-slate-700">{countdown}s</b>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendGmailOtp}
                    disabled={loading}
                    className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
                  >
                    🔄 Gửi lại mã OTP mới
                  </button>
                )}
              </div>
            </div>
          )}
        </form>

        {/* Thông tin chính sách bảo mật */}
        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-500 font-medium space-y-1">
          <p className="font-bold text-slate-700">🔒 Quyền riêng tư & Bảo mật:</p>
          <p>Mã OTP được tạo tự động và có hiệu lực trong vòng 5 phút để bảo vệ tài khoản của bạn.</p>
        </div>
      </section>
    </main>
  )
}
