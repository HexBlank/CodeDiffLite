from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.config import APP_NAME, APP_VERSION, STATIC_REACT_DIR
from app.db import get_db_connection


router = APIRouter(tags=["pages"])


def get_spa_index_file() -> Optional[Path]:
    react_index = STATIC_REACT_DIR / "index.html"
    if react_index.exists():
        return react_index

    return None


def is_spa_internal_path(path: str) -> bool:
    if not path:
        return False

    if path in {"openapi.json", "docs", "redoc"}:
        return True

    return path.startswith(("api", "assets", "healthz"))


def serve_spa_or_fallback(payload: dict):
    index_file = get_spa_index_file()
    if index_file:
        return FileResponse(str(index_file))
    return payload


@router.get("/healthz")
async def healthz():
    conn = get_db_connection()
    try:
        conn.execute("SELECT 1")
    finally:
        conn.close()

    return {
        "status": "ok",
        "app": APP_NAME,
        "version": APP_VERSION,
        "database": "ok",
    }


@router.get("/")
async def index():
    return serve_spa_or_fallback(
        {"message": f"{APP_NAME} API v{APP_VERSION}", "endpoints": ["/api/share", "/api/snippet/{id}"]}
    )


@router.get("/s/{share_token}")
async def get_share_page(share_token: str):
    return serve_spa_or_fallback({"message": f"{APP_NAME} API v{APP_VERSION}", "share_token": share_token})


@router.get("/{snippet_id}")
async def get_snippet_page(snippet_id: str):
    if is_spa_internal_path(snippet_id) or "." in snippet_id:
        raise HTTPException(status_code=404, detail="Not found")
    return serve_spa_or_fallback({"message": f"{APP_NAME} API v{APP_VERSION}", "id": snippet_id})


@router.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    if not full_path or is_spa_internal_path(full_path) or "." in Path(full_path).name:
        raise HTTPException(status_code=404, detail="Not found")
    return serve_spa_or_fallback({"message": f"{APP_NAME} API v{APP_VERSION}", "path": full_path})
