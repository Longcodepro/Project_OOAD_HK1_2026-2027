import { useState, type FormEvent } from 'react'
import type { CheckinResult, User } from '../types'
import { staffApi, ticketsApi, parseTicketId, apiErrorMessage, formatVnd } from '../services/api'

export interface ScannerPageProps {
  user: User
  onBack?: () => void
  onLogout: () => void
}

export function ScannerPage({ user, onBack, onLogout }: ScannerPageProps) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<CheckinResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    const q = input.trim()
    if (!q || loading) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const ticketId = parseTicketId(q)
      if (ticketId !== null) {
        // Soát vé trực tiếp bằng ticketsApi.get() theo mã vé
        const t = await ticketsApi.get(q)
        if (!t) {
          // Thử tra cứu mở rộng qua staffApi.verify
          setResult(await staffApi.verify(q))
        } else {
          switch (t.status) {
            case 'CHUA_DI':
              setResult({ valid: true, message: 'Vé hợp lệ, đã thanh toán', ticket: t })
              break
            case 'DA_HOAN_THANH':
              setResult({ valid: false, message: 'Vé đã hoàn thành chuyến đi', ticket: t })
              break
            case 'DA_HUY':
              setResult({ valid: false, message: 'Vé đã bị hủy', ticket: t })
              break
            case 'CHO_THANH_TOAN':
              setResult({ valid: false, message: 'Vé chưa thanh toán', ticket: t })
              break
            default:
              setResult({ valid: false, message: `Trạng thái vé không xác định: ${t.status}`, ticket: t })
          }
        }
      } else {
        // Soát vé theo nội dung quét QR hoặc số điện thoại
        setResult(await staffApi.verify(q))
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Không kiểm tra được vé, vui lòng thử lại'))
    } finally {
      setLoading(false)
    }
  }

  const t = result?.ticket
  const rows: [string, string][] = t
    ? [
        ['Mã vé', t.ticketCode],
        ['Hành khách', t.passengerName],
        ['Số điện thoại', t.passengerPhone],
        ['Ghế', t.seatNumber],
        ['Tuyến', t.route],
        ['Giờ / ngày', [t.departureTime, t.date].filter(Boolean).join(' · ')],
        ['Biển số', t.plate],
        ['Điểm đón', t.pickupPoint],
        ['Điểm trả', t.dropoffPoint],
        ['Số tiền', formatVnd(t.totalAmount)],
      ]
    : []

  return (
    <main className="scanner min-h-screen p-5">
      <header className="mx-auto flex max-w-xl items-center justify-between gap-3 text-sm">
        {onBack ? (
          <button type="button" onClick={onBack} className="cursor-pointer text-white/60 hover:text-white">
            ← Quay lại
          </button>
        ) : (
          <span className="font-semibold text-white/80">{user.fullName}</span>
        )}
        <div className="flex items-center gap-4">
          {onBack && <span className="text-white/60">{user.fullName}</span>}
          <button type="button" onClick={onLogout} className="cursor-pointer text-white/60 hover:text-white">
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="mx-auto mt-8 max-w-sm text-center">
        <span className="eyebrow">Soát vé</span>
        <h1 className="mt-3 text-2xl font-semibold">Kiểm tra vé hành khách</h1>

        <div className={`scan-window mx-auto mt-8 max-w-[220px] ${result?.valid ? 'is-valid' : ''}`}>
          <div className="scan-corner tl" />
          <div className="scan-corner tr" />
          <div className="scan-corner bl" />
          <div className="scan-corner br" />
          <div className="scan-line" />
          <div className="scan-code">
            ▦ ▦<br />▦ ▦
          </div>
        </div>

        <form onSubmit={handleVerify} className="mt-6">
          <label htmlFor="scan-input" className="sr-only">
            Mã vé, nội dung QR hoặc số điện thoại khách
          </label>
          <input
            id="scan-input"
            className="w-full text-center text-sm tracking-wider uppercase font-semibold"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mã vé (VE-17), QR hoặc SĐT khách"
            autoComplete="off"
            autoFocus
          />
          <button type="submit" disabled={loading || !input.trim()} className="btn btn-primary mt-4 w-full py-3 cursor-pointer">
            {loading ? 'Đang kiểm tra...' : 'Kiểm tra vé'}
          </button>
        </form>
        <p className="mt-3 text-xs text-white/45">
          Hệ thống tra cứu dữ liệu thời gian thực và xác thực tính hợp lệ của vé trước khi lên xe.
        </p>

        {error && (
          <p role="alert" className="mt-5 rounded border border-terracotta/50 bg-terracotta/15 p-4 text-sm text-[#F2B8A8]">
            {error}
          </p>
        )}

        {result && (
          <div
            role="status"
            className={`mt-5 rounded border p-4 text-left ${
              result.valid
                ? 'border-[#5FD1B8]/40 bg-[#5FD1B8]/10 text-[#BDEFE3]'
                : 'border-terracotta/50 bg-terracotta/15 text-[#F2B8A8]'
            }`}
          >
            <b>{result.valid ? '✓ Vé hợp lệ' : '✕ Vé không hợp lệ'}</b>
            <p className="mt-1 text-sm opacity-90">{result.message}</p>
            {rows.length > 0 && (
              <dl className="mt-3 space-y-1.5 border-t border-white/15 pt-3 text-sm">
                {rows
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="opacity-60">{k}</dt>
                      <dd className="text-right font-semibold">{v}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
