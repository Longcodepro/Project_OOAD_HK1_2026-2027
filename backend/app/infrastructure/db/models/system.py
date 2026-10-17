from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.db.base import Base


class SettingModel(Base):
    __tablename__ = "settings"  # ThamSo

    name: Mapped[str] = mapped_column(String(50), primary_key=True)
    value: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(String(255))
