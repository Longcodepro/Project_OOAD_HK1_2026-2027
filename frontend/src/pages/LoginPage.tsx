/**
 * @file LoginPage.tsx
 * @description Màn hình Đăng nhập & Khôi phục Mật khẩu Tài khoản Khách hàng (Customer Authentication).
 *
 * CÁC CHẾ ĐỘ HOẠT ĐỘNG (Modes):
 * 1. 'login': Đăng nhập tiêu chuẩn bằng Số điện thoại và Mật khẩu:
 *    - Validate số điện thoại hợp lệ (10-11 chữ số, bắt đầu bằng số 0).
 *    - Gọi `authApi.login('customer', phone, password)` để lấy JWT Bearer token và nạp thông tin user.
 * 2. 'forgot-phone': Bước 1 của luồng quên mật khẩu:
 *    - Khách hàng nhập số điện thoại để nhận mã OTP xác thực qua SMS (`authApi.requestResetOtp`).
 * 3. 'forgot-reset': Bước 2 của luồng quên mật khẩu:
 *    - Khách hàng nhập mã OTP 6 số và mật khẩu mới (tối thiểu 8 ký tự, xác nhận khớp).
 *    - Gọi `authApi.resetPassword` để cập nhật mật khẩu mới trên backend và chuyển về màn hình đăng nhập.
 */

import { useState, useEffect, type FormEvent } from 'react'
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
  const [countdown, setCountdown] = useState(120)
  const [error, setError] = useState('')
  const [errorKind, setErrorKind] = useState<'locked' | 'temp_locked' | 'invalid_creds' | 'general' | null>(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  const go = (next: Mode) => {
    setMode(next)
    setError('')
    setErrorKind(null)
    setNotice('')
  }

  // Quản lý đồng hồ đếm ngược 120s khi ở chế độ forgot-reset
  useEffect(() => {
    if (mode !== 'forgot-reset') return
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
  }, [mode, otpInfo])

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const run = async (fn: () => Promise<void>) => {
    setError('')
    setErrorKind(null)
    setNotice('')
    setLoading(true)
    try {
      await fn()
    } catch (err) {
      const msg = apiErrorMessage(err)
      const lower = msg.toLowerCase()
      if (lower.includes('bị khóa') || lower.includes('vô hiệu hóa') || lower.includes('disabled')) {
        setErrorKind('locked')
        setError('Tài khoản của bạn đã bị khóa bởi quản trị viên. Vui lòng liên hệ tổng đài hoặc hỗ trợ viên để được giải quyết.')
      } else if (lower.includes('quá nhiều lần') || lower.includes('tạm khóa') || lower.includes('locked')) {
        setErrorKind('temp_locked')
        setError('Tài khoản bị tạm khóa 15 phút do nhập sai mật khẩu quá 5 lần. Bạn có thể sử dụng chức năng "Quên mật khẩu" để đặt lại mật khẩu ngay bằng OTP.')
      } else if (lower.includes('không đúng') || lower.includes('sai') || lower.includes('credentials')) {
        setErrorKind('invalid_creds')
        setError('Số điện thoại hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại thông tin đăng nhập.')
      } else {
        setErrorKind('general')
        setError(msg)
      }
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
    if (!password) {
      setError('Vui lòng nhập mật khẩu.')
      return
    }
    run(async () => onLoginSuccess(await authApi.login('customer', phone, password)))
  }

  const handleRequestOtp = (e: FormEvent) => {
    e.preventDefault()
    if (!validPhone()) return
    run(async () => {
      const res = await authApi.requestResetOtp(phone)
      setOtpInfo(res)
      setOtp('')
      go('forgot-reset')
      setNotice(`Nếu số ${cleanPhone(phone)} đã có tài khoản, mã OTP đã được gửi tới số này.`)
    })
  }

  const handleResendOtp = () => {
    if (countdown > 0 || loading) return
    run(async () => {
      const res = await authApi.requestResetOtp(phone)
      setOtpInfo(res)
      setOtp('')
      setCountdown(res.expiresInSeconds || 120)
      setNotice('Đã gửi lại mã OTP mới.')
    })
  }

  const handleReset = (e: FormEvent) => {
    e.preventDefault()
    if (countdown <= 0) return setError('Mã OTP đã hết hiệu lực, vui lòng bấm "Gửi lại mã OTP" để lấy mã mới.')
    if (otp.length !== 6) return setError('Mã OTP phải gồm đủ 6 chữ số.')
    if (newPassword.length < 8) return setError('Mật khẩu mới phải có ít nhất 8 ký tự.')
    if (newPassword !== confirm) return setError('Mật khẩu xác nhận không khớp.')
    run(async () => {
      await authApi.resetPassword(phone, otp.trim(), newPassword)
      setPassword('')
      setOtp('')
      setNewPassword('')
      setConfirm('')
      go('login')
      setNotice('Đã đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.')
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
              onChange={(e) => {
                setPhone(e.target.value)
                if (error) {
                  setError('')
                  setErrorKind(null)
                }
              }}
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
              onChange={(val) => {
                setPassword(val)
                if (error) {
                  setError('')
                  setErrorKind(null)
                }
              }}
              placeholder="Nhập mật khẩu của bạn"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="space-y-2">
              <FormNote kind="error">{error}</FormNote>
              {(errorKind === 'invalid_creds' || errorKind === 'temp_locked') && (
                <div className="p-2.5 rounded bg-terracotta/5 border border-terracotta/20 flex items-center justify-between text-xs">
                  <span className="text-ink-soft">Bạn không nhớ mật khẩu?</span>
                  <button
                    type="button"
                    onClick={() => go('forgot-phone')}
                    className="font-bold text-terracotta hover:underline cursor-pointer"
                  >
                    Đặt lại qua OTP ngay →
                  </button>
                </div>
              )}
            </div>
          )}
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
            {loading ? 'Đang gửi…' : 'Gửi mã OTP đặt lại mật khẩu'}
          </button>
          <button type="button" onClick={() => go('login')} className="block mx-auto text-xs font-semibold text-ink-soft hover:text-ink cursor-pointer">
            ← Quay lại đăng nhập
          </button>
        </form>
      )}

      {mode === 'forgot-reset' && (
        <form onSubmit={handleReset} className="space-y-4" noValidate>
          {notice && <FormNote kind="info">{notice}</FormNote>}

          {/* Hộp đếm ngược thời gian hiệu lực OTP */}
          <div className="flex items-center justify-between p-3 rounded bg-paper-deep border border-hairline text-xs">
            <span className="flex items-center gap-1.5 text-ink-soft">
              <span className="material-symbols-outlined text-sm text-terracotta">timer</span>
              <span>Hiệu lực mã OTP:</span>
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
              className="w-full font-mono tracking-[.4em] text-center text-lg font-bold"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="reset-new">
              Mật khẩu mới (tối thiểu 8 ký tự)
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
            {loading ? 'Đang xử lý…' : 'Xác nhận đặt lại mật khẩu'}
          </button>

          <div className="flex items-center justify-between text-xs pt-1">
            <button type="button" onClick={() => go('login')} className="font-semibold text-ink-soft hover:text-ink cursor-pointer">
              ← Quay lại đăng nhập
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading || countdown > 0}
              className={`font-semibold cursor-pointer ${
                countdown > 0 ? 'text-ink-soft cursor-not-allowed' : 'text-terracotta hover:underline'
              }`}
            >
              {countdown > 0 ? `Gửi lại mã sau (${countdown}s)` : 'Gửi lại mã OTP'}
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  )
}
