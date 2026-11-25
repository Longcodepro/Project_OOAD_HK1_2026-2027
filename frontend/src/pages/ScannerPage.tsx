import React, { useEffect, useState } from 'react'
import {
  apiErrorMessage,
  counterCheckinTicket,
  counterSearchTicketsForCheckin,
  getStaffToken,
  loginStaff,
} from '../services/api'
import type { SoatVeResponse, TraCuuSoatVeItem } from '../types/scanner'

interface RecentScanLog {
  id: string
  time: string
  ma_dat_ve: number
  ho_ten: string
  tuyen: string
  so_ghe: string[]
  trang_thai: 'valid' | 'duplicate' | 'invalid'
  ghi_chu: string
}

export interface ScannerPageProps {
  user?: any
  onBack?: () => void
  onLogout?: () => void
}

export const ScannerPage: React.FC<ScannerPageProps> = ({ user, onBack, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr')

  // Inputs
  const [qrInput, setQrInput] = useState<string>('VEXE:306')
  const [manualQuery, setManualQuery] = useState<string>('')

  // State loading & response
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<SoatVeResponse | null>(null)
  const [confirmedBoarding, setConfirmedBoarding] = useState<boolean>(false)

  // Fast search results in Tab 2
  const [searchResults, setSearchResults] = useState<TraCuuSoatVeItem[]>([])
  const [searching, setSearching] = useState<boolean>(false)

  // Demo presets detected from database
  const [demoValidId, setDemoValidId] = useState<number>(306)
  const [demoCancelledId, setDemoCancelledId] = useState<number>(309)
  const [demoCheckedInId, setDemoCheckedInId] = useState<number>(307)

  // Recent local scans history
  const [recentLogs, setRecentLogs] = useState<RecentScanLog[]>([])

  // Ensure staff token on load
  useEffect(() => {
    if (!getStaffToken()) {
      loginStaff('nv_miendong', 'MatKhau@123').catch((err) => {
        console.error('Không thể đăng nhập nhân viên soát vé:', err)
      })
    }

    // Pre-fetch candidate demo IDs from database
    counterSearchTicketsForCheckin('09')
      .then((items) => {
        if (!items || items.length === 0) return

        const valid = items.find((i) => i.trang_thai_ve === 'DaThanhToan' && !i.da_soat_ve)
        if (valid) {
          setDemoValidId(valid.ma_dat_ve)
          setQrInput(`VEXE:${valid.ma_dat_ve}`)
        }

        const cancelled = items.find(
          (i) => i.trang_thai_ve === 'DaHuy' || i.trang_thai_ve === 'ChoThanhToan'
        )
        if (cancelled) setDemoCancelledId(cancelled.ma_dat_ve)

        const checkedIn = items.find((i) => i.da_soat_ve)
        if (checkedIn) setDemoCheckedInId(checkedIn.ma_dat_ve)
      })
      .catch((err) => {
        console.warn('Lỗi tải danh sách vé mẫu demo:', err)
      })
  }, [])

  // Helper to extract booking id from string (e.g. "VEXE:1024:A01" -> 1024)
  const parseBookingId = (raw: string): number | null => {
    const trimmed = raw.trim()
    if (!trimmed) return null
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10)
    }
    const match = trimmed.match(/\d+/)
    return match ? parseInt(match[0], 10) : null
  }

  // Execute check-in ticket calling POST /api/quay/soat-ve
  const handleCheckin = async (bookingId: number) => {
    setLoading(true)
    setErrorMessage(null)
    setConfirmedBoarding(false)

    try {
      const res = await counterCheckinTicket({ ma_dat_ve: bookingId })
      setScanResult(res)

      // Add to recent logs
      const logStatus: 'valid' | 'duplicate' | 'invalid' = res.hop_le
        ? 'valid'
        : res.da_soat_truoc_do
        ? 'duplicate'
        : 'invalid'

      const now = new Date()
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

      setRecentLogs((prev) => [
        {
          id: `${Date.now()}-${bookingId}`,
          time: timeStr,
          ma_dat_ve: res.ma_dat_ve,
          ho_ten: res.ho_ten_khach || 'Khách vãng lai',
          tuyen: res.tuyen_xe || 'Chưa rõ',
          so_ghe: res.danh_sach_so_ghe || [],
          trang_thai: logStatus,
          ghi_chu: res.thong_diep,
        },
        ...prev.slice(0, 9),
      ])
    } catch (err: unknown) {
      setErrorMessage(apiErrorMessage(err))
      setScanResult(null)
    } finally {
      setLoading(false)
    }
  }

  // Handle QR form submit
  const handleQrSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = parseBookingId(qrInput)
    if (!id) {
      setErrorMessage('Chuỗi mã QR không hợp lệ! Vui lòng nhập số mã đơn hoặc chuỗi có định dạng VEXE:...')
      return
    }
    handleCheckin(id)
  }

  // Handle Manual search in Tab 2 calling GET /api/quay/tra-cuu-soat-ve
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = manualQuery.trim()
    if (!q) {
      setErrorMessage('Vui lòng nhập Mã đơn đặt vé hoặc Số điện thoại')
      return
    }

    const numericId = parseBookingId(q)

    setSearching(true)
    setErrorMessage(null)
    try {
      const results = await counterSearchTicketsForCheckin(q)
      setSearchResults(results)

      if (results.length === 1 && numericId && results[0].ma_dat_ve === numericId) {
        handleCheckin(numericId)
      } else if (results.length === 0 && numericId) {
        handleCheckin(numericId)
      }
    } catch (err) {
      setErrorMessage(apiErrorMessage(err))
    } finally {
      setSearching(false)
    }
  }

  // Reset to scan next passenger
  const handleResetForNext = () => {
    setScanResult(null)
    setConfirmedBoarding(false)
    setErrorMessage(null)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* HEADER SECTION */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-hairline pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-md">
              Soát vé cửa xe
            </span>
            <span className="text-xs text-ink-soft font-medium">
              Kiểm Soát Cửa Xe (Gate Check-in)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-black text-ink mt-1.5 flex items-center gap-2 tracking-tight">
            <span>📱</span> Soát Vé Lên Xe & Chống Gian Lận Trùng Lặp
          </h1>
          <p className="text-xs md:text-sm text-ink-soft mt-1">
            Hỗ trợ quét mã QR qua khung ngắm điện tử hoặc nhập mã đơn / SĐT thủ công, phát hiện vé hủy và chống Double Check-in tức thì.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-hairline bg-card text-ink hover:bg-paper transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>←</span> Quay lại
            </button>
          )}

          <div className="flex items-center gap-3 bg-card p-2.5 rounded-xl border border-hairline shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-lg">
              👮
            </div>
            <div className="text-xs">
              <div className="font-bold text-ink">
                {user ? user.fullName || user.username : 'Nhân viên kiểm soát cửa xe'}
              </div>
              <div className="text-ink-soft">Trạm kiểm soát lên xe</div>
            </div>
          </div>
        </div>
      </div>

      {/* ERROR ALERT IF ANY */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 shadow-xs animate-fadeIn">
          <span className="text-xl leading-none">⚠️</span>
          <div className="flex-1">
            <div className="font-bold">Có lỗi xảy ra:</div>
            <div className="mt-0.5">{errorMessage}</div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-600 font-bold text-xs cursor-pointer"
          >
            Đóng ✕
          </button>
        </div>
      )}

      {/* MAIN LAYOUT: 2 COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: SCANNER & INPUT TABS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card rounded-2xl shadow-xs border border-hairline overflow-hidden">
            {/* TABS HEADER */}
            <div className="flex border-b border-hairline bg-paper-deep p-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('qr')
                  setErrorMessage(null)
                }}
                className={`flex-1 py-3 px-4 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'qr'
                    ? 'bg-card text-emerald-800 shadow-xs border border-hairline'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                <span>📷</span>
                <span>Tab 1: Quét Mã QR (Live / Simulation)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('manual')
                  setErrorMessage(null)
                }}
                className={`flex-1 py-3 px-4 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-card text-emerald-800 shadow-xs border border-hairline'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                <span>⌨️</span>
                <span>Tab 2: Nhập Mã Thủ Công & Tra Cứu</span>
              </button>
            </div>

            {/* TAB CONTENT 1: QR SCANNER */}
            {activeTab === 'qr' && (
              <div className="p-6 space-y-6">
                {/* VIEWFINDER SIMULATION */}
                <div className="relative w-full aspect-video sm:aspect-2/1 bg-slate-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-slate-800 shadow-inner">
                  {/* Grid background effect */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>

                  {/* Corner Targets */}
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>

                    {/* Laser scanning line */}
                    <div className="absolute left-2 right-2 h-1 bg-emerald-400 shadow-[0_0_12px_#34d399] rounded animate-pulse"></div>

                    {/* QR Icon in center */}
                    <div className="text-slate-600 text-6xl select-none opacity-40">
                      ▦
                    </div>
                  </div>

                  {/* Scanner HUD Overlay */}
                  <div className="absolute bottom-3 inset-x-0 text-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900/80 backdrop-blur-xs text-emerald-400 text-xs font-mono font-medium rounded-full border border-slate-700/60 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      CAMERA QR SCANNER READY • ĐANG CHỜ QUÉT MÃ VÉ
                    </span>
                  </div>
                </div>

                {/* QUICK DEMO ACTION BUTTONS (3 TEST PRESETS) */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-ink-soft flex items-center gap-1.5 uppercase tracking-wider">
                    <span>⚡</span> 3 BỘ MẪU TEST THỬ NGHIỆM TỨC THÌ (PRESETS):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        const code = `VEXE:${demoValidId}`
                        setQrInput(code)
                        handleCheckin(demoValidId)
                      }}
                      className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <span>✅</span>
                      <span>[1. Vé Hợp Lệ #{demoValidId}]</span>
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        const code = `VEXE:${demoCheckedInId}`
                        setQrInput(code)
                        handleCheckin(demoCheckedInId)
                      }}
                      className="px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <span>⚠️</span>
                      <span>[2. Đã Soát Trước Đó #{demoCheckedInId}]</span>
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        const code = `VEXE:${demoCancelledId}`
                        setQrInput(code)
                        handleCheckin(demoCancelledId)
                      }}
                      className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-900 border border-red-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <span>🚫</span>
                      <span>[3. Hủy / Không Tồn Tại #{demoCancelledId}]</span>
                    </button>
                  </div>
                </div>

                {/* QR STRING INPUT FORM */}
                <form onSubmit={handleQrSubmit} className="space-y-3 pt-2 border-t border-hairline">
                  <label htmlFor="qr-code-input" className="block text-xs font-bold text-ink">
                    Nhập chuỗi mã QR trực tiếp từ máy quét / mã đơn:
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="qr-code-input"
                      type="text"
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      placeholder="Ví dụ: VEXE:306 hoặc 306"
                      className="flex-1 px-4 py-2.5 bg-paper border border-hairline rounded-xl text-sm font-mono font-medium text-ink focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:bg-card transition-all"
                    />
                    <button
                      type="submit"
                      disabled={loading || !qrInput.trim()}
                      className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs md:text-sm font-bold shadow-xs hover:shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Đang soát...
                        </>
                      ) : (
                        <>
                          <span>🔍</span>
                          Soát Vé
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB CONTENT 2: MANUAL INPUT */}
            {activeTab === 'manual' && (
              <div className="p-6 space-y-6">
                <form onSubmit={handleManualSearch} className="space-y-4">
                  <div>
                    <label htmlFor="manual-query-input" className="block text-xs font-bold text-ink mb-1.5">
                      Mã đơn đặt vé hoặc Số điện thoại / Tên hành khách:
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="manual-query-input"
                        type="text"
                        value={manualQuery}
                        onChange={(e) => setManualQuery(e.target.value)}
                        placeholder="Nhập mã đơn (vd: 306) hoặc SĐT (vd: 0977...) hoặc Tên khách"
                        className="flex-1 px-4 py-3 bg-paper border border-hairline rounded-xl text-sm text-ink font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:bg-card transition-all"
                      />
                      <button
                        type="submit"
                        disabled={searching || !manualQuery.trim()}
                        className="px-6 py-3 bg-ink hover:bg-ink-soft text-paper rounded-xl text-xs md:text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {searching ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            Đang tìm...
                          </>
                        ) : (
                          <>
                            <span>🔎</span>
                            Tra Cứu & Soát Vé
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {/* SEARCH RESULTS LIST */}
                {searchResults.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-hairline">
                    <div className="flex items-center justify-between text-xs text-ink-soft font-bold">
                      <span>Tìm thấy {searchResults.length} đơn đặt vé phù hợp:</span>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {searchResults.map((item) => (
                        <div
                          key={item.ma_dat_ve}
                          className="p-3.5 rounded-xl border border-hairline bg-paper/60 hover:bg-card hover:border-emerald-400 transition-all flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-ink text-sm">
                                #{item.ma_dat_ve}
                              </span>
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                                  item.trang_thai_ve === 'DaThanhToan'
                                    ? item.da_soat_ve
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {item.trang_thai_ve === 'DaThanhToan'
                                  ? item.da_soat_ve
                                    ? 'Đã soát trước đó'
                                    : 'Đã thanh toán (Sẵn sàng)'
                                  : item.trang_thai_ve}
                              </span>
                            </div>
                            <div className="text-xs text-ink-soft">
                              Khách: <b className="text-ink">{item.ho_ten_khach}</b> • SĐT: {item.sdt_khach}
                            </div>
                            <div className="text-xs text-ink-soft">
                              Tuyến: {item.tuyen_xe} • Ghế:{' '}
                              <span className="font-bold text-terracotta">
                                {item.danh_sach_so_ghe.join(', ')}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCheckin(item.ma_dat_ve)}
                            disabled={loading}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            Soát vé này
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RECENT BOARDING AUDIT LOG */}
          <div className="bg-card rounded-2xl shadow-xs border border-hairline p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                <span>📋</span> Nhật Ký Soát Vé Tại Cửa Xe Gần Đây
              </h2>
              <span className="text-[11px] text-ink-soft font-medium">
                {recentLogs.length} lượt vừa thực hiện
              </span>
            </div>

            {recentLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink-soft italic">
                Chưa có lượt quét nào trong phiên làm việc hiện tại. Hãy bấm các nút PRESET hoặc quét mã QR ở trên.
              </div>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg border border-hairline bg-paper/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-ink-soft text-[11px]">{log.time}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          log.trang_thai === 'valid'
                            ? 'bg-emerald-600'
                            : log.trang_thai === 'duplicate'
                            ? 'bg-amber-600'
                            : 'bg-red-600'
                        }`}
                      ></span>
                      <span className="font-mono font-bold text-ink">#{log.ma_dat_ve}</span>
                      <span className="font-medium text-ink">{log.ho_ten}</span>
                      <span className="text-hairline">|</span>
                      <span className="font-bold text-terracotta">
                        Ghế: {log.so_ghe.join(', ')}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        log.trang_thai === 'valid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.trang_thai === 'duplicate'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {log.trang_thai === 'valid'
                        ? 'HỢP LỆ'
                        : log.trang_thai === 'duplicate'
                        ? 'TRÙNG LẶP'
                        : 'TỪ CHỐI'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED SCAN RESULT CARD (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-card rounded-2xl shadow-xs border border-hairline p-6 space-y-6 sticky top-20">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-ink flex items-center gap-2">
                <span>🎫</span> Kết Quả Kiểm Tra Vé
              </h2>
              {scanResult && (
                <button
                  type="button"
                  onClick={handleResetForNext}
                  className="text-xs text-ink-soft hover:text-ink font-bold cursor-pointer"
                >
                  ✕ Đóng kết quả
                </button>
              )}
            </div>

            {!scanResult ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-paper-deep text-ink-soft flex items-center justify-center text-3xl mx-auto">
                  🔍
                </div>
                <div className="text-sm font-bold text-ink">Chưa có thông tin soát vé</div>
                <p className="text-xs text-ink-soft max-w-xs mx-auto">
                  Vui lòng bấm các nút Thử nghiệm ở khung quét QR hoặc nhập mã đơn / SĐT để tiến hành kiểm tra vé lên xe.
                </p>
              </div>
            ) : (
              <div className="space-y-6 animate-fadeIn">
                {/* 1. STATUS BADGE & ANTI-DOUBLE CHECK-IN ALERT */}
                {scanResult.hop_le && !scanResult.da_soat_truoc_do ? (
                  <div className="p-4 rounded-xl bg-emerald-700 text-white shadow-xs text-center space-y-1">
                    <div className="text-2xl font-serif font-black tracking-wide flex items-center justify-center gap-2">
                      <span>✅</span> VÉ HỢP LỆ — CHO PHÉP LÊN XE
                    </div>
                    <div className="text-xs text-emerald-100 font-medium">
                      {scanResult.thong_diep}
                    </div>
                  </div>
                ) : scanResult.da_soat_truoc_do ? (
                  <div className="p-4 rounded-xl bg-red-700 text-white shadow-sm text-center space-y-2 animate-pulse">
                    <div className="text-base sm:text-lg font-black tracking-wide flex items-center justify-center gap-1.5">
                      <span>🚨</span> CẢNH BÁO: VÉ ĐÃ ĐƯỢC SOÁT TRƯỚC ĐÓ!
                    </div>
                    <div className="inline-block px-2.5 py-0.5 rounded-full bg-red-900 text-red-100 text-[10px] font-black uppercase tracking-wider">
                      Anti-Double Check-in Alert
                    </div>
                    <div className="text-xs text-red-50 bg-red-800/80 p-3 rounded-lg text-left leading-relaxed font-mono">
                      {scanResult.thong_diep}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-red-600 text-white shadow-xs text-center space-y-1">
                    <div className="text-lg font-black tracking-wide flex items-center justify-center gap-2">
                      <span>🚫</span> VÉ KHÔNG HỢP LỆ — TỪ CHỐI LÊN XE
                    </div>
                    <div className="text-xs text-red-100 font-medium">
                      {scanResult.thong_diep}
                    </div>
                  </div>
                )}

                {/* 2. PROMINENT SEAT POSITION */}
                <div className="bg-paper-deep text-ink p-4 rounded-xl text-center space-y-1 border border-hairline">
                  <div className="text-xs uppercase tracking-wider text-ink-soft font-bold">
                    Vị Trí Ghế Ngồi Đã Đặt
                  </div>
                  <div className="text-3xl font-mono font-black text-terracotta tracking-wider">
                    {scanResult.danh_sach_so_ghe && scanResult.danh_sach_so_ghe.length > 0
                      ? scanResult.danh_sach_so_ghe.map((g) => `Ghế ${g}`).join(' • ')
                      : 'Chưa xếp ghế'}
                  </div>
                  <div className="text-[11px] text-ink-soft">
                    Mã đơn vé: <span className="font-mono text-ink font-bold">#{scanResult.ma_dat_ve}</span>
                  </div>
                </div>

                {/* 3. PASSENGER & TRIP INFO CARDS */}
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-hairline bg-paper/60 space-y-1.5">
                    <div className="font-bold text-ink-soft uppercase tracking-wider text-[10px]">
                      Thông tin hành khách
                    </div>
                    <div className="text-sm font-black text-ink">
                      {scanResult.ho_ten_khach || 'Khách vãng lai'}
                    </div>
                    <div className="text-ink-soft font-mono">
                      Số điện thoại: <b className="text-ink">{scanResult.sdt_khach || 'Không có'}</b>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-hairline bg-paper/60 space-y-1.5">
                    <div className="font-bold text-ink-soft uppercase tracking-wider text-[10px]">
                      Thông tin chuyến xe & biển số
                    </div>
                    <div className="text-ink font-medium">
                      Tuyến:{' '}
                      <b className="text-ink">
                        {scanResult.tuyen_xe || 'Chưa cập nhật tuyến'}
                      </b>
                    </div>
                    <div className="text-ink font-medium">
                      Khởi hành: <b className="text-ink">{scanResult.gio_khoi_hanh || 'Chưa rõ'}</b>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-hairline mt-1">
                      <span className="text-ink-soft font-medium">Biển số xe:</span>
                      <span className="px-2 py-0.5 bg-paper-deep text-ink font-mono font-black text-xs rounded border border-hairline">
                        {scanResult.bien_so || 'Chưa gán xe'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. CONFIRMATION / REJECTION BUTTONS */}
                {scanResult.hop_le && !scanResult.da_soat_truoc_do ? (
                  confirmedBoarding ? (
                    <div className="p-4 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-center space-y-2">
                      <div className="font-black text-base flex items-center justify-center gap-1.5">
                        <span>🎉</span> ĐÃ XÁC NHẬN CHO KHÁCH LÊN XE THÀNH CÔNG!
                      </div>
                      <p className="text-xs text-emerald-700">
                        Hành khách đã vào đúng vị trí ghế. Sẵn sàng tiếp nhận vé tiếp theo.
                      </p>
                      <button
                        type="button"
                        onClick={handleResetForNext}
                        className="w-full mt-2 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Soát Vé Tiếp Theo ➔
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmedBoarding(true)}
                      className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-base font-black shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>🚌</span>
                      <span>XÁC NHẬN CHO LÊN XE</span>
                    </button>
                  )
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled
                      className="w-full py-3.5 bg-paper-deep text-ink-soft rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-hairline"
                    >
                      <span>⛔</span>
                      <span>TỪ CHỐI CHO LÊN XE</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetForNext}
                      className="w-full py-2.5 bg-card hover:bg-paper text-ink border border-hairline rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Soát vé khác
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
export default ScannerPage
