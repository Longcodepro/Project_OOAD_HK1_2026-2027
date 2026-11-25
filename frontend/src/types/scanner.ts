export interface SoatVeRequest {
  ma_dat_ve: number
  ma_ghe?: number | null
}

export interface SoatVeResponse {
  hop_le: boolean
  da_soat_truoc_do: boolean
  ma_dat_ve: number
  ho_ten_khach: string
  sdt_khach: string
  tuyen_xe: string
  gio_khoi_hanh: string
  bien_so: string
  danh_sach_so_ghe: string[]
  trang_thai_ve: string
  thong_diep: string
}

export interface TraCuuSoatVeItem {
  ma_dat_ve: number
  ho_ten_khach: string
  sdt_khach: string
  tuyen_xe: string
  gio_khoi_hanh: string
  bien_so: string
  danh_sach_so_ghe: string[]
  tong_tien: number | string
  trang_thai_ve: string
  da_soat_ve: boolean
  thoi_gian_soat?: string | null
  nhan_vien_soat?: string | null
  hop_le_len_xe: boolean
}
