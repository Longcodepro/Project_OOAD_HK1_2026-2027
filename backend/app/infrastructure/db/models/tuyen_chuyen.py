from datetime import date, time
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.base import Base

if TYPE_CHECKING:
    from app.infrastructure.db.models.dat_ve import CT_DatVe
    from app.infrastructure.db.models.phuong_tien import Xe


class TuyenXe(Base):
    __tablename__ = "TuyenXe"

    MaTuyen: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    DiemDi: Mapped[str] = mapped_column(String(100), nullable=False)
    DiemDen: Mapped[str] = mapped_column(String(100), nullable=False)
    KhoangCach: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    ThoiGianDuKien: Mapped[int | None] = mapped_column(Integer, nullable=True)  # phút
    MoTa: Mapped[str | None] = mapped_column(String(255), nullable=True)
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="HoatDong")

    chuyen_xe_list: Mapped[list["ChuyenXe"]] = relationship("ChuyenXe", back_populates="tuyen_xe")


class ChuyenXe(Base):
    __tablename__ = "ChuyenXe"

    MaChuyen: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    MaTuyen: Mapped[int] = mapped_column(Integer, ForeignKey("TuyenXe.MaTuyen"), nullable=False)
    MaXe: Mapped[int] = mapped_column(Integer, ForeignKey("Xe.MaXe"), nullable=False)

    NgayKhoiHanh: Mapped[date] = mapped_column(Date, nullable=False)
    GioKhoiHanh: Mapped[time] = mapped_column(Time, nullable=False)
    GiaVe: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)

    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="SapKhoiHanh")
    GhiChu: Mapped[str | None] = mapped_column(String(255), nullable=True)

    tuyen_xe: Mapped["TuyenXe"] = relationship("TuyenXe", back_populates="chuyen_xe_list")
    xe: Mapped["Xe"] = relationship("Xe", back_populates="chuyen_xe_list")
    ct_dat_ve_list: Mapped[list["CT_DatVe"]] = relationship("CT_DatVe", back_populates="chuyen_xe")
