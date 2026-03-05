"""Add device_pins column to users table

Revision ID: add_device_pins
Revises: 
Create Date: 2026-03-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = 'add_device_pins'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Add device_pins JSON column to users table"""
    op.add_column('users', sa.Column('device_pins', JSON, nullable=True))


def downgrade():
    """Remove device_pins column from users table"""
    op.drop_column('users', 'device_pins')
