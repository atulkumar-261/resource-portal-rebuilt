from contextlib import contextmanager
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

@contextmanager
def transactional(db: Session):
    """
    A context manager to ensure atomic operations.
    If no exception occurs, it commits the session.
    If an exception occurs, it rolls back the session and re-raises.
    """
    try:
        yield
        db.commit()
    except Exception as e:
        db.rollback()
        logger.exception(f"Database transaction rolled back due to error: {str(e)}")
        raise
