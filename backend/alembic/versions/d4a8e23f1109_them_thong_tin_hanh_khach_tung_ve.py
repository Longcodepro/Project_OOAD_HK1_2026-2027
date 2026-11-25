"""them_thong_tin_hanh_khach_tung_ve

Revision ID: d4a8e23f1109
Revises: cf897df0c13c
"""
import sqlalchemy as sa
from alembic import op


revision = 'd4a8e23f1109'
down_revision = 'cf897df0c13c'


def upgrade() -> None:
    try:
        op.add_column('CT_DatVe', sa.Column('HoTenHanhKhach', sa.String(length=100), nullable=True))
    except Exception:
        pass
    try:
        op.add_column('CT_DatVe', sa.Column('SDTHanhKhach', sa.String(length=20), nullable=True))
    except Exception:
        pass


def downgrade() -> None:
    op.drop_column('CT_DatVe', 'SDTHanhKhach')
    op.drop_column('CT_DatVe', 'HoTenHanhKhach')
