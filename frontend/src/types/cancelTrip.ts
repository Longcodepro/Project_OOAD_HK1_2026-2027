export interface KhachHangHuyChuyenItem {
  ma_dat_ve: number
  ho_ten: string
  sdt: string
  so_luong_ve: number
  tien_goc: number | string
  tien_hoan_du_kien: number | string
}

export interface ThongBaoKhachHangHuyChuyenItem {
  ho_ten: string
  danh_sach_so_ghe: string
  ma_dat_ve: number
  danh_sach_ma_ve: number[]
  hinh_thuc_mua: 'Online' | 'TaiQuay' | string
  tai_khoan_hoan_tien: string | null
  sdt_gui_message: string | null
}

export interface BaoCaoHuyChuyenResponse {
  ma_chuyen: number
  tuyen_xe: string
  gio_khoi_hanh: string
  bien_so: string
  trang_thai_hien_tai: string
  tong_so_ve_da_ban: number
  tong_tien_goc: number | string
  ty_le_hoan_mac_dinh: number
  tong_tien_hoan_du_kien: number | string
  danh_sach_khach: KhachHangHuyChuyenItem[]
  danh_sach_thong_bao_khach: ThongBaoKhachHangHuyChuyenItem[]
  mau_tin_nhan_sms: string
  noi_dung_sms_xem_truoc: string
}

export interface XacNhanHuyChuyenAdminRequest {
  ly_do: string
  ty_le_hoan_tien?: number | null
  noi_dung_sms_tuy_chinh?: string | null
}

export interface ThongBaoSMSDaGuiItem {
  ma_dat_ve: number
  ho_ten: string
  sdt: string
  noi_dung: string
  trang_thai: string
}

export interface KetQuaHuyChuyenResponse {
  ma_chuyen: number
  trang_thai: string
  so_don_da_huy: number
  so_ve_da_huy: number
  so_don_online_hoan_ngay: number
  so_don_quay_cho_nhan_tien_mat: number
  so_sms_da_gui: number
  ty_le_hoan_tien_ap_dung: number
  tong_tien_hoan_thuc_te: number | string
  thong_diep: string
  danh_sach_sms: ThongBaoSMSDaGuiItem[]
}

export interface BaoGiaHuyVeResponse {
  ma_dat_ve: number
  cho_phep_huy: boolean
  hinh_thuc_mua: 'Online' | 'TaiQuay' | string
  hinh_thuc_hoan: 'ChuyenKhoanNgay' | 'NhanTienMatTaiQuay' | string
  tai_khoan_hoan: string | null
  so_gio_con_lai: number
  ty_le_phi_huy: number
  phi_huy: number | string
  so_tien_hoan_lai: number | string
  ly_do: string
}

export interface YeuCauHuyVeRequest {
  ly_do: string
}

export interface HuyVeResponse {
  ma_dat_ve: number
  trang_thai: string
  hinh_thuc_mua: string
  hinh_thuc_hoan: string
  tai_khoan_hoan: string | null
  so_tien_hoan: number | string
  phi_huy: number | string
  thong_diep: string
}
