import { useEffect, useState } from 'react'
import type { DatVeResponse } from '../../types/counter'
import type {
  BaoGiaHuyVeResponse,
  HuyVeResponse,
} from '../../types/cancelTrip'
import {
  apiErrorMessage,
  formatVnd,
  quoteTicketCancellation,
  requestTicketCancellation,
} from '../../services/api'
import { CRANE, renderFigureSvg } from '../dongson/dongsonData'

interface CancelTicketModalProps {
  booking: DatVeResponse
  onClose: () => void
  onSuccess: (result: HuyVeResponse) => void
}

const POPULAR_BANKS = [
  'Vietcombank',
  'Techcombank',
  'MB Bank (Quân Đội)',
  'VietinBank',
  'BIDV',
  'Agribank',
  'ACB',
  'TPBank',
  'VPBank',
  'Sacombank',
  'HDBank',
  'VIB',
  'MoMo',
  'ZaloPay',
  'Khác (Nhập tay)',
]

export function CancelTicketModal({ booking, onClose, onSuccess }: CancelTicketModalProps) {
  const [loadingQuote, setLoadingQuote] = useState<boolean>(true)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [quote, setQuote] = useState<BaoGiaHuyVeResponse | null>(null)

  const [reason, setReason] = useState<string>('Có việc bận đột xuất không thể tham gia chuyến đi')
  const [bankName, setBankName] = useState<string>('Vietcombank')
  const [customBankName, setCustomBankName] = useState<string>('')
  const [accountNumber, setAccountNumber] = useState<string>('')
  const [accountHolder, setAccountHolder] = useState<string>(booking.ho_ten_kh || '')

  const [submitting, setSubmitting] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<HuyVeResponse | null>(null)

  const craneSvg = renderFigureSvg(CRANE)

  // Gọi API lấy báo giá hủy vé
  useEffect(() => {
    let isMounted = true
    setLoadingQuote(true)
    setQuoteError(null)

    quoteTicketCancellation(booking.ma_dat_ve)
      .then((data) => {
        if (!isMounted) return
        setQuote(data)

        // Parse tai_khoan_hoan nếu backend trả về sẵn
        if (data.tai_khoan_hoan) {
          const match = data.tai_khoan_hoan.match(/^([^-]+)\s*-\s*([^(]+)\s*(?:\(([^)]+)\))?/)
          if (match) {
            const b = match[1].trim()
            const acc = match[2].trim()
            const name = (match[3] || '').trim()
            if (POPULAR_BANKS.some((p) => p.includes(b))) {
              setBankName(POPULAR_BANKS.find((p) => p.includes(b)) || b)
            } else {
              setBankName('Khác (Nhập tay)')
              setCustomBankName(b)
            }
            if (acc) setAccountNumber(acc)
            if (name) setAccountHolder(name.toUpperCase())
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setQuoteError(apiErrorMessage(err))
      })
      .finally(() => {
        if (isMounted) setLoadingQuote(false)
      })

    return () => {
      isMounted = false
    }
  }, [booking.ma_dat_ve, booking.ho_ten_kh])

  // Xác nhận hủy vé
  const handleConfirmCancel = async () => {
    if (!reason.trim()) {
      setSubmitError('Vui lòng nhập lý do hủy vé (tối thiểu 3 ký tự).')
      return
    }

    const selectedBank = bankName === 'Khác (Nhập tay)' ? customBankName.trim() : bankName
    if (!accountNumber.trim() && !quote?.tai_khoan_hoan) {
      setSubmitError('Vui lòng cung cấp số tài khoản nhận tiền hoàn.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    const bankDetails = accountNumber.trim()
      ? `STK: ${selectedBank} - ${accountNumber.trim()} (${accountHolder.trim().toUpperCase()})`
      : ''
    const fullReason = bankDetails ? `${reason.trim()} [${bankDetails}]` : reason.trim()

    try {
      const res = await requestTicketCancellation(booking.ma_dat_ve, {
        ly_do: fullReason,
      })
      setSuccessResult(res)
    } catch (err) {
      setSubmitError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const isCounter = quote?.hinh_thuc_mua === 'TaiQuay'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-card rounded-lg shadow-2xl border border-hairline overflow-hidden my-8">
        {/* HEADER DONG SON */}
        <div className="bg-terracotta text-paper px-6 py-4 flex items-center justify-between relative overflow-hidden">
          <svg
            aria-hidden="true"
            className="absolute -right-4 -bottom-4 w-32 h-auto text-paper/15 pointer-events-none"
            viewBox="0 0 200 84"
            dangerouslySetInnerHTML={{ __html: craneSvg }}
          />
          <div className="flex items-center gap-2.5 relative z-10">
            <span className="material-symbols-outlined text-2xl">cancel</span>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                Xác Nhận Hủy Vé & Hoàn Tiền #{booking.ma_dat_ve}
              </h3>
              <p className="text-xs text-paper/80 font-medium">
                {booking.diem_di} → {booking.diem_den} ({booking.gio_khoi_hanh?.slice(0, 5)} · Ngày {booking.ngay_khoi_hanh})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded bg-paper/10 hover:bg-paper/20 text-paper flex items-center justify-center text-sm font-bold transition-all cursor-pointer relative z-10"
          >
            ✕
          </button>
        </div>

        {/* NỘI DUNG */}
        <div className="p-6 space-y-5 text-xs text-ink">
          {/* MÀN HÌNH THÀNH CÔNG */}
          {successResult ? (
            <div className="space-y-4">
              <div className="p-4 rounded border border-celadon bg-celadon/10 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-celadon text-paper flex items-center justify-center text-2xl mx-auto shadow-xs">
                  ✓
                </div>
                <h4 className="text-base font-extrabold text-ink">
                  Hủy Vé Thành Công!
                </h4>
                <p className="text-xs text-ink-soft font-medium leading-relaxed">
                  {successResult.thong_diep}
                </p>
              </div>

              <div className="p-4 bg-paper-deep/60 rounded border border-hairline space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-ink-soft">
                  <span>Mã đơn đặt vé:</span>
                  <span className="font-mono font-bold text-ink">#{successResult.ma_dat_ve}</span>
                </div>
                <div className="flex justify-between items-center text-ink-soft">
                  <span>Hình thức hoàn tiền:</span>
                  <span className="font-semibold text-ink">
                    {successResult.hinh_thuc_hoan === 'ChuyenKhoanNgay'
                      ? 'Tự động chuyển khoản ngân hàng'
                      : 'Nhận tiền mặt tại quầy'}
                  </span>
                </div>
                {successResult.tai_khoan_hoan && (
                  <div className="flex justify-between items-center text-celadon font-medium">
                    <span>Tài khoản nhận tiền hoàn:</span>
                    <span className="font-mono font-bold">{successResult.tai_khoan_hoan}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-ink-soft">
                  <span>Phí hủy vé đã khấu trừ (15%):</span>
                  <span className="font-mono font-semibold text-terracotta">-{formatVnd(Number(successResult.phi_huy))}</span>
                </div>
                <div className="pt-2 border-t border-hairline flex justify-between items-center text-sm font-black text-celadon">
                  <span>Số tiền thực tế hoàn lại:</span>
                  <span className="font-mono text-base">{formatVnd(Number(successResult.so_tien_hoan))}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onSuccess(successResult)
                    onClose()
                  }}
                  className="px-5 py-2.5 rounded bg-ink hover:bg-ink-soft text-paper text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Đóng & Hoàn tất
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* TRẠNG THÁI LOADING */}
              {loadingQuote && (
                <div className="py-12 text-center space-y-3">
                  <div className="inline-block w-8 h-8 border-3 border-terracotta border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-ink-soft font-medium">
                    Đang kiểm tra điều kiện hủy vé & tính biểu phí hoàn tiền Đông Sơn...
                  </p>
                </div>
              )}

              {/* LỖI KHI LẤY BÁO GIÁ */}
              {quoteError && (
                <div className="p-4 rounded border border-terracotta/30 bg-terracotta/10 text-xs text-terracotta space-y-1">
                  <p className="font-bold">❌ Không thể báo giá hủy vé:</p>
                  <p>{quoteError}</p>
                </div>
              )}

              {/* DỮ LIỆU BÁO GIÁ */}
              {quote && !loadingQuote && (
                <div className="space-y-4">
                  {/* TRƯỜNG HỢP 1: VÉ MUA TẠI QUẦY */}
                  {isCounter ? (
                    <div className="p-4 rounded border border-bronze/40 bg-bronze/10 text-ink space-y-2">
                      <div className="flex items-center gap-2 text-bronze">
                        <span className="material-symbols-outlined text-xl">store</span>
                        <h4 className="text-sm font-black">
                          Vé Mua Trực Tiếp Tại Quầy Bến Xe
                        </h4>
                      </div>
                      <p className="text-xs leading-relaxed text-ink-soft font-medium">
                        Vé được mua trực tiếp tại quầy bằng tiền mặt. Theo quy định tài chính, Quý khách vui lòng mang vé hoặc CCCD ra quầy vé tại bến xe để nhân viên đối soát và nhận lại tiền mặt.
                      </p>
                      <div className="p-2.5 bg-paper rounded text-[11px] font-semibold text-ink border border-hairline">
                        🔒 Hệ thống khóa tính năng hủy trực tuyến cho vé quầy để tránh thất thoát và bảo đảm an toàn.
                      </div>
                    </div>
                  ) : !quote.cho_phep_huy ? (
                    /* TRƯỜNG HỢP 2: VÉ ONLINE SÁT GIỜ KHỞI HÀNH (<= 24h) -> TỪ CHỐI HỦY */
                    <div className="p-4 rounded border border-terracotta/40 bg-terracotta/10 text-ink space-y-2">
                      <div className="flex items-center gap-2 text-terracotta">
                        <span className="material-symbols-outlined text-xl">error</span>
                        <h4 className="text-sm font-black">
                          Không Đủ Điều Kiện Hủy Vé Trực Tuyến
                        </h4>
                      </div>
                      <p className="text-xs leading-relaxed text-ink-soft font-medium">
                        {quote.ly_do}
                      </p>
                      <div className="p-2.5 bg-paper rounded text-[11px] text-terracotta font-semibold border border-terracotta/30">
                        * Quy định nhà xe: Yêu cầu hủy vé trực tuyến trước giờ xuất bến tối thiểu 24 giờ.
                      </div>
                    </div>
                  ) : (
                    /* TRƯỜNG HỢP 3: VÉ ONLINE ĐỦ ĐIỀU KIỆN (> 24h) */
                    <div className="space-y-4">
                      {/* BẢNG TÍNH PHÍ HOÀN TIỀN (15% PHÍ QUY ĐỊNH) */}
                      <div className="p-4 bg-paper-deep/60 rounded border border-hairline space-y-2.5 text-xs">
                        <div className="flex justify-between items-center text-ink-soft">
                          <span>Thời gian còn lại đến giờ xe chạy:</span>
                          <span className="font-mono font-bold text-ink">
                            {quote.so_gio_con_lai} giờ (đủ điều kiện {'>'} 24h)
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-ink-soft">
                          <span>Tỷ lệ phí hủy vé quy định:</span>
                          <span className="font-mono font-bold text-ink">
                            {quote.ty_le_phi_huy}% tổng tiền vé
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-ink-soft">
                          <span>Phí khấu trừ ({quote.ty_le_phi_huy}%):</span>
                          <span className="font-mono font-semibold text-terracotta">
                            -{formatVnd(Number(quote.phi_huy))}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-hairline flex justify-between items-center">
                          <span className="text-xs font-bold text-ink">
                            Số tiền thực tế Quý khách nhận lại:
                          </span>
                          <span className="text-base font-black font-mono text-celadon">
                            {formatVnd(Number(quote.so_tien_hoan_lai))}
                          </span>
                        </div>
                      </div>

                      {/* THÔNG TIN TÀI KHOẢN NGÂN HÀNG HOÀN TIỀN */}
                      <div className="p-4 bg-[#FFFDF9] border border-dashed border-bronze/60 rounded space-y-3">
                        <div className="flex items-center gap-1.5 text-bronze font-bold">
                          <span className="material-symbols-outlined text-base">account_balance</span>
                          <span>Tài khoản nhận tiền hoàn trực tuyến</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="field-label text-[11px]" htmlFor="refund-bank">
                              Ngân hàng nhận tiền <span className="text-terracotta">*</span>
                            </label>
                            <select
                              id="refund-bank"
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              className="w-full text-xs font-medium"
                            >
                              {POPULAR_BANKS.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                            </select>
                          </div>

                          {bankName === 'Khác (Nhập tay)' && (
                            <div className="space-y-1">
                              <label className="field-label text-[11px]" htmlFor="custom-bank">
                                Tên ngân hàng khác <span className="text-terracotta">*</span>
                              </label>
                              <input
                                id="custom-bank"
                                type="text"
                                value={customBankName}
                                onChange={(e) => setCustomBankName(e.target.value)}
                                placeholder="Ví dụ: Shinhan, OCB..."
                                className="w-full text-xs"
                              />
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="field-label text-[11px]" htmlFor="refund-account-num">
                              Số tài khoản ngân hàng <span className="text-terracotta">*</span>
                            </label>
                            <input
                              id="refund-account-num"
                              type="text"
                              value={accountNumber}
                              onChange={(e) => setAccountNumber(e.target.value)}
                              placeholder="Ví dụ: 0912345678, 1903..."
                              className="w-full text-xs font-mono font-bold"
                            />
                          </div>

                          <div className="space-y-1 sm:col-span-2">
                            <label className="field-label text-[11px]" htmlFor="refund-holder">
                              Tên chủ tài khoản (In hoa không dấu) <span className="text-terracotta">*</span>
                            </label>
                            <input
                              id="refund-holder"
                              type="text"
                              value={accountHolder}
                              onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                              placeholder="NGUYEN VAN A"
                              className="w-full text-xs font-bold uppercase tracking-wider"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Ô NHẬP LÝ DO HỦY */}
                      <div className="space-y-1.5">
                        <label className="field-label text-[11px]" htmlFor="cancel-reason">
                          Lý do hủy vé <span className="text-terracotta">*</span>
                        </label>
                        <textarea
                          id="cancel-reason"
                          rows={2}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Ví dụ: Có việc bận đột xuất, thay đổi lịch trình cá nhân..."
                          className="w-full text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {submitError && (
                    <div className="p-3 rounded border border-terracotta/30 bg-terracotta/10 text-xs text-terracotta font-semibold">
                      ❌ {submitError}
                    </div>
                  )}

                  {/* NÚT THAO TÁC */}
                  <div className="pt-3 border-t border-hairline flex items-center justify-between">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={submitting}
                      className="px-4 py-2 rounded border border-hairline text-ink hover:bg-paper-deep text-xs font-semibold transition cursor-pointer"
                    >
                      Đóng
                    </button>

                    {/* NÚT XÁC NHẬN CHỈ BẬT KHI ĐỦ ĐIỀU KIỆN VÀ KHÔNG PHẢI TẠI QUẦY */}
                    {!isCounter && quote.cho_phep_huy ? (
                      <button
                        type="button"
                        onClick={handleConfirmCancel}
                        disabled={submitting}
                        className="cta-terracotta px-5 py-2.5 rounded text-paper font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <span className="inline-block w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin"></span>
                            <span>Đang xử lý hoàn tiền...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-base">payments</span>
                            <span>Xác nhận hủy & nhận tiền hoàn</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2 rounded bg-paper-deep text-ink-soft border border-hairline text-xs font-bold cursor-not-allowed"
                      >
                        Không thể hủy online
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
