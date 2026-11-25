export interface TaiKhoanAdminItem {
  ma_tk: number
  ten_dang_nhap: string
  vai_tro: string
  trang_thai: string
  ngay_tao: string
  ho_ten?: string | null
  sdt?: string | null
  chuc_vu?: string | null
}

export interface TaoNhanVienPayload {
  ten_dang_nhap: string
  mat_khau: string
  ho_ten: string
  sdt: string
  chuc_vu?: string
}

export interface CapNhatTrangThaiTaiKhoanPayload {
  trang_thai?: 'HoatDong' | 'Khoa' | null
}

export interface LichSuThaoTacItem {
  ma_lich_su: number
  ma_dat_ve: number
  hanh_dong: string
  thoi_gian: string
  ly_do?: string | null
  ghi_chu?: string | null
}

export interface UserProfile {
  ma_tk: number
  ten_dang_nhap: string
  vai_tro: string
  trang_thai: string
  ho_ten: string
  sdt: string
  chuc_vu?: string | null
  dia_chi?: string | null
  ma_kh?: number | null
  ma_nv?: number | null
}
