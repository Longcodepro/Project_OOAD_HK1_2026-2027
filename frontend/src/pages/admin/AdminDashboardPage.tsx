import { useEffect, useState } from 'react'
import type { Ticket, View } from '../../types'
import { ticketsApi } from '../../services/api'

export interface AdminDashboardPageProps {
  setView: (v: View) => void
  onViewTicket?: (ticket: Ticket) => void
}

export function AdminDashboardPage({ setView, onViewTicket }: AdminDashboardPageProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])

  useEffect(() => {
    ticketsApi.getAll().then((data) => setTickets(data))
  }, [])

  const paidTickets = tickets.filter((t) => t.paymentStatus === 'PAID')
  const pendingTickets = tickets.filter((t) => t.paymentStatus === 'PENDING_CANCEL')
  const cancelledTickets = tickets.filter((t) => t.paymentStatus === 'CANCELLED')
  const totalRevenue = paidTickets.reduce((sum, t) => sum + t.totalAmount, 0)

  const weeklyData = [
    { day: 'Thứ 2', amount: 14200000, height: '65%' },
    { day: 'Thứ 3', amount: 16800000, height: '75%' },
    { day: 'Thứ 4', amount: 12500000, height: '55%' },
    { day: 'Thứ 5', amount: 19100000, height: '82%' },
    { day: 'Thứ 6', amount: 24500000, height: '96%' },
    { day: 'Thứ 7', amount: 26800000, height: '100%' },
    { day: 'C.Nhật', amount: 23200000, height: '90%' },
  ]

  return (
    <div className="space-y-8 animate-fadeIn text-slate-900">
      {/* Title */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-orange-600">BÁO CÁO VẬN HÀNH</span>
        <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Tổng quan hoạt động Violetline</h1>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Số liệu thống kê thời gian thực về doanh thu bán vé, tỷ lệ lấp đầy ghế và các yêu cầu hủy vé cần xử lý.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Doanh thu */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>DOANH THU THỰC NHẬN</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">+18.4%</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {totalRevenue.toLocaleString('vi-VN')} đ
          </p>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">Tính trên {paidTickets.length} vé hợp lệ</p>
        </div>

        {/* Số vé đã bán */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>TỔNG VÉ ĐÃ XUẤT</span>
            <span className="text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full font-bold border border-orange-200">Tất cả tuyến</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">{tickets.length} vé</p>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            {paidTickets.length} hợp lệ · {cancelledTickets.length} đã hủy
          </p>
        </div>

        {/* CẢNH BÁO: Chờ duyệt hủy vé */}
        <div
          onClick={() => setView('admin-tickets')}
          className={`cursor-pointer rounded-2xl border p-5 transition shadow-xs ${
            pendingTickets.length > 0
              ? 'border-amber-300 bg-amber-50/70 hover:bg-amber-100/60 hover:shadow-md'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-800">
            <span>YÊU CẦU CHỜ DUYỆT HỦY</span>
            {pendingTickets.length > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-900 font-mono">
            {pendingTickets.length} yêu cầu
          </p>
          <p className="mt-1 text-[11px] font-semibold text-amber-700">
            {pendingTickets.length > 0 ? 'Bấm để duyệt ngay →' : 'Không có yêu cầu tồn đọng'}
          </p>
        </div>

        {/* Tỷ lệ lấp đầy */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>TỶ LỆ LẤP ĐẦY GHẾ</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">Cao</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">88.5%</p>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">Tuyến Sài Gòn - Đà Lạt dẫn đầu</p>
        </div>
      </div>

      {/* Biểu đồ & Tác vụ cần xử lý */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Biểu đồ doanh thu 7 ngày */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Doanh thu 7 ngày qua</h2>
              <p className="text-xs text-slate-400 font-medium">Cập nhật lúc 07:00 hôm nay</p>
            </div>
            <span className="rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700 border border-orange-200">
              Đỉnh tuần: Thứ 7 (26.8tr)
            </span>
          </div>

          <div className="mt-8 flex h-52 items-end justify-between gap-3 px-2">
            {weeklyData.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2 group">
                <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-800 transition">
                  {(d.amount / 1000000).toFixed(1)}M
                </span>
                <div className="relative w-full rounded-t-xl bg-slate-100 overflow-hidden flex items-end h-40">
                  <div
                    style={{ height: d.height }}
                    className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-xl transition-all duration-300 group-hover:from-orange-500 group-hover:to-orange-300"
                  />
                </div>
                <span className="text-xs font-bold text-slate-600 group-hover:text-orange-600 transition">
                  {d.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Lối tắt quản trị nhanh */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Lối tắt quản lý nhanh</h2>
          <p className="text-xs text-slate-500 font-medium">Truy cập nhanh các phân hệ nghiệp vụ chính.</p>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => setView('admin-tickets')}
              className="w-full flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-900 hover:bg-amber-100 transition cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2">
                <span>🎫</span>
                <span>Duyệt yêu cầu hủy vé</span>
              </div>
              <span className="rounded-full bg-amber-200 text-amber-900 px-2 py-0.5 text-[10px] font-bold border border-amber-300">
                {pendingTickets.length} chờ
              </span>
            </button>

            <button
              type="button"
              onClick={() => setView('admin-trips')}
              className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>🚌</span>
                <span>Thêm chuyến xe mới</span>
              </div>
              <span>→</span>
            </button>

            <button
              type="button"
              onClick={() => setView('admin-pricing')}
              className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>🏷️</span>
                <span>Tạo mã giảm giá Voucher</span>
              </div>
              <span>→</span>
            </button>

            <button
              type="button"
              onClick={() => setView('admin-accounts')}
              className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>👥</span>
                <span>Khóa / Mở tài khoản</span>
              </div>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vé mới đặt & Vé chờ duyệt gần nhất */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <h2 className="text-base font-bold text-slate-900">Vé gần đây nhất</h2>
          <button
            type="button"
            onClick={() => setView('admin-tickets')}
            className="text-xs text-orange-600 hover:text-orange-700 font-bold cursor-pointer"
          >
            Xem tất cả trong Quản lý vé →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-3">Mã vé</th>
                <th className="p-3">Hành khách</th>
                <th className="p-3">Lộ trình</th>
                <th className="p-3">Ghế</th>
                <th className="p-3">Tổng tiền</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.slice(0, 5).map((t) => (
                <tr key={t.bookingCode} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-mono font-bold text-slate-900">{t.ticketCode}</td>
                  <td className="p-3 font-semibold text-slate-800">{t.passengerName}</td>
                  <td className="p-3 text-slate-600">{t.route}</td>
                  <td className="p-3 font-mono text-orange-700 font-bold">{t.seatNumber}</td>
                  <td className="p-3 font-mono font-bold text-slate-900">{t.totalAmount.toLocaleString('vi-VN')} đ</td>
                  <td className="p-3">
                    {t.paymentStatus === 'PAID' && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        ĐÃ THANH TOÁN
                      </span>
                    )}
                    {t.paymentStatus === 'PENDING_CANCEL' && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
                        CHỜ DUYỆT HỦY
                      </span>
                    )}
                    {t.paymentStatus === 'CANCELLED' && (
                      <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                        ĐÃ HỦY
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {onViewTicket && (
                      <button
                        type="button"
                        onClick={() => {
                          onViewTicket(t)
                          setView('success')
                        }}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        Xem vé
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
