import { useEffect, useState } from 'react'
import type { View, User } from '../../types'
import { ticketsApi } from '../../services/api'
import { AdminSidebar } from './AdminSidebar'

export interface AdminLayoutProps {
  currentView: View
  setView: (v: View) => void
  user: User | null
  onLogout: () => void
  children: React.ReactNode
}

export function AdminLayout({
  currentView,
  setView,
  user,
  onLogout,
  children,
}: AdminLayoutProps) {
  const [pendingCancelCount, setPendingCancelCount] = useState(0)

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const tickets = await ticketsApi.getAll()
        const count = tickets.filter((t) => t.paymentStatus === 'PENDING_CANCEL').length
        setPendingCancelCount(count)
      } catch {}
    }
    fetchPendingCount()
    const interval = setInterval(fetchPendingCount, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <AdminSidebar
        currentView={currentView}
        setView={setView}
        user={user}
        pendingCancelCount={pendingCancelCount}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-8 py-3.5 backdrop-blur-md shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-600">
              Hệ thống điều hành trực tuyến: <b className="text-slate-900 font-bold">Violetline Core</b>
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {pendingCancelCount > 0 && (
              <button
                type="button"
                onClick={() => setView('admin-tickets')}
                className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 font-bold text-amber-800 hover:bg-amber-100 transition cursor-pointer shadow-xs"
              >
                <span>⚠</span>
                <span>Có <b>{pendingCancelCount}</b> vé chờ duyệt hủy</span>
              </button>
            )}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-xs">
              <span className="text-slate-500 font-medium">Đang trực:</span>
              <span className="font-bold text-slate-900">{user?.fullName || 'Super Admin'}</span>
            </div>
          </div>
        </header>

        {/* Dynamic page content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
