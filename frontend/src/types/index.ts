export type View =
  | 'home'
  | 'results'
  | 'seats'
  | 'checkout'
  | 'success'
  | 'profile'
  | 'scan'
  | 'login'
  | 'register'
  | 'google-signup'

export interface Trip {
  id: string
  time: string
  arrive: string
  operator: string
  seats: number
  price: number // numeric for calculation
  priceFormatted: string
  tag: string
  fromCity: string
  toCity: string
  duration: string
  date: string
  pickupPoint: string
  dropoffPoint: string
  busType: string
  amenities: string[]
}

export interface Seat {
  id: string
  label: string // e.g. "A01", "B02"
  floor: 1 | 2
  status: 'available' | 'held' | 'booked'
  price: number
}

export interface PassengerInfo {
  fullName: string
  phone: string
  email: string
}

export interface BookingRequest {
  tripId: string
  seatLabel: string
  passenger: PassengerInfo
  pickupPoint: string
  dropoffPoint: string
  paymentMethod: 'e-wallet' | 'domestic-card' | 'vietqr'
  totalAmount: number
}

export interface Ticket {
  bookingCode: string
  ticketCode: string
  tripId: string
  route: string
  departureTime: string
  arrivalTime: string
  date: string
  busType: string
  passengerName: string
  passengerPhone: string
  passengerEmail: string
  seatNumber: string
  pickupPoint: string
  dropoffPoint: string
  basePrice: number
  vat: number
  totalAmount: number
  paymentStatus: 'PAID' | 'PENDING' | 'CANCELLED'
  checkinStatus: 'NOT_CHECKED_IN' | 'CHECKED_IN'
  qrData: string
  createdAt: string
}

export interface CheckinResult {
  valid: boolean
  message: string
  ticket?: Ticket
}

export interface User {
  id: string
  fullName: string
  phone: string
  email: string
  tier: string
  points: number
}
