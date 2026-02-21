"""Add face image url to users

Revision ID: 202602161200
Revises: 202602111010
Create Date: 2026-02-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "202602161200"
down_revision: Union[str, None] = "202602111010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("face_image_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "face_image_url")