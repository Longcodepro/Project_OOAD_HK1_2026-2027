import { useState } from 'react'
import type { View, User } from '../types'
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

  const handleGoogleAuth = () => {
    onLoginSuccess({
      id: 'USR-G',
      fullName: 'Nguyễn Minh Anh',
      phone: '090 123 4567',
      email,
      tier: 'Violet Explorer',
      points: 1500,
    })
    setView('profile')
  }

  return (
    <main className="auth-page min-h-screen px-5 py-5">
      <button
        type="button"
        onClick={() => setView('login')}
        className="auth-back"
      >
        ← Quay lại đăng nhập
      </button>
      <section className="google-card relative overflow-hidden rounded-[28px] p-8 sm:p-10">
        <div className="google-g big">G</div>
        <p className="eyebrow mt-6">GOOGLE / VIOLETLINE</p>
        <h1 className="mt-3 text-3xl font-semibold">
          Tạo tài khoản trong một chạm.
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          Thông tin Google sẽ dùng để tạo hồ sơ Violetline và gửi vé điện tử đến
          bạn.
        </p>
        <div className="mt-7 rounded-2xl border border-white/10 bg-white/[.05] p-4">
          <p className="text-xs text-white/45">TÀI KHOẢN GOOGLE</p>
          <input
            className="auth-input mt-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mt-4 rounded-2xl border border-violet-300/20 bg-violet-300/10 p-4 text-sm text-violet-100">
          <b>Thông tin sẽ được chia sẻ</b>
          <p className="mt-1 text-violet-100/65">
            Tên, email và ảnh đại diện để tạo tài khoản.
          </p>
        </div>
        <Button onClick={handleGoogleAuth} className="mt-7 w-full">
          Tiếp tục với Google →
        </Button>
        <p className="mt-5 text-center text-xs text-white/40">
          Bạn có thể thay đổi thông tin trong Hồ sơ sau khi hoàn tất.
        </p>
      </section>
    </main>
  )
}
