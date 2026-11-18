/**
 * @file RegisterPage.tsx
 * @description Màn hình Đăng ký Tài khoản Khách hàng Mới xác thực OTP (Customer Registration Flow).
 *
 * QUY TRÌNH 2 BƯỚC:
 * 1. Bước 1 ('info'): Nhập thông tin tài khoản cơ bản:
 *    - Họ và tên hành khách.
 *    - Số điện thoại đăng ký (bắt đầu bằng số 0, dài 10-11 chữ số).
 *    - Mật khẩu bảo mật (tối thiểu 8 ký tự) và xác nhận mật khẩu.
 *    - Khi bấm tiếp tục: gửi yêu cầu OTP tới số điện thoại (`authApi.requestRegisterOtp`) và chuyển sang bước 2.
 * 2. Bước 2 ('otp'): Xác thực số điện thoại và hoàn tất tạo tài khoản:
 *    - Nhập mã xác thực OTP gồm 6 chữ số nhận qua tin nhắn SMS (có hỗ trợ mã thử nghiệm testCode).
 *    - Cung cấp nút "Gửi lại mã OTP" nếu tin nhắn đến trễ.
 *    - Khi xác thực thành công: Backend tạo tài khoản, tự động đăng nhập vào cổng khách hàng và lưu phiên.
 */

import { useState, useEffect, type FormEvent } from 'react'
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
  const [countdown, setCountdown] = useState(120)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Quản lý đồng hồ đếm ngược 120s khi ở bước xác thực OTP
  useEffect(() => {
    if (step !== 'otp') return
    const initialSecs = otpInfo?.expiresInSeconds && otpInfo.expiresInSeconds > 0 ? otpInfo.expiresInSeconds : 120
    setCountdown(initialSecs)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [step, otpInfo])

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

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
    if (!fullName.trim()) return setError('Vui lòng nhập họ và tên.')
    if (!PHONE_RE.test(cleanPhone(phone))) return setError('Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0.')
    if (password.length < 8) return setError('Mật khẩu phải có ít nhất 8 ký tự.')
    if (password !== confirm) return setError('Mật khẩu xác nhận không khớp.')
    run(async () => {
      const res = await authApi.requestRegisterOtp(phone)
      setOtpInfo(res)
      setOtp('')
      setStep('otp')
    })
  }

  const handleRegister = (e: FormEvent) => {
    e.preventDefault()
    if (countdown <= 0) return setError('Mã OTP đã hết hiệu lực. Vui lòng bấm "Gửi lại mã" để nhận mã mới.')
    if (otp.length !== 6) return setError('Mã OTP phải gồm đủ 6 chữ số.')
    run(async () => onRegisterSuccess(await authApi.register({ fullName, phone, password, otp: otp.trim() })))
  }

  const resend = () => {
    if (countdown > 0 || loading) return
    run(async () => {
      const res = await authApi.requestRegisterOtp(phone)
      setOtpInfo(res)
      setOtp('')
      setCountdown(res.expiresInSeconds || 120)
    })
  }

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
              onChange={(e) => {
                setFullName(e.target.value)
                if (error) setError('')
              }}
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
              onChange={(e) => {
                setPhone(e.target.value)
                if (error) setError('')
              }}
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
              <PasswordInput
                id="reg-pass"
                value={password}
                onChange={(val) => {
                  setPassword(val)
                  if (error) setError('')
                }}
                placeholder="Tối thiểu 8 ký tự"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="reg-confirm">
                Xác nhận mật khẩu <span className="req">*</span>
              </label>
              <PasswordInput
                id="reg-confirm"
                value={confirm}
                onChange={(val) => {
                  setConfirm(val)
                  if (error) setError('')
                }}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                disabled={loading}
              />
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
          {/* Hộp đếm ngược thời gian hiệu lực OTP */}
          <div className="flex items-center justify-between p-3 rounded bg-paper-deep border border-hairline text-xs">
            <span className="flex items-center gap-1.5 text-ink-soft">
              <span className="material-symbols-outlined text-sm text-terracotta">timer</span>
              <span>Mã OTP gửi tới <b>{cleanPhone(phone)}</b>:</span>
            </span>
            <span className={`font-mono font-bold ${countdown <= 30 ? 'text-terracotta' : 'text-celadon'}`}>
              {formatCountdown(countdown)}
            </span>
          </div>

          {otpInfo?.testCode && (
            <div className="p-3 rounded bg-celadon/10 border border-celadon/30 flex items-center justify-between text-xs">
              <div>
                <span className="text-ink-soft">Mã OTP thử nghiệm: </span>
                <b className="font-mono text-celadon text-sm font-extrabold tracking-widest">{otpInfo.testCode}</b>
              </div>
              <button
                type="button"
                onClick={() => setOtp(otpInfo.testCode!)}
                className="px-2 py-1 rounded bg-celadon text-paper font-semibold hover:bg-celadon/90 cursor-pointer"
              >
                Điền nhanh
              </button>
            </div>
          )}

          <div>
            <label className="field-label" htmlFor="reg-otp">
              Mã OTP (6 chữ số)
            </label>
            <input
              id="reg-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ''))
                if (error) setError('')
              }}
              placeholder="000000"
              className="w-full font-mono tracking-[.4em] text-center text-lg font-bold"
              disabled={loading}
              autoFocus
              required
            />
          </div>

          {error && <FormNote kind="error">{error}</FormNote>}

          <button
            type="submit"
            disabled={loading || otp.length !== 6 || countdown <= 0}
            className="cta-terracotta w-full h-11 text-sm font-bold text-paper rounded cursor-pointer"
          >
            {loading ? 'Đang tạo tài khoản…' : 'Hoàn tất đăng ký'}
          </button>
          <div className="flex items-center justify-between text-xs">
            <button type="button" onClick={() => setStep('info')} className="font-semibold text-ink-soft hover:text-ink cursor-pointer">
              ← Sửa thông tin
            </button>
            <button
              type="button"
              onClick={resend}
              disabled={loading || countdown > 0}
              className={`font-semibold cursor-pointer ${
                countdown > 0 ? 'text-ink-soft cursor-not-allowed' : 'text-terracotta hover:underline'
              }`}
            >
              {countdown > 0 ? `Gửi lại mã sau (${countdown}s)` : 'Gửi lại mã'}
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  )
}
