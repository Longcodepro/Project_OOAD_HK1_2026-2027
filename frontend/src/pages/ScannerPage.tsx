import { useState } from 'react'
import type { View } from '../types'
import { crewApi } from '../services/api'
import { Button } from '../components/common/Button'

export interface ScannerPageProps {
  setView: (v: View) => void
}

export function ScannerPage({ setView }: ScannerPageProps) {
  const [ticketInput, setTicketInput] = useState('VL-8N4X-27')
  const [checkinInfo, setCheckinInfo] = useState<{
    valid: boolean
    passenger?: string
    seat?: string
    route?: string
    msg?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleVerify = async () => {
    setLoading(true)
    try {
      const res = await crewApi.verifyTicket(ticketInput)
      if (res.valid && res.ticket) {
        setCheckinInfo({
          valid: true,
          passenger: res.ticket.passengerName,
          seat: res.ticket.seatNumber,
          route: res.ticket.route,
          msg: res.message,
        })
      } else {
        setCheckinInfo({
          valid: false,
          msg: res.message || 'Mã vé không tồn tại',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="scanner min-h-screen p-5">
      <button
        type="button"
        onClick={() => setView('home')}
        className="text-sm text-white/60 hover:text-white"
      >
        ← Thoát chế độ nhân viên
      </button>
      <div className="mx-auto mt-10 max-w-sm text-center">
        <span className="eyebrow">VIOLETLINE / CREW APP</span>
        <h1 className="mt-3 text-2xl font-semibold">Soát vé lên xe</h1>
        <div
          className={`scan-window mt-10 ${
            checkinInfo?.valid ? 'is-valid' : ''
          }`}
        >
          <div className="scan-corner tl" />
          <div className="scan-corner tr" />
          <div className="scan-corner bl" />
          <div className="scan-corner br" />
          <div className="scan-line" />
          <div className="scan-code">
            ▦ ▦<br />▦ ▦
          </div>
        </div>
        <div className="mt-6">
          <input
            className="auth-input text-center text-sm tracking-wider"
            value={ticketInput}
            onChange={(e) => setTicketInput(e.target.value)}
            placeholder="Nhập mã đặt chỗ hoặc mã vé"
          />
        </div>
        <p className="mt-4 text-sm text-white/55">
          Đưa mã QR của hành khách vào khung quét hoặc nhập mã vé
        </p>
        <Button
          onClick={handleVerify}
          disabled={loading}
          className="mt-6 w-full"
        >
          {loading
            ? 'Đang xác thực...'
            : checkinInfo?.valid
            ? '✓ HỢP LỆ — ĐÃ LÊN XE'
            : 'Mô phỏng quét vé / Soát vé'}
        </Button>
        {checkinInfo && (
          <div
            className={`mt-5 rounded-2xl border p-4 text-left ${
              checkinInfo.valid
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                : 'border-rose-400/30 bg-rose-400/10 text-rose-200'
            }`}
          >
            <b>
              {checkinInfo.valid
                ? `${checkinInfo.passenger} · ${checkinInfo.seat}`
                : 'Lỗi kiểm tra vé'}
            </b>
            <p className="mt-1 text-sm opacity-80">
              {checkinInfo.valid ? checkinInfo.route : checkinInfo.msg}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
