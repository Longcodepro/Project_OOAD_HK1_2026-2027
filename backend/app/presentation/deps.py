from collections.abc import Iterator

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.application.errors import Forbidden, InvalidToken
from app.application.use_cases.admin_orders import AdminOrderService
from app.application.use_cases.admin_users import AdminUserService
from app.application.use_cases.auth import AuthRules, AuthService
from app.application.use_cases.booking import BookingService
from app.application.use_cases.coupons import CouponService
from app.application.use_cases.fleet import FleetService
from app.application.use_cases.holds import SeatHoldService
from app.application.use_cases.refunds import RefundService
from app.application.use_cases.reports import ReportService
from app.application.use_cases.tickets import TicketService
from app.application.use_cases.trips import TripService
from app.config import settings
from app.domain.entities.account import Account, Role
from app.infrastructure.db.repositories.auth import (
    SqlAccountRepository,
    SqlActivityLogger,
    SqlOtpRepository,
)
from app.infrastructure.db.repositories.booking import SqlBookingRepository
from app.infrastructure.db.repositories.coupons import SqlCouponRepository
from app.infrastructure.db.repositories.fleet import SqlFleetRepository
from app.infrastructure.db.repositories.holds import SqlSeatHoldRepository, SqlSettingsRepository
from app.infrastructure.db.repositories.refunds import SqlRefundRepository
from app.infrastructure.db.repositories.reports import SqlReportRepository
from app.infrastructure.db.repositories.trips import SqlTripRepository
from app.infrastructure.db.session import SessionLocal
from app.infrastructure.mock.payment_gateway import MockPaymentGateway
from app.infrastructure.mock.sms import MockSmsSender
from app.infrastructure.security.jwt_service import JwtService
from app.infrastructure.security.passwords import Argon2Hasher

bearer = HTTPBearer(auto_error=False)


def get_db() -> Iterator[Session]:
    with SessionLocal() as db:
        yield db


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(
        SqlAccountRepository(db),
        SqlOtpRepository(db),
        Argon2Hasher(),
        JwtService(settings.jwt_secret, settings.jwt_expire_minutes),
        MockSmsSender(),
        AuthRules(
            otp_ttl_seconds=settings.otp_ttl_seconds,
            otp_resend_seconds=settings.otp_resend_seconds,
            otp_max_attempts=settings.otp_max_attempts,
            login_max_failures=settings.login_max_failures,
            login_lock_minutes=settings.login_lock_minutes,
        ),
        SqlActivityLogger(db),
    )


def get_current_account(
    cred: HTTPAuthorizationCredentials | None = Depends(bearer),
    auth: AuthService = Depends(get_auth_service),
) -> Account:
    if cred is None:
        raise InvalidToken
    return auth.authenticate(cred.credentials)


def require_roles(*roles: Role):
    """Dependency chặn theo vai trò: Depends(require_roles(Role.ADMIN))."""

    def check(account: Account = Depends(get_current_account)) -> Account:
        if account.role not in roles:
            raise Forbidden
        return account

    return check


def get_fleet_service(db: Session = Depends(get_db)) -> FleetService:
    return FleetService(SqlFleetRepository(db))


def get_trip_service(db: Session = Depends(get_db)) -> TripService:
    return TripService(SqlTripRepository(db), SqlFleetRepository(db))


def get_hold_service(db: Session = Depends(get_db)) -> SeatHoldService:
    return SeatHoldService(
        SqlSeatHoldRepository(db), SqlTripRepository(db), SqlSettingsRepository(db)
    )


def get_coupon_service(db: Session = Depends(get_db)) -> CouponService:
    return CouponService(SqlCouponRepository(db))


def get_booking_service(db: Session = Depends(get_db)) -> BookingService:
    return BookingService(
        SqlBookingRepository(db),
        SqlTripRepository(db),
        SqlCouponRepository(db),
        MockPaymentGateway(),
        MockSmsSender(),
    )


def get_ticket_service(db: Session = Depends(get_db)) -> TicketService:
    return TicketService(SqlBookingRepository(db))


def get_refund_service(db: Session = Depends(get_db)) -> RefundService:
    return RefundService(
        SqlBookingRepository(db),
        SqlRefundRepository(db),
        SqlTripRepository(db),
        SqlSettingsRepository(db),
        MockPaymentGateway(),
        MockSmsSender(),
    )


def get_admin_order_service(db: Session = Depends(get_db)) -> AdminOrderService:
    return AdminOrderService(SqlBookingRepository(db))


def get_admin_user_service(db: Session = Depends(get_db)) -> AdminUserService:
    return AdminUserService(
        SqlAccountRepository(db), SqlActivityLogger(db), Argon2Hasher(), SqlBookingRepository(db)
    )


def get_report_service(db: Session = Depends(get_db)) -> ReportService:
    return ReportService(SqlReportRepository(db))
