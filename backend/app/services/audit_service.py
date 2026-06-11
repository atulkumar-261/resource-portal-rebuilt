import logging
from typing import Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from backend.app.models.database import AuditLog

logger = logging.getLogger(__name__)

class AuditService:
    @staticmethod
    def record(
        db: Session,
        actor_id: Optional[UUID],
        module: str,
        action: str,
        table_name: str,
        record_id: UUID,
        old_value: Optional[Dict[str, Any]] = None,
        new_value: Optional[Dict[str, Any]] = None,
        changed_fields: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[AuditLog]:
        """
        Record a mutation in the audit logs.
        Wraps operations in a nested transaction (savepoint) to prevent audit logger
        failures from rolling back or aborting the primary transaction.
        """
        try:
            db.begin_nested()
            
            audit = AuditLog(
                module=module,
                action=action,
                table_name=table_name,
                record_id=record_id,
                old_value=old_value,
                new_value=new_value,
                changed_fields=changed_fields,
                user_id=actor_id,
                ip_address=ip_address,
                user_agent=user_agent
            )
            db.add(audit)
            db.flush()
            return audit
        except Exception as e:
            db.rollback()
            # Log the exception, but allow the main business flow to succeed
            logger.exception(f"Audit log failure for action '{action}' on table '{table_name}': {str(e)}")
            return None

    @staticmethod
    def record_create(
        db: Session,
        actor_id: Optional[UUID],
        module: str,
        table_name: str,
        record_id: UUID,
        new_value: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[AuditLog]:
        return AuditService.record(
            db=db,
            actor_id=actor_id,
            module=module,
            action=f"{table_name.lower()}_created",
            table_name=table_name,
            record_id=record_id,
            new_value=new_value,
            changed_fields={"created": True},
            ip_address=ip_address,
            user_agent=user_agent
        )

    @staticmethod
    def record_update(
        db: Session,
        actor_id: Optional[UUID],
        module: str,
        table_name: str,
        record_id: UUID,
        old_value: Dict[str, Any],
        new_value: Dict[str, Any],
        changed_fields: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[AuditLog]:
        return AuditService.record(
            db=db,
            actor_id=actor_id,
            module=module,
            action=f"{table_name.lower()}_updated",
            table_name=table_name,
            record_id=record_id,
            old_value=old_value,
            new_value=new_value,
            changed_fields=changed_fields,
            ip_address=ip_address,
            user_agent=user_agent
        )

    @staticmethod
    def record_delete(
        db: Session,
        actor_id: Optional[UUID],
        module: str,
        table_name: str,
        record_id: UUID,
        old_value: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[AuditLog]:
        return AuditService.record(
            db=db,
            actor_id=actor_id,
            module=module,
            action=f"{table_name.lower()}_deleted",
            table_name=table_name,
            record_id=record_id,
            old_value=old_value,
            changed_fields={"deleted": True},
            ip_address=ip_address,
            user_agent=user_agent
        )
