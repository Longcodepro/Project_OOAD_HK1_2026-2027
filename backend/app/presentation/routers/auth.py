from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.infrastructure.db.models import KhachHang, NhanVien, TaiKhoan, VaiTro
from app.infrastructure.security import create_access_token, hash_password, verify_password
from app.presentation.deps import get_current_user, get_db
from app.presentation.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    RegisterRequest,
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
    )


@router.post("/login", response_model=LoginResponse, summary="Đăng nhập tài khoản")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Đăng nhập hệ thống bằng Tên đăng nhập hoặc Số điện thoại."""
    # Tìm theo TenDangNhap
    user = (
        db.query(TaiKhoan)
        .options(
            joinedload(TaiKhoan.vai_tro),
            joinedload(TaiKhoan.khach_hang),
            joinedload(TaiKhoan.nhan_vien),
        )
        .filter(TaiKhoan.TenDangNhap == req.ten_dang_nhap.strip())
        .first()
    )

    # Nếu không thấy theo username, tìm theo số điện thoại
    if not user:
        kh = db.query(KhachHang).filter(KhachHang.SDT == req.ten_dang_nhap.strip()).first()
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

    if not user:
        nv = db.query(NhanVien).filter(NhanVien.SDT == req.ten_dang_nhap.strip()).first()
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

    if not user or not verify_password(req.mat_khau, user.MatKhau):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác",
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


@router.post(
    "/register",
    response_model=LoginResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản khách hàng mới",
)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Đăng ký tài khoản Khách Hàng mới và tự động đăng nhập cấp Access Token."""
    # 1. Kiểm tra trùng tên đăng nhập
    existed_user = db.query(TaiKhoan).filter(TaiKhoan.TenDangNhap == req.ten_dang_nhap.strip()).first()
    if existed_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tên đăng nhập '{req.ten_dang_nhap.strip()}' đã được sử dụng",
        )

    # 2. Kiểm tra trùng số điện thoại đã có tài khoản
    existed_kh = (
        db.query(KhachHang)
        .filter(KhachHang.SDT == req.sdt.strip(), KhachHang.MaTK.isnot(None))
        .first()
    )
    if existed_kh:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Số điện thoại '{req.sdt.strip()}' đã được đăng ký cho một tài khoản khác",
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
        TenDangNhap=req.ten_dang_nhap.strip(),
        MatKhau=hash_password(req.mat_khau),
        TrangThai="HoatDong",
    )
    db.add(new_user)
    db.flush()

    # 5. Tạo thông tin khách hàng gắn với tài khoản
    new_kh = KhachHang(
        MaTK=new_user.MaTK,
        HoTen=req.ho_ten.strip(),
        SDT=req.sdt.strip(),
        DiaChi=req.dia_chi.strip() if req.dia_chi else None,
    )
    db.add(new_kh)
    db.commit()

    # Nạp lại đối tượng cùng relationship
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


@router.post("/doi-mat-khau", response_model=MessageResponse, summary="Đổi mật khẩu tài khoản")
def change_password(
    req: ChangePasswordRequest,
    current_user: TaiKhoan = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Thay đổi mật khẩu cá nhân cho người dùng đang đăng nhập."""
    if not verify_password(req.mat_khau_cu, current_user.MatKhau):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không chính xác",
        )

    if req.mat_khau_cu == req.mat_khau_moi:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới không được trùng với mật khẩu cũ",
        )

    current_user.MatKhau = hash_password(req.mat_khau_moi)
    db.commit()

    return MessageResponse(message="Đổi mật khẩu thành công. Vui lòng sử dụng mật khẩu mới cho các lần đăng nhập sau.")
