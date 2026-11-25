from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.base import Base

if TYPE_CHECKING:
    from app.infrastructure.db.models.khuyen_mai import KhuyenMai
    from app.infrastructure.db.models.nguoi_dung import KhachHang, NhanVien
    from app.infrastructure.db.models.phuong_tien import Ghe
    from app.infrastructure.db.models.rbac import TaiKhoan
    from app.infrastructure.db.models.tuyen_chuyen import ChuyenXe


class DatVe(Base):
    __tablename__ = "DatVe"

    MaDatVe: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    MaKH: Mapped[int] = mapped_column(Integer, ForeignKey("KhachHang.MaKH"), nullable=False)
    MaNV: Mapped[int | None] = mapped_column(Integer, ForeignKey("NhanVien.MaNV"), nullable=True)
    MaKM: Mapped[int | None] = mapped_column(Integer, ForeignKey("KhuyenMai.MaKM"), nullable=True)

    NgayDat: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=func.now())
    TongTien: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    TienGiam: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))
    TrangThai: Mapped[str] = mapped_column(String(30), nullable=False, default="ChoThanhToan")
    GhiChu: Mapped[str | None] = mapped_column(String(255), nullable=True)

    khach_hang: Mapped["KhachHang"] = relationship("KhachHang", back_populates="dat_ve_list")
    nhan_vien: Mapped["NhanVien | None"] = relationship("NhanVien", back_populates="dat_ve_list")
    khuyen_mai: Mapped["KhuyenMai | None"] = relationship("KhuyenMai", back_populates="dat_ve_list")

    ct_dat_ve_list: Mapped[list["CT_DatVe"]] = relationship(
        "CT_DatVe", back_populates="dat_ve", cascade="all, delete-orphan"
    )
    thanh_toan_list: Mapped[list["ThanhToan"]] = relationship(
        "ThanhToan", back_populates="dat_ve", cascade="all, delete-orphan"
    )
    lich_su_list: Mapped[list["LichSuVe"]] = relationship(
        "LichSuVe", back_populates="dat_ve", cascade="all, delete-orphan"
    )
    thong_bao_sms_list: Mapped[list["ThongBaoSMS"]] = relationship(
        "ThongBaoSMS", back_populates="dat_ve", cascade="all, delete-orphan"
    )


class CT_DatVe(Base):
    __tablename__ = "CT_DatVe"

    MaCT: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    MaDatVe: Mapped[int] = mapped_column(Integer, ForeignKey("DatVe.MaDatVe"), nullable=False)
    MaGhe: Mapped[int] = mapped_column(Integer, ForeignKey("Ghe.MaGhe"), nullable=False)
    MaChuyen: Mapped[int] = mapped_column(Integer, ForeignKey("ChuyenXe.MaChuyen"), nullable=False)

    DonGia: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    HoTenHanhKhach: Mapped[str | None] = mapped_column(String(100), nullable=True)
    SDTHanhKhach: Mapped[str | None] = mapped_column(String(20), nullable=True)

    __table_args__ = (
        UniqueConstraint("MaDatVe", "MaGhe", name="uq_ctdatve_madatve_maghe"),
        Index("idx_ctdatve_machuyen_maghe", "MaChuyen", "MaGhe"),
    )

    dat_ve: Mapped["DatVe"] = relationship("DatVe", back_populates="ct_dat_ve_list")
    ghe: Mapped["Ghe"] = relationship("Ghe", back_populates="ct_dat_ve_list")
    chuyen_xe: Mapped["ChuyenXe"] = relationship("ChuyenXe", back_populates="ct_dat_ve_list")


class ThanhToan(Base):
    __tablename__ = "ThanhToan"

    MaThanhToan: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    MaDatVe: Mapped[int] = mapped_column(Integer, ForeignKey("DatVe.MaDatVe"), nullable=False)

    PhuongThuc: Mapped[str] = mapped_column(String(50), nullable=False)
    SoTien: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    MaGiaoDich: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ThoiGianThanhToan: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=func.now())
    TrangThai: Mapped[str] = mapped_column(String(30), nullable=False, default="ChoThanhToan")
    SoTaiKhoan: Mapped[str | None] = mapped_column(String(50), nullable=True)
    TenNganHang: Mapped[str | None] = mapped_column(String(100), nullable=True)
    TenChuTaiKhoan: Mapped[str | None] = mapped_column(String(100), nullable=True)
    GhiChu: Mapped[str | None] = mapped_column(String(255), nullable=True)

    dat_ve: Mapped["DatVe"] = relationship("DatVe", back_populates="thanh_toan_list")


class LichSuVe(Base):
    __tablename__ = "LichSuVe"

    MaLichSu: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    MaDatVe: Mapped[int] = mapped_column(Integer, ForeignKey("DatVe.MaDatVe"), nullable=False)
    MaTK: Mapped[int] = mapped_column(Integer, ForeignKey("TaiKhoan.MaTK"), nullable=False)

    HanhDong: Mapped[str] = mapped_column(String(50), nullable=False)
    ThoiGian: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=func.now())
    LyDo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    GhiChu: Mapped[str | None] = mapped_column(String(255), nullable=True)

    dat_ve: Mapped["DatVe"] = relationship("DatVe", back_populates="lich_su_list")
    tai_khoan: Mapped["TaiKhoan"] = relationship("TaiKhoan", back_populates="lich_su_list")


class ThongBaoSMS(Base):
    __tablename__ = "ThongBaoSMS"

    MaThongBao: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    MaDatVe: Mapped[int] = mapped_column(Integer, ForeignKey("DatVe.MaDatVe"), nullable=False)
    MaChuyen: Mapped[int] = mapped_column(Integer, ForeignKey("ChuyenXe.MaChuyen"), nullable=False)

    SDT: Mapped[str] = mapped_column(String(20), nullable=False)
    LoaiThongBao: Mapped[str] = mapped_column(String(50), nullable=False, default="SMS_HuyChuyenMoiNhanTien")
    NoiDung: Mapped[str] = mapped_column(String(1000), nullable=False)
    TrangThai: Mapped[str] = mapped_column(String(30), nullable=False, default="DaGui")
    ThoiGianGui: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=func.now())
    GhiChu: Mapped[str | None] = mapped_column(String(255), nullable=True)

    dat_ve: Mapped["DatVe"] = relationship("DatVe", back_populates="thong_bao_sms_list")
    chuyen_xe: Mapped["ChuyenXe"] = relationship("ChuyenXe")

