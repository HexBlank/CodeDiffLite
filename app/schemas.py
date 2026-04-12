"""Pydantic request/response schemas for all API endpoints."""

from typing import List, Optional

from pydantic import BaseModel, EmailStr


# ============== Snippet ==============

class ShareRequest(BaseModel):
    code: str
    parent_id: Optional[str] = None
    language: str = "plaintext"
    message: Optional[str] = None

class SnippetResponse(BaseModel):
    id: str
    code: str
    parent_id: Optional[str]
    root_id: Optional[str]
    depth: int
    language: str
    message: Optional[str] = None
    author_token: Optional[str] = None
    parent_code: Optional[str] = None
    created_at: str
    children_count: int = 0

class SnippetListItem(BaseModel):
    id: str
    parent_id: Optional[str]
    depth: int
    language: str
    message: Optional[str] = None
    created_at: str
    code_preview: str

class VersionTreeResponse(BaseModel):
    root: SnippetResponse
    descendants: List[SnippetListItem]
    is_owner: bool = False


# ============== Compare ==============

class CompareRequest(BaseModel):
    base_id: str
    compare_id: str

class CompareResponse(BaseModel):
    base: SnippetResponse
    compare: SnippetResponse
    original: str
    modified: str
    is_same_root: bool


# ============== Auth ==============

class RegisterRequest(BaseModel):
    email: EmailStr
    code: Optional[str] = None
    password: str
    nickname: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginWithCodeRequest(BaseModel):
    email: EmailStr
    code: str

class SendCodeRequest(BaseModel):
    email: EmailStr
    purpose: str = "register"

class UserResponse(BaseModel):
    id: int
    email: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: int
    email: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: str
    snippet_count: int = 0

class UpdateProfileRequest(BaseModel):
    nickname: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ChangePasswordByCodeRequest(BaseModel):
    code: str
    new_password: str

class ChangeEmailRequest(BaseModel):
    new_email: str
    code: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str


# ============== Private Share ==============

class CreateShareRequest(BaseModel):
    snippet_id: str
    password: Optional[str] = None
    expires_days: Optional[int] = None
    max_views: Optional[int] = None

class ShareVerifyRequest(BaseModel):
    password: str

class ShareInfoResponse(BaseModel):
    share_token: str
    has_password: bool
    expires_at: Optional[str] = None
    current_views: int
    max_views: Optional[int] = None


# ============== My Snippets ==============

class MySnippetItem(BaseModel):
    id: str
    code_preview: str
    language: str
    message: Optional[str] = None
    is_public: bool = True
    allow_fork: bool = True
    status: int = 1
    children_count: int = 0
    descendants_count: int = 0
    created_at: str
    updated_at: Optional[str] = None

class MySnippetsResponse(BaseModel):
    items: List[MySnippetItem]
    total: int
    page: int
    page_size: int
    total_pages: int

class UpdateSnippetRequest(BaseModel):
    is_public: Optional[bool] = None
    allow_fork: Optional[bool] = None
    status: Optional[int] = None


# ============== Admin ==============

class AdminInitRequest(BaseModel):
    username: str
    password: str

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class AdminStatusResponse(BaseModel):
    initialized: bool

class AdminStatsResponse(BaseModel):
    total_snippets: int
    original_snippets: int
    reply_snippets: int
    today_snippets: int
    week_snippets: int
    month_snippets: int
    language_stats: dict

class SnippetAdminItem(BaseModel):
    id: str
    code_preview: str
    language: str
    parent_id: Optional[str]
    root_id: Optional[str]
    depth: int
    message: Optional[str]
    children_count: int
    created_at: str

class SnippetListResponse(BaseModel):
    items: List[SnippetAdminItem]
    total: int
    page: int
    page_size: int
    total_pages: int

class SnippetDetailResponse(BaseModel):
    id: str
    code: str
    language: str
    parent_id: Optional[str]
    root_id: Optional[str]
    depth: int
    message: Optional[str]
    author_token: Optional[str]
    created_at: str
    parent_code: Optional[str] = None
    parent_message: Optional[str] = None
    children_count: int
    descendants_count: int

class UserListItem(BaseModel):
    id: int
    email: str
    nickname: Optional[str]
    created_at: str
    last_login_at: Optional[str]
    snippet_count: int

class UserListResponse(BaseModel):
    items: List[UserListItem]
    total: int
    page: int
    page_size: int
    total_pages: int

class UserDetailResponse(BaseModel):
    id: int
    email: str
    nickname: Optional[str]
    avatar_url: Optional[str]
    email_verified: bool
    created_at: str
    last_login_at: Optional[str]
    snippet_count: int
    public_snippets: int
    private_snippets: int

class ShareListItem(BaseModel):
    id: int
    snippet_id: str
    share_token: str
    has_password: bool
    expires_at: Optional[str]
    max_views: Optional[int]
    current_views: int
    created_at: str
    snippet_preview: str
    snippet_language: str

class ShareListResponse(BaseModel):
    items: List[ShareListItem]
    total: int
    page: int
    page_size: int
    total_pages: int

class ExtendedStatsResponse(BaseModel):
    total_users: int
    today_users: int
    week_users: int
    total_shares: int
    active_shares: int
    expired_shares: int
    private_snippets: int
    public_snippets: int

class EmailConfigResponse(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password_set: bool
    smtp_from: str

class EmailConfigRequest(BaseModel):
    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_password: Optional[str] = None
    smtp_from: str

class TestEmailRequest(BaseModel):
    email: str

class UpdateUsernameRequest(BaseModel):
    new_username: str

class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class TempAdminCredentialResetRequest(BaseModel):
    username: str
    password: str

class CreateUserRequest(BaseModel):
    email: str
    password: str
    nickname: str = ""


# ============== Auth Settings ==============

class AuthSettingsResponse(BaseModel):
    login_enabled: bool
    login_with_code_enabled: bool
    register_enabled: bool
    register_email_verify: bool
    smtp_configured: bool

class AuthSettingsUpdateRequest(BaseModel):
    login_enabled: Optional[bool] = None
    login_with_code_enabled: Optional[bool] = None
    register_enabled: Optional[bool] = None
    register_email_verify: Optional[bool] = None
