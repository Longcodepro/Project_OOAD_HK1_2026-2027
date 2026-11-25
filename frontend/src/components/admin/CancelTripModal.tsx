import { useEffect, useState, useMemo } from 'react'
import type { ChuyenXe } from '../../types/counter'
import type {
  BaoCaoHuyChuyenResponse,
  KetQuaHuyChuyenResponse,
} from '../../types/cancelTrip'
import {
  apiErrorMessage,
  confirmCancelTrip,
  formatVnd,
  getCancelTripReport,
} from '../../services/api'

interface CancelTripModalProps {
  trip: ChuyenXe
  onClose: () => void
  onSuccess?: (result: KetQuaHuyChuyenResponse) => void
}

export function CancelTripModal({ trip, onClose, onSuccess }: CancelTripModalProps) {
  const [activeTab, setActiveTab] = useState<'damage' | 'notification'>('damage')

  const [loadingReport, setLoadingReport] = useState<boolean>(true)
  const [reportError, setReportError] = useState<string | null>(null)
  const [report, setReport] = useState<BaoCaoHuyChuyenResponse | null>(null)

  // Form hủy chuyến
  const [tyLeHoanTien, setTyLeHoanTien] = useState<number>(110)
  const [lyDo, setLyDo] = useState<string>('Sự cố thời tiết bão lũ, không đảm bảo an toàn giao thông')
  const [noiDungSms, setNoiDungSms] = useState<string>('')

  // Trạng thái xác nhận
  const [confirming, setConfirming] = useState<boolean>(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [cancelResult, setCancelResult] = useState<KetQuaHuyChuyenResponse | null>(null)

  // Tải báo cáo hủy chuyến khi mở modal
  useEffect(() => {
    let isMounted = true
    setLoadingReport(true)
    setReportError(null)

    getCancelTripReport(trip.ma_chuyen)
      .then((data) => {
        if (!isMounted) return
        setReport(data)
        setTyLeHoanTien(data.ty_le_hoan_mac_dinh || 110)
        setNoiDungSms(data.noi_dung_sms_xem_truoc || data.mau_tin_nhan_sms || '')
      })
      .catch((err) => {
        if (!isMounted) return
        setReportError(apiErrorMessage(err))
      })
      .finally(() => {
        if (isMounted) setLoadingReport(false)
      })

    return () => {
      isMounted = false
    }
  }, [trip.ma_chuyen])

  // Phân loại số lượng vé Online và Quầy
  const { veOnlineCount, veQuayCount, tienGocNum, tienDenBuNum, tongChiPhiNum } = useMemo(() => {
    if (!report) {
      return { veOnlineCount: 0, veQuayCount: 0, tienGocNum: 0, tienDenBuNum: 0, tongChiPhiNum: 0 }
    }

    let online = 0
    let quay = 0
    for (const item of report.danh_sach_thong_bao_khach) {
      const soVe = item.danh_sach_ma_ve.length || 1
      if (item.hinh_thuc_mua === 'Online') {
        online += soVe
      } else {
        quay += soVe
      }
    }

    const goc = typeof report.tong_tien_goc === 'string' ? parseFloat(report.tong_tien_goc) : report.tong_tien_goc || 0
    const denBuRate = Math.max(0, tyLeHoanTien - 100)
    const denBu = goc * (denBuRate / 100)
    const tongChi = goc * (tyLeHoanTien / 100)

    return {
      veOnlineCount: online,
      veQuayCount: quay,
      tienGocNum: goc,
      tienDenBuNum: denBu,
      tongChiPhiNum: tongChi,
    }
  }, [report, tyLeHoanTien])

  // Xử lý xác nhận hủy chuyến
  const handleConfirmCancel = async () => {
    if (!lyDo.trim()) {
      setConfirmError('Vui lòng nhập lý do hủy chuyến (tối thiểu 3 ký tự).')
      return
    }

    setConfirming(true)
    setConfirmError(null)

    try {
      const res = await confirmCancelTrip(trip.ma_chuyen, {
        ly_do: lyDo.trim(),
        ty_le_hoan_tien: tyLeHoanTien,
        noi_dung_sms_tuy_chinh: noiDungSms.trim() || undefined,
      })
      setCancelResult(res)
    } catch (err) {
      setConfirmError(apiErrorMessage(err))
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* HEADER MODAL */}
        <div className="bg-linear-to-r from-red-700 via-red-600 to-rose-700 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl shrink-0">
              ⚠️
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                Xác Nhận Hủy Chuyến Xe #{trip.ma_chuyen}
              </h2>
              <p className="text-xs text-red-100 font-medium">
                {trip.diem_di} ➔ {trip.diem_den} • Khởi hành: {trip.gio_khoi_hanh} ngày {trip.ngay_khoi_hanh}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-base font-bold transition-all cursor-pointer"
            title="Đóng modal"
          >
            ✕
          </button>
        </div>

        {/* NẾU ĐÃ HỦY THÀNH CÔNG -> HIỂN THỊ MÀN HÌNH KẾT QUẢ CHI TIẾT */}
        {cancelResult ? (
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl shrink-0">
                ✓
              </div>
              <div>
                <h3 className="text-base font-black text-emerald-900">
                  Đã hủy chuyến và kích hoạt quy trình hoàn tiền thành công!
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">{cancelResult.thong_diep}</p>
              </div>
            </div>

            {/* CÁC THỐNG KÊ CHI TIẾT */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Số vé đã hủy
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {cancelResult.so_ve_da_huy} vé <span className="text-xs text-slate-500 font-normal">({cancelResult.so_don_da_huy} đơn)</span>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
                <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  Hoàn tiền Online
                </div>
                <div className="text-lg font-black text-blue-900 mt-1">
                  {cancelResult.so_don_online_hoan_ngay} đơn
                </div>
                <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                  Tự động chuyển khoản ngân hàng
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                  Vé tại Quầy
                </div>
                <div className="text-lg font-black text-amber-900 mt-1">
                  {cancelResult.so_don_quay_cho_nhan_tien_mat} đơn
                </div>
                <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                  Đã tạo phiếu chờ chi tiền mặt
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  Tổng tiền hoàn trả
                </div>
                <div className="text-lg font-black text-emerald-800 mt-1">
                  {formatVnd(cancelResult.tong_tien_hoan_thuc_te)}
                </div>
                <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                  Áp dụng: {cancelResult.ty_le_hoan_tien_ap_dung}%
                </div>
              </div>
            </div>

            {/* DANH SÁCH SMS ĐÃ GỬI (NẾU CÓ) */}
            {cancelResult.danh_sach_sms && cancelResult.danh_sach_sms.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Danh Sách Tin Nhắn SMS Đã Lập Cho Khách Hàng Quầy ({cancelResult.danh_sach_sms.length})
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">Hệ thống gửi tự động</span>
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  {cancelResult.danh_sach_sms.map((sms) => (
                    <div key={sms.ma_dat_ve} className="p-3 text-xs space-y-1 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {sms.ho_ten} • <span className="font-mono text-slate-600">{sms.sdt}</span> (Đơn #{sms.ma_dat_ve})
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {sms.trang_thai}
                        </span>
                      </div>
                      <p className="text-slate-600 font-mono text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200">
                        {sms.noi_dung}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NÚT HOÀN TẤT */}
            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onSuccess?.(cancelResult)
                  onClose()
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
              >
                Đóng & Hoàn tất
              </button>
            </div>
          </div>
        ) : (
          /* NỘI DUNG CHÍNH: 2 TAB BÁO CÁO & THÔNG BÁO */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* THANH ĐIỀU HƯỚNG TAB */}
            <div className="border-b border-slate-200 bg-slate-50 px-6 pt-3 flex items-center justify-between shrink-0">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('damage')}
                  className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-b-2 flex items-center gap-2 ${
                    activeTab === 'damage'
                      ? 'bg-white text-red-600 border-red-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
                  }`}
                >
                  <span>📊</span>
                  Tab 1: Báo Cáo Thiệt Hại & Chi Phí Hoàn Tiền
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('notification')}
                  className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-b-2 flex items-center gap-2 ${
                    activeTab === 'notification'
                      ? 'bg-white text-red-600 border-red-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
                  }`}
                >
                  <span>📢</span>
                  Tab 2: Thông Báo Hành Khách (Bảng 3 Cột)
                </button>
              </div>

              {/* Thông tin nhanh xe */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 pb-2">
                <span className="font-semibold text-slate-700">Xe: {trip.bien_so || 'N/A'}</span>
                <span>•</span>
                <span>{trip.ten_loai_xe || 'Ghế/Giường'}</span>
              </div>
            </div>

            {/* NỘI DUNG BÊN TRONG CÁC TAB */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {loadingReport && (
                <div className="py-16 text-center space-y-3">
                  <div className="inline-block w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-600 font-medium">
                    Đang tính toán chi phí bồi hoàn và tổng hợp danh sách hành khách...
                  </p>
                </div>
              )}

              {reportError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>❌</span> Không thể lấy báo cáo hủy chuyến:
                  </p>
                  <p>{reportError}</p>
                </div>
              )}

              {report && !loadingReport && (
                <>
                  {/* TAB 1: THIỆT HẠI & CHI PHÍ */}
                  {activeTab === 'damage' && (
                    <div className="space-y-6">
                      {/* CARD TỔNG HỢP & TÙY CHỈNH TỶ LỆ HOÀN */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Cột 1: Phân loại số lượng vé */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Tổng Số Vé Đã Bán
                            </div>
                            <div className="text-2xl font-black text-slate-900 mt-1">
                              {report.tong_so_ve_da_ban} <span className="text-xs font-normal text-slate-500">vé</span>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-blue-50/80 p-2 rounded-lg border border-blue-100">
                              <span className="text-blue-700 font-semibold block text-[11px]">Trực tuyến (Online):</span>
                              <b className="text-blue-900 text-sm">{veOnlineCount}</b> vé
                            </div>
                            <div className="bg-amber-50/80 p-2 rounded-lg border border-amber-100">
                              <span className="text-amber-800 font-semibold block text-[11px]">Tại Quầy (POS):</span>
                              <b className="text-amber-900 text-sm">{veQuayCount}</b> vé
                            </div>
                          </div>
                        </div>

                        {/* Cột 2: Tỷ lệ hoàn tiền (cho phép tùy chỉnh) */}
                        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                                Tỷ Lệ Hoàn Tiền Bồi Thường
                              </span>
                              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                                Mặc định: 110%
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-800 mt-1">
                              Gồm 100% tiền vé gốc + % bồi thường thiệt hại cho khách do lỗi nhà xe.
                            </p>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <input
                              type="number"
                              min={100}
                              max={200}
                              step={5}
                              value={tyLeHoanTien}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 100
                                setTyLeHoanTien(Math.min(200, Math.max(100, val)))
                              }}
                              className="w-24 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm font-black text-amber-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                            />
                            <span className="text-xs font-bold text-amber-900">% tổng tiền vé</span>
                          </div>
                        </div>

                        {/* Cột 3: Tổng chi phí nhà xe */}
                        <div className="p-4 bg-red-50/70 rounded-xl border border-red-200 flex flex-col justify-between">
                          <div>
                            <div className="text-xs font-bold text-red-900 uppercase tracking-wider">
                              Tổng Chi Phí Hoàn Trả
                            </div>
                            <div className="text-2xl font-black text-red-600 mt-1">
                              {formatVnd(tongChiPhiNum)}
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-red-200 text-xs space-y-1">
                            <div className="flex justify-between text-slate-600">
                              <span>Tiền vé gốc thu về:</span>
                              <span className="font-semibold text-slate-900">{formatVnd(tienGocNum)}</span>
                            </div>
                            <div className="flex justify-between text-red-700 font-medium">
                              <span>Đền bù thêm (+{Math.max(0, tyLeHoanTien - 100)}%):</span>
                              <span className="font-bold">+{formatVnd(tienDenBuNum)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BẢNG CHI TIẾT THIỆT HẠI TỪNG KHÁCH HÀNG */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            Danh Sách Đơn Đặt Vé Cần Hoàn Trả ({report.danh_sach_khach.length} đơn)
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            Tiền bồi hoàn tự động tính theo tỷ lệ {tyLeHoanTien}%
                          </span>
                        </div>
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                              <tr>
                                <th className="p-3">Mã đơn</th>
                                <th className="p-3">Khách hàng</th>
                                <th className="p-3">Số điện thoại</th>
                                <th className="p-3 text-center">Số lượng vé</th>
                                <th className="p-3 text-right">Tiền gốc</th>
                                <th className="p-3 text-right">Hoàn lại ({tyLeHoanTien}%)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {report.danh_sach_khach.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-6 text-center text-slate-400">
                                    Chuyến xe chưa có vé nào được bán ra. Chi phí hoàn tiền bằng 0 ₫.
                                  </td>
                                </tr>
                              ) : (
                                report.danh_sach_khach.map((item) => {
                                  const goc = typeof item.tien_goc === 'string' ? parseFloat(item.tien_goc) : item.tien_goc
                                  const hoan = goc * (tyLeHoanTien / 100)
                                  return (
                                    <tr key={item.ma_dat_ve} className="hover:bg-slate-50/70 transition-colors">
                                      <td className="p-3 font-mono font-bold text-slate-800">
                                        #{item.ma_dat_ve}
                                      </td>
                                      <td className="p-3 font-medium text-slate-900">
                                        {item.ho_ten}
                                      </td>
                                      <td className="p-3 font-mono text-slate-600">
                                        {item.sdt || '-'}
                                      </td>
                                      <td className="p-3 text-center font-bold text-slate-700">
                                        {item.so_luong_ve}
                                      </td>
                                      <td className="p-3 text-right text-slate-600 font-medium">
                                        {formatVnd(goc)}
                                      </td>
                                      <td className="p-3 text-right font-black text-red-600">
                                        {formatVnd(hoan)}
                                      </td>
                                    </tr>
                                  )
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Ô NHẬP LÝ DO HỦY CHUYẾN (BẮT BUỘC) */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Lý do hủy chuyến xe <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={lyDo}
                          onChange={(e) => setLyDo(e.target.value)}
                          placeholder="Ví dụ: Sự cố thời tiết bão lũ, sạt lở đèo Sa Pa không đảm bảo an toàn giao thông"
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                        />
                        <p className="text-[11px] text-slate-500">
                          Lý do này sẽ được ghi vào nhật ký hệ thống và tự động chèn vào thông báo gửi tới hành khách.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: BẢNG 3 CỘT THÔNG BÁO HÀNH KHÁCH & TEXTAREA SMS */}
                  {activeTab === 'notification' && (
                    <div className="space-y-6">
                      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                        <span className="text-base">ℹ️</span>
                        <div>
                          <p className="font-bold">Quy tắc phân loại kênh hoàn trả:</p>
                          <p className="text-[11px] text-blue-800 mt-0.5">
                            • Khách mua trực tuyến: Hoàn tiền trực tiếp về tài khoản ngân hàng (Cột 2 ghi rõ số tài khoản, Cột 3 để trống).<br />
                            • Khách mua tại quầy: Mời tới quầy vé bến xe nhận tiền mặt (Cột 2 để trống, Cột 3 ghi SĐT nhận SMS).
                          </p>
                        </div>
                      </div>

                      {/* BẢNG 3 CỘT CHUẨN XÁC */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            Bảng Thông Báo Hành Khách & Kênh Hoàn Trả ({report.danh_sach_thong_bao_khach.length} khách)
                          </h4>
                          <span className="text-[11px] text-slate-500 font-medium">Bảng 3 cột chuẩn</span>
                        </div>
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-200">
                              <tr>
                                <th className="p-3 w-5/12">
                                  CỘT 1: Tên Khách Hàng + Ghế + Mã Vé
                                </th>
                                <th className="p-3 w-4/12">
                                  CỘT 2: Tài Khoản Hoàn Tiền (Online)
                                </th>
                                <th className="p-3 w-3/12">
                                  CỘT 3: Số Điện Thoại Gửi SMS (Quầy)
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {report.danh_sach_thong_bao_khach.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="p-8 text-center text-slate-400">
                                    Không có hành khách nào trên chuyến xe này.
                                  </td>
                                </tr>
                              ) : (
                                report.danh_sach_thong_bao_khach.map((item, idx) => {
                                  const isOnline = item.hinh_thuc_mua === 'Online'
                                  const maVeStr = item.danh_sach_ma_ve.length > 0
                                    ? item.danh_sach_ma_ve.map((v) => `#${v}`).join(', ')
                                    : `#${item.ma_dat_ve}`

                                  return (
                                    <tr key={`${item.ma_dat_ve}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                                      {/* CỘT 1: Tên khách hàng + Mã ghế + Mã vé */}
                                      <td className="p-3 align-top space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900 text-sm">
                                            {item.ho_ten}
                                          </span>
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                              isOnline
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-amber-100 text-amber-900'
                                            }`}
                                          >
                                            {isOnline ? 'Online' : 'Tại quầy'}
                                          </span>
                                        </div>
                                        <div className="text-xs text-slate-600">
                                          Ghế: <span className="font-mono font-bold text-slate-800">{item.danh_sach_so_ghe}</span>
                                          {' • '}
                                          Vé: <span className="font-mono text-slate-700">{maVeStr}</span>
                                        </div>
                                      </td>

                                      {/* CỘT 2: Tài khoản hoàn tiền */}
                                      <td className="p-3 align-top">
                                        {item.tai_khoan_hoan_tien ? (
                                          <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-200/80">
                                            <span className="font-mono font-bold text-blue-900 block text-xs">
                                              💳 {item.tai_khoan_hoan_tien}
                                            </span>
                                            <span className="text-[10px] text-blue-700">
                                              Tự động chuyển khoản khi xác nhận
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 font-mono text-center block">-</span>
                                        )}
                                      </td>

                                      {/* CỘT 3: SĐT gửi SMS */}
                                      <td className="p-3 align-top">
                                        {item.sdt_gui_message ? (
                                          <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/80">
                                            <span className="font-mono font-bold text-amber-900 block text-xs">
                                              📱 {item.sdt_gui_message}
                                            </span>
                                            <span className="text-[10px] text-amber-700">
                                              Gửi SMS mời ra quầy nhận tiền mặt
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 font-mono text-center block">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Ở DƯỚI CÙNG TAB 2: KHUNG TEXTAREA SOẠN TIN NHẮN SMS */}
                      <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-300 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black text-amber-950 uppercase tracking-wider">
                            💬 Soạn Tin Nhắn SMS Gửi Khách Hàng Mua Tại Quầy
                          </label>
                          <span className="text-[11px] text-amber-800 font-medium">
                            Admin có thể sửa trực tiếp nội dung bên dưới
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800">
                          Hệ thống sẽ gửi tin nhắn này đến các số điện thoại khách mua trực tiếp tại quầy để họ tới quầy vé bến xe làm thủ tục nhận lại tiền mặt bồi thường.
                        </p>
                        <textarea
                          rows={4}
                          value={noiDungSms}
                          onChange={(e) => setNoiDungSms(e.target.value)}
                          placeholder="Nội dung SMS thông báo hủy chuyến..."
                          className="w-full p-3 font-mono text-xs bg-white border border-amber-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 leading-relaxed"
                        />
                        <div className="text-[11px] text-slate-500 flex flex-wrap gap-1.5 items-center">
                          <span className="font-semibold text-slate-700">Các tham số tự động thay thế:</span>
                          <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[10px] font-mono">{'{HO_TEN}'}</code>
                          <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[10px] font-mono">{'{MA_CHUYEN}'}</code>
                          <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[10px] font-mono">{'{TUYEN_XE}'}</code>
                          <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[10px] font-mono">{'{DANH_SACH_GHE}'}</code>
                          <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[10px] font-mono">{'{TY_LE_HOAN}%'}</code>
                          <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[10px] font-mono">{'{TONG_TIEN_HOAN}'}</code>
                          <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[10px] font-mono">{'{HAN_NHAN_TIEN}'}</code>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* THÔNG BÁO LỖI KHI XÁC NHẬN */}
              {confirmError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <span>❌</span>
                  <span className="font-semibold">{confirmError}</span>
                </div>
              )}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                {report && (
                  <span>
                    Tổng hoàn dự kiến: <b className="text-red-600 font-mono text-sm">{formatVnd(tongChiPhiNum)}</b> ({tyLeHoanTien}%)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={confirming}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer"
                >
                  Hủy bỏ / Đóng
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={confirming || loadingReport || !report}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {confirming ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Đang xử lý hủy chuyến & hoàn tiền...
                    </>
                  ) : (
                    <>
                      <span>🚨</span>
                      Xác Nhận Hủy Chuyến & Gửi Thông Báo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
