from sqlalchemy.orm import Session

from app.infrastructure.db.models import CaiDat


def get_setting_int(db: Session, key: str, default: int) -> int:
    """Lấy giá trị cài đặt dạng số nguyên từ bảng CaiDat."""
    record = db.query(CaiDat).filter(CaiDat.Khoa == key).first()
    if record and record.GiaTri.isdigit():
        return int(record.GiaTri)
    return default


def get_setting_str(db: Session, key: str, default: str) -> str:
    """Lấy giá trị cài đặt dạng chuỗi từ bảng CaiDat."""
    record = db.query(CaiDat).filter(CaiDat.Khoa == key).first()
    if record:
        return record.GiaTri
    return default
