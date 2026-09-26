import { useState } from 'react'
import type { View, User } from '../types'
import { authApi } from '../services/api'
import { Logo } from '../components/common/Logo'
import { Button } from '../components/common/Button'

export interface RegisterPageProps {
  setView: (v: View) => void
  onRegisterSuccess: (user: User) => void
}

export function RegisterPage({ setView, onRegisterSuccess }: RegisterPageProps) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên của bạn')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Vui lòng nhập email hợp lệ để nhận vé và quản lý tài khoản')
      return
    }
    if (!phone.trim()) {
      setErrorMsg('Vui lòng nhập số điện thoại để nhà xe liên hệ khi đón')
      return
    }
    if (!password || password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }
    if (password !== confirmPassword) {
      setErrorMsg('Xác nhận mật khẩu không khớp')
      return
    }

    setLoading(true)
    setErrorMsg('')
    try {
      const res = await authApi.register({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
      })
      if (res.success && res.user) {
        onRegisterSuccess(res.user)
        setView('home')
      } else {
        setErrorMsg('Không thể đăng ký tài khoản. Vui lòng thử lại.')
      }
    } catch {
      setErrorMsg('Lỗi kết nối. Vui lòng thử lại sau.')
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
        {/* Banner bên trái */}
        <div className="auth-aside p-8 lg:p-12">
          <Logo />
          <p className="eyebrow mt-16">THÀNH VIÊN VIOLETLINE</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-white">
            Đăng ký tài khoản để nhận đặc quyền du lịch.
          </h1>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">
            Tích điểm trên mọi dặm đường, nhận vé điện tử trực tiếp qua email và quản lý hành trình linh hoạt 24/7.
          </p>

          <div className="mt-12 space-y-3.5 text-xs text-white/80">
            <p className="flex items-center gap-2">
              <span className="text-violet-300">✦</span> Tặng ngay 100 điểm thưởng chào mừng
            </p>
            <p className="flex items-center gap-2">
              <span className="text-violet-300">✦</span> Quản lý & lưu danh sách vé trọn đời qua Email
            </p>
            <p className="flex items-center gap-2">
              <span className="text-violet-300">✦</span> Bảo mật tài khoản & hỗ trợ 24/7
            </p>
          </div>
        </div>

        {/* Form đăng ký bên phải */}
        <div className="bg-[#101638]/90 p-7 sm:p-12">
          {/* Tab chuyển đổi Đăng nhập / Đăng ký */}
          <div className="flex border-b border-white/10 pb-4 mb-6 gap-6">
            <button
              type="button"
              onClick={() => setView('login')}
              className="text-base font-semibold text-white/50 hover:text-white transition pb-1"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className="text-base font-semibold text-violet-300 border-b-2 border-violet-400 pb-1"
            >
              Đăng ký tài khoản
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs text-white/60 mb-1">
                HỌ VÀ TÊN <span className="text-rose-400">*</span>
              </label>
              <input
                className="auth-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">
                ĐỊA CHỈ EMAIL <span className="text-rose-400">*</span>{' '}
                <span className="text-[11px] text-violet-300">(Dùng đăng nhập & nhận vé)</span>
              </label>
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tenban@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">
                SỐ ĐIỆN THOẠI <span className="text-rose-400">*</span>{' '}
                <span className="text-[11px] text-white/40">(Tài xế liên hệ khi đón)</span>
              </label>
              <input
                className="auth-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901234567"
                inputMode="tel"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">
                  MẬT KHẨU <span className="text-rose-400">*</span>
                </label>
                <input
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1">
                  XÁC NHẬN MẬT KHẨU <span className="text-rose-400">*</span>
                </label>
                <input
                  className="auth-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  required
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-300 bg-rose-400/10 p-2.5 rounded-xl border border-rose-400/20">
                {errorMsg}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-4 w-full"
            >
              {loading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'} →
            </Button>
          </form>


          <div className="my-6 flex items-center gap-3 text-[10px] text-white/35">
            <span className="h-px flex-1 bg-white/10" />
            HOẶC ĐĂNG KÝ VỚI
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={() => setView('google-signup')}
            className="google-button"
          >
            <span className="google-g">G</span> Đăng ký nhanh với Google
          </button>

          <p className="mt-6 text-center text-xs text-white/50">
            Đã có tài khoản?{' '}
            <button
              type="button"
              onClick={() => setView('login')}
              className="text-violet-300 font-semibold hover:underline"
            >
              Đăng nhập tại đây
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
