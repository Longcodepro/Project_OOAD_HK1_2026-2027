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
  const [phone, setPhone] = useState('0901234567')
  const [otp, setOtp] = useState('')
  const [sent, setSent] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const handleSendOtp = async () => {
    if (!phone) return
    const res = await authApi.sendOtp(phone)
    setSent(true)
    setStatusMsg(res.message || 'Đã gửi mã xác thực')
  }

  const handleVerify = async () => {
    const res = await authApi.verifyOtp(phone, otp || '123456')
    if (res.success && res.user) {
      onLoginSuccess(res.user)
      setView('profile')
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
        <div className="auth-aside p-8 lg:p-12">
          <Logo />
          <p className="eyebrow mt-16">VIOLETLINE ACCOUNT</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-white">
            Đăng nhập để mọi hành trình liền mạch hơn.
          </h1>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">
            Lưu hành khách, nhận vé điện tử và quản lý mọi đặt chỗ ở một nơi.
          </p>
          <div className="mt-12 space-y-3.5 text-xs text-white/80">
            <p className="flex items-center gap-2">
              <span className="text-violet-300">✦</span> Vé và hóa đơn luôn sẵn sàng
            </p>
            <p className="flex items-center gap-2">
              <span className="text-violet-300">✦</span> Tích điểm với hội viên Violet Pass
            </p>
            <p className="flex items-center gap-2">
              <span className="text-violet-300">✦</span> Hỗ trợ chuyến đi 24/7
            </p>
          </div>
        </div>

        <div className="bg-[#101638]/90 p-7 sm:p-12">
          {/* Tab chuyển đổi Đăng nhập / Đăng ký */}
          <div className="flex border-b border-white/10 pb-4 mb-6 gap-6">
            <button
              type="button"
              className="text-base font-semibold text-violet-300 border-b-2 border-violet-400 pb-1"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => setView('register')}
              className="text-base font-semibold text-white/50 hover:text-white transition pb-1"
            >
              Đăng ký tài khoản
            </button>
          </div>

          <p className="text-sm text-white/60 mb-5">
            Dùng số điện thoại để nhận mã xác thực đăng nhập nhanh.
          </p>

          <label className="block text-xs text-white/60 mb-1.5">
            SỐ ĐIỆN THOẠI
            <input
              className="auth-input mt-1.5"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại của bạn"
              inputMode="tel"
            />
          </label>

          {sent && (
            <label className="mt-4 block text-xs text-white/60">
              MÃ OTP (Thử nghiệm: 123456)
              <input
                className="auth-input mt-1.5"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="• • • • • •"
                maxLength={6}
              />
            </label>
          )}

          {statusMsg && (
            <p className="mt-2 text-xs text-violet-300 bg-violet-400/10 p-2.5 rounded-xl border border-violet-400/20">
              {statusMsg}
            </p>
          )}

          <Button
            onClick={sent ? handleVerify : handleSendOtp}
            className="mt-6 w-full"
          >
            {sent ? 'Xác thực & đăng nhập' : 'Nhận mã OTP'} →
          </Button>

          <div className="my-6 flex items-center gap-3 text-[10px] text-white/35">
            <span className="h-px flex-1 bg-white/10" />
            HOẶC TIẾP TỤC VỚI
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={() => setView('google-signup')}
            className="google-button"
          >
            <span className="google-g">G</span> Đăng nhập nhanh với Google
          </button>
          <button type="button" className="google-button mt-3">
            <span className="text-lg text-[#4fc3f7]">Z</span> Tiếp tục với Zalo
          </button>

          <p className="mt-6 text-center text-xs text-white/50">
            Chưa có tài khoản?{' '}
            <button
              type="button"
              onClick={() => setView('register')}
              className="text-violet-300 font-semibold hover:underline"
            >
              Đăng ký ngay
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}
