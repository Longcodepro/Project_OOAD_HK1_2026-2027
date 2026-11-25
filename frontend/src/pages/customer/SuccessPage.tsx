import { useState } from 'react'
import type { DatVeResponse } from '../../types/counter'
import { formatVnd } from '../../services/api'
import { UpdatePassengerModal } from '../../components/ticket/UpdatePassengerModal'

interface SuccessPageProps {
  booking: DatVeResponse
  onNewBooking: () => void
}

export function SuccessPage({ booking, onNewBooking }: SuccessPageProps) {
  const [currentBooking, setCurrentBooking] = useState<DatVeResponse>(booking)
  const [showUpdateModal, setShowUpdateModal] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* SUCCESS TOP BANNER */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-6 md:p-8 text-center shadow-lg space-y-3">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-3xl mx-auto shadow-inner">
          🎉
        </div>
        <div>
          <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
            Thanh Toán Thành Công • Vé Đã Được Xuất
          </span>
          <h1 className="text-2xl md:text-3xl font-black mt-2">
            Chúc Mừng Quý Khách Đặt Vé Thành Công!
          </h1>
          <p className="text-xs md:text-sm text-emerald-100 max-w-lg mx-auto mt-1">
            Mã đơn đặt vé của quý khách là{' '}
            <b className="font-mono text-white text-base">#{currentBooking.ma_dat_ve}</b>. Tin nhắn xác nhận và mã vé điện tử đã được gửi tới số điện thoại{' '}
            <b className="font-mono text-white">{currentBooking.sdt_kh}</b>.
          </p>
        </div>
      </div>

      {/* TICKET CARD (BOARDING PASS STYLE) */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Ticket Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎫</span>
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Vé Điện Tử Lên Xe</span>
              <div className="text-sm font-bold">VÉXE VIỆT TRANSPORT</div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400">Mã Đặt Vé:</span>
            <div className="text-base font-black font-mono text-orange-400">
              #{currentBooking.ma_dat_ve}
            </div>
          </div>
        </div>

        {/* Ticket Content */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Journey details */}
          <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-orange-800 tracking-wider">Điểm Đi</span>
              <div className="text-base font-black text-slate-900">{currentBooking.diem_di}</div>
            </div>

            <div className="text-center">
              <div className="text-xs font-bold text-orange-600">➔ Di Chuyển ➔</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">Chuyến #{currentBooking.ma_chuyen}</div>
            </div>

            <div className="space-y-1 md:text-right">
              <span className="text-[10px] font-bold uppercase text-orange-800 tracking-wider">Điểm Đến</span>
              <div className="text-base font-black text-slate-900">{currentBooking.diem_den}</div>
            </div>
          </div>

          {/* Time & Seats & Buyer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 font-medium">Giờ khởi hành:</span>
              <div className="text-sm font-black font-mono text-slate-900">
                {currentBooking.gio_khoi_hanh.substring(0, 5)}
              </div>
              <div className="text-slate-600 font-semibold">{currentBooking.ngay_khoi_hanh}</div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 font-medium">Người liên hệ đặt vé:</span>
              <div className="text-sm font-bold text-slate-900 truncate">{currentBooking.ho_ten_kh}</div>
              <div className="text-slate-600 font-mono">{currentBooking.sdt_kh}</div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 font-medium">Tổng tiền thanh toán:</span>
              <div className="text-base font-black font-mono text-emerald-600">
                {formatVnd(currentBooking.thanh_tien)}
              </div>
              <div className="text-[10px] text-slate-400">Đã thanh toán đủ</div>
            </div>
          </div>

          {/* PASSENGER & SEATS LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <span>💺</span> Danh Sách Ghế & Hành Khách
              </h4>

              {/* NÚT CẬP NHẬT THÔNG TIN HÀNH KHÁCH */}
              <button
                type="button"
                onClick={() => setShowUpdateModal(true)}
                className="px-3 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>✏️</span> Cập nhật thông tin hành khách
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentBooking.danh_sach_ve.map((ve) => (
                <div
                  key={ve.ma_ct}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 bg-orange-600 text-white rounded-lg font-mono font-bold text-xs shadow-2xs">
                      {ve.so_ghe}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">
                        {ve.ho_ten_hanh_khach || currentBooking.ho_ten_kh}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {ve.sdt_hanh_khach || currentBooking.sdt_kh}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Tầng {ve.tang}</span>
                </div>
              ))}
            </div>
          </div>

          {/* QR CODE & INSTRUCTIONS */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
            <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200 shrink-0 text-center">
              <svg className="w-28 h-28 mx-auto" viewBox="0 0 100 100" fill="currentColor">
                <rect x="0" y="0" width="30" height="30" rx="4" fill="#0f172a" />
                <rect x="5" y="5" width="20" height="20" rx="2" fill="#ffffff" />
                <rect x="9" y="9" width="12" height="12" rx="1" fill="#0f172a" />

                <rect x="70" y="0" width="30" height="30" rx="4" fill="#0f172a" />
                <rect x="75" y="5" width="20" height="20" rx="2" fill="#ffffff" />
                <rect x="79" y="9" width="12" height="12" rx="1" fill="#0f172a" />

                <rect x="0" y="70" width="30" height="30" rx="4" fill="#0f172a" />
                <rect x="5" y="75" width="20" height="20" rx="2" fill="#ffffff" />
                <rect x="9" y="79" width="12" height="12" rx="1" fill="#0f172a" />

                <rect x="36" y="10" width="8" height="8" fill="#ea580c" />
                <rect x="52" y="10" width="8" height="8" fill="#0f172a" />
                <rect x="44" y="38" width="12" height="12" rx="2" fill="#ea580c" />
                <rect x="10" y="44" width="8" height="8" fill="#0f172a" />
                <rect x="70" y="44" width="8" height="8" fill="#0f172a" />
                <rect x="36" y="60" width="8" height="8" fill="#0f172a" />
                <rect x="52" y="60" width="8" height="8" fill="#0f172a" />
                <rect x="74" y="84" width="12" height="8" fill="#0f172a" />
              </svg>
              <div className="text-[10px] font-mono font-bold text-slate-700 mt-1">
                SOÁT VÉ #{currentBooking.ma_dat_ve}
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="font-bold text-slate-900 text-sm">Hướng Dẫn Lên Xe:</div>
              <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                <li>Vui lòng có mặt tại bến xe trước giờ khởi hành ít nhất <b>30 phút</b>.</li>
                <li>Xuất trình mã QR vé điện tử trên màn hình điện thoại hoặc đọc số điện thoại đặt vé cho nhân viên soát vé tại cửa xe.</li>
                <li>Thông tin hành khách có thể tự cập nhật trực tuyến trước giờ xe chạy <b>2 tiếng</b>.</li>
                <li>Nếu cần hỗ trợ khẩn cấp, vui lòng gọi tổng đài 24/7: <b className="text-orange-600">1900 6868</b>.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Ticket Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>🖨️</span> In / Tải Vé Điện Tử
          </button>

          <button
            type="button"
            onClick={onNewBooking}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>➕</span> Đặt Chuyến Xe Khác
          </button>
        </div>
      </div>

      {/* UPDATE PASSENGER MODAL */}
      {showUpdateModal && (
        <UpdatePassengerModal
          booking={currentBooking}
          onClose={() => setShowUpdateModal(false)}
          onSuccess={(updated) => {
            setCurrentBooking(updated)
          }}
        />
      )}
    </div>
  )
}
