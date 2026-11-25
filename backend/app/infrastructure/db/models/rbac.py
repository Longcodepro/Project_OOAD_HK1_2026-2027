from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.base import Base

if TYPE_CHECKING:
    from app.infrastructure.db.models.dat_ve import LichSuVe
    from app.infrastructure.db.models.nguoi_dung import KhachHang, NhanVien


class VaiTro(Base):
    __tablename__ = "VaiTro"

    MaVaiTro: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    TenVaiTro: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    MoTa: Mapped[str | None] = mapped_column(String(255), nullable=True)

    tai_khoan_list: Mapped[list["TaiKhoan"]] = relationship("TaiKhoan", back_populates="vai_tro")
    phan_quyen_list: Mapped[list["PhanQuyen"]] = relationship("PhanQuyen", back_populates="vai_tro")


class ChucNang(Base):
    __tablename__ = "ChucNang"

    MaCN: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    TenChucNang: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    MoTa: Mapped[str | None] = mapped_column(String(255), nullable=True)

    phan_quyen_list: Mapped[list["PhanQuyen"]] = relationship("PhanQuyen", back_populates="chuc_nang")


class PhanQuyen(Base):
    __tablename__ = "PhanQuyen"

    MaPQ: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    MaVaiTro: Mapped[int] = mapped_column(Integer, ForeignKey("VaiTro.MaVaiTro"), nullable=False)
    MaCN: Mapped[int] = mapped_column(Integer, ForeignKey("ChucNang.MaCN"), nullable=False)

    CoQuyenXem: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    CoQuyenThem: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    CoQuyenSua: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    CoQuyenXoa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (UniqueConstraint("MaVaiTro", "MaCN", name="uq_phanquyen_vaitro_chucnang"),)

    vai_tro: Mapped["VaiTro"] = relationship("VaiTro", back_populates="phan_quyen_list")
    chuc_nang: Mapped["ChucNang"] = relationship("ChucNang", back_populates="phan_quyen_list")


class TaiKhoan(Base):
    __tablename__ = "TaiKhoan"

    MaTK: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    MaVaiTro: Mapped[int] = mapped_column(Integer, ForeignKey("VaiTro.MaVaiTro"), nullable=False)

    TenDangNhap: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    MatKhau: Mapped[str] = mapped_column(String(255), nullable=False)

    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="HoatDong")
    NgayTao: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=func.now())

    vai_tro: Mapped["VaiTro"] = relationship("VaiTro", back_populates="tai_khoan_list")
    khach_hang: Mapped["KhachHang | None"] = relationship("KhachHang", back_populates="tai_khoan", uselist=False)
    nhan_vien: Mapped["NhanVien | None"] = relationship("NhanVien", back_populates="tai_khoan", uselist=False)
    lich_su_list: Mapped[list["LichSuVe"]] = relationship("LichSuVe", back_populates="tai_khoan")
