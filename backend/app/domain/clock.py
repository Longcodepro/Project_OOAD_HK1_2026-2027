from datetime import UTC, datetime


def utcnow() -> datetime:
    """UTC không kèm tzinfo, khớp cách MySQL DATETIME lưu."""
    return datetime.now(UTC).replace(tzinfo=None)
