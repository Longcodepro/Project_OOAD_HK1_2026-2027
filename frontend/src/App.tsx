import { useCallback, useEffect, useState } from 'react'
import type { Ticket, Trip, User, View } from './types'
import { authApi, checkBackendHealth } from './services/api'
import { ADMIN_HASH, currentPortal, loadUser, type Portal } from './services/session'
import { Footer } from './components/layout/Footer'
import { DongSonDrum } from './components/dongson/DongSonDrum'
import { DrumRippleListener } from './components/dongson/DrumRippleListener'

// Cổng khách hàng
import { HomePage } from './pages/HomePage'
import { ResultsPage } from './pages/ResultsPage'
import { SeatsPage } from './pages/SeatsPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { SuccessPage } from './pages/SuccessPage'
import { ProfilePage } from './pages/ProfilePage'
import { TicketLookupPage } from './pages/TicketLookupPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

// Cổng quản trị & nhân viên
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminLayout } from './components/admin/AdminLayout'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminTicketsPage } from './pages/admin/AdminTicketsPage'
import { AdminTripsPage } from './pages/admin/AdminTripsPage'
import { AdminBusesPage } from './pages/admin/AdminBusesPage'
import { AdminPricingPage } from './pages/admin/AdminPricingPage'
import { AdminAccountsPage } from './pages/admin/AdminAccountsPage'
import { AdminRoutesPage } from './pages/admin/AdminRoutesPage'
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage'
import { CounterPage } from './pages/admin/CounterPage'
import { ScannerPage } from './pages/ScannerPage'

/** Các trang khách chỉ vào được khi đã đăng nhập (backend yêu cầu token khách). */
const NEEDS_LOGIN: View[] = ['checkout', 'success', 'profile', 'lookup']

export default function App() {
  const [portal, setPortal] = useState<Portal>(currentPortal)
  const [view, setViewState] = useState<View>('home')
  const [backendOnline, setBackendOnline] = useState(false)

  // Hai phiên độc lập: khách hàng và quản trị/nhân viên
  const [user, setUser] = useState<User | null>(() => loadUser('customer'))
  const [adminUser, setAdminUser] = useState<User | null>(() => loadUser('admin'))
  // Trang khách đang muốn vào nhưng phải đăng nhập trước
  const [pendingView, setPendingView] = useState<View | null>(null)

  const [searchParams, setSearchParams] = useState({ from: '', to: '', date: '' })
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [chosenSeats, setChosenSeats] = useState<string[]>([]) // nhãn ghế đang chọn (tối đa 10)
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null)
  const [orderTickets, setOrderTickets] = useState<Ticket[]>([]) // các vé của đơn vừa đặt

  // Xác thực lại token đã lưu với backend (token hết hạn/bị thu hồi thì bỏ phiên)
  useEffect(() => {
    authApi.restore('customer', loadUser('customer')).then(setUser)
    authApi.restore('admin', loadUser('admin')).then(setAdminUser)
  }, [])

  // Chuyển cổng khi URL đổi (#/admin ↔ trang khách)
  useEffect(() => {
    const onHash = () => setPortal(currentPortal())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const check = () => checkBackendHealth().then(setBackendOnline)
    check()
    const interval = setInterval(check, 15000)
    return () => clearInterval(interval)
  }, [])

  /** Điều hướng: vào/ra cổng quản trị đổi URL; trang khách cần đăng nhập thì chuyển sang đăng nhập. */
  const navigate = useCallback(
    (next: View) => {
      const toAdmin = next.startsWith('admin-')
      if (toAdmin !== (portal === 'admin')) {
        window.location.hash = toAdmin ? ADMIN_HASH : ''
        setPortal(toAdmin ? 'admin' : 'customer')
      }
      if (!toAdmin && NEEDS_LOGIN.includes(next) && !user) {
        setPendingView(next)
        setViewState('login')
        return
      }
      setViewState(next)
    },
    [portal, user],
  )

  const handleCustomerLogin = (u: User) => {
    setUser(u)
    setViewState(pendingView ?? 'home')
    setPendingView(null)
  }

  const handleCustomerLogout = async () => {
    await authApi.logout('customer')
    setUser(null)
    setCurrentTicket(null)
    setViewState('home')
  }

  const handleAdminLogin = (u: User) => {
    setAdminUser(u)
    setViewState(u.role === 'clerk' ? 'admin-counter' : 'admin-dashboard')
  }

  const handleAdminLogout = async () => {
    await authApi.logout('admin')
    setAdminUser(null)
    setViewState('admin-dashboard')
  }

  const handleSearch = (from: string, to: string, date: string) => {
    setSearchParams({ from, to, date })
    setViewState('results')
  }

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTrip(trip)
    setChosenSeats([])
    setViewState('seats')
  }

  // ---------------------------------------------------------
  // CỔNG QUẢN TRỊ & NHÂN VIÊN (#/admin)
  // ---------------------------------------------------------
  if (portal === 'admin') {
    if (!adminUser) {
      return (
        <div className="app-shell">
          <AdminLoginPage onLoginSuccess={handleAdminLogin} onBack={() => navigate('home')} />
        </div>
      )
    }

    // Nhân viên bán vé chỉ có quầy bán vé và soát vé; quản trị viên có các màn còn lại
    const isClerk = adminUser.role === 'clerk'
    const adminView: View = !view.startsWith('admin-')
      ? isClerk
        ? 'admin-counter'
        : 'admin-dashboard'
      : isClerk && view !== 'admin-scan'
        ? 'admin-counter'
        : !isClerk && view === 'admin-counter'
          ? 'admin-dashboard'
          : view

    if (adminView === 'admin-scan') {
      return (
        <ScannerPage
          user={adminUser}
          onBack={() => navigate(isClerk ? 'admin-counter' : 'admin-dashboard')}
          onLogout={handleAdminLogout}
        />
      )
    }

    const page = (() => {
      switch (adminView) {
        case 'admin-tickets':
          return <AdminTicketsPage />
        case 'admin-trips':
          return <AdminTripsPage />
        case 'admin-buses':
          return <AdminBusesPage />
        case 'admin-pricing':
          return <AdminPricingPage />
        case 'admin-accounts':
          return <AdminAccountsPage />
        case 'admin-routes':
          return <AdminRoutesPage />
        case 'admin-settings':
          return <AdminSettingsPage />
        case 'admin-counter':
          return <CounterPage user={adminUser} onOpenScanner={() => navigate('admin-scan')} />
        default:
          return <AdminDashboardPage setView={navigate} />
      }
    })()

    return (
      <div className="app-shell">
        <AdminLayout currentView={adminView} setView={navigate} user={adminUser} onLogout={handleAdminLogout}>
          {page}
        </AdminLayout>
      </div>
    )
  }

  // ---------------------------------------------------------
  // CỔNG KHÁCH HÀNG
  // ---------------------------------------------------------
  const customerView: View = view.startsWith('admin-') ? 'home' : view

  const renderPage = () => {
    switch (customerView) {
      case 'results':
        return (
          <ResultsPage
            setView={navigate}
            user={user}
            backendOnline={backendOnline}
            onLogout={handleCustomerLogout}
            searchParams={searchParams}
            onSelectTrip={handleSelectTrip}
          />
        )
      case 'seats':
        return (
          <SeatsPage
            setView={navigate}
            user={user}
            backendOnline={backendOnline}
            onLogout={handleCustomerLogout}
            trip={selectedTrip}
            chosenSeats={chosenSeats}
            onSelectSeats={setChosenSeats}
          />
        )
      case 'checkout':
        return (
          <CheckoutPage
            setView={navigate}
            user={user}
            backendOnline={backendOnline}
            onLogout={handleCustomerLogout}
            trip={selectedTrip}
            chosenSeats={chosenSeats}
            onBookingSuccess={(tickets) => {
              setOrderTickets(tickets)
              setCurrentTicket(tickets[0] ?? null)
            }}
          />
        )
      case 'success':
        return (
          <SuccessPage
            setView={navigate}
            user={user}
            backendOnline={backendOnline}
            onLogout={handleCustomerLogout}
            ticket={currentTicket}
            orderTickets={orderTickets}
            onSelectTicket={setCurrentTicket}
          />
        )
      case 'profile':
        return (
          <ProfilePage
            setView={navigate}
            user={user}
            backendOnline={backendOnline}
            onViewTicket={setCurrentTicket}
            onLogout={handleCustomerLogout}
            onUserUpdate={setUser}
          />
        )
      case 'lookup':
        return (
          <TicketLookupPage
            setView={navigate}
            user={user}
            backendOnline={backendOnline}
            onViewTicket={setCurrentTicket}
            onLogout={handleCustomerLogout}
          />
        )
      case 'login':
        return <LoginPage setView={navigate} onLoginSuccess={handleCustomerLogin} />
      case 'register':
        return <RegisterPage setView={navigate} onRegisterSuccess={handleCustomerLogin} />
      default:
        return (
          <HomePage
            setView={navigate}
            user={user}
            backendOnline={backendOnline}
            onSearch={handleSearch}
            onLogout={handleCustomerLogout}
          />
        )
    }
  }

  const showFooter = customerView !== 'login' && customerView !== 'register'

  return (
    <div className="app-shell flex flex-col justify-between min-h-screen relative bg-paper text-ink selection:bg-terracotta selection:text-paper overflow-x-hidden">
      {/* Mặt trống đồng Đông Sơn làm nền toàn trang */}
      <DongSonDrum fixed size={1680} opacity={0.22} />

      {/* Sóng âm trống đồng & mực loang khi click */}
      <DrumRippleListener />

      <div className="flex-1 relative z-10">{renderPage()}</div>
      {showFooter && <Footer setView={navigate} />}
    </div>
  )
}
