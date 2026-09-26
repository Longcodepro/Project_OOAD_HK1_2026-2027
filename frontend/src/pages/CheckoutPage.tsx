import { useState } from 'react'
import type { Trip, Ticket, View, User } from '../types'
import { bookingsApi } from '../services/api'
import { Header } from '../components/layout/Header'
import { Button } from '../components/common/Button'

export interface CheckoutPageProps {
  setView: (v: View) => void
  user: User | null
  backendOnline: boolean
  trip: Trip | null
  chosenSeat: string
  onBookingSuccess: (ticket: Ticket) => void
}

export function CheckoutPage({
  setView,
  user,
  backendOnline,
  trip,
  chosenSeat,
  onBookingSuccess,
}: CheckoutPageProps) {
  const [fullName, setFullName] = useState(user?.fullName || 'Nguyễn Minh Anh')
  const [phone, setPhone] = useState(user?.phone || '090 123 4567')
  const [email, setEmail] = useState(user?.email || 'minhanh.nguyen@gmail.com')
  const [payMethod, setPayMethod] = useState<'e-wallet' | 'domestic-card' | 'vietqr'>('e-wallet')
  const [submitting, setSubmitting] = useState(false)

  const activeTrip = trip || {
    id: 'TRIP-002',
    time: '10:15',
    arrive: '16:20',
    operator: 'Cabin đôi First Class',
    price: 520000,
    priceFormatted: '520.000đ',
    fromCity: 'Sài Gòn',
    toCity: 'Đà Lạt',
    date: new Date().toLocaleDateString('vi-VN'),
    pickupPoint: '272 Đề Thám, Quận 1',
    dropoffPoint: '01 Quang Trung, Đà Lạt',
    busType: 'V01 · Cabin đôi First Class',
  }

  const basePrice = Math.round(activeTrip.price / 1.1)
  const vat = activeTrip.price - basePrice

  const handlePayment = async () => {
    setSubmitting(true)
    try {
      const ticket = await bookingsApi.create({
        tripId: activeTrip.id,
        seatLabel: chosenSeat,
        passenger: { fullName, phone, email },
        pickupPoint: activeTrip.pickupPoint,
        dropoffPoint: activeTrip.dropoffPoint,
        paymentMethod: payMethod,
        totalAmount: activeTrip.price,
      })
      onBookingSuccess(ticket)
      setView('success')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Header
        setView={setView}
        openLogin={() => setView('profile')}
        user={user}
        backendOnline={backendOnline}
      />
      <main className="mx-auto max-w-[1040px] px-5 pb-16 pt-10 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_330px]">
          <section>
            <p className="eyebrow">BƯỚC 03 / 03</p>
            <h1 className="mt-2 text-4xl font-semibold">Hoàn tất hành trình</h1>
            <div className="timeline mt-9">
              <div className="timeline-item">
                <i>01</i>
                <div>
                  <h2>Thông tin hành khách</h2>
                  <p>Thông tin dùng để xuất vé điện tử và gửi xác nhận qua SMS/Email.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Họ và tên hành khách"
                    />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Số điện thoại"
                    />
                  </div>
                  <div className="mt-3">
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email nhận vé điện tử"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              <div className="timeline-item">
                <i>02</i>
                <div>
                  <h2>Điểm đón & trả</h2>
                  <p>
                    {activeTrip.time} · {activeTrip.pickupPoint}{' '}
                    <span className="mx-2">→</span> {activeTrip.dropoffPoint}
                  </p>
                </div>
              </div>
              <div className="timeline-item">
                <i>03</i>
                <div>
                  <h2>Thanh toán</h2>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPayMethod('e-wallet')}
                      className={`pay-option ${payMethod === 'e-wallet' ? 'selected-pay' : ''}`}
                    >
                      ◈ Ví điện tử
                      <br />
                      <small>{payMethod === 'e-wallet' ? 'Đã chọn' : 'MoMo / Ví điện tử'}</small>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod('vietqr')}
                      className={`pay-option ${payMethod === 'vietqr' ? 'selected-pay' : ''}`}
                    >
                      ▣ Quét VietQR
                      <br />
                      <small>{payMethod === 'vietqr' ? 'Đã chọn' : 'Chuyển khoản'}</small>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod('domestic-card')}
                      className={`pay-option ${payMethod === 'domestic-card' ? 'selected-pay' : ''}`}
                    >
                      💳 Thẻ ATM/Visa
                      <br />
                      <small>{payMethod === 'domestic-card' ? 'Đã chọn' : 'Nội địa/Quốc tế'}</small>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <aside className="order-card h-fit rounded-[24px] border border-white/10 p-6">
            <p className="font-mono text-[10px] tracking-[.16em] text-white/50">
              TÓM TẮT ĐẶT CHỖ
            </p>
            <h2 className="mt-4 text-xl font-semibold">
              {activeTrip.fromCity} → {activeTrip.toCity}
            </h2>
            <p className="mt-1 text-sm text-white/50">
              {activeTrip.date} · {activeTrip.time} · Ghế {chosenSeat}
            </p>
            <div className="my-6 space-y-3 border-y border-dashed border-white/15 py-5 text-sm">
              <div className="flex justify-between text-white/60">
                <span>Giá vé cơ bản</span>
                <span>{basePrice.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>VAT (10%)</span>
                <span>{vat.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
            <div className="flex justify-between">
              <b>Tổng thanh toán</b>
              <b className="text-xl text-violet-200">
                {activeTrip.price.toLocaleString('vi-VN')}đ
              </b>
            </div>
            <Button
              onClick={handlePayment}
              disabled={submitting}
              className="mt-6 w-full"
            >
              {submitting ? 'Đang xử lý kết nối...' : 'Thanh toán an toàn →'}
            </Button>
          </aside>
        </div>
      </main>
    </>
  )
}
