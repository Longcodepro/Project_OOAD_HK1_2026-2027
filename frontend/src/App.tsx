import { useEffect, useState } from 'react'
import type { Trip, Ticket, User, View } from './types'
import { checkBackendHealth } from './services/api'
import { Footer } from './components/layout/Footer'
import { HomePage } from './pages/HomePage'
import { ResultsPage } from './pages/ResultsPage'
import { SeatsPage } from './pages/SeatsPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { SuccessPage } from './pages/SuccessPage'
import { ProfilePage } from './pages/ProfilePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { GoogleSignupPage } from './pages/GoogleSignupPage'
import { ScannerPage } from './pages/ScannerPage'

export default function App() {
  const [view, setView] = useState<View>('home')
  const [backendOnline, setBackendOnline] = useState(false)

  // Khởi tạo user: mặc định là null (khách mới chưa đăng nhập) hoặc lấy từ localStorage nếu đã đăng nhập trước đó
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('violetline_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [searchParams, setSearchParams] = useState({
    from: 'TP. Hồ Chí Minh',
    to: 'Đà Lạt',
    date: new Date().toISOString().slice(0, 10),
  })

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [chosenSeat, setChosenSeat] = useState('A01')
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null)

  // Lưu thông tin đăng nhập vào localStorage
  const handleAuthSuccess = (newUser: User) => {
    setUser(newUser)
    try {
      localStorage.setItem('violetline_user', JSON.stringify(newUser))
    } catch {
      // ignore
    }
  }

  // Đăng xuất tài khoản
  const handleLogout = () => {
    setUser(null)
    try {
      localStorage.removeItem('violetline_user')
    } catch {
      // ignore
    }
    setView('home')
  }

  // Kiểm tra kết nối backend khi app khởi chạy và kiểm tra định kỳ
  useEffect(() => {
    checkBackendHealth().then((online) => setBackendOnline(online))
    const interval = setInterval(() => {
      checkBackendHealth().then((online) => setBackendOnline(online))
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleSearch = (from: string, to: string, date: string) => {
    setSearchParams({ from, to, date })
    setView('results')
  }

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTrip(trip)
    setView('seats')
  }

  const renderPage = () => {
    switch (view) {
      case 'home':
        return (
          <HomePage
            setView={setView}
            user={user}
            backendOnline={backendOnline}
            onSearch={handleSearch}
            onLogout={handleLogout}
          />
        )
      case 'results':
        return (
          <ResultsPage
            setView={setView}
            user={user}
            backendOnline={backendOnline}
            searchParams={searchParams}
            onSelectTrip={handleSelectTrip}
          />
        )
      case 'seats':
        return (
          <SeatsPage
            setView={setView}
            user={user}
            backendOnline={backendOnline}
            trip={selectedTrip}
            chosenSeat={chosenSeat}
            onSelectSeat={setChosenSeat}
          />
        )
      case 'checkout':
        return (
          <CheckoutPage
            setView={setView}
            user={user}
            backendOnline={backendOnline}
            trip={selectedTrip}
            chosenSeat={chosenSeat}
            onBookingSuccess={setCurrentTicket}
          />
        )
      case 'success':
        return (
          <SuccessPage
            setView={setView}
            user={user}
            backendOnline={backendOnline}
            ticket={currentTicket}
          />
        )
      case 'profile':
        return (
          <ProfilePage
            setView={setView}
            user={user}
            backendOnline={backendOnline}
            onViewTicket={setCurrentTicket}
            onLogout={handleLogout}
          />
        )
      case 'scan':
        return <ScannerPage setView={setView} />
      case 'login':
        return <LoginPage setView={setView} onLoginSuccess={handleAuthSuccess} />
      case 'register':
        return <RegisterPage setView={setView} onRegisterSuccess={handleAuthSuccess} />
      case 'google-signup':
        return <GoogleSignupPage setView={setView} onLoginSuccess={handleAuthSuccess} />
      default:
        return (
          <HomePage
            setView={setView}
            user={user}
            backendOnline={backendOnline}
            onSearch={handleSearch}
            onLogout={handleLogout}
          />
        )
    }
  }

  const isCustomerPortal =
    view !== 'login' &&
    view !== 'register' &&
    view !== 'google-signup' &&
    view !== 'scan'

  return (
    <div className="app-shell flex flex-col justify-between min-h-screen">
      <div className="flex-1">{renderPage()}</div>

      {isCustomerPortal && <Footer setView={setView} />}

      {isCustomerPortal && (
        <button
          type="button"
          onClick={() => setView('scan')}
          className="crew-entry"
        >
          ◉ Crew scan
        </button>
      )}
    </div>
  )
}
