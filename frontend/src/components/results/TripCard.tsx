import type { Trip } from '../../types'
import { Button } from '../common/Button'

export interface TripCardProps {
  trip: Trip
  onSelectTrip: (trip: Trip) => void
}

export function TripCard({ trip, onSelectTrip }: TripCardProps) {
  return (
    <article className="trip-card grid gap-5 rounded-[22px] border border-white/10 p-5 lg:grid-cols-[145px_1fr_160px] lg:items-center">
      <div>
        <div className="flex items-baseline gap-2">
          <b className="font-mono text-2xl text-white">{trip.time}</b>
          <span className="text-xs text-white/40">→ {trip.arrive}</span>
        </div>
        <p className="mt-2 text-xs text-violet-200">{trip.duration}</p>
      </div>

      <div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-white/75">
            {trip.operator}
          </span>
          <span className="rounded-full bg-violet-300/10 px-2.5 py-1 text-xs text-violet-200">
            {trip.amenities?.join(' · ') || 'Wi-Fi · Nước · USB-C'}
          </span>
        </div>
        <p className="mt-3 text-sm text-white/50">
          {trip.pickupPoint} <span className="mx-2">→</span> {trip.dropoffPoint}
        </p>
      </div>

      <div className="flex items-center justify-between lg:block lg:text-right">
        <div>
          <b className="text-lg">{trip.priceFormatted}</b>
          <p className="text-xs text-white/50">còn {trip.seats} chỗ trống</p>
        </div>
        <Button
          onClick={() => onSelectTrip(trip)}
          className="px-4 py-2.5 lg:mt-3"
        >
          Chọn chuyến
        </Button>
      </div>
    </article>
  )
}
