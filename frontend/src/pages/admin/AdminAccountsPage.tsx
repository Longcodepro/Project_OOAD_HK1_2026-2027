import { useEffect, useState } from 'react'
import type { View } from '../../types'
import { adminAccountsApi } from '../../services/api'

export interface AdminAccountsPageProps {
  setView: (v: View) => void
}

export function AdminAccountsPage({ setView: _ }: AdminAccountsPageProps) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    adminAccountsApi.getAll().then((data) => {
      setUsers(data)
      setLoading(false)
    })
  }, [])

  const handleToggleLock = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'LOCKED' : 'ACTIVE'
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: nextStatus } : u)),
    )
    setToastMsg(
      nextStatus === 'LOCKED'
        ? `⚠ Đã khóa tài khoản ${id}. Người dùng này sẽ không thể đăng nhập hoặc đặt vé.`
        : `✓ Đã mở khóa tài khoản ${id} thành công.`,
    )
  }

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      u.id.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-orange-600">PHÂN QUYỀN & BẢO MẬT</span>
        <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Quản lý Tài khoản</h1>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Xem thông tin khách hàng, phân quyền quản trị và thực hiện khóa tài khoản khi phát hiện dấu hiệu vi phạm hoặc spam.
        </p>
      </div>

      {toastMsg && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3.5 text-xs text-orange-900 font-semibold flex items-center justify-between shadow-xs">
          <span>{toastMsg}</span>
          <button type="button" onClick={() => setToastMsg('')} className="text-orange-500 hover:text-orange-900">✕</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <input
            type="text"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 font-medium shadow-xs"
            placeholder="Tìm theo tên, email hoặc SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">Tổng số: {users.length} tài khoản</span>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="p-4">Mã User</th>
                <th className="p-4">Họ và tên</th>
                <th className="p-4">Liên hệ</th>
                <th className="p-4">Vai trò</th>
                <th className="p-4">Hạng thành viên</th>
                <th className="p-4">Số vé đã đặt</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">Đang tải...</td>
                </tr>
              ) : filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-mono font-bold text-orange-600">{u.id}</td>
                  <td className="p-4">
                    <b className="text-slate-900 block font-bold">{u.fullName}</b>
                    <span className="text-[11px] text-slate-400 font-medium">Tạo: {u.createdAt}</span>
                  </td>
                  <td className="p-4">
                    <p className="text-slate-800 font-medium">{u.email}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{u.phone}</p>
                  </td>
                  <td className="p-4">
                    {u.role === 'admin' ? (
                      <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        QUẢN TRỊ VIÊN
                      </span>
                    ) : (
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        KHÁCH HÀNG
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-bold text-slate-800">{u.tier}</td>
                  <td className="p-4 font-mono font-bold text-slate-900">{u.bookingsCount} chuyến</td>
                  <td className="p-4">
                    {u.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        HOẠT ĐỘNG
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                        ĐÃ KHÓA
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {u.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleToggleLock(u.id, u.status)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition border cursor-pointer ${
                          u.status === 'ACTIVE'
                            ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa'}
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
