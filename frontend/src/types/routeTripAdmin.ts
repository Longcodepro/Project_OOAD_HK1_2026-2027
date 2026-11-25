export interface ThongTinChuyenGanNhat {
  ma_chuyen: number
  tuyen_xe: string
  diem_den: string
  ngay_khoi_hanh: string
  gio_khoi_hanh: string
  trang_thai: string
}

export interface XeAdmin {
  ma_xe: number
  bien_so: string
  ma_loai_xe: number
  ten_loai_xe: string
  so_ghe: number
  trang_thai: string
  chuyen_gan_nhat?: ThongTinChuyenGanNhat | null
}

export interface TaoTuyenXePayload {
  diem_di: string
  diem_den: string
  khoang_cach?: number | null
  thoi_gian_du_kien?: number | null
  mo_ta?: string | null
}

export interface CapNhatTrangThaiTuyenPayload {
  trang_thai: 'HoatDong' | 'TamDung'
}

export interface CapNhatTrangThaiTuyenResponse {
  ma_tuyen: number
  trang_thai: string
  so_chuyen_dang_mo_ban: number
  thong_diep: string
}

export interface TaoChuyenXePayload {
  ma_tuyen: number
  ma_xe: number
  ngay_khoi_hanh: string
  gio_khoi_hanh: string
  gia_ve: number
  ghi_chu?: string | null
}

export interface LapLichHangLoatPayload {
  ma_tuyen: number
  ma_xe: number
  ngay_bat_dau: string
  ngay_ket_thuc: string
  gio_khoi_hanh: string
  gia_ve: number
  ghi_chu?: string | null
}

export interface LapLichHangLoatResponse {
  status: string
  so_chuyen_tao: number
  danh_sach_ma_chuyen: number[]
  thong_diep: string
}

export interface ChiTietDongBo {
  dang_ban: number
  sap_khoi_hanh: number
  dang_chay: number
}

export interface DongBoVongDoiResponse {
  status: string
  so_chuyen_cap_nhat: number
  thong_diep: string
  chi_tiet: ChiTietDongBo
}

export interface XacNhanHoanThanhResponse {
  status: string
  message: string
  ma_chuyen: number
  trang_thai: string
}
