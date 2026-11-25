import { useEffect, useState, useMemo } from 'react'
import type { TaiKhoanAdminItem, LichSuThaoTacItem, UserProfile } from '../../types/adminUsers'
import {
  apiErrorMessage,
  createStaffAccount,
  getMe,
  getUserAccounts,
  getUserAuditLogs,
  loginAdmin,
  updateUserStatus,
} from '../../services/api'

export function AdminUsersPage() {
  const [users, setUsers] = useState<TaiKhoanAdminItem[]>([])
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Bộ lọc
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Modal Thêm nhân viên
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [createForm, setCreateForm] = useState({
    ten_dang_nhap: '',
    mat_khau: '',
    ho_ten: '',
    sdt: '',
    chuc_vu: 'Nhân viên bán vé quầy POS',
  })
  const [creatingUser, setCreatingUser] = useState<boolean>(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Modal Audit Log
  const [selectedUserForLogs, setSelectedUserForLogs] = useState<TaiKhoanAdminItem | null>(null)
  const [auditLogs, setAuditLogs] = useState<LichSuThaoTacItem[]>([])
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false)
  const [logsError, setLogsError] = useState<string | null>(null)

  // Trạng thái thao tác khóa / mở khóa
  const [togglingMaTk, setTogglingMaTk] = useState<number | null>(null)
  const [adminLoggingIn, setAdminLoggingIn] = useState<boolean>(false)

  // Tải dữ liệu người dùng & thông tin profile admin hiện tại
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      let me: UserProfile | null = null
      try {
        me = await getMe()
        setCurrentUser(me)
      } catch {
        // Nếu token chưa có hoặc hết hạn, thử auto login admin
        await loginAdmin('admin', 'MatKhau@123')
        me = await getMe()
        setCurrentUser(me)
      }

      const userList = await getUserAccounts({
        vai_tro: roleFilter || undefined,
        trang_thai: statusFilter || undefined,
      })
      setUsers(userList)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [roleFilter, statusFilter])

  // Đăng nhập nhanh quyền Admin
  const handleQuickAdminLogin = async () => {
    setAdminLoggingIn(true)
    setError(null)
    try {
      await loginAdmin('admin', 'MatKhau@123')
      const me = await getMe()
      setCurrentUser(me)
      setSuccessMsg('Đã đăng nhập quyền Quản trị viên (admin) thành công!')
      await loadData()
    } catch (err) {
      setError(`Lỗi đăng nhập admin: ${apiErrorMessage(err)}`)
    } finally {
      setAdminLoggingIn(false)
    }
  }

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = users.length
    const customers = users.filter((u) => u.vai_tro === 'KhachHang').length
    const staff = users.filter((u) => u.vai_tro === 'NhanVienBanVe').length
    const admins = users.filter((u) => u.vai_tro === 'QuanTri').length
    const locked = users.filter((u) => u.trang_thai === 'Khoa').length
    return { total, customers, staff, admins, locked }
  }, [users])

  // Lọc tìm kiếm live
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users
    const q = searchQuery.toLowerCase().trim()
    return users.filter(
      (u) =>
        u.ten_dang_nhap.toLowerCase().includes(q) ||
        (u.ho_ten && u.ho_ten.toLowerCase().includes(q)) ||
        (u.sdt && u.sdt.toLowerCase().includes(q)) ||
        (u.chuc_vu && u.chuc_vu.toLowerCase().includes(q))
    )
  }, [users, searchQuery])

  // Xử lý Khóa / Mở khóa tài khoản
  const handleToggleStatus = async (user: TaiKhoanAdminItem) => {
    if (currentUser && user.ma_tk === currentUser.ma_tk) {
      alert('Bạn không thể tự khóa tài khoản quản trị của chính mình!')
      return
    }

    const nextStatus = user.trang_thai === 'HoatDong' ? 'Khoa' : 'HoatDong'
    const confirmText =
      nextStatus === 'Khoa'
        ? `Bạn có chắc chắn muốn KHÓA tài khoản "${user.ten_dang_nhap}"? Người dùng này sẽ không thể đăng nhập vào hệ thống.`
        : `MỞ KHÓA tài khoản "${user.ten_dang_nhap}" để người dùng có thể đăng nhập bình thường?`

    if (!window.confirm(confirmText)) return

    setTogglingMaTk(user.ma_tk)
    setError(null)
    setSuccessMsg(null)
    try {
      const updated = await updateUserStatus(user.ma_tk, { trang_thai: nextStatus })
      setUsers((prev) => prev.map((u) => (u.ma_tk === updated.ma_tk ? updated : u)))
      setSuccessMsg(
        nextStatus === 'Khoa'
          ? `Đã khóa thành công tài khoản @${user.ten_dang_nhap}`
          : `Đã mở khóa thành công tài khoản @${user.ten_dang_nhap}`
      )
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setTogglingMaTk(null)
    }
  }

  // Xử lý tạo nhân viên mới
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)

    if (!createForm.ten_dang_nhap.trim()) {
      setCreateError('Vui lòng nhập tên đăng nhập.')
      return
    }
    if (createForm.mat_khau.length < 6) {
      setCreateError('Mật khẩu khởi tạo phải từ 6 ký tự trở lên.')
      return
    }
    if (!createForm.ho_ten.trim()) {
      setCreateError('Vui lòng nhập họ và tên nhân viên.')
      return
    }
    if (!createForm.sdt.trim() || createForm.sdt.trim().length < 9) {
      setCreateError('Số điện thoại không hợp lệ (tối thiểu 9 số).')
      return
    }

    setCreatingUser(true)
    try {
      const newStaff = await createStaffAccount({
        ten_dang_nhap: createForm.ten_dang_nhap.trim(),
        mat_khau: createForm.mat_khau,
        ho_ten: createForm.ho_ten.trim(),
        sdt: createForm.sdt.trim(),
        chuc_vu: createForm.chuc_vu.trim() || 'NhanVienBanVe',
      })

      setUsers((prev) => [newStaff, ...prev])
      setSuccessMsg(`Tạo mới thành công nhân viên quầy: ${newStaff.ho_ten} (@${newStaff.ten_dang_nhap})`)
      setShowCreateModal(false)
      setCreateForm({
        ten_dang_nhap: '',
        mat_khau: '',
        ho_ten: '',
        sdt: '',
        chuc_vu: 'Nhân viên bán vé quầy POS',
      })
    } catch (err) {
      setCreateError(apiErrorMessage(err))
    } finally {
      setCreatingUser(false)
    }
  }

  // Xử lý mở Modal xem Audit Log
  const handleOpenAuditLog = async (user: TaiKhoanAdminItem) => {
    setSelectedUserForLogs(user)
    setAuditLogs([])
    setLoadingLogs(true)
    setLogsError(null)
    try {
      const logs = await getUserAuditLogs(user.ma_tk)
      setAuditLogs(logs)
    } catch (err) {
      setLogsError(apiErrorMessage(err))
    } finally {
      setLoadingLogs(false)
    }
  }

  // Helper hiển thị badge vai trò
  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'QuanTri':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            👑 Quản Trị Viên
          </span>
        )
      case 'NhanVienBanVe':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            🎟️ Nhân Viên Quầy
          </span>
        )
      case 'KhachHang':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            👤 Khách Hàng
          </span>
        )
      case 'TaiXe':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            🚐 Tài Xế
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {role || 'Khác'}
          </span>
        )
    }
  }

  // Helper avatar chữ cái đầu
  const getAvatarLetter = (user: TaiKhoanAdminItem) => {
    if (user.ho_ten && user.ho_ten.trim()) {
      const parts = user.ho_ten.trim().split(' ')
      return parts[parts.length - 1].charAt(0).toUpperCase()
    }
    return user.ten_dang_nhap.charAt(0).toUpperCase()
  }

  const getAvatarGradient = (role: string) => {
    switch (role) {
      case 'QuanTri':
        return 'from-purple-600 to-indigo-700 text-white'
      case 'NhanVienBanVe':
        return 'from-blue-500 to-cyan-600 text-white'
      case 'KhachHang':
        return 'from-emerald-500 to-teal-600 text-white'
      default:
        return 'from-slate-600 to-slate-800 text-white'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* HEADER TRANG */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">👥</span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Quản Lý Tài Khoản & Phân Quyền RBAC
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản trị danh sách người dùng, cấp quyền nhân viên quầy POS và kiểm soát trạng thái truy cập hệ thống (UC21, UC22).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600">Đang đăng nhập:</span>
              <strong className="text-slate-900">@{currentUser.ten_dang_nhap}</strong>
              <span className="text-purple-700 font-bold">({currentUser.vai_tro})</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleQuickAdminLogin}
            disabled={adminLoggingIn}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
            title="Đăng nhập lại nếu hết phiên"
          >
            {adminLoggingIn ? 'Đang xác thực...' : '🔄 Xác thực Admin'}
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateError(null)
              setShowCreateModal(true)
            }}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>➕</span> Thêm nhân viên quầy
          </button>
        </div>
      </div>

      {/* THÔNG BÁO ALERT */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-800 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-500 hover:text-emerald-800 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 5 THẺ THỐNG KÊ TỔNG QUAN */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng người dùng</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tài khoản trong hệ thống</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs bg-gradient-to-br from-white to-blue-50/40">
          <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Nhân viên quầy</div>
          <div className="text-2xl font-black text-blue-900 mt-1">{stats.staff}</div>
          <div className="text-[11px] text-blue-600 mt-0.5">Bán vé & POS bến xe</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-gradient-to-br from-white to-emerald-50/40">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Khách hàng</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{stats.customers}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Đặt vé trực tuyến</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs bg-gradient-to-br from-white to-purple-50/40">
          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Quản trị viên</div>
          <div className="text-2xl font-black text-purple-900 mt-1">{stats.admins}</div>
          <div className="text-[11px] text-purple-600 mt-0.5">Toàn quyền hệ thống</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs bg-gradient-to-br from-white to-rose-50/40">
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Tài khoản bị khóa</div>
          <div className="text-2xl font-black text-rose-900 mt-1">{stats.locked}</div>
          <div className="text-[11px] text-rose-600 mt-0.5">Bị đình chỉ đăng nhập</div>
        </div>
      </div>

      {/* THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Ô tìm kiếm live */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên đăng nhập, số điện thoại, họ tên..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Lọc theo Trạng thái */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="HoatDong">Đang hoạt động</option>
              <option value="Khoa">Đã bị khóa</option>
            </select>
          </div>
        </div>

        {/* Lọc theo Vai trò (Pills) */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
          <span className="text-xs font-medium text-slate-500 mr-1">Vai trò:</span>
          {[
            { label: 'Tất cả', value: '' },
            { label: '👤 Khách Hàng', value: 'KhachHang' },
            { label: '🎟️ Nhân Viên Quầy', value: 'NhanVienBanVe' },
            { label: '👑 Quản Trị Viên', value: 'QuanTri' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setRoleFilter(item.value)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                roleFilter === item.value
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400">
            Hiển thị <strong>{filteredUsers.length}</strong> / {users.length} tài khoản
          </span>
        </div>
      </div>

      {/* BẢNG DANH SÁCH NGƯỜI DÙNG */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Đang tải danh sách tài khoản người dùng...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <div className="text-4xl">👥</div>
            <div className="text-sm font-bold text-slate-800">Không tìm thấy tài khoản phù hợp</div>
            <p className="text-xs text-slate-400">Thử thay đổi bộ lọc vai trò, trạng thái hoặc từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Người dùng</th>
                  <th className="py-3 px-4">Số điện thoại</th>
                  <th className="py-3 px-4">Vai trò RBAC</th>
                  <th className="py-3 px-4">Chức vụ / Vị trí</th>
                  <th className="py-3 px-4">Ngày tạo</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((user) => {
                  const isCurrentUser = currentUser?.ma_tk === user.ma_tk
                  const isLocked = user.trang_thai === 'Khoa'
                  const isToggling = togglingMaTk === user.ma_tk

                  return (
                    <tr
                      key={user.ma_tk}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrentUser ? 'bg-purple-50/20' : ''
                      } ${isLocked ? 'opacity-70 bg-rose-50/10' : ''}`}
                    >
                      {/* CỘT NGƯỜI DÙNG & AVATAR */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                              user.vai_tro
                            )} flex items-center justify-center font-black text-sm shadow-xs shrink-0`}
                          >
                            {getAvatarLetter(user)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{user.ho_ten || 'Chưa cập nhật tên'}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] bg-purple-600 text-white font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              @{user.ten_dang_nhap}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SỐ ĐIỆN THOẠI */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {user.sdt ? (
                          <span className="flex items-center gap-1">
                            <span className="text-slate-400">📞</span> {user.sdt}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có SĐT</span>
                        )}
                      </td>

                      {/* VAI TRÒ */}
                      <td className="py-3.5 px-4">
                        {renderRoleBadge(user.vai_tro)}
                      </td>

                      {/* CHỨC VỤ */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {user.chuc_vu || (user.vai_tro === 'KhachHang' ? 'Khách hàng cá nhân' : '—')}
                      </td>

                      {/* NGÀY TẠO */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(user.ngay_tao).toLocaleDateString('vi-VN')}
                      </td>

                      {/* TRẠNG THÁI */}
                      <td className="py-3.5 px-4">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Đã khóa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Hoạt động
                          </span>
                        )}
                      </td>

                      {/* NÚT THAO TÁC */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Nút Xem nhật ký Audit log */}
                          <button
                            type="button"
                            onClick={() => handleOpenAuditLog(user)}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition cursor-pointer flex items-center gap-1"
                            title="Xem lịch sử thao tác vé"
                          >
                            <span>📋</span> Nhật ký
                          </button>

                          {/* Nút Khóa / Mở khóa tài khoản */}
                          {isCurrentUser ? (
                            <span
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                              title="Tài khoản của bạn - Không thể tự khóa"
                            >
                              Tài khoản của bạn
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => handleToggleStatus(user)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                                isLocked
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {isToggling ? (
                                'Đang xử lý...'
                              ) : isLocked ? (
                                <>
                                  <span>🔓</span> Mở khóa
                                </>
                              ) : (
                                <>
                                  <span>🔒</span> Khóa
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================== MODAL THÊM NHÂN VIÊN QUẦY ==================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎟️</span>
                <h3 className="text-sm font-bold text-slate-900">
                  Thêm Mới Nhân Viên Bán Vé Quầy POS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateStaff} className="p-6 space-y-4 text-xs">
              {createError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium">
                  ⚠️ {createError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    Tên đăng nhập <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="nv_mientay"
                    value={createForm.ten_dang_nhap}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, ten_dang_nhap: e.target.value.toLowerCase().replace(/\s/g, '') })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400">Viết liền, không dấu.</p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    Mật khẩu khởi tạo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    value={createForm.mat_khau}
                    onChange={(e) => setCreateForm({ ...createForm, mat_khau: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    Họ và tên nhân viên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={createForm.ho_ten}
                    onChange={(e) => setCreateForm({ ...createForm, ho_ten: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    Số điện thoại liên hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0912345678"
                    value={createForm.sdt}
                    onChange={(e) => setCreateForm({ ...createForm, sdt: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Chức vụ & Bến xe làm việc
                </label>
                <input
                  type="text"
                  placeholder="Nhân viên Bến xe Miền Đông mới"
                  value={createForm.chuc_vu}
                  onChange={(e) => setCreateForm({ ...createForm, chuc_vu: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                ℹ️ Tài khoản sẽ tự động được gán vai trò <strong>NhanVienBanVe</strong> và có đầy đủ quyền bán vé quầy POS, tra cứu thông tin vé và in vé nhiệt.
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {creatingUser ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL XEM AUDIT LOG ==================== */}
      {selectedUserForLogs && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Nhật Ký Thao Tác Vé (Audit Log)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tài khoản: <strong>@{selectedUserForLogs.ten_dang_nhap}</strong> ({selectedUserForLogs.ho_ten || 'Không có tên'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForLogs(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {loadingLogs ? (
                <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang tải lịch sử thao tác vé...</span>
                </div>
              ) : logsError ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  ⚠️ {logsError}
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <div className="text-3xl">📭</div>
                  <div className="text-xs font-bold text-slate-600">Chưa có lịch sử thao tác nào</div>
                  <p className="text-[11px]">Tài khoản này chưa thực hiện thao tác đặt vé, hoàn hủy hoặc thanh toán nào.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Thời gian</th>
                        <th className="py-2.5 px-3">Mã đơn</th>
                        <th className="py-2.5 px-3">Hành động</th>
                        <th className="py-2.5 px-3">Lý do / Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log) => (
                        <tr key={log.ma_lich_su} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-[11px] text-slate-500 font-mono">
                            {new Date(log.thoi_gian).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-orange-600">
                            #{log.ma_dat_ve}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                              {log.hanh_dong}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            {log.ly_do && <div className="font-medium text-slate-800">{log.ly_do}</div>}
                            {log.ghi_chu && <div className="text-slate-500 italic">{log.ghi_chu}</div>}
                            {!log.ly_do && !log.ghi_chu && <span className="text-slate-400">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedUserForLogs(null)}
                className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
