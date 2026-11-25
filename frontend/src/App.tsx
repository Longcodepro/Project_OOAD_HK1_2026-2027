/**
 * @file App.tsx
 * @description Thành phần gốc (Root Component) điều phối toàn bộ ứng dụng Vé Xe.
 *
 * KIẾN TRÚC & QUẢN TRỊ TRẠNG THÁI:
 * 1. Định tuyến Hash hai chiều & Lưu giữ trạng thái khi F5 (Bidirectional Hash Routing & Reload Persistence):
 *    - Ánh xạ trực tiếp mọi view sang URL Hash (`#/`, `#/results`, `#/seats`, `#/checkout`, `#/success`, `#/profile`...).
 *    - Lưu trữ an toàn các trạng thái quan trọng vào `sessionStorage` (`searchParams`, `selectedTrip`, `chosenSeats`,
 *      `currentTicket`, `orderTickets`). Khi người dùng bấm F5 (Reload), hệ thống tự động khôi phục đúng màn hình
 *      và dữ liệu đang thao tác dở mà không bị văng về trang chủ.
 * 2. Giải pháp Giảm Lag & Tối ưu Hiệu năng (Performance Optimization):
 *    - Bọc `DongSonDrum` và `DrumRippleListener` bằng `React.memo` để tránh re-render thừa.
 *    - Cung cấp "Chế độ mượt mà" (`perfMode`): Tự động hoặc chủ động dừng xoay đa tầng SVG nặng nề của mặt trống đồng,
 *      giảm 90% tải GPU/CPU, duy trì 60fps mượt mà trên mọi thiết bị máy tính và điện thoại.
 * 3. Kiến trúc 2 phiên làm việc song song (Dual-Session Architecture):
 *    - `user`: Phiên đăng nhập của khách hàng (`vexe_token`).
 *    - `adminUser`: Phiên đăng nhập của quản trị viên / nhân viên (`vexe_admin_token`).
 * 4. Bảo vệ tuyến đường yêu cầu đăng nhập (`NEEDS_LOGIN`):
 *    - Các view: 'checkout', 'success', 'profile', 'lookup' bắt buộc phải có tài khoản khách hàng.
 *    - Tự động lưu `pendingView` để sau khi đăng nhập đưa khách về đúng trang ban đầu.
 * 5. Phân quyền nghiệp vụ nội bộ (Role-based Authorization):
 *    - 'clerk' (Nhân viên bán vé): Màn hình Bán vé quầy (`admin-counter`) và Soát vé (`admin-scan`).
 *    - 'admin' (Quản trị viên): Toàn quyền quản trị Dashboard, Chuyến, Tuyến, Xe, Bảng giá, Tài khoản.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Ticket, Trip, User, View } from './types'
import { authApi, bookingsApi, checkBackendHealth } from './services/api'
import { getToken, loadUser, type Portal } from './services/session'
import {
  parseHash,
  viewToHash,
  loadSavedSearchParams,
  saveSearchParams,
  loadSavedTrip,
  saveSelectedTrip,
  loadSavedSeats,
  saveChosenSeats,
  loadSavedCurrentTicket,
  saveCurrentTicket,
  loadSavedOrderTickets,
  saveOrderTickets,
  loadSavedPendingView,
  savePendingView,
  loadPerfMode,
  savePerfMode,
  clearBookingFlow,
} from './services/viewState'
import { Footer } from './components/layout/Footer'
import { BottomBar } from './components/layout/BottomBar'
import { DongSonDrum } from './components/dongson/DongSonDrum'
import { DrumRippleListener } from './components/dongson/DrumRippleListener'
import { Modal } from './components/common/Modal'
import { Button } from './components/common/Button'

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

/** Danh sách các màn hình khách hàng yêu cầu bắt buộc phải đăng nhập trước khi truy cập */
const NEEDS_LOGIN: View[] = ['checkout', 'success', 'profile', 'lookup']

export default function App() {
  /** Đọc định tuyến ban đầu từ URL Hash trên trình duyệt */
  const initialRoute = parseHash()
  const initialCustomer = loadUser('customer')
  const needsAuthOnStart =
    !initialRoute.view.startsWith('admin-') &&
    NEEDS_LOGIN.includes(initialRoute.view) &&
    !initialCustomer

  /** Cổng hiện hành ('customer' hoặc 'admin'), xác định từ URL hash */
  const [portal, setPortal] = useState<Portal>(initialRoute.portal)

  /** Màn hình (view) đang hiển thị */
  const [view, setViewState] = useState<View>(() => (needsAuthOnStart ? 'login' : initialRoute.view))

  /** Trạng thái kết nối máy chủ backend (true: online, false: offline/unreachable) */
  const [backendOnline, setBackendOnline] = useState(false)

  /** Thông tin phiên đăng nhập của Khách hàng */
  const [user, setUser] = useState<User | null>(() => initialCustomer)

  /** Thông tin phiên đăng nhập của Ban quản trị / Nhân viên */
  const [adminUser, setAdminUser] = useState<User | null>(() => loadUser('admin'))

  /** Lưu vết màn hình người dùng muốn vào nhưng bị chặn lại do chưa đăng nhập (lưu cả sessionStorage) */
  const [pendingView, setPendingViewState] = useState<View | null>(() => {
    if (needsAuthOnStart) {
      savePendingView(initialRoute.view)
      return initialRoute.view
    }
    return loadSavedPendingView()
  })

  /** Bộ tham số tìm kiếm chuyến xe hiện tại (khôi phục từ URL hash hoặc sessionStorage khi F5) */
  const [searchParams, setSearchParamsState] = useState(() => {
    if (initialRoute.searchParams && initialRoute.searchParams.from && initialRoute.searchParams.to) {
      saveSearchParams(initialRoute.searchParams)
      return initialRoute.searchParams
    }
    return loadSavedSearchParams()
  })

  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  /** Chuyến xe được chọn để đặt vé (khôi phục từ sessionStorage khi F5) */
  const [selectedTrip, setSelectedTripState] = useState<Trip | null>(loadSavedTrip)

  /** Danh sách nhãn các ghế đang được giữ/chọn (khôi phục từ sessionStorage khi F5) */
  const [chosenSeats, setChosenSeatsState] = useState<string[]>(loadSavedSeats)

  /** Vé đang được hiển thị chi tiết (khôi phục từ sessionStorage khi F5) */
  const [currentTicket, setCurrentTicketState] = useState<Ticket | null>(loadSavedCurrentTicket)

  /** Tập hợp toàn bộ các vé thuộc đơn hàng vừa thanh toán thành công (khôi phục từ sessionStorage khi F5) */
  const [orderTickets, setOrderTicketsState] = useState<Ticket[]>(loadSavedOrderTickets)

  /** Chế độ mượt mà / Giảm tải GPU (tắt xoay đa tầng SVG để chống giật lag máy) */
  const [perfMode, setPerfModeState] = useState<boolean>(loadPerfMode)

  /** Thông báo nổi ngắn khi bật/tắt chế độ mượt mà */
  const [perfToast, setPerfToast] = useState<string | null>(null)

  // ---------------------------------------------------------
  // CÁC HÀM CẬP NHẬT TRẠNG THÁI KÈM PERSISTENCE VÀO SESSIONSTORAGE
  // ---------------------------------------------------------

  const setPendingView = useCallback((v: View | null) => {
    setPendingViewState(v)
    savePendingView(v)
  }, [])

  const setSearchParams = useCallback((p: { from: string; to: string; date: string }) => {
    setSearchParamsState(p)
    saveSearchParams(p)
  }, [])

  const setSelectedTrip = useCallback((trip: Trip | null) => {
    setSelectedTripState(trip)
    saveSelectedTrip(trip)
  }, [])

  const setChosenSeats = useCallback((seats: string[]) => {
    setChosenSeatsState(seats)
    saveChosenSeats(seats)
  }, [])

  const setCurrentTicket = useCallback((ticket: Ticket | null) => {
    setCurrentTicketState(ticket)
    saveCurrentTicket(ticket)
  }, [])

  const setOrderTickets = useCallback((tickets: Ticket[]) => {
    setOrderTicketsState(tickets)
    saveOrderTickets(tickets)
  }, [])

  /** Chuyển đổi bật/tắt chế độ mượt mà để giảm lag */
  const togglePerfMode = useCallback(() => {
    setPerfModeState((prev) => {
      const next = !prev
      savePerfMode(next)
      setPerfToast(next ? 'Đã bật Chế độ mượt mà (Giảm lag & tiết kiệm pin)' : 'Đã bật Hiệu ứng đồ họa đầy đủ')
      setTimeout(() => setPerfToast(null), 2500)
      return next
    })
  }, [])

  /**
   * Khởi động ứng dụng: Kiểm tra và xác thực lại token đã lưu trong LocalStorage với backend.
   * Đồng thời đồng bộ URL hash nếu ban đầu bị chặn bởi Auth Guard.
   */
  useEffect(() => {
    if (needsAuthOnStart && window.location.hash !== '#/login') {
      window.location.hash = viewToHash('login')
    }
    authApi.restore('customer', loadUser('customer')).then(setUser)
    authApi.restore('admin', loadUser('admin')).then(setAdminUser)
  }, [])

  /**
   * Lắng nghe sự kiện thay đổi hash của URL (`hashchange`).
   * Tự động đồng bộ view, portal và khôi phục dữ liệu từ sessionStorage khi người dùng F5 hoặc dùng Back/Forward.
   */
  useEffect(() => {
    const onHash = () => {
      const { portal: nextPortal, view: nextView, searchParams: hashSearchParams } = parseHash(window.location.hash)
      setPortal(nextPortal)

      // Đồng bộ searchParams từ URL Hash nếu có query parameters
      if (hashSearchParams && hashSearchParams.from && hashSearchParams.to) {
        setSearchParamsState(hashSearchParams)
        saveSearchParams(hashSearchParams)
      }

      // Xử lý trường hợp truy cập trực tiếp các view yêu cầu dữ liệu chuyến xe
      if (nextView === 'seats' || nextView === 'checkout') {
        const currentTrip = selectedTrip ?? loadSavedTrip()
        if (!currentTrip) {
          // Chưa có chuyến xe nào được chọn: tự chuyển hướng về danh sách kết quả hoặc trang chủ
          const savedParams = loadSavedSearchParams()
          if (savedParams.from && savedParams.to) {
            setViewState('results')
            window.location.hash = viewToHash('results', savedParams)
            return
          }
          setViewState('home')
          window.location.hash = viewToHash('home')
          return
        }
        if (!selectedTrip && currentTrip) {
          setSelectedTripState(currentTrip)
        }
      }

      // Kiểm tra yêu cầu đăng nhập
      if (!nextView.startsWith('admin-') && NEEDS_LOGIN.includes(nextView) && !user) {
        setPendingView(nextView)
        window.location.hash = viewToHash('login')
        setViewState('login')
        return
      }

      setViewState(nextView)
    }

    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [user, selectedTrip, setPendingView])

  /**
   * Kiểm tra định kỳ nhịp tim (heartbeat health check) của backend mỗi 15 giây.
   */
  useEffect(() => {
    const check = () => checkBackendHealth().then(setBackendOnline)
    check()
    const interval = setInterval(check, 15000)
    return () => clearInterval(interval)
  }, [])

  /**
   * Hàm điều hướng trung tâm (Navigation Handler):
   * - Cập nhật URL Hash tương ứng với view mới.
   * - Kiểm tra quyền truy cập (Auth Guard) cho các màn hình yêu cầu đăng nhập.
   * - Ghi nhớ pendingView khi người dùng chủ động vào màn hình login/register.
   */
  const navigate = useCallback(
    (next: View) => {
      const toAdmin = next.startsWith('admin-')
      const targetHash = viewToHash(next, next === 'results' ? searchParamsRef.current : null)

      if (!toAdmin && NEEDS_LOGIN.includes(next) && !user) {
        setPendingView(next)
        window.location.hash = viewToHash('login')
        setPortal('customer')
        setViewState('login')
        return
      }

      // Nếu đang ở màn hình khác mà bấm đăng nhập/đăng ký: ghi nhớ trang hiện tại
      if (!toAdmin && (next === 'login' || next === 'register')) {
        if (view !== 'home' && view !== 'login' && view !== 'register') {
          setPendingView(view)
        }
      }

      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash
      }
      setPortal(toAdmin ? 'admin' : 'customer')
      setViewState(next)
    },
    [user, view, setPendingView],
  )

  /**
   * Xử lý khi khách hàng đăng nhập thành công:
   * Chuyển tiếp đúng về `pendingView` (ví dụ đang ở checkout thì quay lại checkout),
   * hoặc tiếp tục tiến trình đặt vé nếu đã chọn chuyến/ghế, thay vì luôn luôn về home.
   */
  const handleCustomerLogin = (u: User) => {
    setUser(u)
    const savedPending = pendingView ?? loadSavedPendingView()
    setPendingView(null)
    const currentTrip = selectedTrip ?? loadSavedTrip()
    const target =
      savedPending ??
      (currentTrip ? (chosenSeats.length > 0 ? 'checkout' : 'seats') : 'home')
    navigate(target)
  }

  /** Trạng thái mở hộp thoại cảnh báo khi người dùng đăng xuất trong lúc đang giữ chỗ hoặc thanh toán */
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false)

  /**
   * Cảnh báo khi người dùng đóng tab / F5 / điều hướng trình duyệt ngoài ứng dụng:
   * Nếu đang ở bước giữ chỗ ('seats') hoặc thanh toán ('checkout') mà có ghế được chọn,
   * trình duyệt sẽ kích hoạt cảnh báo chuẩn beforeunload để người dùng xác nhận trước khi rời đi.
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((view === 'seats' || view === 'checkout') && chosenSeats.length > 0) {
        e.preventDefault()
        e.returnValue = 'Bạn đang trong quá trình giữ chỗ/thanh toán vé. Các ghế đang giữ sẽ bị hủy nếu bạn đóng tab.'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [view, chosenSeats])

  /**
   * Hủy giải phóng toàn bộ ghế đang giữ trên server và dọn sạch session khi người dùng xác nhận thoát hoặc đăng xuất
   */
  const releaseCurrentHolds = useCallback(async () => {
    if (selectedTrip && chosenSeats.length > 0) {
      try {
        await bookingsApi.releaseSeats(selectedTrip.id).catch(() => undefined)
      } catch {
        // Bỏ qua lỗi mạng
      }
    }
    setChosenSeatsState([])
    saveChosenSeats([])
    clearBookingFlow()
  }, [selectedTrip, chosenSeats])

  /**
   * Xử lý khi khách hàng yêu cầu đăng xuất:
   * Nếu đang trong quá trình giữ chỗ hoặc thanh toán, bắt buộc cảnh báo và yêu cầu xác nhận.
   * Khi xác nhận, hệ thống lập tức nhả ghế về 'TRONG' trên server để không bị treo ghế.
   */
  const handleCustomerLogout = async () => {
    const hasHoldingSeats = (view === 'seats' || view === 'checkout') && chosenSeats.length > 0
    if (hasHoldingSeats) {
      setShowLogoutConfirmModal(true)
      return
    }
    await executeCustomerLogout()
  }

  const executeCustomerLogout = async () => {
    setShowLogoutConfirmModal(false)
    await releaseCurrentHolds()
    await authApi.logout('customer')
    setUser(null)
    setCurrentTicket(null)
    navigate('home')
  }

  /** Xử lý khi nhân viên/admin đăng nhập thành công: phân nhánh về Quầy bán vé (clerk) hoặc Dashboard (admin) */
  const handleAdminLogin = (u: User) => {
    setAdminUser(u)
    navigate(u.role === 'clerk' ? 'admin-counter' : 'admin-dashboard')
  }

  /** Xử lý khi nhân viên/admin đăng xuất */
  const handleAdminLogout = async () => {
    await authApi.logout('admin')
    setAdminUser(null)
    navigate('admin-dashboard')
  }

  /** Kích hoạt tìm kiếm chuyến từ trang chủ: lưu tham số và chuyển sang màn hình danh sách kết quả */
  const handleSearch = (from: string, to: string, date: string) => {
    setSearchParams({ from, to, date })
    navigate('results')
  }

  /** Chọn một chuyến xe từ danh sách kết quả: reset ghế chọn và mở màn hình chọn ghế */
  const handleSelectTrip = (trip: Trip) => {
    setSelectedTrip(trip)
    setChosenSeats([])
    navigate('seats')
  }

  // ---------------------------------------------------------
  // CỔNG QUẢN TRỊ & NHÂN VIÊN (#/admin)
  // ---------------------------------------------------------
  if (portal === 'admin') {
    // Nếu chưa đăng nhập quản trị, hiển thị form Admin Login
    if (!adminUser) {
      return (
        <div className="app-shell">
          <AdminLoginPage onLoginSuccess={handleAdminLogin} onBack={() => navigate('home')} />
        </div>
      )
    }

    // Phân quyền màn hình: Nhân viên quầy (clerk) chỉ được dùng Counter và Scanner
    const isClerk = adminUser.role === 'clerk'
    const adminView: View = !view.startsWith('admin-')
      ? isClerk
        ? 'admin-counter'
        : 'admin-dashboard'
      : isClerk && view !== 'admin-scan' && view !== 'admin-counter'
        ? 'admin-counter'
        : view

    // Màn hình Soát vé độc lập (chế độ toàn màn hình cho camera scanner)
    if (adminView === 'admin-scan') {
      return (
        <ScannerPage
          user={adminUser}
          onBack={() => navigate(isClerk ? 'admin-counter' : 'admin-dashboard')}
          onLogout={handleAdminLogout}
        />
      )
    }

    // Các trang quản trị nghiệp vụ bọc trong AdminLayout
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
  // CỔNG KHÁCH HÀNG (Customer Portal)
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
            onSelectSeats={setChosenSeats}
            onBookingSuccess={(tickets) => {
              setOrderTickets(tickets)
              setCurrentTicket(tickets[0] ?? null)
              setChosenSeats([])
              navigate('success')
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
            onViewTicket={(ticket) => {
              setCurrentTicket(ticket)
            }}
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
            onViewTicket={(ticket) => {
              setCurrentTicket(ticket)
            }}
            onLogout={handleCustomerLogout}
            perfMode={perfMode}
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
            perfMode={perfMode}
          />
        )
    }
  }

  // Ẩn Footer và BottomBar ở trang đăng nhập/đăng ký để giao diện tập trung và gọn gàng
  const showFooter = customerView !== 'login' && customerView !== 'register'

  return (
    <div
      className={`app-shell flex flex-col justify-between min-h-screen relative bg-paper text-ink selection:bg-terracotta selection:text-paper overflow-x-clip ${
        showFooter ? 'pb-14 md:pb-9' : '' // Chừa khoảng trống phía dưới cho thanh điều hướng cố định (BottomBar)
      }`}
    >
      {/* Mặt trống đồng Đông Sơn chìm làm nền mỹ thuật toàn trang (hỗ trợ perfMode chống lag) */}
      <DongSonDrum fixed size={1680} opacity={0.22} perfMode={perfMode} />

      {/* Hiệu ứng lan tỏa sóng âm trống đồng và mực loang khi click chuột */}
      <DrumRippleListener perfMode={perfMode} />

      {/* Vùng nội dung chính của màn hình */}
      <div className="flex-1 relative z-10">{renderPage()}</div>

      {/* Footer ở cuối trang (chỉ hiển thị ở HomePage) */}
      {customerView === 'home' && <Footer setView={navigate} />}

      {/* Thanh điều hướng cố định phía dưới màn hình trên thiết bị di động */}
      {showFooter && <BottomBar currentView={customerView} setView={navigate} />}

      {/* Nút bật/tắt chế độ mượt mà (Giảm lag) nổi ở góc phải màn hình */}
      <div className="fixed bottom-16 md:bottom-11 right-4 z-40 select-none">
        <button
          onClick={togglePerfMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md transition-all border backdrop-blur-md cursor-pointer ${
            perfMode
              ? 'bg-celadon text-paper border-celadon hover:bg-celadon/90'
              : 'bg-paper/90 text-ink-soft border-hairline hover:text-ink hover:border-bronze'
          }`}
          title={perfMode ? 'Chế độ mượt mà đang BẬT (Đã tắt xoay trống đồng, tiết kiệm GPU)' : 'Bấm để bật Chế độ mượt mà (Giảm lag)'}
        >
          <span className="material-symbols-outlined text-sm">
            {perfMode ? 'bolt' : 'speed'}
          </span>
          <span>{perfMode ? 'Mượt mà: Bật' : 'Giảm lag'}</span>
        </button>
      </div>

      {/* Thông báo nổi (Toast) khi người dùng chuyển đổi chế độ mượt mà */}
      {perfToast && (
        <div className="fixed top-20 right-4 z-50 rounded-md bg-ink text-paper px-4 py-2.5 text-xs font-medium shadow-lg animate-fade-in flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-celadon">check_circle</span>
          <span>{perfToast}</span>
        </div>
      )}

      {/* Modal cảnh báo khi người dùng đăng xuất trong lúc đang giữ chỗ hoặc thanh toán */}
      {showLogoutConfirmModal && (
        <Modal
          title="Xác nhận đăng xuất"
          onClose={() => setShowLogoutConfirmModal(false)}
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowLogoutConfirmModal(false)}>
                Ở lại tiếp tục đặt vé
              </Button>
              <Button
                variant="primary"
                className="bg-terracotta hover:bg-terracotta/90 text-white cursor-pointer"
                onClick={executeCustomerLogout}
              >
                Xác nhận đăng xuất (Hủy giữ ghế)
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-ink">
              Bạn đang trong quá trình đặt vé và đang giữ các ghế: <b className="text-terracotta">{chosenSeats.join(', ')}</b>.
            </p>
            <p className="text-sm text-ink-soft">
              Nếu bạn đăng xuất bây giờ, hệ thống sẽ <b>hủy bỏ toàn bộ phiên giữ chỗ</b> và đưa các ghế này trở lại trạng thái <b>trống (chưa ai chọn)</b> ngay lập tức để không bị treo ghế trong hệ thống.
            </p>
            <p className="text-xs font-semibold text-terracotta">
              Bạn có chắc chắn muốn đăng xuất và hủy giữ chỗ không?
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
