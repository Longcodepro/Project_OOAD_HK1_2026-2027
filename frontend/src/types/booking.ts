export interface ThongTinHanhKhachGhe {
  ma_ghe: number
  ho_ten?: string
  sdt?: string
}

export interface TaoDonDatVePayload {
  ma_chuyen: number
  danh_sach_ma_ghe: number[]
  ma_km?: number | null
  ma_code_km?: string | null
  ho_ten: string
  sdt: string
  dia_chi?: string | null
  ghi_chu?: string | null
  danh_sach_hanh_khach?: ThongTinHanhKhachGhe[]
}

export interface ThanhToanPayload {
  phuong_thuc: string
  ma_giao_dich?: string
  so_tai_khoan?: string
  ten_ngan_hang?: string
  ten_chu_tai_khoan?: string
  ma_code_km?: string
  mo_phong?: string
}

export interface ThanhToanResponse {
  ma_thanh_toan: number
  ma_dat_ve: number
  phuong_thuc: string
  so_tien: number | string
  ma_giao_dich?: string
  thoi_gian_thanh_toan: string
  trang_thai: string
  thong_diep: string
}

export interface KiemTraVoucherPayload {
  ma_code: string
  tong_tien: number
}

export interface KiemTraVoucherResponse {
  hop_le: boolean
  ma_km: number
  ten_km: string
  ma_code: string
  loai_giam: string
  gia_tri_giam: number
  tien_giam: number
  tong_tien_sau_giam: number
  thong_diep: string
}

export interface CapNhatHanhKhachItem {
  ma_ct: number
  ho_ten: string
  sdt: string
}

export interface CapNhatHanhKhachPayload {
  danh_sach_hanh_khach: CapNhatHanhKhachItem[]
}
