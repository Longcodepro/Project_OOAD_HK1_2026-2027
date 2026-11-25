export interface PhuongTienAdmin {
  ma_xe: number
  bien_so: string
  hang_xe?: string | null
  nam_san_xuat?: number | null
  ma_loai_xe: number
  ten_loai_xe: string
  so_ghe: number
  trang_thai: 'HoatDong' | 'BaoTri' | 'NgungHoatDong' | string
  so_chuyen_da_chay: number
}

export interface LoaiXeAdmin {
  ma_loai_xe: number
  ten_loai_xe: string
  so_ghe: number
  mo_ta?: string | null
}

export interface TaoPhuongTienPayload {
  bien_so: string
  hang_xe?: string
  nam_san_xuat?: number
  ma_loai_xe: number
}

export interface ChuyenXeAnhHuong {
  ma_chuyen: number
  tuyen_xe: string
  ngay_khoi_hanh: string
  gio_khoi_hanh: string
  trang_thai: string
}

export interface CapNhatTrangThaiXeResponse {
  ma_xe: number
  bien_so: string
  trang_thai: string
  so_chuyen_anh_huong: number
  danh_sach_chuyen_anh_huong: ChuyenXeAnhHuong[]
  canh_bao?: string | null
  thong_diep: string
}

export interface GheXeAdmin {
  ma_ghe: number
  ma_xe: number
  so_ghe: string
  tang: number
  trang_thai: string
}
