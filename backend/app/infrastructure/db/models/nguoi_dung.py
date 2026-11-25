from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.base import Base

if TYPE_CHECKING:
    from app.infrastructure.db.models.dat_ve import DatVe
    from app.infrastructure.db.models.rbac import TaiKhoan


class KhachHang(Base):
    __tablename__ = "KhachHang"

    MaKH: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    MaTK: Mapped[int | None] = mapped_column(Integer, ForeignKey("TaiKhoan.MaTK"), unique=True, nullable=True)
    HoTen: Mapped[str] = mapped_column(String(100), nullable=False)
    SDT: Mapped[str] = mapped_column(String(15), nullable=False)
    DiaChi: Mapped[str | None] = mapped_column(String(255), nullable=True)

    tai_khoan: Mapped["TaiKhoan | None"] = relationship("TaiKhoan", back_populates="khach_hang")
    dat_ve_list: Mapped[list["DatVe"]] = relationship("DatVe", back_populates="khach_hang")


class NhanVien(Base):
    __tablename__ = "NhanVien"

    MaNV: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    MaTK: Mapped[int] = mapped_column(Integer, ForeignKey("TaiKhoan.MaTK"), unique=True, nullable=False)
    HoTen: Mapped[str] = mapped_column(String(100), nullable=False)
    SDT: Mapped[str] = mapped_column(String(15), nullable=False)
    NgaySinh: Mapped[date | None] = mapped_column(Date, nullable=True)
    ChucVu: Mapped[str] = mapped_column(String(50), nullable=False)
    NgayVaoLam: Mapped[date | None] = mapped_column(Date, nullable=True)

    tai_khoan: Mapped["TaiKhoan"] = relationship("TaiKhoan", back_populates="nhan_vien")
    dat_ve_list: Mapped[list["DatVe"]] = relationship("DatVe", back_populates="nhan_vien")
