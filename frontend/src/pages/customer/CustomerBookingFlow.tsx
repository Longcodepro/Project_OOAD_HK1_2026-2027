import { useState } from 'react'
import type { ChuyenXe, DatVeResponse } from '../../types/counter'
import { TripSearchWidget } from './TripSearchWidget'
import { SeatsPage } from './SeatsPage'
import { CheckoutPage } from './CheckoutPage'
import { SuccessPage } from './SuccessPage'

export function CustomerBookingFlow() {
  const [step, setStep] = useState<'search' | 'seats' | 'checkout' | 'success'>('search')
  const [selectedTrip, setSelectedTrip] = useState<ChuyenXe | null>(null)
  const [activeBooking, setActiveBooking] = useState<DatVeResponse | null>(null)

  // Step 1 -> Step 2
  const handleSelectTrip = (trip: ChuyenXe) => {
    setSelectedTrip(trip)
    setStep('seats')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Step 2 -> Step 3
  const handleBookingCreated = (booking: DatVeResponse) => {
    setActiveBooking(booking)
    setStep('checkout')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Step 3 -> Step 4
  const handlePaymentSuccess = (paidBooking: DatVeResponse) => {
    setActiveBooking(paidBooking)
    setStep('success')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Cancel in Step 3 / Back
  const handleCancelled = () => {
    setActiveBooking(null)
    setStep('search')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Reset from SuccessPage
  const handleNewBooking = () => {
    setSelectedTrip(null)
    setActiveBooking(null)
    setStep('search')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* STEP PROGRESS INDICATOR */}
      <div className="bg-white rounded-2xl p-3 md:p-4 shadow-xs border border-slate-200">
        <div className="flex items-center justify-between max-w-2xl mx-auto text-xs md:text-sm font-bold">
          {/* Step 1 */}
          <div
            className={`flex items-center gap-1.5 md:gap-2 ${
              step === 'search'
                ? 'text-orange-600'
                : 'text-slate-400'
            }`}
          >
            <span
              className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 'search'
                  ? 'bg-orange-600 text-white'
                  : step !== 'search'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {step !== 'search' ? '✓' : '1'}
            </span>
            <span className="hidden sm:inline">Tìm chuyến</span>
          </div>

          <div className="h-0.5 w-8 md:w-16 bg-slate-200"></div>

          {/* Step 2 */}
          <div
            className={`flex items-center gap-1.5 md:gap-2 ${
              step === 'seats'
                ? 'text-orange-600'
                : ['checkout', 'success'].includes(step)
                ? 'text-slate-700'
                : 'text-slate-400'
            }`}
          >
            <span
              className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 'seats'
                  ? 'bg-orange-600 text-white'
                  : ['checkout', 'success'].includes(step)
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {['checkout', 'success'].includes(step) ? '✓' : '2'}
            </span>
            <span className="hidden sm:inline">Chọn ghế & Giữ chỗ</span>
          </div>

          <div className="h-0.5 w-8 md:w-16 bg-slate-200"></div>

          {/* Step 3 */}
          <div
            className={`flex items-center gap-1.5 md:gap-2 ${
              step === 'checkout'
                ? 'text-orange-600'
                : step === 'success'
                ? 'text-slate-700'
                : 'text-slate-400'
            }`}
          >
            <span
              className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 'checkout'
                  ? 'bg-orange-600 text-white'
                  : step === 'success'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {step === 'success' ? '✓' : '3'}
            </span>
            <span className="hidden sm:inline">Thanh toán</span>
          </div>

          <div className="h-0.5 w-8 md:w-16 bg-slate-200"></div>

          {/* Step 4 */}
          <div
            className={`flex items-center gap-1.5 md:gap-2 ${
              step === 'success' ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              4
            </span>
            <span className="hidden sm:inline">Vé điện tử</span>
          </div>
        </div>
      </div>

      {/* STEP CONTENT */}
      {step === 'search' && <TripSearchWidget onSelectTrip={handleSelectTrip} />}

      {step === 'seats' && selectedTrip && (
        <SeatsPage
          trip={selectedTrip}
          onBack={() => setStep('search')}
          onBookingCreated={handleBookingCreated}
        />
      )}

      {step === 'checkout' && activeBooking && (
        <CheckoutPage
          booking={activeBooking}
          onPaymentSuccess={handlePaymentSuccess}
          onCancelled={handleCancelled}
        />
      )}

      {step === 'success' && activeBooking && (
        <SuccessPage booking={activeBooking} onNewBooking={handleNewBooking} />
      )}
    </div>
  )
}
