from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.infrastructure.db.models import KhachHang, NhanVien, TaiKhoan, VaiTro
from app.infrastructure.security import create_access_token, hash_password, verify_password
from app.presentation.deps import get_current_user, get_db
from app.presentation.schemas.auth import (
    ChangePasswordRequest,
    ChangePhoneRequest,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    OtpResponse,
    RegisterRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["xác thực & tài khoản"])


def _build_user_response(user: TaiKhoan) -> UserResponse:
    vai_tro_ten = user.vai_tro.TenVaiTro if user.vai_tro else "KhachHang"
    ho_ten = user.TenDangNhap
    sdt = ""
    dia_chi = None
    chuc_vu = None
    ma_kh = None
    ma_nv = None

    if user.khach_hang:
        ho_ten = user.khach_hang.HoTen
        sdt = user.khach_hang.SDT
        dia_chi = user.khach_hang.DiaChi
        ma_kh = user.khach_hang.MaKH
    elif user.nhan_vien:
        ho_ten = user.nhan_vien.HoTen
        sdt = user.nhan_vien.SDT
        chuc_vu = user.nhan_vien.ChucVu
        ma_nv = user.nhan_vien.MaNV

    # Map sang role frontend cũ
    role_map = {
        "QuanTri": "ADMIN",
        "NhanVienBanVe": "NHAN_VIEN_BAN_VE",
        "TaiXe": "NHAN_VIEN_BAN_VE",
        "KhachHang": "KHACH_HANG",
    }
    role_fe = role_map.get(vai_tro_ten, "KHACH_HANG")

    return UserResponse(
        ma_tk=user.MaTK,
        ten_dang_nhap=user.TenDangNhap,
        vai_tro=vai_tro_ten,
        trang_thai=user.TrangThai,
        ho_ten=ho_ten,
        sdt=sdt,
        dia_chi=dia_chi,
        chuc_vu=chuc_vu,
        ma_kh=ma_kh,
        ma_nv=ma_nv,
        # Frontend compat
        id=user.MaTK,
        full_name=ho_ten,
        phone=sdt,
        role=role_fe,
        status=user.TrangThai,
        address=dia_chi,
    )


@router.post("/login", response_model=LoginResponse, summary="Đăng nhập tài khoản")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Đăng nhập hệ thống bằng Tên đăng nhập hoặc Số điện thoại."""
    login_id = (req.ten_dang_nhap or req.phone or req.username or "").strip()
    pwd = (req.mat_khau or req.password or "").strip()

    if not login_id or not pwd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng cung cấp số điện thoại/tên đăng nhập và mật khẩu",
        )

    # Tìm theo TenDangNhap
    user = (
        db.query(TaiKhoan)
        .options(
            joinedload(TaiKhoan.vai_tro),
            joinedload(TaiKhoan.khach_hang),
            joinedload(TaiKhoan.nhan_vien),
        )
        .filter(TaiKhoan.TenDangNhap == login_id)
        .first()
    )

    # Nếu không thấy theo username, tìm theo số điện thoại khách hàng
    if not user:
        kh = db.query(KhachHang).filter(KhachHang.SDT == login_id).first()
        if kh and kh.MaTK:
            user = (
                db.query(TaiKhoan)
                .options(
                    joinedload(TaiKhoan.vai_tro),
                    joinedload(TaiKhoan.khach_hang),
                    joinedload(TaiKhoan.nhan_vien),
                )
                .filter(TaiKhoan.MaTK == kh.MaTK)
                .first()
            )

    # Nếu không thấy, tìm theo số điện thoại nhân viên
    if not user:
        nv = db.query(NhanVien).filter(NhanVien.SDT == login_id).first()
        if nv and nv.MaTK:
            user = (
                db.query(TaiKhoan)
                .options(
                    joinedload(TaiKhoan.vai_tro),
                    joinedload(TaiKhoan.khach_hang),
                    joinedload(TaiKhoan.nhan_vien),
                )
                .filter(TaiKhoan.MaTK == nv.MaTK)
                .first()
            )

    if not user or not verify_password(pwd, user.MatKhau):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Số điện thoại / Tên đăng nhập hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.TrangThai != "HoatDong":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản hiện đang bị khóa hoặc ngừng hoạt động",
        )

    user_info = _build_user_response(user)
    token = create_access_token(
        data={
            "sub": str(user.MaTK),
            "ten_dang_nhap": user.TenDangNhap,
            "vai_tro": user_info.vai_tro,
            "ho_ten": user_info.ho_ten,
        }
    )

    return LoginResponse(access_token=token, token_type="bearer", user=user_info)


@router.get("/me", response_model=UserResponse, summary="Lấy thông tin tài khoản hiện tại")
def get_me(current_user: TaiKhoan = Depends(get_current_user)):
    """Trả về thông tin hồ sơ của người dùng đang đăng nhập dựa trên JWT Access Token."""
    return _build_user_response(current_user)


@router.patch("/me", response_model=UserResponse, summary="Cập nhật thông tin tài khoản")
def update_me(
    req: UpdateProfileRequest,
    current_user: TaiKhoan = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cập nhật thông tin cá nhân của người dùng đang đăng nhập."""
    full_name = req.full_name or req.fullName
    address = req.address

    if current_user.khach_hang:
        if full_name:
            current_user.khach_hang.HoTen = full_name.strip()
        if address is not None:
            current_user.khach_hang.DiaChi = address.strip() if address else None
    elif current_user.nhan_vien:
        if full_name:
            current_user.nhan_vien.HoTen = full_name.strip()

    db.commit()
    db.refresh(current_user)
    return _build_user_response(current_user)


@router.post("/register/otp", response_model=OtpResponse, summary="Gửi OTP đăng ký")
def request_register_otp(payload: dict | None = None):
    return OtpResponse(expires_in_seconds=120, test_code="123456")


@router.post("/password/forgot/otp", response_model=OtpResponse, summary="Gửi OTP quên mật khẩu")
def request_forgot_password_otp(payload: dict | None = None):
    return OtpResponse(expires_in_seconds=120, test_code="123456")


@router.post("/phone/otp", response_model=OtpResponse, summary="Gửi OTP đổi số điện thoại")
def request_phone_otp(payload: dict | None = None):
    return OtpResponse(expires_in_seconds=120, test_code="123456")


@router.post(
    "/register",
    response_model=LoginResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản khách hàng mới",
)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Đăng ký tài khoản Khách Hàng mới và tự động đăng nhập cấp Access Token."""
    sdt = (req.sdt or req.phone or "").strip()
    pwd = (req.mat_khau or req.password or "").strip()
    ho_ten = (req.ho_ten or req.full_name or f"Khách hàng {sdt[-4:]}").strip()
    username = (req.ten_dang_nhap or f"kh_{sdt}").strip()
    dia_chi = (req.dia_chi or "").strip() or None

    if not sdt or not pwd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng cung cấp số điện thoại và mật khẩu",
        )

    # 1. Kiểm tra trùng tên đăng nhập
    existed_user = db.query(TaiKhoan).filter(TaiKhoan.TenDangNhap == username).first()
    if existed_user:
        if req.ten_dang_nhap:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tên đăng nhập '{username}' đã được sử dụng",
            )
        username = f"kh_{sdt}_{existed_user.MaTK + 1}"

    # 2. Kiểm tra trùng số điện thoại đã có tài khoản
    existed_kh = (
        db.query(KhachHang)
        .filter(KhachHang.SDT == sdt, KhachHang.MaTK.isnot(None))
        .first()
    )
    if existed_kh:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Số điện thoại '{sdt}' đã được đăng ký cho một tài khoản khác",
        )

    # 3. Lấy vai trò KhachHang
    vai_tro_kh = db.query(VaiTro).filter(VaiTro.TenVaiTro == "KhachHang").first()
    if not vai_tro_kh:
        vai_tro_kh = VaiTro(TenVaiTro="KhachHang", MoTa="Khách hàng cá nhân đăng ký trực tuyến")
        db.add(vai_tro_kh)
        db.flush()

    # 4. Tạo tài khoản
    new_user = TaiKhoan(
        MaVaiTro=vai_tro_kh.MaVaiTro,
        TenDangNhap=username,
        MatKhau=hash_password(pwd),
        TrangThai="HoatDong",
    )
    db.add(new_user)
    db.flush()

    # 5. Tạo thông tin khách hàng gắn với tài khoản
    new_kh = KhachHang(
        MaTK=new_user.MaTK,
        HoTen=ho_ten,
        SDT=sdt,
        DiaChi=dia_chi,
    )
    db.add(new_kh)
    db.commit()

    db.refresh(new_user)
    user_info = _build_user_response(new_user)

    token = create_access_token(
        data={
            "sub": str(new_user.MaTK),
            "ten_dang_nhap": new_user.TenDangNhap,
            "vai_tro": user_info.vai_tro,
            "ho_ten": user_info.ho_ten,
        }
    )

    return LoginResponse(access_token=token, token_type="bearer", user=user_info)


@router.post("/password/reset", response_model=MessageResponse, summary="Đặt lại mật khẩu bằng OTP")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Đặt lại mật khẩu cho số điện thoại."""
    phone = req.phone.strip()
    kh = db.query(KhachHang).filter(KhachHang.SDT == phone).first()
    if not kh or not kh.MaTK:
        # Kiểm tra nhân viên
        nv = db.query(NhanVien).filter(NhanVien.SDT == phone).first()
        if not nv or not nv.MaTK:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy tài khoản gắn với số điện thoại {phone}",
            )
        user = db.query(TaiKhoan).filter(TaiKhoan.MaTK == nv.MaTK).first()
    else:
        user = db.query(TaiKhoan).filter(TaiKhoan.MaTK == kh.MaTK).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản",
        )

    user.MatKhau = hash_password(req.new_password)
    db.commit()
    return MessageResponse(message="Đặt lại mật khẩu thành công")


@router.post("/password/change", summary="Đổi mật khẩu tài khoản")
@router.post("/doi-mat-khau", response_model=MessageResponse, summary="Đổi mật khẩu tài khoản")
def change_password(
    req: ChangePasswordRequest,
    current_user: TaiKhoan = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Thay đổi mật khẩu cá nhân cho người dùng đang đăng nhập."""
    old_p = req.mat_khau_cu or req.current_password or ""
    new_p = req.mat_khau_moi or req.new_password or ""

    if not verify_password(old_p, current_user.MatKhau):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không chính xác",
        )

    if old_p == new_p:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới không được trùng với mật khẩu cũ",
        )

    current_user.MatKhau = hash_password(new_p)
    db.commit()

    token = create_access_token(
        data={
            "sub": str(current_user.MaTK),
            "ten_dang_nhap": current_user.TenDangNhap,
            "vai_tro": current_user.vai_tro.TenVaiTro if current_user.vai_tro else "KhachHang",
        }
    )

    return {"message": "Đổi mật khẩu thành công", "access_token": token, "token_type": "bearer"}


@router.post("/phone/change", summary="Đổi số điện thoại tài khoản")
def change_phone(
    req: ChangePhoneRequest,
    current_user: TaiKhoan = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Đổi số điện thoại tài khoản."""
    new_p = (req.newPhone or req.new_phone or "").strip()
    if not new_p:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp số điện thoại mới")

    if current_user.khach_hang:
        current_user.khach_hang.SDT = new_p
    elif current_user.nhan_vien:
        current_user.nhan_vien.SDT = new_p

    db.commit()

    token = create_access_token(
        data={
            "sub": str(current_user.MaTK),
            "ten_dang_nhap": current_user.TenDangNhap,
            "vai_tro": current_user.vai_tro.TenVaiTro if current_user.vai_tro else "KhachHang",
        }
    )
    return {"message": "Đổi số điện thoại thành công", "access_token": token, "token_type": "bearer"}


@router.post("/logout", summary="Đăng xuất")
def logout():
    return {"message": "Đăng xuất thành công"}
