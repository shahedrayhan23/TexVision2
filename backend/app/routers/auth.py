"""
Authentication routes: register, login, profile.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import RegisterRequest, LoginRequest, TokenResponse
from app.utils import local_db, security

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest):
    existing = local_db.find_one("users", email=payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = local_db.insert("users", {
        "name": payload.name,
        "email": payload.email,
        "password_hash": security.hash_password(payload.password),
        "role": payload.role.value,
        "factory_id": payload.factory_id,
    })

    token = security.create_access_token({"sub": user["id"], "role": user["role"]})
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return TokenResponse(access_token=token, user=safe_user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    user = local_db.find_one("users", email=payload.email)
    if not user or not security.verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = security.create_access_token({"sub": user["id"], "role": user["role"]})
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return TokenResponse(access_token=token, user=safe_user)


@router.get("/me")
def get_profile(user: dict = Depends(security.get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}
