import secrets
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from env_config import get_env_str

from app.schemas import (
    AdminInitRequest,
    AdminLoginRequest,
    AdminLoginResponse,
    AdminStatsResponse,
    AdminStatusResponse,
    AuthSettingsResponse,
    AuthSettingsUpdateRequest,
    CreateUserRequest,
    EmailConfigRequest,
    EmailConfigResponse,
    ExtendedStatsResponse,
    ShareListItem,
    ShareListResponse,
    SnippetAdminItem,
    SnippetDetailResponse,
    SnippetListResponse,
    TempAdminCredentialResetRequest,
    TestEmailRequest,
    UpdatePasswordRequest,
    UpdateUsernameRequest,
    UserDetailResponse,
    UserListItem,
    UserListResponse,
)
from app.security import (
    create_admin_access_token as create_access_token,
    get_current_admin,
    verify_password,
)
from app.services.admin_service import (
    create_admin,
    create_user,
    delete_admin_snippet,
    delete_admin_snippet_tree,
    delete_share as delete_share_service,
    delete_user as delete_user_service,
    get_admin_snippet_detail,
    get_admin_snippet_stats,
    get_extended_stats as get_extended_stats_service,
    get_user_detail as get_user_detail_service,
    is_admin_initialized,
    list_admin_snippet_children,
    list_admin_snippets,
    list_shares as list_shares_service,
    list_users as list_users_service,
    reset_admin_credentials,
    update_admin_password as update_admin_password_service,
    update_admin_username as update_admin_username_service,
    verify_admin,
)
from app.services.email_service import send_test_email
from app.services.system_config import get_auth_settings, get_config, is_email_configured, set_config

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ============== Auth ==============

@router.get("/status", response_model=AdminStatusResponse)
async def get_admin_status():
    """检查系统是否已初始化"""
    return AdminStatusResponse(initialized=is_admin_initialized())


@router.post("/init")
async def init_admin(request: AdminInitRequest):
    """初始化管理员账户（仅首次可用）"""
    if is_admin_initialized():
        raise HTTPException(status_code=400, detail="系统已初始化")

    if len(request.username) < 3:
        raise HTTPException(status_code=400, detail="用户名至少3个字符")

    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="密码至少6个字符")

    create_admin(request.username, request.password)
    return {"message": "管理员账户创建成功"}


@router.post("/login", response_model=AdminLoginResponse)
async def login_admin(request: AdminLoginRequest):
    """管理员登录"""
    if not is_admin_initialized():
        raise HTTPException(status_code=400, detail="系统未初始化")

    if not verify_admin(request.username, request.password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    access_token = create_access_token(data={"sub": request.username})
    return AdminLoginResponse(access_token=access_token)


# ============== Stats ==============

@router.get("/stats", response_model=AdminStatsResponse)
async def get_stats(admin: str = Depends(get_current_admin)):
    """获取系统统计数据"""
    return AdminStatsResponse(**get_admin_snippet_stats())


@router.get("/stats/extended", response_model=ExtendedStatsResponse)
async def get_extended_stats(admin: str = Depends(get_current_admin)):
    """获取扩展统计数据"""
    return ExtendedStatsResponse(**get_extended_stats_service())


# ============== Snippets ==============

@router.get("/snippets", response_model=SnippetListResponse)
async def list_snippets(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    language: Optional[str] = None,
    only_original: bool = False,
    admin: str = Depends(get_current_admin),
):
    """获取代码片段列表"""
    result = list_admin_snippets(
        page=page,
        page_size=page_size,
        search=search,
        language=language,
        only_original=only_original,
    )
    return SnippetListResponse(
        items=[SnippetAdminItem(**row) for row in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"],
    )


@router.get("/snippets/{snippet_id}", response_model=SnippetDetailResponse)
async def get_snippet_detail(snippet_id: str, admin: str = Depends(get_current_admin)):
    """获取代码片段详情"""
    return SnippetDetailResponse(**get_admin_snippet_detail(snippet_id))


@router.delete("/snippets/{snippet_id}")
async def delete_snippet(snippet_id: str, admin: str = Depends(get_current_admin)):
    """删除单个代码片段"""
    delete_admin_snippet(snippet_id)
    return {"message": "删除成功"}


@router.delete("/snippets/{snippet_id}/tree")
async def delete_snippet_tree(snippet_id: str, admin: str = Depends(get_current_admin)):
    """删除代码片段及其所有衍生版本"""
    deleted_count = delete_admin_snippet_tree(snippet_id)
    return {"message": f"已删除 {deleted_count} 个代码片段"}


@router.get("/snippets/{snippet_id}/children")
async def get_snippet_children(snippet_id: str, admin: str = Depends(get_current_admin)):
    """获取代码片段的直接回复列表"""
    return list_admin_snippet_children(snippet_id)


# ============== Users ==============

@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    admin: str = Depends(get_current_admin),
):
    """获取用户列表"""
    result = list_users_service(page=page, page_size=page_size, search=search)
    return UserListResponse(
        items=[UserListItem(**row) for row in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"],
    )


@router.get("/users/{user_id}", response_model=UserDetailResponse)
async def get_user_detail(user_id: int, admin: str = Depends(get_current_admin)):
    """获取用户详情"""
    return UserDetailResponse(**get_user_detail_service(user_id))


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, admin: str = Depends(get_current_admin)):
    """删除用户（软删除：将用户代码转为匿名）"""
    delete_user_service(user_id)
    return {"message": "用户已删除，其代码已转为匿名"}


@router.post("/users")
async def admin_create_user(
    request: CreateUserRequest,
    admin: str = Depends(get_current_admin),
):
    """管理员创建新用户"""
    from email_validator import EmailNotValidError, validate_email

    try:
        validate_email(request.email)
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="邮箱格式不正确")

    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="密码至少6个字符")

    user_id = create_user(request.email, request.password, request.nickname)
    return {"message": "用户创建成功", "user_id": user_id}


# ============== Shares ==============

@router.get("/shares", response_model=ShareListResponse)
async def list_shares(
    page: int = 1,
    page_size: int = 20,
    snippet_id: Optional[str] = None,
    admin: str = Depends(get_current_admin),
):
    """获取私密分享列表"""
    result = list_shares_service(page=page, page_size=page_size, snippet_id=snippet_id)
    return ShareListResponse(
        items=[ShareListItem(**row) for row in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"],
    )


@router.delete("/shares/{share_id}")
async def delete_share(share_id: int, admin: str = Depends(get_current_admin)):
    """删除私密分享链接"""
    delete_share_service(share_id)
    return {"message": "分享链接已删除"}


# ============== Email Config ==============

@router.get("/config/email", response_model=EmailConfigResponse)
async def get_email_config_api(admin: str = Depends(get_current_admin)):
    """获取邮件配置（仅从数据库读取）"""
    try:
        host = get_config('smtp_host', '')
        port = int(get_config('smtp_port', '587') or '587')
        user = get_config('smtp_user', '')
        password = get_config('smtp_password', '')
        from_addr = get_config('smtp_from', '')

        return EmailConfigResponse(
            smtp_host=host,
            smtp_port=port,
            smtp_user=user,
            smtp_password_set=bool(password),
            smtp_from=from_addr,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取配置失败: {str(e)}")


@router.post("/config/email")
async def update_email_config(request: EmailConfigRequest, admin: str = Depends(get_current_admin)):
    """更新邮件配置"""
    try:
        set_config('smtp_host', request.smtp_host)
        set_config('smtp_port', str(request.smtp_port))
        set_config('smtp_user', request.smtp_user)
        if request.smtp_password:
            set_config('smtp_password', request.smtp_password)
        set_config('smtp_from', request.smtp_from)

        return {"message": "邮件配置已更新"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存配置失败: {str(e)}")


@router.post("/config/email/test")
async def test_email_config(request: TestEmailRequest, admin: str = Depends(get_current_admin)):
    """测试邮件配置（发送连通性测试邮件，不含验证码）"""
    try:
        success = send_test_email(request.email)
        if success:
            return {"message": f"测试邮件已发送到 {request.email}"}
        else:
            raise HTTPException(status_code=500, detail="邮件发送失败，请检查配置")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"测试失败: {str(e)}")


# ============== Auth Config ==============

@router.get("/config/auth", response_model=AuthSettingsResponse)
async def get_auth_config_api(admin: str = Depends(get_current_admin)):
    """获取认证开关配置"""
    settings = get_auth_settings()
    return AuthSettingsResponse(**settings)


@router.post("/config/auth")
async def update_auth_config(
    request: AuthSettingsUpdateRequest,
    admin: str = Depends(get_current_admin),
):
    """更新认证开关配置。开启注册邮箱验证码或验证码登录时会校验 SMTP 配置。"""
    # 开启注册邮箱验证码，或验证码登录时，必须检查 SMTP 配置
    if request.register_email_verify is True or request.login_with_code_enabled is True:
        if not is_email_configured():
            raise HTTPException(
                status_code=400,
                detail="无法开启邮箱验证功能：请先配置 SMTP 邮件服务器",
            )

    if request.login_enabled is not None:
        set_config("auth_login_enabled", "true" if request.login_enabled else "false")
    if request.login_with_code_enabled is not None:
        set_config("auth_login_with_code_enabled", "true" if request.login_with_code_enabled else "false")
    if request.register_enabled is not None:
        set_config("auth_register_enabled", "true" if request.register_enabled else "false")
    if request.register_email_verify is not None:
        set_config("auth_register_email_verify", "true" if request.register_email_verify else "false")

    return {"message": "认证配置已更新"}


# ============== Admin Settings ==============

@router.post("/settings/username")
async def update_admin_username(
    request: UpdateUsernameRequest,
    admin: str = Depends(get_current_admin),
):
    """修改管理员用户名"""
    if len(request.new_username) < 3:
        raise HTTPException(status_code=400, detail="用户名至少3个字符")

    update_admin_username_service(admin, request.new_username)
    return {"message": "用户名修改成功，请使用新用户名重新登录"}


@router.post("/settings/password")
async def update_admin_password(
    request: UpdatePasswordRequest,
    admin: str = Depends(get_current_admin),
):
    """修改管理员密码（需验证当前密码）"""
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码至少6个字符")

    if not verify_admin(admin, request.current_password):
        raise HTTPException(status_code=400, detail="当前密码错误")

    update_admin_password_service(admin, request.new_password)
    return {"message": "密码修改成功，请使用新密码重新登录"}


# ============== Emergency Reset ==============

@router.post("/temp/reset-credentials")
async def temp_reset_admin_credentials(
    request: TempAdminCredentialResetRequest,
    temp_token: Optional[str] = Header(None, alias="X-Temp-Admin-Token"),
):
    """Emergency-only admin credential reset endpoint gated by env token."""
    expected_token = get_env_str("CODEDIFF_TEMP_ADMIN_RESET_TOKEN", "").strip()
    if not expected_token:
        raise HTTPException(status_code=404, detail="临时接口未启用")

    if not temp_token or not secrets.compare_digest(temp_token, expected_token):
        raise HTTPException(status_code=401, detail="临时重置令牌无效")

    if len(request.username) < 3:
        raise HTTPException(status_code=400, detail="用户名至少 3 个字符")

    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="密码至少 6 个字符")

    reset_admin_credentials(request.username, request.password)

    return {
        "message": "管理员账号密码已临时重置，请尽快移除环境变量 CODEDIFF_TEMP_ADMIN_RESET_TOKEN"
    }
