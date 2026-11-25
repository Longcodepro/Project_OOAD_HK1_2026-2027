from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.db.base import Base


class CaiDat(Base):
    __tablename__ = "CaiDat"

    MaCaiDat: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    Khoa: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    GiaTri: Mapped[str] = mapped_column(Text, nullable=False)
    MoTa: Mapped[str | None] = mapped_column(String(255), nullable=True)
    NgayCapNhat: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
