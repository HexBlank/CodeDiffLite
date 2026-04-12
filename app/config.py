from pathlib import Path

from env_config import get_env_int, get_env_path, get_env_str


ROOT_DIR = Path(__file__).resolve().parent.parent

APP_NAME = get_env_str("CODEDIFF_APP_NAME", "CodeDiff Lite")
APP_VERSION = "2.0.0"
HOST = get_env_str("CODEDIFF_HOST", "0.0.0.0")
PORT = get_env_int("CODEDIFF_PORT", 8088)

DB_PATH = get_env_path("CODEDIFF_DB_PATH", ROOT_DIR / "snippets.db", base_dir=ROOT_DIR)
DB_BUSY_TIMEOUT_MS = 5000

DEFAULT_SECRET_KEY = "codediff-secret-key-change-in-production"
SECRET_KEY = get_env_str("CODEDIFF_SECRET_KEY", DEFAULT_SECRET_KEY)
ALGORITHM = "HS256"
USER_TOKEN_EXPIRE_DAYS = 7
ADMIN_TOKEN_EXPIRE_HOURS = 24
SHARE_PASSWORD_ITERATIONS = 260000

STATIC_REACT_DIR = ROOT_DIR / "static-react"
