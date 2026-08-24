"""
Authentication utilities: password hashing + JWT issuing/verification.
Role-based access control helpers included.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.config import get_settings
from app.utils import local_db


settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    # bcrypt has a 72-byte input limit
    pw_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(
        pw_bytes,
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain.encode("utf-8")[:72],
            hashed.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(
    data: dict,
    expires_minutes: Optional[int] = None
) -> str:

    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.access_token_expire_minutes
    )

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm="HS256"
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.secret_key,
            algorithms=["HS256"]
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    token: str = Depends(oauth2_scheme)
) -> dict:

    payload = decode_token(token)

    user_id = payload.get("sub")

    user = local_db.find_by_id(
        "users",
        user_id
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


def require_roles(*roles: str):

    """Dependency factory for role-based access control."""

    def checker(
        user: dict = Depends(get_current_user)
    ) -> dict:

        if user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {roles}",
            )

        return user

    return checker