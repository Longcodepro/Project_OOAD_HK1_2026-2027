import type { Ticket, View, User } from '../types'
import { Header } from '../components/layout/Header'
import { Logo } from '../components/common/Logo'
import { Button } from '../components/common/Button'

export interface SuccessPageProps {
  setView: (v: View) => void
  user: User | null
  backendOnline: boolean
  ticket: Ticket | null
}

export function SuccessPage({
  setView,
  user,
  backendOnline,
  ticket,
}: SuccessPageProps) {
  const activeTicket: Ticket = ticket || {
    bookingCode: 'VL-8N4X-27',
    ticketCode: 'TDV-092482',
    tripId: 'TRIP-002',
    route: 'Sài Gòn → Đà Lạt',
    departureTime: '10:15',
    arrivalTime: '16:20',
    date: '24.10.2026',
    busType: 'V01 · Cabin đôi First Class',
    passengerName: 'Nguyễn Minh Anh',
    passengerPhone: '090 123 4567',
    passengerEmail: 'minhanh.nguyen@gmail.com',
    seatNumber: 'A01 · Tầng 1',
    pickupPoint: '272 Đề Thám, Q.1',
    dropoffPoint: '01 Quang Trung, Đà Lạt',
    basePrice: 472727,
    vat: 47273,
    totalAmount: 520000,
    paymentStatus: 'PAID',
    checkinStatus: 'NOT_CHECKED_IN',
    qrData: 'VL-8N4X-27|TDV-092482|A01|NguyenMinhAnh',
    createdAt: new Date().toISOString(),
  }

  return (
    <>
      <Header
        setView={setView}
        openLogin={() => setView('profile')}
        user={user}
        backendOnline={backendOnline}
      />
      <main className="mx-auto max-w-[900px] px-5 pb-16 pt-12 text-center">
        <div className="success-mark">✓</div>
        <p className="eyebrow mt-5">THANH TOÁN HOÀN TẤT</p>
        <h1 className="mt-2 text-4xl font-semibold">
          Chúc bạn có một hành trình đẹp.
        </h1>
        <p className="mt-3 text-white/55">
          Vé điện tử đã được gửi đến email và số điện thoại của bạn.
        </p>
        <article className="invoice mt-10 overflow-hidden rounded-[28px] text-left shadow-2xl">
          <div className="invoice-head">
            <Logo />
            <div className="stamp">ĐÃ THANH TOÁN</div>
          </div>
          <div className="invoice-body grid gap-8 p-6 sm:grid-cols-[1fr_160px] sm:p-9">
            <div>
              <p className="font-mono text-[10px] tracking-[.2em] text-[#6b6f8c]">
                XÁC NHẬN ĐẶT VÉ & THANH TOÁN THÀNH CÔNG
              </p>
              <div className="mt-6 grid grid-cols-2 gap-5 border-y border-[#e4e4eb] py-5">
                <div>
                  <small>MÃ ĐẶT CHỖ</small>
                  <b>{activeTicket.bookingCode}</b>
                </div>
                <div>
                  <small>MÃ VÉ</small>
                  <b>{activeTicket.ticketCode}</b>
                </div>
              </div>
              <div className="mt-6">
                <p className="ticket-route">{activeTicket.route}</p>
                <p className="mt-2 text-sm text-[#65677e]">
                  {activeTicket.date} · {activeTicket.departureTime} —{' '}
                  {activeTicket.arrivalTime}
                  <br />
                  {activeTicket.busType}
                </p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-y-5 text-sm">
                <div>
                  <small>HÀNH KHÁCH</small>
                  <b>{activeTicket.passengerName}</b>
                </div>
                <div>
                  <small>SỐ GHẾ</small>
                  <b>{activeTicket.seatNumber}</b>
                </div>
                <div>
                  <small>ĐIỂM ĐÓN</small>
                  <b>{activeTicket.pickupPoint}</b>
                </div>
                <div>
                  <small>ĐIỂM TRẢ</small>
                  <b>{activeTicket.dropoffPoint}</b>
                </div>
              </div>
            </div>
            <div className="border-t border-dashed border-[#d6d7e0] pt-7 sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0 flex flex-col items-center">
              <div className="qr-container bg-white p-2.5 rounded-2xl border border-[#dedfe8] shadow-sm text-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=4&data=${encodeURIComponent(
                    activeTicket.qrData ||
                      `${activeTicket.bookingCode}|${activeTicket.ticketCode}|${activeTicket.seatNumber}|${activeTicket.passengerName}`,
                  )}`}
                  alt="Mã QR Soát Vé"
                  className="w-[135px] h-[135px] object-contain mx-auto"
                />
                <span className="block mt-1 font-mono text-[10px] font-bold text-[#4a4d65] tracking-widest">
                  {activeTicket.ticketCode}
                </span>
              </div>
              <p className="mt-2.5 text-center font-mono text-[10px] font-semibold tracking-wider text-[#6b6f8c]">
                QUÉT KHI LÊN XE
              </p>
              <div className="mt-5 w-full space-y-2 text-xs text-[#65677e]">
                <div className="flex justify-between">
                  <span>Giá vé</span>
                  <b>{activeTicket.basePrice.toLocaleString('vi-VN')}đ</b>
                </div>
                <div className="flex justify-between">
                  <span>VAT</span>
                  <b>{activeTicket.vat.toLocaleString('vi-VN')}đ</b>
                </div>
                <div className="flex justify-between border-t pt-2 text-[#171a35]">
                  <span>TỔNG CỘNG</span>
                  <b className="text-sm font-bold text-violet-700">
                    {activeTicket.totalAmount.toLocaleString('vi-VN')}đ
                  </b>
                </div>
              </div>
            </div>
          </div>
          <div className="invoice-foot">
            Cảm ơn bạn đã chọn Violetline · Hỗ trợ 24/7: 1900 0666
          </div>
        </article>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => window.print()} kind="ghost">
            ↓ In / Tải hóa đơn PDF
          </Button>
          <Button onClick={() => setView('profile')} kind="ghost">
            Xem danh sách vé
          </Button>
          <Button onClick={() => setView('home')}>Về trang chủ</Button>
        </div>
      </main>
    </>
  )
}
