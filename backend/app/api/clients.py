from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.config import get_db_session
from backend.app.core.security import require_privileged_user, require_current_user
from backend.app.models.database import Client, AuditLog, User
from backend.app.schemas.clients import ClientCreateRequest, ClientUpdateRequest, ClientResponse

router = APIRouter(prefix="/clients", tags=["Clients"])

def _snapshot(client: Client) -> Dict[str, Any]:
    return {
        "id": str(client.id),
        "name": client.name,
        "contact_person": client.contact_person,
        "email": client.email,
        "phone": client.phone,
        "address": client.address,
    }

def _audit(
    db: Session,
    actor: User,
    client_id: UUID,
    action: str,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    changed_fields: Optional[Dict[str, Any]] = None,
):
    savepoint = db.begin_nested()
    try:
        db.add(
            AuditLog(
                module="clients",
                action=action,
                table_name="clients",
                record_id=client_id,
                old_value=old_value,
                new_value=new_value,
                changed_fields=changed_fields,
                user_id=actor.id,
            )
        )
        db.flush()
    except Exception:
        savepoint.rollback()
        import logging
        logging.getLogger(__name__).exception("Audit log failure")

@router.get("", response_model=List[ClientResponse])
def get_clients(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    return db.query(Client).filter(Client.is_deleted == False).all()

@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    client = db.query(Client).filter(Client.id == client_id, Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found or deleted.")
    return client

@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    request: ClientCreateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    # Uniqueness constraint on Name
    exists = db.query(Client).filter(Client.name == request.name, Client.is_deleted == False).first()
    if exists:
        raise HTTPException(status_code=409, detail="Client with this name already exists.")

    client = Client(
        name=request.name,
        contact_person=request.contact_person,
        email=request.email,
        phone=request.phone,
        address=request.address,
        is_deleted=False
    )
    db.add(client)
    db.flush()

    _audit(
        db,
        current_user,
        client.id,
        "client_created",
        new_value=_snapshot(client),
        changed_fields={"created": True}
    )
    db.commit()
    db.refresh(client)
    return client

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: UUID,
    request: ClientUpdateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    client = db.query(Client).filter(Client.id == client_id, Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")

    old = _snapshot(client)
    changed: Dict[str, Any] = {}

    if request.name is not None and request.name != client.name:
        exists = db.query(Client).filter(Client.name == request.name, Client.id != client_id, Client.is_deleted == False).first()
        if exists:
            raise HTTPException(status_code=409, detail="Client with this name already exists.")
        changed["name"] = {"old": client.name, "new": request.name}
        client.name = request.name

    if request.contact_person is not None and request.contact_person != client.contact_person:
        changed["contact_person"] = {"old": client.contact_person, "new": request.contact_person}
        client.contact_person = request.contact_person

    if request.email is not None and request.email != client.email:
        changed["email"] = {"old": client.email, "new": request.email}
        client.email = request.email

    if request.phone is not None and request.phone != client.phone:
        changed["phone"] = {"old": client.phone, "new": request.phone}
        client.phone = request.phone

    if request.address is not None and request.address != client.address:
        changed["address"] = {"old": client.address, "new": request.address}
        client.address = request.address

    if not changed:
        return client

    db.add(client)
    db.flush()

    _audit(
        db,
        current_user,
        client.id,
        "client_updated",
        old_value=old,
        new_value=_snapshot(client),
        changed_fields=changed
    )
    db.commit()
    db.refresh(client)
    return client

@router.delete("/{client_id}")
def delete_client(
    client_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    client = db.query(Client).filter(Client.id == client_id, Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")

    old = _snapshot(client)
    client.is_deleted = True
    client.deleted_at = datetime.utcnow()
    client.deleted_by = current_user.id
    db.add(client)
    db.flush()

    _audit(
        db,
        current_user,
        client.id,
        "client_deleted",
        old_value=old,
        changed_fields={"deleted": True}
    )
    db.commit()
    return {"status": "success", "message": "Client soft-deleted successfully."}
