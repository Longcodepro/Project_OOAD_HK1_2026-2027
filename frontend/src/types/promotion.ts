export interface KhuyenMaiAdminItem {
  ma_km: number
  ten_km: string
  ma_code: string
  loai_giam: 'PhanTram' | 'TienMat'
  gia_tri_giam: number
  gia_tri_giam_toi_da?: number | null
  don_toi_thieu: number
  ngay_bat_dau: string
  ngay_ket_thuc: string
  trang_thai: 'HoatDong' | 'TamDung'
  mo_ta?: string | null
  so_lan_su_dung: number
  con_hieu_luc: boolean
}

export interface TaoKhuyenMaiPayload {
  ten_km: string
  ma_code: string
  loai_giam: 'PhanTram' | 'TienMat'
  gia_tri_giam: number
  gia_tri_giam_toi_da?: number | null
  don_toi_thieu: number
  ngay_bat_dau: string
  ngay_ket_thuc: string
  mo_ta?: string | null
}
