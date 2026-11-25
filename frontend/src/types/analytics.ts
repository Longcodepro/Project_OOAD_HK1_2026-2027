export interface ThongKeKPI {
  tong_doanh_thu_thuc_te: number
  tong_tien_thu: number
  tong_tien_hoan: number
  tong_don_hang: number
  tong_ve_ban: number
  tong_chuyen_xe: number
  tong_khach_hang: number
}

export interface ThongKeTuyenXe {
  ma_tuyen: number
  tuyen_xe: string
  so_chuyen: number
  so_ve_ban: number
  tong_doanh_thu: number
  ty_le_lap_day_trung_binh: number
  diem_di?: string
  diem_den?: string
}

export interface ThongKeTheoNgay {
  ngay: string
  doanh_thu: number
  so_ve: number
  so_don: number
}

export interface ThongKePhuongThuc {
  phuong_thuc: string
  ten_hien_thi: string
  so_giao_dich: number
  tong_tien: number
  ty_le_phan_tram: number
}
