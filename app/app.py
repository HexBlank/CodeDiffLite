from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import APP_NAME, APP_VERSION, DEFAULT_SECRET_KEY, SECRET_KEY, STATIC_REACT_DIR
from app.db import init_db
from app.routers.admin import router as admin_router
from app.routers.pages import router as pages_router
from app.routers.public import router as public_router


def create_app() -> FastAPI:
    app = FastAPI(
        title=APP_NAME,
        description="Collaborative code sharing and version diff platform",
        version=APP_VERSION,
    )
    app.add_middleware(GZipMiddleware, minimum_size=1024)

    @app.on_event("startup")
    async def startup_event():
        init_db()
        if SECRET_KEY == DEFAULT_SECRET_KEY:
            print(
                "[CodeDiff Warning] CODEDIFF_SECRET_KEY is using the default value. "
                "Set a unique secret before public deployment."
            )

    assets_dir = STATIC_REACT_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    app.include_router(admin_router)
    app.include_router(public_router)
    app.include_router(pages_router)
    return app


app = create_app()
