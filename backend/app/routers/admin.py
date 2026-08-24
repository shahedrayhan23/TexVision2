"""
Admin routes: manage users, factories, and production lines.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import FactoryCreate, ProductionLineCreate
from app.utils import local_db, security

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/users")
def list_users(user: dict = Depends(security.require_roles("admin"))):
    users = local_db.find_all("users")
    return [{k: v for k, v in u.items() if k != "password_hash"} for u in users]


@router.delete("/users/{user_id}")
def delete_user(user_id: str, user: dict = Depends(security.require_roles("admin"))):
    ok = local_db.delete("users", user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True}


@router.patch("/users/{user_id}/role")
def update_user_role(user_id: str, role: str, user: dict = Depends(security.require_roles("admin"))):
    updated = local_db.update("users", user_id, {"role": role})
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return {k: v for k, v in updated.items() if k != "password_hash"}


@router.post("/factories")
def create_factory(payload: FactoryCreate, user: dict = Depends(security.require_roles("admin"))):
    return local_db.insert("factories", payload.model_dump())


@router.get("/factories")
def list_factories(user: dict = Depends(security.get_current_user)):
    return local_db.find_all("factories")


@router.post("/production-lines")
def create_production_line(payload: ProductionLineCreate, user: dict = Depends(security.require_roles("admin", "manager"))):
    return local_db.insert("production_lines", payload.model_dump())


@router.get("/production-lines")
def list_production_lines(user: dict = Depends(security.get_current_user)):
    return local_db.find_all("production_lines")
