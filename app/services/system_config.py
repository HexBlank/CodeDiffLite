from datetime import datetime, timezone

from app.db import get_db


def get_config(key: str, default: str = "") -> str:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM system_config WHERE key = ?", (key,))
        row = cursor.fetchone()
        return row["value"] if row else default


def set_config(key: str, value: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO system_config (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            """,
            (key, value, now),
        )
        conn.commit()


def get_email_config() -> dict:
    return {
        "host": get_config("smtp_host", ""),
        "port": int(get_config("smtp_port", "587") or "587"),
        "user": get_config("smtp_user", ""),
        "password": get_config("smtp_password", ""),
        "from": get_config("smtp_from", ""),
    }


def is_email_configured() -> bool:
    """检查 SMTP 邮件服务器是否已完整配置。"""
    cfg = get_email_config()
    return all([cfg["host"], cfg["port"], cfg["user"], cfg["password"], cfg["from"]])


def get_auth_settings() -> dict:
    """获取认证相关的开关配置。"""
    return {
        "login_enabled": get_config("auth_login_enabled", "true") == "true",
        "login_with_code_enabled": get_config("auth_login_with_code_enabled", "false") == "true",
        "register_enabled": get_config("auth_register_enabled", "true") == "true",
        "register_email_verify": get_config("auth_register_email_verify", "false") == "true",
        'smtp_configured': is_email_configured(),
    }
