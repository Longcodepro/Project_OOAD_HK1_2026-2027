from decimal import Decimal
from typing import Annotated

from pydantic import PlainSerializer

# Tiền VND: nhận Decimal, trả về số (không phải chuỗi) trong JSON
Money = Annotated[Decimal, PlainSerializer(lambda v: float(v), return_type=float, when_used="json")]
