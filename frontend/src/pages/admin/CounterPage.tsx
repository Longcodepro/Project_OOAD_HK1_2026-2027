import { useEffect, useState, useMemo } from 'react'
import type {
  BienLaiHoanTienResponse,
  ChuyenXe,
  DatVeResponse,
  Ghe,
  PhieuInVeResponse,
  SoDoGhe,
  ThongKeCaResponse,
  TuyenXe,
} from '../../types/counter'
import {
  apiErrorMessage,
  counterCreateTicket,
  counterGetPrintTicket,
  counterGetShiftSummary,
  counterHoldPhoneBooking,
  counterRefundCash,
  formatVnd,
  getRoutes,
  getSeatMap,
  getTrips,
  lookupTickets,
} from '../../services/api'

export interface CounterPageProps {
  user?: any
  onOpenScanner?: () => void
}

// Helper mở cửa sổ in nhiệt (40 cột ASCII)
function printAsciiContent(text: string, title: string = 'In biên nhận POS'): void {
  const printWindow = window.open('', '_blank', 'width=420,height=600')
  if (!printWindow) {
    alert('Trình duyệt đã chặn cửa sổ bật lên. Vui lòng cho phép popup để in vé!')
    return
  }
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            line-height: 1.4;
            padding: 12px;
            margin: 0;
            background: #fff;
            color: #000;
          }
          pre {
            white-space: pre-wrap;
            margin: 0;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <pre>${text}</pre>
        <script>
          window.focus();
          window.print();
          setTimeout(() => window.close(), 1000);
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

export function CounterPage({ user, onOpenScanner }: CounterPageProps = {}) {
  const [activeTab, setActiveTab] = useState<'sell' | 'refund' | 'shift'>('sell')
  const [targetTabToSwitch, setTargetTabToSwitch] = useState<'sell' | 'refund' | 'shift' | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false)

  // ==================== TAB 1: BÁN VÉ & GIỮ CHỖ ====================
  const [routes, setRoutes] = useState<TuyenXe[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<number | ''>('')
  const [trips, setTrips] = useState<ChuyenXe[]>([])
  const [selectedTripId, setSelectedTripId] = useState<number | ''>('')
  const [seatMap, setSeatMap] = useState<SoDoGhe | null>(null)
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([])

  // Form khách hàng (nhập trực tiếp, không gợi ý tự động)
  const [customerName, setCustomerName] = useState<string>('')
  const [customerPhone, setCustomerPhone] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('TienMatTaiQuay')
  const [bookingNote, setBookingNote] = useState<string>('')

  // Trạng thái xử lý
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [sellError, setSellError] = useState<string | null>(null)
  const [sellSuccessMsg, setSellSuccessMsg] = useState<string | null>(null)

  // Modal in phôi vé nhiệt
  const [printableTicket, setPrintableTicket] = useState<PhieuInVeResponse | null>(null)

  // ==================== TAB 2: HỦY VÉ & HOÀN TIỀN MẶT ====================
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searching, setSearching] = useState<boolean>(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [foundOrders, setFoundOrders] = useState<DatVeResponse[]>([])
  const [selectedOrderToRefund, setSelectedOrderToRefund] = useState<DatVeResponse | null>(null)
  const [refundReason, setRefundReason] = useState<string>('Khách mang vé ra quầy trả và nhận lại tiền mặt')
  const [customRefundFee, setCustomRefundFee] = useState<string>('')
  const [refunding, setRefunding] = useState<boolean>(false)
  const [refundReceipt, setRefundReceipt] = useState<BienLaiHoanTienResponse | null>(null)

  // ==================== TAB 3: ĐỐI SOÁT CA TRỰC ====================
  const [shiftStartTime, setShiftStartTime] = useState<string>('07:00')
  const [shiftDate, setShiftDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [shiftData, setShiftData] = useState<ThongKeCaResponse | null>(null)
  const [loadingShift, setLoadingShift] = useState<boolean>(false)
  const [shiftError, setShiftError] = useState<string | null>(null)

  // ==================== NAVIGATION GUARD ====================
  const hasUnsavedProgress = useMemo(() => {
    return selectedSeatIds.length > 0 || customerName.trim().length > 0 || customerPhone.trim().length > 0
  }, [selectedSeatIds, customerName, customerPhone])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedProgress) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedProgress])

  const handleTabClick = (tab: 'sell' | 'refund' | 'shift') => {
    if (tab === activeTab) return
    if (activeTab === 'sell' && hasUnsavedProgress) {
      setTargetTabToSwitch(tab)
      setShowExitConfirm(true)
    } else {
      setActiveTab(tab)
    }
  }

  const confirmExitBooking = () => {
    setSelectedSeatIds([])
    setCustomerName('')
    setCustomerPhone('')
    setBookingNote('')
    setSellError(null)
    setSellSuccessMsg(null)
    setShowExitConfirm(false)
    if (targetTabToSwitch) {
      setActiveTab(targetTabToSwitch)
      setTargetTabToSwitch(null)
    }
  }

  // ==================== KHỞI TẠO DỮ LIỆU ====================
  useEffect(() => {
    getRoutes()
      .then((data) => {
        setRoutes(data)
        if (data.length > 0) {
          setSelectedRouteId(data[0].ma_tuyen)
        }
      })
      .catch((err) => {
        setSellError(apiErrorMessage(err))
      })
  }, [])

  useEffect(() => {
    if (!selectedRouteId) {
      setTrips([])
      setSelectedTripId('')
      setSeatMap(null)
      return
    }
    getTrips({ ma_tuyen: Number(selectedRouteId) })
      .then((data) => {
        setTrips(data)
        if (data.length > 0) {
          setSelectedTripId(data[0].ma_chuyen)
        } else {
          setSelectedTripId('')
          setSeatMap(null)
        }
      })
      .catch((err) => {
        setSellError(apiErrorMessage(err))
      })
  }, [selectedRouteId])

  useEffect(() => {
    if (!selectedTripId) {
      setSeatMap(null)
      setSelectedSeatIds([])
      return
    }
    getSeatMap(Number(selectedTripId))
      .then((data) => {
        setSeatMap(data)
        setSelectedSeatIds([])
      })
      .catch((err) => {
        setSellError(apiErrorMessage(err))
      })
  }, [selectedTripId])

  const toggleSeat = (seat: Ghe) => {
    if (seat.trang_thai_chuyen !== 'TRONG' || seat.trang_thai_vat_ly !== 'Trong') {
      return
    }
    setSellError(null)
    setSellSuccessMsg(null)
    if (selectedSeatIds.includes(seat.ma_ghe)) {
      setSelectedSeatIds(selectedSeatIds.filter((id) => id !== seat.ma_ghe))
    } else {
      if (selectedSeatIds.length >= 10) {
        setSellError('Chính sách quầy: Mỗi đơn bán tối đa 10 ghế.')
        return
      }
      setSelectedSeatIds([...selectedSeatIds, seat.ma_ghe])
    }
  }

  const totalAmount = useMemo(() => {
    if (!seatMap) return 0
    let sum = 0
    seatMap.danh_sach_ghe.forEach((g) => {
      if (selectedSeatIds.includes(g.ma_ghe)) {
        sum += typeof g.gia_ve === 'string' ? parseFloat(g.gia_ve) : g.gia_ve
      }
    })
    return sum
  }, [seatMap, selectedSeatIds])

  const selectedSeatNames = useMemo(() => {
    if (!seatMap) return []
    return seatMap.danh_sach_ghe.filter((g) => selectedSeatIds.includes(g.ma_ghe)).map((g) => g.so_ghe)
  }, [seatMap, selectedSeatIds])

  // Fast POS ticketing (POST /api/quay/dat-ve)
  const handleSellDirect = async () => {
    if (!selectedTripId) {
      setSellError('Vui lòng chọn chuyến xe trước.')
      return
    }
    if (selectedSeatIds.length === 0) {
      setSellError('Vui lòng chọn ít nhất 1 ghế trên sơ đồ.')
      return
    }
    if (!customerName.trim()) {
      setSellError('Vui lòng nhập họ tên khách hàng.')
      return
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 9) {
      setSellError('Vui lòng nhập số điện thoại hợp lệ của khách hàng.')
      return
    }

    setSubmitting(true)
    setSellError(null)
    setSellSuccessMsg(null)

    try {
      const order = await counterCreateTicket({
        ma_chuyen: Number(selectedTripId),
        danh_sach_ma_ghe: selectedSeatIds,
        ho_ten: customerName.trim(),
        sdt: customerPhone.trim(),
        phuong_thuc: paymentMethod,
        ghi_chu: bookingNote.trim() || undefined,
      })

      setSellSuccessMsg(`Xuất vé thành công! Mã đơn: #${order.ma_dat_ve} (${order.trang_thai})`)
      // Tải phôi in vé nhiệt 40 cột (GET /api/quay/ve/{id}/in-ve)
      const printData = await counterGetPrintTicket(order.ma_dat_ve)
      setPrintableTicket(printData)

      // Cập nhật lại sơ đồ ghế
      const updatedSeatMap = await getSeatMap(Number(selectedTripId))
      setSeatMap(updatedSeatMap)
      setSelectedSeatIds([])
      setCustomerName('')
      setCustomerPhone('')
      setBookingNote('')
    } catch (err) {
      setSellError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Phone reservation hold (POST /api/quay/giu-cho-dien-thoai)
  const handleHoldByPhone = async () => {
    if (!selectedTripId) {
      setSellError('Vui lòng chọn chuyến xe trước.')
      return
    }
    if (selectedSeatIds.length === 0) {
      setSellError('Vui lòng chọn ít nhất 1 ghế cần giữ chỗ.')
      return
    }
    if (!customerName.trim()) {
      setSellError('Vui lòng nhập họ tên người gọi đặt giữ chỗ.')
      return
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 9) {
      setSellError('Vui lòng nhập số điện thoại khách gọi đặt.')
      return
    }

    setSubmitting(true)
    setSellError(null)
    setSellSuccessMsg(null)

    try {
      const order = await counterHoldPhoneBooking({
        ma_chuyen: Number(selectedTripId),
        danh_sach_ma_ghe: selectedSeatIds,
        ho_ten: customerName.trim(),
        sdt: customerPhone.trim(),
        thoi_han_phut: 60,
        ghi_chu: bookingNote.trim() || undefined,
      })

      setSellSuccessMsg(
        `Giữ chỗ qua điện thoại thành công! Mã đơn #${order.ma_dat_ve} (Trạng thái: ${order.trang_thai}). Hạn nhận vé: ${new Date(order.han_thanh_toan).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`
      )

      const updatedSeatMap = await getSeatMap(Number(selectedTripId))
      setSeatMap(updatedSeatMap)
      setSelectedSeatIds([])
      setCustomerName('')
      setCustomerPhone('')
      setBookingNote('')
    } catch (err) {
      setSellError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // ==================== XỬ LÝ TAB 2: TÌM & HỦY VÉ ====================
  const handleSearchTickets = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      setSearchError('Vui lòng nhập Mã đơn đặt vé hoặc Số điện thoại.')
      return
    }
    setSearching(true)
    setSearchError(null)
    setSelectedOrderToRefund(null)
    setRefundReceipt(null)

    try {
      const isNum = /^\d+$/.test(searchQuery.trim())
      const params = isNum && searchQuery.trim().length <= 6
        ? { ma_dat_ve: parseInt(searchQuery.trim(), 10) }
        : { sdt: searchQuery.trim() }

      const list = await lookupTickets(params)
      if (list.length === 0) {
        setSearchError('Không tìm thấy đơn đặt vé nào phù hợp với thông tin tra cứu.')
      } else {
        setFoundOrders(list)
        setSelectedOrderToRefund(list[0])
      }
    } catch (err) {
      setSearchError(apiErrorMessage(err))
    } finally {
      setSearching(false)
    }
  }

  // Cash refund (POST /api/quay/ve/{id}/hoan-tien-mat)
  const handleRefundCashSubmit = async () => {
    if (!selectedOrderToRefund) return
    setRefunding(true)
    setSearchError(null)

    try {
      const payloadFee = customRefundFee.trim() !== '' ? parseFloat(customRefundFee) : undefined
      const receipt = await counterRefundCash(selectedOrderToRefund.ma_dat_ve, {
        ly_do: refundReason.trim() || 'Khách mang vé ra quầy trả và nhận lại tiền mặt',
        phi_huy_tuy_chinh: payloadFee,
      })
      setRefundReceipt(receipt)
      setSelectedOrderToRefund({
        ...selectedOrderToRefund,
        trang_thai: 'DaHuy',
      })
    } catch (err) {
      setSearchError(apiErrorMessage(err))
    } finally {
      setRefunding(false)
    }
  }

  // ==================== XỬ LÝ TAB 3: ĐỐI SOÁT CA ====================
  const fetchShiftSummary = async () => {
    setLoadingShift(true)
    setShiftError(null)
    try {
      const data = await counterGetShiftSummary(shiftStartTime, shiftDate)
      setShiftData(data)
    } catch (err) {
      setShiftError(apiErrorMessage(err))
    } finally {
      setLoadingShift(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'shift') {
      fetchShiftSummary()
    }
  }, [activeTab])

  const floor1Seats = useMemo(() => {
    return seatMap?.danh_sach_ghe.filter((g) => g.tang === 1) || []
  }, [seatMap])

  const floor2Seats = useMemo(() => {
    return seatMap?.danh_sach_ghe.filter((g) => g.tang === 2) || []
  }, [seatMap])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* HEADER QUẦY BÁN VÉ */}
      <div className="bg-card rounded-xl shadow-xs border border-hairline p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700">
              Quầy Bán Vé POS
            </span>
            <span className="text-xs text-ink-soft">
              {user ? `Thu ngân: ${user.fullName || user.username}` : 'Dành riêng cho Nhân viên Bán Vé'}
            </span>
          </div>
          <h1 className="text-2xl font-serif font-black text-ink mt-1 tracking-tight">
            Bán Vé & Đối Soát Doanh Thu Quầy
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <span>📷</span>
              <span>Soát vé lên xe</span>
            </button>
          )}

          {/* TAB SWITCHER */}
          <div className="flex items-center p-1 bg-paper-deep rounded-lg border border-hairline">
            <button
              type="button"
              onClick={() => handleTabClick('sell')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'sell'
                  ? 'bg-card text-terracotta shadow-xs'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Tab 1: Bán Vé & Giữ Chỗ
            </button>
            <button
              type="button"
              onClick={() => handleTabClick('refund')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'refund'
                  ? 'bg-card text-terracotta shadow-xs'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Tab 2: Hủy Vé & Trả Tiền Mặt
            </button>
            <button
              type="button"
              onClick={() => handleTabClick('shift')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'shift'
                  ? 'bg-card text-terracotta shadow-xs'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Tab 3: Đối Soát Ca Trực
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: BÁN VÉ & GIỮ CHỖ TẠI QUẦY                         */}
      {/* ======================================================== */}
      {activeTab === 'sell' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI (7 CỘT): TÌM CHUYẾN & SƠ ĐỒ GHẾ */}
          <div className="lg:col-span-7 space-y-6">
            {/* Bộ lọc tuyến & chuyến */}
            <div className="bg-card rounded-xl shadow-xs border border-hairline p-5 space-y-4">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <span>📍</span> 1. Chọn Tuyến Đường & Chuyến Xe
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Tuyến đường
                  </label>
                  <select
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(Number(e.target.value))}
                    className="w-full text-sm border border-hairline rounded-lg p-2.5 bg-paper focus:bg-card focus:ring-2 focus:ring-terracotta outline-hidden"
                  >
                    {routes.map((r) => (
                      <option key={r.ma_tuyen} value={r.ma_tuyen}>
                        {r.diem_di} ➔ {r.diem_den}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Chuyến xe mở bán
                  </label>
                  <select
                    value={selectedTripId}
                    onChange={(e) => setSelectedTripId(Number(e.target.value))}
                    disabled={trips.length === 0}
                    className="w-full text-sm border border-hairline rounded-lg p-2.5 bg-paper focus:bg-card focus:ring-2 focus:ring-terracotta outline-hidden disabled:opacity-50"
                  >
                    {trips.length === 0 ? (
                      <option value="">Chưa có chuyến mở bán</option>
                    ) : (
                      trips.map((t) => (
                        <option key={t.ma_chuyen} value={t.ma_chuyen}>
                          {t.gio_khoi_hanh} ({t.ngay_khoi_hanh}) — {t.bien_so} ({formatVnd(t.gia_ve)})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* SƠ ĐỒ GHẾ TRỰC QUAN */}
            <div className="bg-card rounded-xl shadow-xs border border-hairline p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
                <div>
                  <h2 className="text-base font-bold text-ink flex items-center gap-2">
                    <span>💺</span> 2. Sơ Đồ Ghế Xe Trực Quan
                  </h2>
                  {seatMap && (
                    <p className="text-xs text-ink-soft mt-0.5">
                      Xe: <b className="text-ink">{seatMap.bien_so}</b> ({seatMap.ten_loai_xe}) •
                      Còn trống: <b className="text-emerald-700 font-bold">{seatMap.so_ghe_trong}</b> ghế
                    </p>
                  )}
                </div>

                {/* Chú thích màu sắc */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-xs bg-paper border border-hairline inline-block"></span>
                    <span className="text-ink-soft">Trống</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-xs bg-terracotta border border-terracotta-hover inline-block"></span>
                    <span className="text-terracotta font-bold">Đang chọn</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-xs bg-paper-deep border border-hairline inline-block"></span>
                    <span className="text-ink-soft">Đã bán</span>
                  </div>
                </div>
              </div>

              {!seatMap ? (
                <div className="py-12 text-center text-sm text-ink-soft">
                  Vui lòng chọn chuyến xe để tải sơ đồ ghế.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* TẦNG 1 */}
                  <div>
                    <div className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span>TẦNG DƯỚI (TẦNG 1)</span>
                      <span className="h-px bg-hairline flex-1"></span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                      {floor1Seats.map((seat) => {
                        const isSelected = selectedSeatIds.includes(seat.ma_ghe)
                        const isOccupied = seat.trang_thai_chuyen !== 'TRONG' || seat.trang_thai_vat_ly !== 'Trong'
                        return (
                          <button
                            key={seat.ma_ghe}
                            type="button"
                            disabled={isOccupied}
                            onClick={() => toggleSeat(seat)}
                            className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                              isOccupied
                                ? 'bg-paper-deep border-hairline text-ink-soft cursor-not-allowed opacity-60'
                                : isSelected
                                ? 'bg-terracotta border-terracotta-hover text-white shadow-xs ring-2 ring-orange-200 font-bold'
                                : 'bg-paper border-hairline text-ink hover:bg-orange-50 hover:border-terracotta'
                            }`}
                          >
                            <span className="text-xs font-mono font-bold">{seat.so_ghe}</span>
                            <span className="text-[10px] mt-0.5 opacity-80">
                              {isOccupied ? 'Đã bán' : formatVnd(seat.gia_ve)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* TẦNG 2 (NẾU CÓ) */}
                  {floor2Seats.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span>TẦNG TRÊN (TẦNG 2)</span>
                        <span className="h-px bg-hairline flex-1"></span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                        {floor2Seats.map((seat) => {
                          const isSelected = selectedSeatIds.includes(seat.ma_ghe)
                          const isOccupied = seat.trang_thai_chuyen !== 'TRONG' || seat.trang_thai_vat_ly !== 'Trong'
                          return (
                            <button
                              key={seat.ma_ghe}
                              type="button"
                              disabled={isOccupied}
                              onClick={() => toggleSeat(seat)}
                              className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                                isOccupied
                                  ? 'bg-paper-deep border-hairline text-ink-soft cursor-not-allowed opacity-60'
                                  : isSelected
                                  ? 'bg-terracotta border-terracotta-hover text-white shadow-xs ring-2 ring-orange-200 font-bold'
                                  : 'bg-paper border-hairline text-ink hover:bg-orange-50 hover:border-terracotta'
                              }`}
                            >
                              <span className="text-xs font-mono font-bold">{seat.so_ghe}</span>
                              <span className="text-[10px] mt-0.5 opacity-80">
                                {isOccupied ? 'Đã bán' : formatVnd(seat.gia_ve)}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI (5 CỘT): FORM KHÁCH HÀNG & THAO TÁC POS */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-card rounded-xl shadow-xs border border-hairline p-5 space-y-5">
              <h2 className="text-base font-bold text-ink flex items-center gap-2 border-b border-hairline pb-3">
                <span>📝</span> 3. Thông Tin Bán Vé & Thanh Toán
              </h2>

              {sellError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  ❌ {sellError}
                </div>
              )}
              {sellSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                  ✅ {sellSuccessMsg}
                </div>
              )}

              {/* Tóm tắt ghế đang chọn */}
              <div className="p-3.5 rounded-lg bg-orange-50/60 border border-orange-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-soft font-medium">Ghế đang chọn:</span>
                  <span className="font-mono font-bold text-terracotta">
                    {selectedSeatNames.length > 0 ? selectedSeatNames.join(', ') : 'Chưa chọn ghế'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-soft font-medium">Số lượng:</span>
                  <span className="font-bold text-ink">{selectedSeatIds.length} vé</span>
                </div>
                <div className="flex items-center justify-between text-sm font-extrabold border-t border-orange-200 pt-2">
                  <span className="text-ink">TỔNG TIỀN:</span>
                  <span className="text-terracotta font-mono text-base">{formatVnd(totalAmount)}</span>
                </div>
              </div>

              {/* Form nhập thông tin khách */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Họ và tên khách hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập họ và tên hành khách..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full text-sm border border-hairline rounded-lg p-2.5 bg-paper focus:bg-card focus:ring-2 focus:ring-terracotta outline-hidden"
                  />
                  <p className="text-[11px] text-ink-soft mt-1">
                    Nhập trực tiếp họ tên hành khách vãng lai mua tại quầy.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Số điện thoại liên hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Ví dụ: 0908123456"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full text-sm border border-hairline rounded-lg p-2.5 bg-paper focus:bg-card focus:ring-2 focus:ring-terracotta outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Phương thức thu tiền
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('TienMatTaiQuay')}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        paymentMethod === 'TienMatTaiQuay'
                          ? 'bg-orange-50 border-terracotta text-terracotta ring-1 ring-orange-300'
                          : 'bg-card border-hairline text-ink hover:bg-paper'
                      }`}
                    >
                      💵 Tiền mặt tại quầy
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('ChuyenKhoanPOS')}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        paymentMethod === 'ChuyenKhoanPOS'
                          ? 'bg-orange-50 border-terracotta text-terracotta ring-1 ring-orange-300'
                          : 'bg-card border-hairline text-ink hover:bg-paper'
                      }`}
                    >
                      💳 Thẻ / POS Chuyển khoản
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Ghi chú đơn vé
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ghi chú in vé hoặc điểm đón nếu có..."
                    value={bookingNote}
                    onChange={(e) => setBookingNote(e.target.value)}
                    className="w-full text-sm border border-hairline rounded-lg p-2 bg-paper focus:bg-card focus:ring-2 focus:ring-terracotta outline-hidden"
                  />
                </div>
              </div>

              {/* NÚT THAO TÁC POS */}
              <div className="space-y-2 pt-2 border-t border-hairline">
                <button
                  type="button"
                  disabled={submitting || selectedSeatIds.length === 0}
                  onClick={handleSellDirect}
                  className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-sm rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>🖨️</span>
                  <span>{submitting ? 'Đang xử lý xuất vé...' : 'THU TIỀN NGAY & IN VÉ'}</span>
                </button>

                <button
                  type="button"
                  disabled={submitting || selectedSeatIds.length === 0}
                  onClick={handleHoldByPhone}
                  className="w-full py-2.5 px-4 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>📞</span>
                  <span>GIỮ CHỖ QUA ĐIỆN THOẠI (CHỜ THANH TOÁN)</span>
                </button>

                {hasUnsavedProgress && (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetTabToSwitch('sell')
                      setShowExitConfirm(true)
                    }}
                    className="w-full py-1.5 text-xs font-semibold text-ink-soft hover:text-terracotta transition-colors cursor-pointer"
                  >
                    Hủy chọn ghế & làm mới form
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: HỦY VÉ & TRẢ TIỀN MẶT                             */}
      {/* ======================================================== */}
      {activeTab === 'refund' && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl shadow-xs border border-hairline p-5">
            <h2 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
              <span>🔍</span> Tra Cứu Vé Khách Mang Ra Quầy
            </h2>
            <form onSubmit={handleSearchTickets} className="flex gap-3 max-w-xl">
              <input
                type="text"
                placeholder="Nhập Mã vé (Ví dụ: 78) hoặc Số điện thoại của khách..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm border border-hairline rounded-lg p-2.5 bg-paper focus:bg-card focus:ring-2 focus:ring-terracotta outline-hidden"
              />
              <button
                type="submit"
                disabled={searching}
                className="px-5 py-2.5 bg-terracotta hover:bg-terracotta-hover text-white font-bold text-sm rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {searching ? 'Đang tìm...' : 'Tìm kiếm'}
              </button>
            </form>
            {searchError && (
              <p className="text-xs font-semibold text-red-600 mt-2">❌ {searchError}</p>
            )}
          </div>

          {/* DANH SÁCH CÁC ĐƠN TÌM THẤY */}
          {foundOrders.length > 1 && (
            <div className="bg-card rounded-xl shadow-xs border border-hairline p-4 space-y-2">
              <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wider">
                Tìm thấy {foundOrders.length} đơn đặt vé — Chọn đơn cần xử lý:
              </h3>
              <div className="flex flex-wrap gap-2">
                {foundOrders.map((ord) => (
                  <button
                    key={ord.ma_dat_ve}
                    type="button"
                    onClick={() => {
                      setSelectedOrderToRefund(ord)
                      setRefundReceipt(null)
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      selectedOrderToRefund?.ma_dat_ve === ord.ma_dat_ve
                        ? 'bg-terracotta text-white border-terracotta-hover shadow-xs'
                        : 'bg-paper border-hairline text-ink hover:bg-paper-deep'
                    }`}
                  >
                    Đơn #{ord.ma_dat_ve} ({ord.danh_sach_ve.map((v) => v.so_ghe).join(', ')}) — {formatVnd(ord.tong_tien)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* KẾT QUẢ TÌM THẤY & FORM HOÀN TIỀN */}
          {selectedOrderToRefund && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* CHI TIẾT ĐƠN */}
              <div className="md:col-span-6 bg-card rounded-xl shadow-xs border border-hairline p-5 space-y-4">
                <h3 className="text-sm font-bold text-ink border-b border-hairline pb-2 flex items-center justify-between">
                  <span>Thông tin đơn vé #{selectedOrderToRefund.ma_dat_ve}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      selectedOrderToRefund.trang_thai === 'DaThanhToan'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedOrderToRefund.trang_thai === 'DaHuy'
                        ? 'bg-paper-deep text-ink-soft'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedOrderToRefund.trang_thai}
                  </span>
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-hairline/50">
                    <span className="text-ink-soft">Khách hàng:</span>
                    <span className="font-semibold text-ink">{selectedOrderToRefund.ho_ten_kh}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-hairline/50">
                    <span className="text-ink-soft">Số điện thoại:</span>
                    <span className="font-semibold text-ink">{selectedOrderToRefund.sdt_kh}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-hairline/50">
                    <span className="text-ink-soft">Tuyến đường:</span>
                    <span className="font-semibold text-ink">
                      {selectedOrderToRefund.diem_di} ➔ {selectedOrderToRefund.diem_den}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-hairline/50">
                    <span className="text-ink-soft">Khởi hành:</span>
                    <span className="font-semibold text-ink">
                      {selectedOrderToRefund.gio_khoi_hanh} ({selectedOrderToRefund.ngay_khoi_hanh})
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-hairline/50">
                    <span className="text-ink-soft">Ghế ngồi:</span>
                    <span className="font-mono font-bold text-terracotta">
                      {selectedOrderToRefund.danh_sach_ve.map((v) => v.so_ghe).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-sm font-bold pt-2 border-t border-hairline">
                    <span className="text-ink">Tổng tiền ban đầu:</span>
                    <span className="text-ink font-mono">{formatVnd(selectedOrderToRefund.tong_tien)}</span>
                  </div>
                </div>
              </div>

              {/* FORM XÁC NHẬN CHI TIỀN MẶT */}
              <div className="md:col-span-6 bg-card rounded-xl shadow-xs border border-hairline p-5 space-y-4">
                <h3 className="text-sm font-bold text-ink border-b border-hairline pb-2">
                  Xác nhận chi hoàn tiền mặt tại quầy
                </h3>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 leading-relaxed">
                  💡 Nhân viên quầy kiểm tra cẩn thận vé giấy hoặc CCCD/SĐT của khách trước khi bấm chi tiền mặt. Hệ thống sẽ tự động cập nhật đơn thành <b>Đã Hủy</b> và giải phóng ghế.
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">
                      Lý do hủy / hoàn trả tiền mặt
                    </label>
                    <input
                      type="text"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="w-full text-sm border border-hairline rounded-lg p-2 bg-paper focus:bg-card focus:ring-2 focus:ring-terracotta outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1">
                      Phí hủy điều chỉnh (VNĐ) — <i>(Tùy chọn, để trống sẽ áp dụng theo chính sách tự động)</i>
                    </label>
                    <input
                      type="number"
                      placeholder="Mặc định theo hệ thống (10% nếu > 24h, 100% nếu cận giờ, 0% nếu hủy chuyến)"
                      value={customRefundFee}
                      onChange={(e) => setCustomRefundFee(e.target.value)}
                      className="w-full text-sm border border-hairline rounded-lg p-2 bg-paper focus:bg-card focus:ring-2 focus:ring-terracotta outline-hidden"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={refunding || selectedOrderToRefund.trang_thai === 'DaHuy'}
                    onClick={handleRefundCashSubmit}
                    className="w-full py-3 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white font-bold text-sm rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>💸</span>
                    <span>
                      {selectedOrderToRefund.trang_thai === 'DaHuy'
                        ? 'ĐƠN ĐÃ ĐƯỢC HOÀN TIỀN'
                        : refunding
                        ? 'Đang xử lý...'
                        : 'XÁC NHẬN CHI TIỀN MẶT & IN PHIẾU CHI'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ĐỐI SOÁT CA TRỰC                                   */}
      {/* ======================================================== */}
      {activeTab === 'shift' && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl shadow-xs border border-hairline p-5">
            <h2 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
              <span>⏱️</span> Đối Soát Doanh Thu Ca Trực Theo Giờ Bắt Đầu
            </h2>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Giờ bắt đầu ca
                </label>
                <input
                  type="time"
                  value={shiftStartTime}
                  onChange={(e) => setShiftStartTime(e.target.value)}
                  className="text-sm border border-hairline rounded-lg p-2 bg-paper focus:bg-card focus:ring-2 focus:ring-terracotta outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Ngày đối soát
                </label>
                <input
                  type="date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                  className="text-sm border border-hairline rounded-lg p-2 bg-paper focus:bg-card focus:ring-2 focus:ring-terracotta outline-hidden font-mono"
                />
              </div>

              <button
                type="button"
                disabled={loadingShift}
                onClick={fetchShiftSummary}
                className="px-5 py-2.5 bg-terracotta hover:bg-terracotta-hover text-white font-bold text-sm rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingShift ? 'Đang tải đối soát...' : 'Lấy Dữ Liệu Đối Soát'}
              </button>
            </div>
            {shiftError && (
              <p className="text-xs font-semibold text-red-600 mt-2">❌ {shiftError}</p>
            )}
          </div>

          {/* 4 THẺ KPI ĐỐI SOÁT */}
          {shiftData && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card p-4 rounded-xl border border-hairline shadow-xs">
                  <p className="text-xs font-semibold text-ink-soft">Đơn đã bán / Số vé</p>
                  <p className="text-2xl font-black text-ink mt-1">
                    {shiftData.tong_so_don} đơn <span className="text-sm font-normal text-ink-soft">({shiftData.tong_so_ve_ban} vé)</span>
                  </p>
                  <p className="text-[11px] text-ink-soft mt-1">Từ {shiftData.gio_bat_dau} đến hiện tại</p>
                </div>

                <div className="bg-card p-4 rounded-xl border border-hairline shadow-xs">
                  <p className="text-xs font-semibold text-ink-soft">Tiền mặt thu vào</p>
                  <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
                    {formatVnd(shiftData.doanh_thu_tien_mat)}
                  </p>
                  <p className="text-[11px] text-ink-soft mt-1">POS thẻ: {formatVnd(shiftData.doanh_thu_chuyen_khoan)}</p>
                </div>

                <div className="bg-card p-4 rounded-xl border border-hairline shadow-xs">
                  <p className="text-xs font-semibold text-ink-soft">Tiền hoàn chi ra</p>
                  <p className="text-2xl font-black text-rose-700 font-mono mt-1">
                    {formatVnd(shiftData.tong_tien_mat_hoan)}
                  </p>
                  <p className="text-[11px] text-ink-soft mt-1">Các phiếu chi hoàn vé tại quầy</p>
                </div>

                <div className="bg-orange-50/70 p-4 rounded-xl border border-orange-200 shadow-xs">
                  <p className="text-xs font-bold text-terracotta uppercase tracking-wider">Tiền mặt cần bàn giao</p>
                  <p className="text-2xl font-black text-terracotta font-mono mt-1">
                    {formatVnd(shiftData.tien_mat_thuc_thu)}
                  </p>
                  <p className="text-[11px] text-terracotta font-medium mt-1">
                    (Tiền mặt thu vào - Tiền hoàn chi ra)
                  </p>
                </div>
              </div>

              {/* BẢNG DANH SÁCH CÁC ĐƠN VỪA BÁN TRONG CA */}
              <div className="bg-card rounded-xl shadow-xs border border-hairline overflow-hidden">
                <div className="p-4 border-b border-hairline flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink">
                    Danh Sách Đơn Bán Trong Ca ({shiftData.danh_sach_don.length})
                  </h3>
                  <span className="text-xs text-ink-soft">
                    Nhân viên: <b className="text-ink">{shiftData.ho_ten_nv}</b>
                  </span>
                </div>

                {shiftData.danh_sach_don.length === 0 ? (
                  <div className="p-8 text-center text-sm text-ink-soft">
                    Chưa có đơn vé nào được lập từ mốc {shiftData.gio_bat_dau}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-ink">
                      <thead className="bg-paper-deep text-ink-soft font-semibold uppercase tracking-wider border-b border-hairline">
                        <tr>
                          <th className="p-3">Mã đơn</th>
                          <th className="p-3">Thời gian</th>
                          <th className="p-3">Khách hàng</th>
                          <th className="p-3">Tuyến & Ghế</th>
                          <th className="p-3">Số tiền</th>
                          <th className="p-3">Hình thức</th>
                          <th className="p-3">Trạng thái</th>
                          <th className="p-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline/60 font-medium">
                        {shiftData.danh_sach_don.map((item) => (
                          <tr key={item.ma_dat_ve} className="hover:bg-paper/80 transition-colors">
                            <td className="p-3 font-mono font-bold text-ink">#{item.ma_dat_ve}</td>
                            <td className="p-3 text-ink-soft">
                              {new Date(item.thoi_gian).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-ink">{item.ho_ten_khach || 'Khách vãng lai'}</div>
                              <div className="text-[11px] text-ink-soft font-mono">{item.sdt_khach}</div>
                            </td>
                            <td className="p-3">
                              <div>{item.tuyen_xe}</div>
                              <div className="font-mono font-bold text-terracotta">Ghế: {item.so_ghe}</div>
                            </td>
                            <td className="p-3 font-mono font-bold text-ink">{formatVnd(item.so_tien)}</td>
                            <td className="p-3 text-[11px] font-semibold text-ink-soft">{item.phuong_thuc}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.trang_thai === 'DaThanhToan'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.trang_thai === 'DaHuy'
                                    ? 'bg-paper-deep text-ink-soft'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {item.trang_thai}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const printData = await counterGetPrintTicket(item.ma_dat_ve)
                                    setPrintableTicket(printData)
                                  } catch (err) {
                                    alert(apiErrorMessage(err))
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-hairline bg-card hover:bg-paper text-ink transition-colors cursor-pointer"
                              >
                                🖨️ In lại vé
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL NAVIGATION GUARD: XÁC NHẬN KHI THOÁT TIẾN TRÌNH    */}
      {/* ======================================================== */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-hairline">
            <div className="flex items-center gap-3 text-amber-700">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-base font-bold text-ink">Cảnh báo thoát tiến trình bán vé</h3>
            </div>
            <p className="text-sm text-ink-soft leading-relaxed">
              Bạn đang trong quá trình bán vé/giữ chỗ. Nếu thoát, các ghế đang chọn ({selectedSeatNames.join(', ')}) sẽ bị hủy. Bạn có chắc chắn muốn thoát?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false)
                  setTargetTabToSwitch(null)
                }}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-hairline bg-card text-ink hover:bg-paper cursor-pointer"
              >
                Ở lại tiếp tục bán vé
              </button>
              <button
                type="button"
                onClick={confirmExitBooking}
                className="px-4 py-2 text-sm font-bold rounded-lg bg-rose-700 text-white hover:bg-rose-800 cursor-pointer"
              >
                Xác nhận thoát & Hủy chọn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL IN PHÔI VÉ IN NHIỆT (ASCII POS THERMAL RECEIPT)    */}
      {/* ======================================================== */}
      {printableTicket && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-hairline">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <span>🖨️</span> {printableTicket.tieu_de}
              </h3>
              <button
                type="button"
                onClick={() => setPrintableTicket(null)}
                className="text-ink-soft hover:text-ink text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Khung xem trước phôi in nhiệt */}
            <div className="bg-paper border border-hairline p-4 rounded-lg overflow-x-auto max-h-96">
              <pre className="font-mono text-xs text-ink leading-relaxed whitespace-pre">
                {printableTicket.noi_dung_in}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-hairline">
              <button
                type="button"
                onClick={() => setPrintableTicket(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-hairline text-ink hover:bg-paper cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => printAsciiContent(printableTicket.noi_dung_in, printableTicket.tieu_de)}
                className="px-5 py-2 text-sm font-bold rounded-lg bg-terracotta hover:bg-terracotta-hover text-white flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>🖨️</span> In Phôi Vé Nhiệt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL PHIẾU CHI HOÀN TIỀN MẶT                            */}
      {/* ======================================================== */}
      {refundReceipt && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-hairline">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="text-base font-bold text-emerald-800 flex items-center gap-2">
                <span>💸</span> Đã hoàn tiền mặt đơn #{refundReceipt.ma_dat_ve}
              </h3>
              <button
                type="button"
                onClick={() => setRefundReceipt(null)}
                className="text-ink-soft hover:text-ink text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-paper border border-hairline p-4 rounded-lg overflow-x-auto max-h-96">
              <pre className="font-mono text-xs text-ink leading-relaxed whitespace-pre">
                {refundReceipt.noi_dung_in_phieu_chi}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-hairline">
              <button
                type="button"
                onClick={() => setRefundReceipt(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-hairline text-ink hover:bg-paper cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => printAsciiContent(refundReceipt.noi_dung_in_phieu_chi, `Phieu_Chi_${refundReceipt.ma_giao_dich}`)}
                className="px-5 py-2 text-sm font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>🖨️</span> In Phiếu Chi Hoàn Tiền
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
