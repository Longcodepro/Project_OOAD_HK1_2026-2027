from sqlalchemy import create_engine

from alembic import context
from app.config import settings
from app.infrastructure.db import models  # noqa: F401  (nạp model để autogenerate thấy bảng)
from app.infrastructure.db.base import Base

# cho phép: alembic -x url=sqlite:///x.db ...
url = context.get_x_argument(as_dictionary=True).get("url") or settings.database_url

with create_engine(url).connect() as conn:
    context.configure(connection=conn, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()
