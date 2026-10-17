from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.clock import utcnow
from app.domain.entities.account import Account, AccountStatus, Role
from app.domain.entities.otp import Otp, OtpPurpose
from app.infrastructure.db.models import AccountModel, OtpModel, RoleModel


def _to_entity(m: AccountModel) -> Account:
    return Account(
        id=m.id,
        phone=m.phone,
        password_hash=m.password_hash,
        full_name=m.full_name,
        role=Role(m.role.name),
        status=AccountStatus(m.status),
        birth_date=m.birth_date,
        address=m.address,
        must_change_password=m.must_change_password,
        failed_login_count=m.failed_login_count,
        locked_until=m.locked_until,
        token_version=m.token_version,
        created_at=m.created_at,
    )


class SqlAccountRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, account_id: int) -> Account | None:
        m = self.db.get(AccountModel, account_id)
        return _to_entity(m) if m else None

    def get_by_phone(self, phone: str) -> Account | None:
        m = self.db.scalar(select(AccountModel).where(AccountModel.phone == phone))
        return _to_entity(m) if m else None

    def add(self, account: Account) -> Account:
        role_id = self.db.scalar(select(RoleModel.id).where(RoleModel.name == account.role))
        m = AccountModel(
            role_id=role_id,
            phone=account.phone,
            password_hash=account.password_hash,
            full_name=account.full_name,
            birth_date=account.birth_date,
            address=account.address,
            status=account.status,
            must_change_password=account.must_change_password,
            failed_login_count=account.failed_login_count,
            locked_until=account.locked_until,
            token_version=account.token_version,
            created_at=utcnow(),
        )
        self.db.add(m)
        self.db.commit()
        self.db.refresh(m)
        return _to_entity(m)

    def save(self, account: Account) -> None:
        m = self.db.get(AccountModel, account.id)
        m.password_hash = account.password_hash
        m.full_name = account.full_name
        m.birth_date = account.birth_date
        m.address = account.address
        m.status = account.status
        m.must_change_password = account.must_change_password
        m.failed_login_count = account.failed_login_count
        m.locked_until = account.locked_until
        m.token_version = account.token_version
        self.db.commit()


class SqlOtpRepository:
    def __init__(self, db: Session):
        self.db = db

    def latest(self, phone: str, purpose: OtpPurpose) -> Otp | None:
        m = self.db.scalar(
            select(OtpModel)
            .where(OtpModel.phone == phone, OtpModel.purpose == purpose)
            .order_by(OtpModel.id.desc())
            .limit(1)
        )
        if m is None:
            return None
        return Otp(
            id=m.id,
            phone=m.phone,
            code_hash=m.code_hash,
            purpose=OtpPurpose(m.purpose),
            expires_at=m.expires_at,
            used=m.used,
            wrong_count=m.wrong_count,
        )

    def add(self, otp: Otp) -> None:
        self.db.add(
            OtpModel(
                phone=otp.phone,
                code_hash=otp.code_hash,
                purpose=otp.purpose,
                expires_at=otp.expires_at,
                used=otp.used,
                wrong_count=otp.wrong_count,
            )
        )
        self.db.commit()

    def save(self, otp: Otp) -> None:
        m = self.db.get(OtpModel, otp.id)
        m.used = otp.used
        m.wrong_count = otp.wrong_count
        self.db.commit()
