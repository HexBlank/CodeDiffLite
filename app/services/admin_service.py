import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException

from app.db import get_db, get_db_connection, init_admin_table
from app.security import HAS_AUTH_DEPS, hash_password, verify_password


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def is_admin_initialized() -> bool:
    init_admin_table()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM admin_users")
        count = cursor.fetchone()[0]
        return count > 0


def create_admin(username: str, password: str) -> None:
    if not HAS_AUTH_DEPS:
        raise HTTPException(status_code=500, detail="认证依赖未安装")

    with get_db() as conn:
        try:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO admin_users (username, password_hash, created_at) VALUES (?, ?, ?)",
                (username, hash_password(password), _now_iso()),
            )
            conn.commit()
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=400, detail="用户名已存在") from exc


def verify_admin(username: str, password: str) -> bool:
    if not HAS_AUTH_DEPS:
        return False

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash FROM admin_users WHERE username = ?", (username,))
        row = cursor.fetchone()
        if not row:
            return False

        return verify_password(password, row["password_hash"])


def get_admin_snippet_stats() -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM snippets")
        total = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM snippets WHERE depth = 0 OR depth IS NULL")
        original = cursor.fetchone()[0]

        today = datetime.now(timezone.utc).date().isoformat()
        cursor.execute("SELECT COUNT(*) FROM snippets WHERE created_at LIKE ?", (f"{today}%",))
        today_count = cursor.fetchone()[0]

        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        cursor.execute("SELECT COUNT(*) FROM snippets WHERE created_at >= ?", (week_ago,))
        week_count = cursor.fetchone()[0]

        month_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        cursor.execute("SELECT COUNT(*) FROM snippets WHERE created_at >= ?", (month_ago,))
        month_count = cursor.fetchone()[0]

        cursor.execute(
            """
            SELECT language, COUNT(*) AS count
            FROM snippets
            GROUP BY language
            ORDER BY count DESC
            """
        )
        language_stats = {row["language"] or "plaintext": row["count"] for row in cursor.fetchall()}

        return {
            "total_snippets": total,
            "original_snippets": original,
            "reply_snippets": total - original,
            "today_snippets": today_count,
            "week_snippets": week_count,
            "month_snippets": month_count,
            "language_stats": language_stats,
        }


def list_admin_snippets(
    *,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    language: Optional[str] = None,
    only_original: bool = False,
) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        conditions = []
        params: list[Any] = []

        if search:
            conditions.append("(code LIKE ? OR id LIKE ? OR message LIKE ?)")
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern])

        if language:
            conditions.append("language = ?")
            params.append(language)

        if only_original:
            conditions.append("(depth = 0 OR depth IS NULL)")

        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
        cursor.execute(f"SELECT COUNT(*) FROM snippets{where_clause}", params)
        total = cursor.fetchone()[0]

        offset = (page - 1) * page_size
        cursor.execute(
            f"""
            SELECT s.id, SUBSTR(s.code, 1, 200) AS code_preview, s.language,
                   s.parent_id, s.root_id, s.depth, s.message, s.created_at,
                   (SELECT COUNT(*) FROM snippets c WHERE c.parent_id = s.id) AS children_count
            FROM snippets s
            {where_clause}
            ORDER BY s.created_at DESC
            LIMIT ? OFFSET ?
            """,
            params + [page_size, offset],
        )
        rows = cursor.fetchall()

        items = [
            {
                "id": row["id"],
                "code_preview": row["code_preview"] or "",
                "language": row["language"] or "plaintext",
                "parent_id": row["parent_id"],
                "root_id": row["root_id"],
                "depth": row["depth"] or 0,
                "message": row["message"],
                "children_count": row["children_count"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]
        total_pages = (total + page_size - 1) // page_size

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }


def get_admin_snippet_detail(snippet_id: str) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, code, language, parent_id, root_id, depth, message, author_token, created_at
            FROM snippets
            WHERE id = ?
            """,
            (snippet_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="代码片段不存在")

        cursor.execute("SELECT COUNT(*) FROM snippets WHERE parent_id = ?", (snippet_id,))
        children_count = cursor.fetchone()[0]

        root_id = row["root_id"] or snippet_id
        cursor.execute("SELECT COUNT(*) FROM snippets WHERE root_id = ? AND id != ?", (root_id, root_id))
        descendants_count = cursor.fetchone()[0]

        parent_code = None
        parent_message = None
        if row["parent_id"]:
            cursor.execute("SELECT code, message FROM snippets WHERE id = ?", (row["parent_id"],))
            parent_row = cursor.fetchone()
            if parent_row:
                parent_code = parent_row["code"]
                parent_message = parent_row["message"]

        return {
            "id": row["id"],
            "code": row["code"],
            "language": row["language"] or "plaintext",
            "parent_id": row["parent_id"],
            "root_id": row["root_id"],
            "depth": row["depth"] or 0,
            "message": row["message"],
            "author_token": row["author_token"],
            "created_at": row["created_at"],
            "parent_code": parent_code,
            "parent_message": parent_message,
            "children_count": children_count,
            "descendants_count": descendants_count,
        }


def delete_admin_snippet(snippet_id: str) -> None:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM snippets WHERE id = ?", (snippet_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="代码片段不存在")

        cursor.execute("DELETE FROM snippets WHERE id = ?", (snippet_id,))
        conn.commit()


def delete_admin_snippet_tree(snippet_id: str) -> int:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, root_id FROM snippets WHERE id = ?", (snippet_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="代码片段不存在")

        root_id = row["root_id"] or snippet_id
        cursor.execute("DELETE FROM snippets WHERE root_id = ? OR id = ?", (root_id, root_id))
        deleted_count = cursor.rowcount
        conn.commit()
        return deleted_count


def list_admin_snippet_children(snippet_id: str) -> list[dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, SUBSTR(code, 1, 200) AS code_preview, message, created_at
            FROM snippets
            WHERE parent_id = ?
            ORDER BY created_at DESC
            """,
            (snippet_id,),
        )
        return [
            {
                "id": row["id"],
                "code_preview": row["code_preview"] or "",
                "message": row["message"],
                "created_at": row["created_at"],
            }
            for row in cursor.fetchall()
        ]


def list_users(
    *,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        conditions = []
        params: list[Any] = []

        if search:
            conditions.append("(email LIKE ? OR nickname LIKE ?)")
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern])

        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
        cursor.execute(f"SELECT COUNT(*) FROM users{where_clause}", params)
        total = cursor.fetchone()[0]

        offset = (page - 1) * page_size
        cursor.execute(
            f"""
            SELECT u.id, u.email, u.nickname, u.created_at, u.last_login_at,
                   (SELECT COUNT(*) FROM snippets WHERE user_id = u.id AND status >= 0) AS snippet_count
            FROM users u
            {where_clause}
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
            """,
            params + [page_size, offset],
        )
        rows = cursor.fetchall()

        items = [
            {
                "id": row["id"],
                "email": row["email"],
                "nickname": row["nickname"],
                "created_at": row["created_at"],
                "last_login_at": row["last_login_at"],
                "snippet_count": row["snippet_count"],
            }
            for row in rows
        ]
        total_pages = (total + page_size - 1) // page_size

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }


def get_user_detail(user_id: int) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, email, nickname, avatar_url, email_verified, created_at, last_login_at
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="用户不存在")

        cursor.execute(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN is_public = 1 THEN 1 ELSE 0 END) AS public_count,
                SUM(CASE WHEN is_public = 0 THEN 1 ELSE 0 END) AS private_count
            FROM snippets
            WHERE user_id = ? AND status >= 0
            """,
            (user_id,),
        )
        stats = cursor.fetchone()

        return {
            "id": row["id"],
            "email": row["email"],
            "nickname": row["nickname"],
            "avatar_url": row["avatar_url"],
            "email_verified": bool(row["email_verified"]),
            "created_at": row["created_at"],
            "last_login_at": row["last_login_at"],
            "snippet_count": stats["total"] or 0,
            "public_snippets": stats["public_count"] or 0,
            "private_snippets": stats["private_count"] or 0,
        }


def delete_user(user_id: int) -> None:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="用户不存在")

        cursor.execute(
            """
            UPDATE snippets
            SET user_id = NULL, updated_at = ?
            WHERE user_id = ?
            """,
            (_now_iso(), user_id),
        )
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()


def list_shares(
    *,
    page: int = 1,
    page_size: int = 20,
    snippet_id: Optional[str] = None,
) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        conditions = []
        params: list[Any] = []

        if snippet_id:
            conditions.append("ss.snippet_id = ?")
            params.append(snippet_id)

        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
        cursor.execute(
            f"""
            SELECT COUNT(*)
            FROM snippet_shares ss
            JOIN snippets s ON ss.snippet_id = s.id
            {where_clause}
            """,
            params,
        )
        total = cursor.fetchone()[0]

        offset = (page - 1) * page_size
        cursor.execute(
            f"""
            SELECT ss.id, ss.snippet_id, ss.share_token, ss.password_hash,
                   ss.expires_at, ss.max_views, ss.current_views, ss.created_at,
                   SUBSTR(s.code, 1, 100) AS snippet_preview, s.language AS snippet_language
            FROM snippet_shares ss
            JOIN snippets s ON ss.snippet_id = s.id
            {where_clause}
            ORDER BY ss.created_at DESC
            LIMIT ? OFFSET ?
            """,
            params + [page_size, offset],
        )
        rows = cursor.fetchall()

        items = [
            {
                "id": row["id"],
                "snippet_id": row["snippet_id"],
                "share_token": row["share_token"],
                "has_password": row["password_hash"] is not None,
                "expires_at": row["expires_at"],
                "max_views": row["max_views"],
                "current_views": row["current_views"],
                "created_at": row["created_at"],
                "snippet_preview": row["snippet_preview"] or "",
                "snippet_language": row["snippet_language"] or "plaintext",
            }
            for row in rows
        ]
        total_pages = (total + page_size - 1) // page_size

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }


def delete_share(share_id: int) -> None:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM snippet_shares WHERE id = ?", (share_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="分享链接不存在")

        cursor.execute("DELETE FROM snippet_shares WHERE id = ?", (share_id,))
        conn.commit()


def get_extended_stats() -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]

        today = datetime.now(timezone.utc).date().isoformat()
        cursor.execute("SELECT COUNT(*) FROM users WHERE created_at LIKE ?", (f"{today}%",))
        today_users = cursor.fetchone()[0]

        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        cursor.execute("SELECT COUNT(*) FROM users WHERE last_login_at >= ?", (week_ago,))
        week_users = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM snippet_shares")
        total_shares = cursor.fetchone()[0]

        now = _now_iso()
        cursor.execute("SELECT COUNT(*) FROM snippet_shares WHERE expires_at IS NULL OR expires_at > ?", (now,))
        active_shares = cursor.fetchone()[0]

        cursor.execute(
            "SELECT COUNT(*) FROM snippet_shares WHERE expires_at IS NOT NULL AND expires_at <= ?",
            (now,),
        )
        expired_shares = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM snippets WHERE is_public = 1 AND status >= 0")
        public_snippets = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM snippets WHERE is_public = 0 AND status >= 0")
        private_snippets = cursor.fetchone()[0]

        return {
            "total_users": total_users,
            "today_users": today_users,
            "week_users": week_users,
            "total_shares": total_shares,
            "active_shares": active_shares,
            "expired_shares": expired_shares,
            "private_snippets": private_snippets,
            "public_snippets": public_snippets,
        }


def update_admin_username(current_username: str, new_username: str) -> None:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM admin_users WHERE username = ?", (new_username,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="该用户名已被使用")

        cursor.execute(
            "UPDATE admin_users SET username = ? WHERE username = ?",
            (new_username, current_username),
        )
        conn.commit()


def update_admin_password(username: str, new_password: str) -> None:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE admin_users SET password_hash = ? WHERE username = ?",
            (hash_password(new_password), username),
        )
        conn.commit()


def reset_admin_credentials(username: str, password: str) -> None:
    init_admin_table()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM admin_users ORDER BY id LIMIT 1")
        admin_row = cursor.fetchone()
        if not admin_row:
            raise HTTPException(status_code=400, detail="管理员尚未初始化")

        cursor.execute(
            "SELECT id FROM admin_users WHERE username = ? AND id != ?",
            (username, admin_row["id"]),
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="该用户名已被使用")

        cursor.execute(
            "UPDATE admin_users SET username = ?, password_hash = ? WHERE id = ?",
            (username, hash_password(password), admin_row["id"]),
        )
        conn.commit()


def create_user(email: str, password: str, nickname: str = "") -> int:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="该邮箱已被注册")

        cursor.execute(
            """
            INSERT INTO users (email, password_hash, nickname, email_verified, created_at, last_login_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                email,
                hash_password(password),
                nickname or None,
                True,
                _now_iso(),
                None,
            ),
        )
        conn.commit()
        return cursor.lastrowid
