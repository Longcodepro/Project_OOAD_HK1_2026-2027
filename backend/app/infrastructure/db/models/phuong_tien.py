from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.base import Base

if TYPE_CHECKING:
    from app.infrastructure.db.models.dat_ve import CT_DatVe
    from app.infrastructure.db.models.tuyen_chuyen import ChuyenXe


class LoaiXe(Base):
    __tablename__ = "LoaiXe"

    MaLoaiXe: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    TenLoaiXe: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    SoGhe: Mapped[int] = mapped_column(Integer, nullable=False)
    MoTa: Mapped[str | None] = mapped_column(String(255), nullable=True)

    xe_list: Mapped[list["Xe"]] = relationship("Xe", back_populates="loai_xe")


class Xe(Base):
    __tablename__ = "Xe"

    MaXe: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    MaLoaiXe: Mapped[int] = mapped_column(Integer, ForeignKey("LoaiXe.MaLoaiXe"), nullable=False)

    BienSo: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    HangXe: Mapped[str | None] = mapped_column(String(100), nullable=True)
    NamSanXuat: Mapped[int | None] = mapped_column(Integer, nullable=True)
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="HoatDong")

    loai_xe: Mapped["LoaiXe"] = relationship("LoaiXe", back_populates="xe_list")
    ghe_list: Mapped[list["Ghe"]] = relationship("Ghe", back_populates="xe", cascade="all, delete-orphan")
    chuyen_xe_list: Mapped[list["ChuyenXe"]] = relationship("ChuyenXe", back_populates="xe")


class Ghe(Base):
    __tablename__ = "Ghe"

    MaGhe: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    MaXe: Mapped[int] = mapped_column(Integer, ForeignKey("Xe.MaXe"), nullable=False)

    SoGhe: Mapped[str] = mapped_column(String(10), nullable=False)
    Tang: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="Trong")

    __table_args__ = (UniqueConstraint("MaXe", "SoGhe", name="uq_ghe_xe_soghe"),)

    xe: Mapped["Xe"] = relationship("Xe", back_populates="ghe_list")
    ct_dat_ve_list: Mapped[list["CT_DatVe"]] = relationship("CT_DatVe", back_populates="ghe")
