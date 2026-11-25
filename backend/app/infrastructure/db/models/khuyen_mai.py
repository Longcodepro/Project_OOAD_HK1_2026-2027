from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.base import Base

if TYPE_CHECKING:
    from app.infrastructure.db.models.dat_ve import DatVe


class KhuyenMai(Base):
    __tablename__ = "KhuyenMai"

    MaKM: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    TenKM: Mapped[str] = mapped_column(String(100), nullable=False)
    MaCode: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    LoaiGiam: Mapped[str] = mapped_column(String(20), nullable=False)  # 'PhanTram' hoặc 'TienMat'
    GiaTriGiam: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    GiaTriGiamToiDa: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    DonToiThieu: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal(0))
    NgayBatDau: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    NgayKetThuc: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="HoatDong")
    MoTa: Mapped[str | None] = mapped_column(String(255), nullable=True)

    dat_ve_list: Mapped[list["DatVe"]] = relationship("DatVe", back_populates="khuyen_mai")
