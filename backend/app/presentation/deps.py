from collections.abc import Iterator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.infrastructure.db.models import TaiKhoan
from app.infrastructure.db.session import SessionLocal
from app.infrastructure.security import decode_access_token

security = HTTPBearer(auto_error=False)


def get_db() -> Iterator[Session]:
    with SessionLocal() as db:
        yield db


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> TaiKhoan:
    """Xác thực token JWT từ header Authorization: Bearer <token> và trả về đối tượng TaiKhoan."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu cung cấp Access Token để truy cập",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )

    ma_tk = int(payload["sub"])
    tai_khoan = (
        db.query(TaiKhoan)
        .options(
            joinedload(TaiKhoan.vai_tro),
            joinedload(TaiKhoan.khach_hang),
            joinedload(TaiKhoan.nhan_vien),
        )
        .filter(TaiKhoan.MaTK == ma_tk)
        .first()
    )

    if not tai_khoan:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không tồn tại trên hệ thống",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if tai_khoan.TrangThai != "HoatDong":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản hiện đang bị khóa hoặc ngừng hoạt động",
        )

    return tai_khoan


def require_roles(allowed_roles: list[str]):
    """Kiểm tra quyền hạn vai trò (Role-based Access Control)."""

    def role_checker(current_user: TaiKhoan = Depends(get_current_user)) -> TaiKhoan:
        ten_vai_tro = current_user.vai_tro.TenVaiTro if current_user.vai_tro else ""
        if ten_vai_tro not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bạn không có quyền thực hiện chức năng này (yêu cầu vai trò: {', '.join(allowed_roles)})",
            )
        return current_user

    return role_checker
