import os
from pathlib import Path
from typing import Optional, Union


ROOT_DIR = Path(__file__).resolve().parent
ENV_FILE = ROOT_DIR / ".env"

_env_loaded = False


def load_env_file() -> None:
    global _env_loaded
    if _env_loaded:
        return

    _env_loaded = True
    if not ENV_FILE.exists():
        return

    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        if line.startswith("export "):
            line = line[7:].strip()

        key, separator, value = line.partition("=")
        if not separator:
            continue

        key = key.strip()
        value = value.strip()
        if not key:
            continue

        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]

        os.environ.setdefault(key, value)


def get_env_str(name: str, default: str = "") -> str:
    load_env_file()
    return os.environ.get(name, default)


def get_env_int(name: str, default: int) -> int:
    load_env_file()
    raw_value = os.environ.get(name)
    if raw_value is None or raw_value.strip() == "":
        return default

    try:
        return int(raw_value)
    except ValueError:
        return default


def get_env_bool(name: str, default: bool = False) -> bool:
    load_env_file()
    raw_value = os.environ.get(name)
    if raw_value is None or raw_value.strip() == "":
        return default

    normalized = raw_value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


def get_env_path(
    name: str,
    default: Union[str, Path],
    *,
    base_dir: Optional[Path] = None,
) -> Path:
    load_env_file()
    raw_value = os.environ.get(name)
    if raw_value is None or raw_value.strip() == "":
        return Path(default).expanduser().resolve()

    candidate = Path(raw_value.strip()).expanduser()
    if candidate.is_absolute():
        return candidate.resolve()

    resolved_base_dir = (base_dir or ROOT_DIR).resolve()
    return (resolved_base_dir / candidate).resolve()
