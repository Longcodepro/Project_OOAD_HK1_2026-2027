export interface TuyenXe {
  ma_tuyen: number
  diem_di: string
  diem_den: string
  khoang_cach?: string
  thoi_gian_du_kien?: number
  mo_ta?: string
  trang_thai: string
}

export interface ChuyenXe {
  ma_chuyen: number
  ma_tuyen: number
  diem_di: string
  diem_den: string
  ngay_khoi_hanh: string
  gio_khoi_hanh: string
  gia_ve: number | string
  trang_thai: string
  ghi_chu?: string
  ma_xe: number
  bien_so: string
  ten_loai_xe: string
  tong_so_ghe: number
  so_ghe_trong: number
}

export interface Ghe {
  ma_ghe: number
  so_ghe: string
  tang: number
  trang_thai_vat_ly: string
  trang_thai_chuyen: 'TRONG' | 'DA_DAT' | 'DANG_GIU' | string
  gia_ve: number | string
}

export interface SoDoGhe {
  ma_chuyen: number
  ma_xe: number
  bien_so: string
  ten_loai_xe: string
  tong_so_ghe: number
  so_ghe_trong: number
  so_ghe_da_dat: number
  danh_sach_ghe: Ghe[]
}

export interface CTDatVeItem {
  ma_ct: number
  ma_ghe: number
  so_ghe: string
  tang: number
  don_gia: number | string
  ho_ten_hanh_khach?: string
  sdt_hanh_khach?: string
}

export interface DatVeResponse {
  ma_dat_ve: number
  ma_kh: number
  ho_ten_kh: string
  sdt_kh: string
  ma_chuyen: number
  diem_di: string
  diem_den: string
  ngay_khoi_hanh: string
  gio_khoi_hanh: string
  ngay_dat: string
  tong_tien: number | string
  tien_giam: number | string
  thanh_tien: number | string
  trang_thai: string
  han_thanh_toan: string
  ghi_chu?: string
  bien_so_xe?: string
  loai_xe?: string
  danh_sach_ve: CTDatVeItem[]
}

export interface DonHangCaItem {
  ma_dat_ve: number
  thoi_gian: string
  ho_ten_khach: string
  sdt_khach: string
  tuyen_xe: string
  so_ghe: string
  so_tien: number | string
  phuong_thuc: string
  trang_thai: string
}

export interface ThongKeCaResponse {
  ma_nv: number
  ho_ten_nv: string
  chuc_vu?: string
  thoi_gian_hien_tai: string
  gio_bat_dau: string
  ngay: string
  tong_so_don: number
  tong_so_ve_ban: number
  tong_doanh_thu: number | string
  doanh_thu_tien_mat: number | string
  doanh_thu_chuyen_khoan: number | string
  tong_tien_mat_hoan: number | string
  tien_mat_thuc_thu: number | string
  danh_sach_don: DonHangCaItem[]
}

export interface BienLaiHoanTienResponse {
  ma_dat_ve: number
  ho_ten_khach: string
  sdt_khach: string
  tuyen_xe: string
  gio_khoi_hanh: string
  danh_sach_so_ghe: string[]
  tong_tien_ve: number | string
  ty_le_phi_huy: number | string
  phi_huy: number | string
  so_tien_hoan_mat: number | string
  thoi_gian_hoan: string
  ma_giao_dich: string
  nguoi_thuc_hien: string
  ly_do: string
  noi_dung_in_phieu_chi: string
}

export interface PhieuInVeResponse {
  ma_dat_ve: number
  noi_dung_in: string
  tieu_de: string
  nha_xe: string
  tuyen_xe: string
  ngay_khoi_hanh: string
  gio_khoi_hanh: string
  bien_so_xe: string
  danh_sach_ghe: string[]
  tong_tien: number | string
  ho_ten_khach: string
  sdt_khach: string
  ma_ve_barcode: string
  trang_thai: string
}

export interface BanVeTaiQuayPayload {
  ma_chuyen: number
  danh_sach_ma_ghe: number[]
  ho_ten: string
  sdt: string
  phuong_thuc?: string
  ghi_chu?: string
}

export interface GiuChoDienThoaiPayload {
  ma_chuyen: number
  danh_sach_ma_ghe: number[]
  ho_ten: string
  sdt: string
  thoi_han_phut?: number
  ghi_chu?: string
}

export interface HoanTienMatPayload {
  ly_do?: string
  phi_huy_tuy_chinh?: number
}
