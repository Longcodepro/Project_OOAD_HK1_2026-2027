import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.domain.entities.account import Role
from app.infrastructure.db.base import Base
from app.infrastructure.db.models import RoleModel
from app.infrastructure.security.jwt_service import JwtService
from app.infrastructure.security.passwords import Argon2Hasher
from app.main import app
from app.presentation.deps import get_db

PASSWORD = "matkhau123"


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(engine, expire_on_commit=False)
    with Session() as db:
        db.add_all(RoleModel(name=r.value) for r in Role)
        db.commit()

    def override():
        with Session() as db:
            yield db

    app.dependency_overrides[get_db] = override
    c = TestClient(app)
    c.session_factory = Session  # để test chuẩn bị/đọc dữ liệu trực tiếp
    yield c
    app.dependency_overrides.clear()


_hasher = Argon2Hasher()
_hash = _hasher.hash(PASSWORD)  # băm một lần cho nhanh


@pytest.fixture
def make_user(client):
    """Tạo tài khoản với vai trò tùy ý, trả về (account, headers)."""
    from app.domain.entities.account import Account
    from app.infrastructure.db.repositories.auth import SqlAccountRepository

    counter = {"n": 0}

    def make(role: Role = Role.CUSTOMER, phone: str | None = None, name: str = "Người Dùng"):
        counter["n"] += 1
        phone = phone or f"09{counter['n']:08d}"
        with client.session_factory() as db:
            acc = SqlAccountRepository(db).add(
                Account(phone=phone, password_hash=_hash, full_name=name, role=role)
            )
        from app.config import settings

        token = JwtService(settings.jwt_secret, 60).issue(acc)
        return acc, {"Authorization": f"Bearer {token}"}

    return make
