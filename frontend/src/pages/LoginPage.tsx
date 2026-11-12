import { useState, type FormEvent } from 'react'
import type { View, User } from '../types'
import { authApi, apiErrorMessage, cleanPhone, type OtpTicket } from '../services/api'
import { AuthShell, FormNote, PasswordInput } from '../components/auth/AuthShell'

export interface LoginPageProps {
  setView: (v: View) => void
  onLoginSuccess: (user: User) => void
}

const PHONE_RE = /^0\d{9,10}$/
const PHONE_HINT = 'Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0'

type Mode = 'login' | 'forgot-phone' | 'forgot-reset'

export function LoginPage({ setView, onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<Mode>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [otpInfo, setOtpInfo] = useState<OtpTicket | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  const go = (next: Mode) => {
    setMode(next)
    setError('')
    setNotice('')
  }

  const run = async (fn: () => Promise<void>) => {
    setError('')
    setNotice('')
    setLoading(true)
    try {
      await fn()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const validPhone = () => {
    if (PHONE_RE.test(cleanPhone(phone))) return true
    setError(PHONE_HINT)
    return false
  }

  const handleLogin = (e: FormEvent) => {
    e.preventDefault()
    if (!validPhone()) return
    run(async () => onLoginSuccess(await authApi.login('customer', phone, password)))
  }

  const handleRequestOtp = (e: FormEvent) => {
    e.preventDefault()
    if (!validPhone()) return
    run(async () => {
      setOtpInfo(await authApi.requestResetOtp(phone))
      go('forgot-reset')
      setNotice(`Nếu số ${cleanPhone(phone)} đã có tài khoản, mã OTP đã được gửi tới số này.`)
    })
  }

  const handleReset = (e: FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) return setError('Mật khẩu mới phải có ít nhất 8 ký tự')
    if (newPassword !== confirm) return setError('Mật khẩu xác nhận không khớp')
    run(async () => {
      await authApi.resetPassword(phone, otp.trim(), newPassword)
      setPassword('')
      setOtp('')
      setNewPassword('')
      setConfirm('')
      go('login')
      setNotice('Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.')
    })
  }

  const forgot = mode !== 'login'

  return (
    <AuthShell
      tab={forgot ? undefined : 'login'}
      setView={setView}
      heading={forgot ? 'Khôi phục mật khẩu bằng mã OTP.' : 'Đăng nhập để mọi hành trình liền mạch hơn.'}
      blurb={
        forgot
          ? 'Mã OTP 6 chữ số được gửi tới số điện thoại đã đăng ký tài khoản.'
          : 'Xem lịch sử vé, hủy vé và đặt chuyến mới chỉ với số điện thoại và mật khẩu.'
      }
    >
      {mode === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          <div>
            <label className="field-label" htmlFor="login-phone">
              Số điện thoại
            </label>
            <input
              id="login-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912345678"
              className="w-full"
              disabled={loading}
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="field-label" htmlFor="login-password">
                Mật khẩu
              </label>
              <button
                type="button"
                onClick={() => go('forgot-phone')}
                className="text-xs font-semibold text-terracotta hover:underline mb-1.5 cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={setPassword}
              placeholder="Nhập mật khẩu của bạn"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && <FormNote kind="error">{error}</FormNote>}
          {notice && <FormNote kind="ok">{notice}</FormNote>}

          <button type="submit" disabled={loading} className="cta-terracotta w-full h-11 text-sm font-bold text-paper rounded cursor-pointer">
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập →'}
          </button>

          <p className="pt-2 text-center text-xs text-ink-soft">
            Chưa có tài khoản?{' '}
            <button type="button" onClick={() => setView('register')} className="font-bold text-terracotta hover:underline cursor-pointer">
              Đăng ký ngay
            </button>
          </p>
        </form>
      )}

      {mode === 'forgot-phone' && (
        <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
          <div>
            <label className="field-label" htmlFor="forgot-phone">
              Số điện thoại đã đăng ký
            </label>
            <input
              id="forgot-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912345678"
              className="w-full"
              disabled={loading}
              required
            />
          </div>
          {error && <FormNote kind="error">{error}</FormNote>}
          <button type="submit" disabled={loading} className="cta-terracotta w-full h-11 text-sm font-bold text-paper rounded cursor-pointer">
            {loading ? 'Đang gửi…' : 'Gửi mã OTP'}
          </button>
          <button type="button" onClick={() => go('login')} className="block mx-auto text-xs font-semibold text-ink-soft hover:text-ink cursor-pointer">
            ← Quay lại đăng nhập
          </button>
        </form>
      )}

      {mode === 'forgot-reset' && (
        <form onSubmit={handleReset} className="space-y-4" noValidate>
          {notice && <FormNote kind="info">{notice}</FormNote>}
          {otpInfo?.testCode && (
            <FormNote kind="info">
              Máy chủ đang ở chế độ SMS thử nghiệm, mã OTP của bạn là <b className="font-mono">{otpInfo.testCode}</b>.
            </FormNote>
          )}
          <div>
            <label className="field-label" htmlFor="reset-otp">
              Mã OTP (6 chữ số)
            </label>
            <input
              id="reset-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full font-mono tracking-[.4em] text-center"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="reset-new">
              Mật khẩu mới (8–72 ký tự)
            </label>
            <PasswordInput id="reset-new" value={newPassword} onChange={setNewPassword} autoComplete="new-password" disabled={loading} />
          </div>
          <div>
            <label className="field-label" htmlFor="reset-confirm">
              Nhập lại mật khẩu mới
            </label>
            <PasswordInput id="reset-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" disabled={loading} />
          </div>
          {error && <FormNote kind="error">{error}</FormNote>}
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="cta-terracotta w-full h-11 text-sm font-bold text-paper rounded cursor-pointer"
          >
            {loading ? 'Đang xử lý…' : 'Đặt lại mật khẩu'}
          </button>
          <button type="button" onClick={() => go('login')} className="block mx-auto text-xs font-semibold text-ink-soft hover:text-ink cursor-pointer">
            ← Quay lại đăng nhập
          </button>
        </form>
      )}
    </AuthShell>
  )
}
