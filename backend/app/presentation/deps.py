from collections.abc import Iterator

from sqlalchemy.orm import Session

from app.infrastructure.db.session import SessionLocal


def get_db() -> Iterator[Session]:
    with SessionLocal() as db:
        yield db
