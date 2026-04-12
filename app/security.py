import hashlib
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Header, HTTPException

from .config import (
    ADMIN_TOKEN_EXPIRE_HOURS,
    ALGORITHM,
    SECRET_KEY,
    SHARE_PASSWORD_ITERATIONS,
    USER_TOKEN_EXPIRE_DAYS,
)

try:
    from jose import JWTError, jwt
    from passlib.context import CryptContext

    HAS_AUTH_DEPS = True
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except ImportError:
    HAS_AUTH_DEPS = False
    pwd_context = None


def hash_password(password: str) -> str:
    if pwd_context:
        return pwd_context.hash(password)

    salt = secrets.token_hex(16)
    hash_obj = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${hash_obj.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    if pwd_context and password_hash.startswith("$"):
        try:
            return pwd_context.verify(password, password_hash)
        except Exception:
            pass

    try:
        salt, hash_value = password_hash.split("$")
        hash_obj = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return secrets.compare_digest(hash_obj.hex(), hash_value)
    except Exception:
        return False


def hash_share_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hash_obj = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        SHARE_PASSWORD_ITERATIONS,
    )
    return f"pbkdf2_sha256${SHARE_PASSWORD_ITERATIONS}${salt}${hash_obj.hex()}"


def verify_share_password(password: str, password_hash: str) -> bool:
    try:
        parts = password_hash.split("$")
        if len(parts) == 4 and parts[0] == "pbkdf2_sha256":
            _, iterations, salt, hash_value = parts
            hash_obj = hashlib.pbkdf2_hmac(
                "sha256",
                password.encode("utf-8"),
                salt.encode("utf-8"),
                int(iterations),
            )
            return secrets.compare_digest(hash_obj.hex(), hash_value)

        if len(parts) == 2:
            salt, hash_value = parts
            hash_obj = hashlib.sha256((password + salt).encode()).hexdigest()
            return secrets.compare_digest(hash_obj, hash_value)

        return False
    except (ValueError, TypeError):
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    if not HAS_AUTH_DEPS:
        raise HTTPException(status_code=500, detail="JWT not available")

    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=USER_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_admin_access_token(data: dict) -> str:
    return create_access_token(data, expires_delta=timedelta(hours=ADMIN_TOKEN_EXPIRE_HOURS))


def verify_token(token: str) -> Optional[str]:
    if not HAS_AUTH_DEPS:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        subject = payload.get("sub")
        return str(subject) if subject is not None else None
    except JWTError:
        return None


async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[int]:
    if not authorization:
        return None

    parts = authorization.split()
    token = parts[1] if len(parts) == 2 and parts[0].lower() == "bearer" else authorization
    subject = verify_token(token)
    try:
        return int(subject) if subject else None
    except (TypeError, ValueError):
        return None


async def get_current_admin(authorization: Optional[str] = Header(None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="未提供认证信息")

    parts = authorization.split()
    token = parts[1] if len(parts) == 2 and parts[0].lower() == "bearer" else authorization
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="无效的认证信息")

    return username


def is_user_owner(row: sqlite3.Row, user_id: Optional[int]) -> bool:
    return user_id is not None and row["user_id"] == user_id


def is_author_owner(row: sqlite3.Row, author_token: Optional[str]) -> bool:
    return (
        author_token is not None
        and row["author_token"] is not None
        and row["author_token"] == author_token
    )


def ensure_snippet_access(
    row: sqlite3.Row,
    user_id: Optional[int] = None,
    author_token: Optional[str] = None,
) -> bool:
    is_owner = is_user_owner(row, user_id) or is_author_owner(row, author_token)

    if row["status"] != 1 and not is_owner:
        raise HTTPException(status_code=404, detail="Snippet not found")

    if not row["is_public"] and not is_owner:
        raise HTTPException(status_code=403, detail="该代码为私密状态")

    return is_owner
