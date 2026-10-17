from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.domain.entities.coupon import CouponKind, CouponStatus
from app.presentation.schemas.common import Money


class CouponCreate(BaseModel):
    code: str = Field(min_length=3, max_length=50, examples=["TET2027"])
    kind: CouponKind
    value: Decimal = Field(gt=0, examples=[10])
    max_discount: Decimal | None = Field(default=None, gt=0)
    min_order: Decimal = Field(default=Decimal(0), ge=0)
    quantity: int = Field(gt=0, examples=[100])
    valid_from: datetime
    valid_to: datetime
    description: str | None = Field(default=None, max_length=255)


class CouponStatusIn(BaseModel):
    status: CouponStatus


class CouponOut(BaseModel):
    id: int
    code: str
    kind: CouponKind
    value: Money
    max_discount: Money | None = None
    min_order: Money
    quantity: int
    used: int
    valid_from: datetime
    valid_to: datetime
    status: CouponStatus
    description: str | None = None


class ValidateIn(BaseModel):
    code: str
    amount: Decimal = Field(gt=0, examples=[700000])


class ValidateOut(BaseModel):
    code: str
    discount: Money
    final_amount: Money
