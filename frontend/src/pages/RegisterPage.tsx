import { useState, type FormEvent } from 'react'
import type { View, User } from '../types'
import { authApi, apiErrorMessage, cleanPhone, type OtpTicket } from '../services/api'
import { AuthShell, FormNote, PasswordInput } from '../components/auth/AuthShell'

export interface RegisterPageProps {
  setView: (v: View) => void
  onRegisterSuccess: (user: User) => void
}

const PHONE_RE = /^0\d{9,10}$/

export function RegisterPage({ setView, onRegisterSuccess }: RegisterPageProps) {
  const [step, setStep] = useState<'info' | 'otp'>('info')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [otp, setOtp] = useState('')
  const [otpInfo, setOtpInfo] = useState<OtpTicket | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setError('')
    setLoading(true)
    try {
      await fn()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleInfo = (e: FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) return setError('Vui lòng nhập họ và tên')
    if (!PHONE_RE.test(cleanPhone(phone))) return setError('Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0')
    if (password.length < 8) return setError('Mật khẩu phải có ít nhất 8 ký tự')
    if (password !== confirm) return setError('Mật khẩu xác nhận không khớp')
    run(async () => {
      setOtpInfo(await authApi.requestRegisterOtp(phone))
      setStep('otp')
    })
  }

  const handleRegister = (e: FormEvent) => {
    e.preventDefault()
    run(async () => onRegisterSuccess(await authApi.register({ fullName, phone, password, otp: otp.trim() })))
  }

  const resend = () =>
    run(async () => {
      setOtpInfo(await authApi.requestRegisterOtp(phone))
      setOtp('')
    })

  return (
    <AuthShell
      tab="register"
      setView={setView}
      heading="Đăng ký tài khoản để đặt vé nhanh hơn."
      blurb="Chỉ cần họ tên, số điện thoại và mật khẩu. Chúng tôi sẽ gửi mã OTP để xác nhận số điện thoại của bạn."
    >
      {step === 'info' ? (
        <form onSubmit={handleInfo} className="space-y-4" noValidate>
          <div>
            <label className="field-label" htmlFor="reg-name">
              Họ và tên <span className="req">*</span>
            </label>
            <input
              id="reg-name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              maxLength={100}
              className="w-full"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="reg-phone">
              Số điện thoại <span className="req">*</span>
            </label>
            <input
              id="reg-phone"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="reg-pass">
                Mật khẩu <span className="req">*</span>
              </label>
              <PasswordInput id="reg-pass" value={password} onChange={setPassword} placeholder="Tối thiểu 8 ký tự" autoComplete="new-password" disabled={loading} />
            </div>
            <div>
              <label className="field-label" htmlFor="reg-confirm">
                Xác nhận mật khẩu <span className="req">*</span>
              </label>
              <PasswordInput id="reg-confirm" value={confirm} onChange={setConfirm} placeholder="Nhập lại mật khẩu" autoComplete="new-password" disabled={loading} />
            </div>
          </div>

          {error && <FormNote kind="error">{error}</FormNote>}

          <button type="submit" disabled={loading} className="cta-terracotta w-full h-11 text-sm font-bold text-paper rounded cursor-pointer">
            {loading ? 'Đang gửi mã OTP…' : 'Tiếp tục →'}
          </button>
          <p className="pt-2 text-center text-xs text-ink-soft">
            Đã có tài khoản?{' '}
            <button type="button" onClick={() => setView('login')} className="font-bold text-terracotta hover:underline cursor-pointer">
              Đăng nhập tại đây
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4" noValidate>
          <FormNote kind="info">
            Mã OTP gồm 6 chữ số đã được gửi tới <b>{cleanPhone(phone)}</b> và có hiệu lực trong{' '}
            {Math.round((otpInfo?.expiresInSeconds ?? 0) / 60)} phút.
          </FormNote>
          {otpInfo?.testCode && (
            <FormNote kind="info">
              Máy chủ đang ở chế độ SMS thử nghiệm, mã OTP của bạn là <b className="font-mono">{otpInfo.testCode}</b>.
            </FormNote>
          )}
          <div>
            <label className="field-label" htmlFor="reg-otp">
              Mã OTP
            </label>
            <input
              id="reg-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full font-mono tracking-[.4em] text-center"
              disabled={loading}
              autoFocus
              required
            />
          </div>

          {error && <FormNote kind="error">{error}</FormNote>}

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="cta-terracotta w-full h-11 text-sm font-bold text-paper rounded cursor-pointer"
          >
            {loading ? 'Đang tạo tài khoản…' : 'Hoàn tất đăng ký'}
          </button>
          <div className="flex items-center justify-between text-xs">
            <button type="button" onClick={() => setStep('info')} className="font-semibold text-ink-soft hover:text-ink cursor-pointer">
              ← Sửa thông tin
            </button>
            <button type="button" onClick={resend} disabled={loading} className="font-semibold text-terracotta hover:underline cursor-pointer">
              Gửi lại mã
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  )
}
