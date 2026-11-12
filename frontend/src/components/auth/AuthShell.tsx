import { useState, type ReactNode } from 'react'
import type { View } from '../../types'
import { Logo } from '../common/Logo'

interface AuthShellProps {
  /** Tab đang mở; bỏ trống thì không hiện tab (ví dụ màn quên mật khẩu). */
  tab?: 'login' | 'register'
  setView: (v: View) => void
  heading: string
  blurb: string
  children: ReactNode
}

/** Khung hai cột dùng chung cho đăng nhập / đăng ký / quên mật khẩu của khách. */
export function AuthShell({ tab, setView, heading, blurb, children }: AuthShellProps) {
  return (
    <main className="auth-page min-h-screen px-5 py-5">
      <button type="button" onClick={() => setView('home')} className="auth-back">
        ← Quay về VéXe Việt
      </button>

      <div className="auth-orbit one" />
      <div className="auth-orbit two" />

      <section className="auth-card relative lg:grid lg:grid-cols-[.9fr_1.1fr]">
        <div className="auth-aside p-8 lg:p-12">
          <Logo className="text-paper" />
          <p className="eyebrow mt-16">TÀI KHOẢN VÉXE VIỆT</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-white">{heading}</h1>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">{blurb}</p>
          <div className="mt-12 space-y-3.5 text-xs text-white/80">
            {[
              'Đặt vé chỉ cần số điện thoại và mật khẩu',
              'Xem lại lịch sử vé của bạn bất cứ lúc nào',
              'Hủy vé trực tuyến, hoàn tiền tự động theo chính sách',
            ].map((t) => (
              <p key={t} className="flex items-center gap-2">
                <span className="text-bronze">✦</span> {t}
              </p>
            ))}
          </div>
        </div>

        <div className="bg-card p-7 sm:p-12 border-l border-hairline">
          {tab && (
            <div className="flex border-b border-hairline pb-4 mb-6 gap-6">
              <button
                type="button"
                onClick={() => setView('login')}
                className={`text-base pb-1 cursor-pointer transition ${
                  tab === 'login'
                    ? 'font-bold text-terracotta border-b-2 border-terracotta'
                    : 'font-semibold text-ink-soft hover:text-ink'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => setView('register')}
                className={`text-base pb-1 cursor-pointer transition ${
                  tab === 'register'
                    ? 'font-bold text-terracotta border-b-2 border-terracotta'
                    : 'font-semibold text-ink-soft hover:text-ink'
                }`}
              >
                Đăng ký tài khoản
              </button>
            </div>
          )}
          {children}
        </div>
      </section>
    </main>
  )
}

/** Hộp thông báo lỗi / thành công / ghi chú trong form. */
export function FormNote({ kind, children }: { kind: 'error' | 'ok' | 'info'; children: ReactNode }) {
  const tone =
    kind === 'error'
      ? 'border-terracotta/40 bg-terracotta/10 text-terracotta'
      : kind === 'ok'
        ? 'border-celadon/40 bg-celadon/10 text-celadon'
        : 'border-bronze/40 bg-paper-deep text-ink'
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded border px-3 py-2.5 text-xs font-medium ${tone}`}>
      {children}
    </div>
  )
}

/** Ô mật khẩu có nút hiện/ẩn. */
export function PasswordInput(props: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete: 'current-password' | 'new-password'
  disabled?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        id={props.id}
        type={show ? 'text' : 'password'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete}
        disabled={props.disabled}
        className="pr-11"
        required
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-soft hover:text-ink cursor-pointer"
      >
        <span className="material-symbols-outlined text-lg">{show ? 'visibility_off' : 'visibility'}</span>
      </button>
    </div>
  )
}
