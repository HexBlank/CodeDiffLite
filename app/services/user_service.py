import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException

from app.db import get_db
from app.security import create_access_token, hash_password, verify_password
from app.services.email_service import send_verification_email
from app.services.snippet_service import generate_code
from app.services.system_config import get_auth_settings


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _user_payload(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "email": row["email"],
        "nickname": row["nickname"],
        "avatar_url": row["avatar_url"] if "avatar_url" in row.keys() else None,
    }


def send_code(email: str, purpose: str = "register") -> dict[str, Any]:
    # 注册验证码：检查开关是否开启
    if purpose == "register":
        settings = get_auth_settings()
        if not settings["register_email_verify"]:
            raise HTTPException(status_code=400, detail="当前未开启注册邮箱验证码")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        existing_user = cursor.fetchone()

        if purpose == "register" and existing_user:
            raise HTTPException(status_code=400, detail="该邮箱已注册")
        if purpose in ["login", "reset_password", "change_password"] and not existing_user:
            raise HTTPException(status_code=400, detail="该邮箱未注册")
        if purpose == "change_email" and existing_user:
            raise HTTPException(status_code=400, detail="该邮箱已被使用")

        code = generate_code(6)
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=5 if purpose == "register" else 10)).isoformat()

        cursor.execute(
            "UPDATE email_verifications SET used = 1 WHERE email = ? AND purpose = ? AND used = 0",
            (email, purpose),
        )
        cursor.execute(
            """
            INSERT INTO email_verifications (email, code, purpose, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (email, code, purpose, expires_at, _now_iso()),
        )
        conn.commit()

    if not send_verification_email(email, code, purpose):
        raise HTTPException(status_code=500, detail="邮件发送失败")

    return {"message": "验证码已发送", "email": email}


def register_user(email: str, code: Optional[str], password: str, nickname: Optional[str] = None) -> dict[str, Any]:
    settings = get_auth_settings()
    require_code = settings["register_email_verify"]

    with get_db() as conn:
        cursor = conn.cursor()

        if require_code:
            if not code:
                raise HTTPException(status_code=400, detail="请输入验证码")
            cursor.execute(
                """
                SELECT id
                FROM email_verifications
                WHERE email = ? AND code = ? AND purpose = 'register' AND used = 0 AND expires_at > ?
                """,
                (email, code, _now_iso()),
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail="验证码无效或已过期")

            cursor.execute(
                'UPDATE email_verifications SET used = 1 WHERE email = ? AND code = ? AND purpose = "register"',
                (email, code),
            )

        display_name = nickname or email.split("@")[0]
        try:
            cursor.execute(
                """
                INSERT INTO users (email, password_hash, nickname, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (email, hash_password(password), display_name, _now_iso()),
            )
            user_id = cursor.lastrowid
            conn.commit()
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=400, detail="该邮箱已注册") from exc

        return {
            "access_token": create_access_token(data={"sub": str(user_id)}),
            "token_type": "bearer",
            "user": {"id": user_id, "email": email, "nickname": display_name, "avatar_url": None},
        }


def login_user(email: str, password: str) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, password_hash, nickname, avatar_url FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        if not user or not verify_password(password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="邮箱或密码错误")

        cursor.execute(
            "UPDATE users SET last_login_at = ? WHERE id = ?",
            (_now_iso(), user["id"]),
        )
        conn.commit()

        return {
            "access_token": create_access_token(data={"sub": str(user['id'])}),
            "token_type": "bearer",
            "user": _user_payload(user),
        }


def login_with_code(email: str, code: str) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id
            FROM email_verifications
            WHERE email = ? AND code = ? AND purpose = 'login' AND used = 0 AND expires_at > ?
            """,
            (email, code, _now_iso()),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="验证码无效或已过期")

        cursor.execute(
            'UPDATE email_verifications SET used = 1 WHERE email = ? AND code = ? AND purpose = "login"',
            (email, code),
        )

        cursor.execute("SELECT id, email, nickname, avatar_url FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        if not user:
            nickname = email.split("@")[0]
            cursor.execute(
                """
                INSERT INTO users (email, password_hash, nickname, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (email, hash_password(str(uuid.uuid4())), nickname, _now_iso()),
            )
            user_id = cursor.lastrowid
            conn.commit()
            user_payload = {"id": user_id, "email": email, "nickname": nickname, "avatar_url": None}
        else:
            cursor.execute(
                "UPDATE users SET last_login_at = ? WHERE id = ?",
                (_now_iso(), user["id"]),
            )
            conn.commit()
            user_id = user["id"]
            user_payload = _user_payload(user)

        return {
            "access_token": create_access_token(data={"sub": str(user_id)}),
            "token_type": "bearer",
            "user": user_payload,
        }


def get_user_profile(user_id: int) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, nickname, avatar_url FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        return _user_payload(user)


def update_user_profile(user_id: int, nickname: Optional[str] = None) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="用户不存在")

        if nickname is not None:
            cursor.execute("UPDATE users SET nickname = ? WHERE id = ?", (nickname or None, user_id))
            conn.commit()

        cursor.execute("SELECT id, email, nickname, avatar_url FROM users WHERE id = ?", (user_id,))
        return _user_payload(cursor.fetchone())


def change_password(user_id: int, current_password: str, new_password: str) -> None:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        if not verify_password(current_password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="当前密码错误")

        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(new_password), user_id),
        )
        conn.commit()


def change_password_by_code(user_id: int, code: str, new_password: str) -> None:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT email FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")

        cursor.execute(
            """
            SELECT id
            FROM email_verifications
            WHERE email = ? AND code = ? AND purpose = 'change_password' AND used = 0 AND expires_at > ?
            """,
            (user["email"], code, _now_iso()),
        )
        verification = cursor.fetchone()
        if not verification:
            raise HTTPException(status_code=400, detail="验证码错误或已过期")

        cursor.execute("UPDATE email_verifications SET used = 1 WHERE id = ?", (verification["id"],))
        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(new_password), user_id),
        )
        conn.commit()


def change_email(user_id: int, new_email: str, code: str) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ? AND id != ?", (new_email, user_id))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="该邮箱已被其他账号使用")

        cursor.execute(
            """
            SELECT id
            FROM email_verifications
            WHERE email = ? AND code = ? AND purpose = 'change_email' AND used = 0 AND expires_at > ?
            """,
            (new_email, code, _now_iso()),
        )
        verification = cursor.fetchone()
        if not verification:
            raise HTTPException(status_code=400, detail="验证码错误或已过期")

        cursor.execute("UPDATE email_verifications SET used = 1 WHERE id = ?", (verification["id"],))
        cursor.execute("UPDATE users SET email = ? WHERE id = ?", (new_email, user_id))
        conn.commit()

        cursor.execute("SELECT id, email, nickname, avatar_url FROM users WHERE id = ?", (user_id,))
        return _user_payload(cursor.fetchone())


def reset_password(email: str, code: str, new_password: str) -> None:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="该邮箱未注册")

        cursor.execute(
            """
            SELECT id
            FROM email_verifications
            WHERE email = ? AND code = ? AND purpose = 'reset_password' AND used = 0 AND expires_at > ?
            """,
            (email, code, _now_iso()),
        )
        verification = cursor.fetchone()
        if not verification:
            raise HTTPException(status_code=400, detail="验证码错误或已过期")

        cursor.execute("UPDATE email_verifications SET used = 1 WHERE id = ?", (verification["id"],))
        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(new_password), user["id"]),
        )
        conn.commit()
