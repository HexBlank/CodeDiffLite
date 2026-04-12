import secrets
import string
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException, Response

from app.db import get_db
from app.security import (
    ensure_snippet_access,
    hash_share_password,
    is_author_owner,
    is_user_owner,
    verify_share_password,
)


VALID_LANGUAGES = {
    "plaintext",
    "javascript",
    "typescript",
    "python",
    "java",
    "c",
    "cpp",
    "go",
    "rust",
    "css",
    "html",
    "json",
    "sql",
    "mysql",
    "pgsql",
    "shell",
    "bash",
}


def generate_id(length: int = 8) -> str:
    chars = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


def generate_code(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def normalize_language(language: str) -> str:
    return language if language in VALID_LANGUAGES else "plaintext"


def get_or_create_author_token(response: Response, author_token: Optional[str] = None) -> str:
    if author_token:
        return author_token

    new_token = str(uuid.uuid4())[:16]
    response.set_cookie(key="author_token", value=new_token, max_age=60 * 60 * 24 * 365, httponly=True)
    return new_token


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _root_id(row: Any) -> str:
    return row["root_id"] or row["id"]


def _snippet_payload(
    row: Any,
    *,
    parent_code: Optional[str] = None,
    children_count: int = 0,
) -> dict[str, Any]:
    return {
        "id": row["id"],
        "code": row["code"],
        "parent_id": row["parent_id"],
        "root_id": _root_id(row),
        "depth": row["depth"] or 0,
        "language": row["language"] or "plaintext",
        "message": row["message"],
        "author_token": row["author_token"] if "author_token" in row.keys() else None,
        "parent_code": parent_code,
        "created_at": row["created_at"],
        "children_count": children_count,
    }


def _snippet_list_item_payload(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "parent_id": row["parent_id"],
        "depth": row["depth"] or 0,
        "language": row["language"] or "plaintext",
        "message": row["message"],
        "created_at": row["created_at"],
        "code_preview": row["code_preview"] or "",
    }


def _get_accessible_snippet_row(cursor: Any, snippet_id: str, user_id: Optional[int], author_token: Optional[str]):
    cursor.execute(
        """
        SELECT id, code, parent_id, root_id, depth, language, message, author_token,
               user_id, is_public, allow_fork, status, created_at
        FROM snippets
        WHERE id = ?
        """,
        (snippet_id,),
    )
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Snippet not found")

    ensure_snippet_access(row, user_id=user_id, author_token=author_token)
    return row


def _get_root_row(cursor: Any, root_id: str):
    cursor.execute(
        """
        SELECT id, code, parent_id, root_id, depth, language, message, author_token,
               user_id, is_public, status, created_at
        FROM snippets
        WHERE id = ?
        """,
        (root_id,),
    )
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Snippet not found")
    return row


def create_snippet(
    *,
    code: str,
    parent_id: Optional[str],
    language: str,
    message: Optional[str],
    author_token: str,
    user_id: Optional[int],
) -> dict[str, Any]:
    snippet_id = generate_id()
    created_at = _now_iso()
    normalized_language = normalize_language(language)

    with get_db() as conn:
        cursor = conn.cursor()
        root_id = snippet_id
        depth = 0
        parent_code = None
        allow_fork = 1

        if parent_id:
            cursor.execute(
                """
                SELECT id, code, root_id, depth, allow_fork, is_public, status
                FROM snippets
                WHERE id = ?
                """,
                (parent_id,),
            )
            parent_row = cursor.fetchone()
            if not parent_row:
                raise HTTPException(status_code=404, detail="父代码片段不存在")
            if not parent_row["allow_fork"]:
                raise HTTPException(status_code=403, detail="该代码不允许创建衍生版本")
            if not parent_row["is_public"] or parent_row["status"] != 1:
                raise HTTPException(status_code=403, detail="该代码不可访问")

            parent_code = parent_row["code"]
            root_id = parent_row["root_id"] or parent_id
            depth = (parent_row["depth"] or 0) + 1

        cursor.execute(
            """
            INSERT INTO snippets (
                id, code, parent_id, root_id, depth, language, message,
                author_token, user_id, is_public, allow_fork, status, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                snippet_id,
                code,
                parent_id,
                root_id,
                depth,
                normalized_language,
                message,
                author_token,
                user_id,
                1,
                allow_fork,
                1,
                created_at,
                created_at if user_id else None,
            ),
        )

        conn.commit()
        return {
            "id": snippet_id,
            "code": code,
            "parent_id": parent_id,
            "root_id": root_id,
            "depth": depth,
            "language": normalized_language,
            "message": message,
            "author_token": author_token,
            "parent_code": parent_code,
            "created_at": created_at,
            "children_count": 0,
        }


def get_snippet_detail(
    snippet_id: str,
    *,
    user_id: Optional[int] = None,
    author_token: Optional[str] = None,
) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        row = _get_accessible_snippet_row(cursor, snippet_id, user_id, author_token)

        cursor.execute(
            """
            SELECT COUNT(*) AS cnt
            FROM snippets
            WHERE parent_id = ? AND is_public = 1 AND status = 1
            """,
            (snippet_id,),
        )
        children_count = cursor.fetchone()["cnt"]

        parent_code = None
        if row["parent_id"]:
            cursor.execute(
                """
                SELECT code
                FROM snippets
                WHERE id = ? AND (is_public = 1 OR user_id = ? OR author_token = ?) AND status = 1
                """,
                (row["parent_id"], user_id, author_token),
            )
            parent_row = cursor.fetchone()
            if parent_row:
                parent_code = parent_row["code"]

        return _snippet_payload(row, parent_code=parent_code, children_count=children_count)


def list_snippet_children(
    snippet_id: str,
    *,
    user_id: Optional[int] = None,
    author_token: Optional[str] = None,
) -> list[dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        snippet_row = _get_accessible_snippet_row(cursor, snippet_id, user_id, author_token)
        root_id = snippet_row["root_id"] or snippet_id
        root_row = _get_root_row(cursor, root_id)

        is_root_owner = is_user_owner(root_row, user_id) or is_author_owner(root_row, author_token)
        if not is_root_owner:
            raise HTTPException(status_code=403, detail="仅原始作者可查看版本回复列表")

        cursor.execute(
            """
            SELECT id, parent_id, depth, language, message, created_at,
                   SUBSTR(code, 1, 100) AS code_preview
            FROM snippets
            WHERE parent_id = ? AND status >= 0
            ORDER BY created_at DESC
            """,
            (snippet_id,),
        )
        return [_snippet_list_item_payload(row) for row in cursor.fetchall()]


def list_snippet_descendants(
    snippet_id: str,
    *,
    user_id: Optional[int] = None,
    author_token: Optional[str] = None,
) -> list[dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        snippet_row = _get_accessible_snippet_row(cursor, snippet_id, user_id, author_token)
        root_id = snippet_row["root_id"] or snippet_id
        root_row = _get_root_row(cursor, root_id)

        is_root_owner = is_user_owner(root_row, user_id) or is_author_owner(root_row, author_token)
        if not is_root_owner:
            raise HTTPException(status_code=403, detail="仅原始作者可查看版本回复列表")

        cursor.execute(
            """
            SELECT id, parent_id, depth, language, message, created_at,
                   SUBSTR(code, 1, 100) AS code_preview
            FROM snippets
            WHERE root_id = ? AND id != ? AND status >= 0
            ORDER BY depth ASC, created_at DESC
            """,
            (root_id, root_id),
        )
        return [_snippet_list_item_payload(row) for row in cursor.fetchall()]


def get_version_tree(
    snippet_id: str,
    *,
    user_id: Optional[int] = None,
    author_token: Optional[str] = None,
) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        current_row = _get_accessible_snippet_row(cursor, snippet_id, user_id, author_token)
        root_id = current_row["root_id"] or snippet_id
        root_row = _get_root_row(cursor, root_id)
        ensure_snippet_access(root_row, user_id=user_id, author_token=author_token)

        cursor.execute(
            "SELECT COUNT(*) AS cnt FROM snippets WHERE parent_id = ? AND status >= 0",
            (root_id,),
        )
        root_children_count = cursor.fetchone()["cnt"]
        is_owner = is_user_owner(root_row, user_id) or is_author_owner(root_row, author_token)

        descendants: list[dict[str, Any]] = []
        if is_owner:
            cursor.execute(
                """
                SELECT id, parent_id, depth, language, message, created_at,
                       SUBSTR(code, 1, 100) AS code_preview
                FROM snippets
                WHERE root_id = ? AND id != ? AND status >= 0
                ORDER BY depth ASC, created_at DESC
                """,
                (root_id, root_id),
            )
            descendants = [_snippet_list_item_payload(row) for row in cursor.fetchall()]

        return {
            "root": _snippet_payload(
                root_row,
                children_count=root_children_count if is_owner else 0,
            ),
            "descendants": descendants,
            "is_owner": is_owner,
        }


def compare_snippets(base_id: str, compare_id: str, *, user_id: Optional[int] = None) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        base_row = _get_accessible_snippet_row(cursor, base_id, user_id, None)
        compare_row = _get_accessible_snippet_row(cursor, compare_id, user_id, None)

        if base_row["status"] != 1 or compare_row["status"] != 1:
            raise HTTPException(status_code=404, detail="代码片段不存在")

        base_root_id = _root_id(base_row)
        compare_root_id = _root_id(compare_row)
        if base_root_id != compare_root_id:
            raise HTTPException(status_code=400, detail="只能对比同一版本树中的代码片段")

        return {
            "base": _snippet_payload(base_row),
            "compare": _snippet_payload(compare_row),
            "original": base_row["code"],
            "modified": compare_row["code"],
            "is_same_root": True,
        }


def create_private_share(
    snippet_id: str,
    *,
    user_id: int,
    password: Optional[str] = None,
    expires_days: Optional[int] = None,
    max_views: Optional[int] = None,
) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM snippets WHERE id = ? AND user_id = ?", (snippet_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="无权分享此代码")

        share_token = generate_id(16)
        password_hash = hash_share_password(password) if password else None
        expires_at = None
        if expires_days:
            expires_at = (datetime.now(timezone.utc) + timedelta(days=expires_days)).isoformat()

        cursor.execute(
            """
            INSERT INTO snippet_shares (snippet_id, share_token, password_hash, expires_at, max_views, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                snippet_id,
                share_token,
                password_hash,
                expires_at,
                max_views,
                _now_iso(),
            ),
        )
        conn.commit()

        return {
            "share_token": share_token,
            "share_url": f"/s/{share_token}",
            "has_password": password is not None,
            "expires_at": expires_at,
        }


def get_private_share_info(share_token: str) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT share_token, password_hash, expires_at, max_views, current_views
            FROM snippet_shares
            WHERE share_token = ?
            """,
            (share_token,),
        )
        share = cursor.fetchone()
        if not share:
            raise HTTPException(status_code=404, detail="分享链接不存在")

        if share["expires_at"] and datetime.fromisoformat(share["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="分享链接已过期")
        if share["max_views"] and share["current_views"] >= share["max_views"]:
            raise HTTPException(status_code=410, detail="分享链接已达到最大查看次数")

        return {
            "share_token": share["share_token"],
            "has_password": share["password_hash"] is not None,
            "expires_at": share["expires_at"],
            "current_views": share["current_views"],
            "max_views": share["max_views"],
        }


def verify_private_share(share_token: str, password: str) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT ss.password_hash, ss.expires_at, ss.max_views, ss.current_views,
                   s.id, s.code, s.language, s.message, s.created_at
            FROM snippet_shares ss
            JOIN snippets s ON ss.snippet_id = s.id
            WHERE ss.share_token = ?
            """,
            (share_token,),
        )
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="分享链接不存在")

        if result["expires_at"] and datetime.fromisoformat(result["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="分享链接已过期")
        if result["max_views"] and result["current_views"] >= result["max_views"]:
            raise HTTPException(status_code=410, detail="分享链接已达到最大查看次数")
        if result["password_hash"] and not verify_share_password(password, result["password_hash"]):
            raise HTTPException(status_code=401, detail="密码错误")

        cursor.execute(
            "UPDATE snippet_shares SET current_views = current_views + 1 WHERE share_token = ?",
            (share_token,),
        )
        conn.commit()

        return {
            "snippet": {
                "id": result["id"],
                "code": result["code"],
                "parent_id": None,
                "root_id": result["id"],
                "depth": 0,
                "language": result["language"] or "plaintext",
                "message": result["message"],
                "created_at": result["created_at"],
                "children_count": 0,
            }
        }


def list_my_snippets(
    user_id: int,
    *,
    page: int = 1,
    page_size: int = 20,
    status: Optional[int] = None,
) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        conditions = ["user_id = ?", "status >= 0"]
        params: list[Any] = [user_id]

        if status is not None:
            conditions.append("status = ?")
            params.append(status)

        where_clause = " WHERE " + " AND ".join(conditions)
        cursor.execute(f"SELECT COUNT(*) FROM snippets{where_clause}", params)
        total = cursor.fetchone()[0]

        offset = (page - 1) * page_size
        cursor.execute(
            f"""
            SELECT s.id, SUBSTR(s.code, 1, 200) AS code_preview, s.language, s.message,
                   s.is_public, s.allow_fork, s.status, s.created_at, s.updated_at,
                   (SELECT COUNT(*) FROM snippets WHERE parent_id = s.id) AS children_count,
                   (SELECT COUNT(*) FROM snippets WHERE root_id = s.id AND id != s.id) AS descendants_count
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
                "message": row["message"],
                "is_public": bool(row["is_public"]),
                "allow_fork": bool(row["allow_fork"]),
                "status": row["status"],
                "children_count": row["children_count"],
                "descendants_count": row["descendants_count"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
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


def update_my_snippet(
    snippet_id: str,
    *,
    user_id: int,
    is_public: Optional[bool] = None,
    allow_fork: Optional[bool] = None,
    status: Optional[int] = None,
) -> None:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM snippets WHERE id = ? AND user_id = ?", (snippet_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="无权操作此代码")

        updates = []
        params: list[Any] = []
        if is_public is not None:
            updates.append("is_public = ?")
            params.append(1 if is_public else 0)
        if allow_fork is not None:
            updates.append("allow_fork = ?")
            params.append(1 if allow_fork else 0)
        if status is not None:
            updates.append("status = ?")
            params.append(status)
        if not updates:
            raise HTTPException(status_code=400, detail="没有要更新的字段")

        updates.append("updated_at = ?")
        params.append(_now_iso())
        params.append(snippet_id)

        cursor.execute(f"UPDATE snippets SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()


def delete_my_snippet(snippet_id: str, *, user_id: int) -> None:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM snippets WHERE id = ? AND user_id = ?", (snippet_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="无权操作此代码")

        cursor.execute(
            "UPDATE snippets SET status = -1, updated_at = ? WHERE id = ?",
            (_now_iso(), snippet_id),
        )
        conn.commit()
