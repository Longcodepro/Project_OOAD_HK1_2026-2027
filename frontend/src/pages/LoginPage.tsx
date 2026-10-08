import { useState } from 'react'
import type { View, User } from '../types'
import { authApi } from '../services/api'
import { Logo } from '../components/common/Logo'
import { Button } from '../components/common/Button'

export interface LoginPageProps {
  setView: (v: View) => void
  onLoginSuccess: (user: User) => void
}

export function LoginPage({ setView, onLoginSuccess }: LoginPageProps) {
  const [authMode, setAuthMode] = useState<'password' | 'otp' | 'forgot'>('password')
  const [email, setEmail] = useState('minhanh.nguyen@gmail.com')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Đăng nhập bằng Email & Mật khẩu
  const handlePasswordLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ')
      return
    }
    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu')
      return
    }

    setLoading(true)
    setErrorMsg('')
    try {
      const cleanEmail = email.trim().toLowerCase()
      const res = await authApi.loginWithEmail(cleanEmail, password)
      if (res.success && res.user) {
        const isAdmin = cleanEmail.includes('admin')
        const userWithRole: User = {
          ...res.user,
          role: isAdmin ? 'admin' : 'customer',
        }
        onLoginSuccess(userWithRole)
        setView(isAdmin ? 'admin-dashboard' : 'profile')
      } else {
        setErrorMsg(res.message || 'Email hoặc mật khẩu không chính xác')
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  // Đăng nhập nhanh tài khoản Khách hàng
  const handleQuickCustomer = () => {
    const customerUser: User = {
      id: 'USR-01',
      fullName: 'Nguyễn Minh Anh',
      phone: '0901234567',
      email: 'minhanh.nguyen@gmail.com',
      role: 'customer',
      tier: 'Violet Explorer',
      points: 1250,
    }
    onLoginSuccess(customerUser)
    setView('profile')
  }

  // Đăng nhập nhanh tài khoản Quản trị viên (Admin)
  const handleQuickAdmin = () => {
    const adminUser: User = {
      id: 'ADM-01',
      fullName: 'Quản trị viên Tổng (Admin)',
      phone: '0909999888',
      email: 'admin@violetline.vn',
      role: 'admin',
      tier: 'Super Admin',
      points: 9999,
    }
    onLoginSuccess(adminUser)
    setView('admin-dashboard')
  }

  // Gửi OTP đăng nhập nhanh qua Email
  const handleSendLoginOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email nhận mã')
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await authApi.sendOtp(email.trim().toLowerCase())
      setOtpSent(true)
      setStatusMsg(res.message || `Mã OTP đã được gửi về hộp thư ${email}`)
    } catch {
      setErrorMsg('Không thể gửi mã OTP. Vui lòng kiểm tra lại.')
    } finally {
      setLoading(false)
    }
  }

  // Xác thực OTP đăng nhập
  const handleVerifyLoginOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!otp.trim()) {
      setErrorMsg('Vui lòng nhập mã OTP 6 số')
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await authApi.verifyOtp(email.trim().toLowerCase(), otp.trim())
      if (res.success && res.user) {
        onLoginSuccess(res.user)
        setView('profile')
      } else {
        setErrorMsg('Mã OTP không chính xác hoặc đã hết hạn')
      }
    } catch {
      setErrorMsg('Lỗi xác thực. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  // Gửi mã OTP khôi phục mật khẩu qua Email
  const handleSendForgotOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email đã đăng ký')
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await authApi.sendPasswordResetEmail(email.trim().toLowerCase())
      setOtpSent(true)
      setStatusMsg(res.message || `Mã xác nhận đặt lại mật khẩu đã gửi tới ${email}`)
    } catch {
      setErrorMsg('Không thể gửi email khôi phục. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  // Đổi mật khẩu mới qua Email
  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!otp.trim()) {
      setErrorMsg('Vui lòng nhập mã xác nhận từ email')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 6 ký tự')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Xác nhận mật khẩu mới không khớp')
      return
    }

    setLoading(true)
    setErrorMsg('')
    try {
      const res = await authApi.resetPassword(email.trim().toLowerCase(), otp.trim(), newPassword)
      if (res.success) {
        setStatusMsg(res.message || 'Đổi mật khẩu thành công!')
        setTimeout(() => {
          setAuthMode('password')
          setOtpSent(false)
          setOtp('')
          setPassword('')
          setStatusMsg('Mật khẩu mới đã được cập nhật. Vui lòng đăng nhập.')
        }, 1200)
      } else {
        setErrorMsg(res.message || 'Mã xác nhận không đúng hoặc đã hết hạn')
      }
    } catch {
      setErrorMsg('Lỗi khi cập nhật mật khẩu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page min-h-screen px-5 py-5">
      <button
        type="button"
        onClick={() => setView('home')}
        className="auth-back flex items-center gap-1.5 hover:text-white transition"
      >
        ← Quay về Violetline
      </button>

      <div className="auth-orbit one" />
      <div className="auth-orbit two" />

      <section className="auth-card relative overflow-hidden rounded-[32px] border border-white/12 lg:grid lg:grid-cols-[.9fr_1.1fr]">
        {/* Banner thông tin bên trái */}
        <div className="auth-aside p-8 lg:p-12">
          <Logo />
          <p className="eyebrow mt-16">TÀI KHOẢN VIOLETLINE</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-white">
            {authMode === 'forgot'
              ? 'Khôi phục mật khẩu tài khoản qua Email an toàn.'
              : 'Đăng nhập để mọi hành trình liền mạch hơn.'}
          </h1>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">
            {authMode === 'forgot'
              ? 'Hệ thống gửi mã xác nhận 6 chữ số trực tiếp về hòm thư của bạn để bảo vệ quyền riêng tư.'
              : 'Lưu hành khách, nhận vé điện tử trực tiếp qua Email và quản lý mọi chuyến đi dễ dàng.'}
          </p>
          <div className="mt-12 space-y-3.5 text-xs text-white/80">
            <p className="flex items-center gap-2">
              <span className="text-violet-300">✦</span> Nhận vé điện tử & hóa đơn gửi về Email
            </p>
            <p className="flex items-center gap-2">
              <span className="text-violet-300">✦</span> Tích điểm hội viên Violet Explorer
            </p>
            <p className="flex items-center gap-2">
              <span className="text-violet-300">✦</span> Bảo mật tài khoản với xác thực Email
            </p>
          </div>
        </div>

        {/* Khung tương tác bên phải (Clean Light Theme) */}
        <div className="bg-white p-7 sm:p-12 text-slate-900 border-l border-slate-100">
          {authMode !== 'forgot' ? (
            <>
              {/* Tab chuyển đổi Đăng nhập / Đăng ký */}
              <div className="flex border-b border-slate-200 pb-4 mb-6 gap-6">
                <button
                  type="button"
                  className="text-base font-bold text-orange-600 border-b-2 border-orange-500 pb-1"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => setView('register')}
                  className="text-base font-semibold text-slate-400 hover:text-slate-800 transition pb-1 cursor-pointer"
                >
                  Đăng ký tài khoản
                </button>
              </div>

              {/* Lựa chọn phương thức: Mật khẩu vs Mã OTP Email */}
              <div className="flex items-center gap-2 mb-5 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('password')
                    setErrorMsg('')
                    setStatusMsg('')
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition cursor-pointer ${authMode === 'password'
                      ? 'bg-white text-orange-600 border border-orange-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Email & Mật khẩu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('otp')
                    setErrorMsg('')
                    setStatusMsg('')
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition cursor-pointer ${authMode === 'otp'
                      ? 'bg-white text-orange-600 border border-orange-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Mã OTP qua Email
                </button>
              </div>

              {/* Form Đăng nhập Email & Mật khẩu */}
              {authMode === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      ĐỊA CHỈ EMAIL
                    </label>
                    <input
                      className="auth-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        MẬT KHẨU
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot')
                          setErrorMsg('')
                          setStatusMsg('')
                          setOtpSent(false)
                        }}
                        className="text-xs font-semibold text-orange-600 hover:underline cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <input
                      className="auth-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu của bạn"
                      required
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-medium">
                      {errorMsg}
                    </p>
                  )}
                  {statusMsg && (
                    <p className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-medium">
                      {statusMsg}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="mt-6 w-full"
                  >
                    {loading ? 'Đang xác thực...' : 'Đăng nhập ngay'} →
                  </Button>
                </form>
              )}

              {/* Form Đăng nhập bằng mã OTP qua Email */}
              {authMode === 'otp' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      ĐỊA CHỈ EMAIL NHẬN MÃ OTP
                    </label>
                    <input
                      className="auth-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Nhập email của bạn"
                      required
                    />
                  </div>

                  {otpSent && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        MÃ XÁC THỰC OTP (Mã mẫu: 123456)
                      </label>
                      <input
                        className="auth-input font-mono text-center tracking-widest text-lg font-bold"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="• • • • • •"
                        maxLength={6}
                      />
                    </div>
                  )}

                  {errorMsg && (
                    <p className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-medium">
                      {errorMsg}
                    </p>
                  )}
                  {statusMsg && (
                    <p className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-medium">
                      {statusMsg}
                    </p>
                  )}

                  <Button
                    onClick={otpSent ? handleVerifyLoginOtp : handleSendLoginOtp}
                    disabled={loading}
                    className="mt-6 w-full"
                  >
                    {loading
                      ? 'Đang xử lý...'
                      : otpSent
                        ? 'Xác thực & đăng nhập'
                        : 'Gửi mã OTP về Email'} →
                  </Button>
                </div>
              )}

              <div className="my-6 flex items-center gap-3 text-xs font-semibold text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                HOẶC TIẾP TỤC VỚI
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={() => setView('google-signup')}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
              >
                <span className="text-base">🌐</span> Đăng nhập nhanh với Google
              </button>

              <p className="mt-6 text-center text-xs text-slate-500 font-medium">
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => setView('register')}
                  className="text-orange-600 font-bold hover:underline cursor-pointer"
                >
                  Đăng ký ngay
                </button>
              </p>

              {/* Gợi ý tài khoản kiểm thử */}
              <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-500 text-center space-y-1 bg-slate-50 p-3 rounded-2xl">
                <p className="font-bold text-slate-700">Tài khoản kiểm thử:</p>
                <p>Khách hàng: <span className="font-mono font-semibold text-orange-600">minhanh.nguyen@gmail.com</span> (mật khẩu: 123456)</p>
                <p>Quản trị viên: <span className="font-mono font-semibold text-amber-700">admin@violetline.vn</span> (mật khẩu: 123456)</p>
              </div>
            </>
          ) : (
            /* Chế độ Quên / Đặt lại mật khẩu qua Email */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900">
                  Khôi phục mật khẩu qua Email
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('password')
                    setErrorMsg('')
                    setStatusMsg('')
                  }}
                  className="text-xs font-semibold text-orange-600 hover:underline cursor-pointer"
                >
                  ← Quay lại
                </button>
              </div>

              <p className="text-xs leading-relaxed text-slate-600 font-medium">
                Nhập email của bạn để nhận mã xác nhận đặt lại mật khẩu mới.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ĐỊA CHỈ EMAIL
                </label>
                <div className="flex gap-2">
                  <input
                    className="auth-input flex-1"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                  <Button
                    type="button"
                    onClick={handleSendForgotOtp}
                    disabled={loading}
                    kind="ghost"
                    className="whitespace-nowrap text-xs px-3"
                  >
                    {otpSent ? 'Gửi lại mã' : 'Lấy mã OTP'}
                  </Button>
                </div>
              </div>

              {otpSent && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      MÃ XÁC THỰC TỪ EMAIL (Mã mẫu: 654321)
                    </label>
                    <input
                      className="auth-input font-mono text-center tracking-widest text-lg font-bold"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="• • • • • •"
                      maxLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      MẬT KHẨU MỚI
                    </label>
                    <input
                      className="auth-input"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      XÁC NHẬN MẬT KHẨU MỚI
                    </label>
                    <input
                      className="auth-input"
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </div>
                </div>
              )}

              {errorMsg && (
                <p className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-medium">
                  {errorMsg}
                </p>
              )}
              {statusMsg && (
                <p className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-medium">
                  {statusMsg}
                </p>
              )}

              {otpSent ? (
                <Button
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="mt-4 w-full"
                >
                  {loading ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'} →
                </Button>
              ) : (
                <p className="text-xs text-slate-500 text-center pt-2 font-medium">
                  Bấm "Lấy mã OTP" để hệ thống gửi mã xác minh về email.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
