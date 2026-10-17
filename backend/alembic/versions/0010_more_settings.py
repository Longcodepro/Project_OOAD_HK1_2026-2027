"""them tham so OTP va khoa dang nhap vao bang settings

Revision ID: 0010
Revises: 0009
"""

import sqlalchemy as sa

from alembic import op

revision = "0010"
down_revision = "0009"

ROWS = [
    ("OTP_HIEU_LUC_GIAY", "120", "OTP có hiệu lực bao nhiêu giây"),
    ("OTP_SO_LAN_THU_TOI_DA", "5", "Nhập sai OTP quá số lần này thì mã bị khóa"),
    ("OTP_GUI_LAI_GIAY", "60", "Khoảng cách tối thiểu giữa hai lần xin OTP (giây)"),
    ("DANG_NHAP_SAI_TOI_DA", "5", "Đăng nhập sai quá số lần này thì khóa tạm"),
    ("DANG_NHAP_KHOA_PHUT", "15", "Thời gian khóa đăng nhập tạm (phút)"),
]


def upgrade() -> None:
    t = sa.table("settings", sa.column("name"), sa.column("value"), sa.column("description"))
    op.bulk_insert(t, [{"name": n, "value": v, "description": d} for n, v, d in ROWS])


def downgrade() -> None:
    names = ", ".join(f"'{n}'" for n, _, _ in ROWS)
    op.execute(f"DELETE FROM settings WHERE name IN ({names})")
