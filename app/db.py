import sqlite3
from contextlib import contextmanager
from typing import Generator

from .config import DB_BUSY_TIMEOUT_MS, DB_PATH


def configure_db_connection(conn: sqlite3.Connection) -> sqlite3.Connection:
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute(f"PRAGMA busy_timeout = {DB_BUSY_TIMEOUT_MS}")
    return conn


def get_db_connection() -> sqlite3.Connection:
    return configure_db_connection(
        sqlite3.connect(str(DB_PATH), timeout=DB_BUSY_TIMEOUT_MS / 1000)
    )


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Database connection context manager.

    Usage::

        with get_db() as conn:
            cursor = conn.cursor()
            ...
    """
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


def init_admin_table() -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def init_db() -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS snippets (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            parent_id TEXT,
            root_id TEXT,
            depth INTEGER DEFAULT 0,
            language TEXT DEFAULT "plaintext",
            message TEXT,
            author_token TEXT,
            user_id INTEGER,
            is_public INTEGER DEFAULT 1,
            allow_fork INTEGER DEFAULT 1,
            status INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            nickname TEXT,
            avatar_url TEXT,
            email_verified INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            last_login_at TEXT
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS email_verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            purpose TEXT DEFAULT 'register',
            expires_at TEXT NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS snippet_shares (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            snippet_id TEXT NOT NULL,
            share_token TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            expires_at TEXT,
            max_views INTEGER,
            current_views INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS snippet_stars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            snippet_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(user_id, snippet_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS snippet_collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS snippet_collection_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            collection_id INTEGER NOT NULL,
            snippet_id TEXT NOT NULL,
            added_at TEXT NOT NULL,
            UNIQUE(collection_id, snippet_id),
            FOREIGN KEY (collection_id) REFERENCES snippet_collections(id) ON DELETE CASCADE,
            FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS system_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )

    init_admin_table()

    cursor.execute("PRAGMA table_info(snippets)")
    columns = [col[1] for col in cursor.fetchall()]

    if "language" not in columns:
        cursor.execute('ALTER TABLE snippets ADD COLUMN language TEXT DEFAULT "plaintext"')

    if "root_id" not in columns:
        cursor.execute("ALTER TABLE snippets ADD COLUMN root_id TEXT")

    if "depth" not in columns:
        cursor.execute("ALTER TABLE snippets ADD COLUMN depth INTEGER DEFAULT 0")

    if "message" not in columns:
        cursor.execute("ALTER TABLE snippets ADD COLUMN message TEXT")

    if "author_token" not in columns:
        cursor.execute("ALTER TABLE snippets ADD COLUMN author_token TEXT")

    if "user_id" not in columns:
        cursor.execute("ALTER TABLE snippets ADD COLUMN user_id INTEGER")

    if "is_public" not in columns:
        cursor.execute("ALTER TABLE snippets ADD COLUMN is_public INTEGER DEFAULT 1")

    if "allow_fork" not in columns:
        cursor.execute("ALTER TABLE snippets ADD COLUMN allow_fork INTEGER DEFAULT 1")

    if "status" not in columns:
        cursor.execute("ALTER TABLE snippets ADD COLUMN status INTEGER DEFAULT 1")

    if "updated_at" not in columns:
        cursor.execute("ALTER TABLE snippets ADD COLUMN updated_at TEXT")

    cursor.execute("UPDATE snippets SET root_id = id WHERE root_id IS NULL AND parent_id IS NULL")
    cursor.execute(
        """
        UPDATE snippets
        SET root_id = (
            WITH RECURSIVE chain(id, parent_id, root) AS (
                SELECT id, parent_id, id FROM snippets WHERE parent_id IS NULL
                UNION ALL
                SELECT s.id, s.parent_id, c.root
                FROM snippets s
                JOIN chain c ON s.parent_id = c.id
            )
            SELECT root FROM chain WHERE chain.id = snippets.id
        )
        WHERE root_id IS NULL
        """
    )

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_snippets_parent_id ON snippets(parent_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_snippets_root_id ON snippets(root_id)")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_snippets_user_status_created_at ON snippets(user_id, status, created_at DESC)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_snippets_visibility_created_at ON snippets(is_public, status, created_at DESC)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_snippets_status_created_at ON snippets(status, created_at DESC)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_email_verifications_lookup ON email_verifications(email, purpose, used, expires_at)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_snippet_shares_snippet_created_at ON snippet_shares(snippet_id, created_at DESC)"
    )
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_snippet_shares_expiry ON snippet_shares(expires_at)")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_snippet_collection_items_collection_id ON snippet_collection_items(collection_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_snippet_collection_items_snippet_id ON snippet_collection_items(snippet_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_snippet_collections_user_id ON snippet_collections(user_id)"
    )

    conn.commit()
    conn.close()
