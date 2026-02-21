"""Rename request approval/submission fields

Revision ID: 202602111010
Revises: 496748f5398d
Create Date: 2026-02-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "202602111010"
down_revision: Union[str, None] = "496748f5398d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLES = [
    "permission_requests",
    "overtime_requests",
    "regularization_requests",
    "shift_change_requests",
]


def upgrade() -> None:
    for table in TABLES:
        # Drop old FK tying approved_by to users.employee_id; manager_name will store the acting manager's display name.
        op.drop_constraint(f"{table}_approved_by_fkey", table_name=table, type_="foreignkey")
        op.alter_column(table, "approved_by", new_column_name="manager_name", existing_type=sa.String())
        op.alter_column(
            table,
            "approved_at",
            new_column_name="decision_date",
            existing_type=sa.DateTime(timezone=True),
        )
        op.alter_column(
            table,
            "submitted_at",
            new_column_name="submitted_date",
            existing_type=sa.DateTime(timezone=True),
        )


def downgrade() -> None:
    for table in TABLES:
        op.alter_column(
            table,
            "submitted_date",
            new_column_name="submitted_at",
            existing_type=sa.DateTime(timezone=True),
        )
        op.alter_column(
            table,
            "decision_date",
            new_column_name="approved_at",
            existing_type=sa.DateTime(timezone=True),
        )
        op.alter_column(table, "manager_name", new_column_name="approved_by", existing_type=sa.String())
        op.create_foreign_key(
            f"{table}_approved_by_fkey",
            source_table=table,
            referent_table="users",
            local_cols=["approved_by"],
            remote_cols=["employee_id"],
        )
