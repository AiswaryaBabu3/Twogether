"""add_reply_reactions_and_soft_delete_to_chat

Revision ID: ea623992392b
Revises: 7510b5b5e094
Create Date: 2026-11-02 17:33:15.615892

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ea623992392b'
down_revision: Union[str, Sequence[str], None] = '7510b5b5e094'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('chat_messages', sa.Column('reply_to_id', sa.Integer(), nullable=True))
    op.add_column('chat_messages', sa.Column('reply_to_text', sa.Text(), nullable=True))
    op.add_column('chat_messages', sa.Column('reply_to_sender', sa.String(length=100), nullable=True))
    op.add_column('chat_messages', sa.Column('reactions', sa.JSON(), server_default='{}', nullable=True))
    op.add_column('chat_messages', sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('chat_messages', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key('fk_chat_messages_reply_to_id', 'chat_messages', 'chat_messages', ['reply_to_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_chat_messages_reply_to_id', 'chat_messages', type_='foreignkey')
    op.drop_column('chat_messages', 'deleted_at')
    op.drop_column('chat_messages', 'is_deleted')
    op.drop_column('chat_messages', 'reactions')
    op.drop_column('chat_messages', 'reply_to_sender')
    op.drop_column('chat_messages', 'reply_to_text')
    op.drop_column('chat_messages', 'reply_to_id')
