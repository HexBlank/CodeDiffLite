from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response

from app.schemas import (
    AuthSettingsResponse,
    ChangeEmailRequest,
    ChangePasswordByCodeRequest,
    ChangePasswordRequest,
    CompareRequest,
    CompareResponse,
    CreateShareRequest,
    LoginRequest,
    LoginWithCodeRequest,
    MySnippetItem,
    MySnippetsResponse,
    RegisterRequest,
    ResetPasswordRequest,
    SendCodeRequest,
    ShareInfoResponse,
    ShareRequest,
    ShareVerifyRequest,
    SnippetListItem,
    SnippetResponse,
    UpdateProfileRequest,
    UpdateSnippetRequest,
    UserResponse,
    VersionTreeResponse,
)
from app.security import get_current_user
from app.services.system_config import get_auth_settings, is_email_configured
from app.services.snippet_service import (
    compare_snippets,
    create_private_share,
    create_snippet,
    delete_my_snippet,
    get_or_create_author_token,
    get_private_share_info,
    get_snippet_detail,
    get_version_tree,
    list_my_snippets,
    list_snippet_children,
    list_snippet_descendants,
    update_my_snippet,
    verify_private_share,
)
from app.services.user_service import (
    change_email,
    change_password,
    change_password_by_code,
    get_user_profile,
    login_user,
    login_with_code,
    register_user,
    reset_password,
    send_code,
    update_user_profile,
)

router = APIRouter(tags=["public"])


# ============== Snippet API ==============

@router.post("/api/share", response_model=SnippetResponse)
async def share_snippet(
    request: ShareRequest,
    response: Response,
    author_token: Optional[str] = Cookie(None),
    user_id: Optional[int] = Depends(get_current_user),
):
    """创建新的代码片段"""
    token = get_or_create_author_token(response, author_token)
    result = create_snippet(
        code=request.code,
        parent_id=request.parent_id,
        language=request.language,
        message=request.message,
        author_token=token,
        user_id=user_id,
    )
    return SnippetResponse(**result)


@router.get("/api/snippet/{snippet_id}", response_model=SnippetResponse)
async def get_snippet(
    snippet_id: str,
    user_id: Optional[int] = Depends(get_current_user),
    author_token: Optional[str] = Cookie(None),
):
    """获取代码片段（如果存在父节点则返回父节点代码）"""
    result = get_snippet_detail(snippet_id, user_id=user_id, author_token=author_token)
    return SnippetResponse(**result)


@router.get("/api/snippet/{snippet_id}/children", response_model=List[SnippetListItem])
async def get_snippet_children_api(
    snippet_id: str,
    user_id: Optional[int] = Depends(get_current_user),
    author_token: Optional[str] = Cookie(None),
):
    """获取该版本的所有直接子版本（仅原始作者可见）。"""
    rows = list_snippet_children(snippet_id, user_id=user_id, author_token=author_token)
    return [SnippetListItem(**row) for row in rows]


@router.get("/api/snippet/{snippet_id}/descendants", response_model=List[SnippetListItem])
async def get_snippet_descendants_api(
    snippet_id: str,
    user_id: Optional[int] = Depends(get_current_user),
    author_token: Optional[str] = Cookie(None),
):
    """获取该版本的所有衍生版本（仅原始作者可见）。"""
    rows = list_snippet_descendants(snippet_id, user_id=user_id, author_token=author_token)
    return [SnippetListItem(**row) for row in rows]


@router.get("/api/snippet/{snippet_id}/tree", response_model=VersionTreeResponse)
async def get_snippet_tree(
    snippet_id: str,
    author_token: Optional[str] = Cookie(None),
    user_id: Optional[int] = Depends(get_current_user),
):
    """获取完整版本树（根节点 + 所有衍生版本）

    只有原始作者（通过 author_token cookie 验证）才能看到回复列表
    """
    result = get_version_tree(snippet_id, user_id=user_id, author_token=author_token)
    return VersionTreeResponse(
        root=SnippetResponse(**result["root"]),
        descendants=[SnippetListItem(**row) for row in result["descendants"]],
        is_owner=result["is_owner"],
    )


# ============== Compare API ==============

@router.post("/api/compare", response_model=CompareResponse)
async def compare_snippets_api(
    request: CompareRequest,
    user_id: Optional[int] = Depends(get_current_user),
):
    """对比任意两个代码片段

    要求两个片段必须来自同一版本树（有共同的 root）
    """
    result = compare_snippets(request.base_id, request.compare_id, user_id=user_id)
    return CompareResponse(
        base=SnippetResponse(**result["base"]),
        compare=SnippetResponse(**result["compare"]),
        original=result["original"],
        modified=result["modified"],
        is_same_root=result["is_same_root"],
    )


# ============== Auth API ==============

@router.post("/api/auth/send-code")
async def send_verification_code(request: SendCodeRequest):
    """发送邮箱验证码"""
    # 注册用途：检查注册开关
    if request.purpose == "register":
        settings = get_auth_settings()
        if not settings["register_enabled"]:
            raise HTTPException(status_code=403, detail="注册功能已关闭")
    # 登录用途：检查登录开关，以及验证码登录开关
    if request.purpose == "login":
        settings = get_auth_settings()
        if not settings["login_enabled"]:
            raise HTTPException(status_code=403, detail="登录功能已关闭")
        if not settings["login_with_code_enabled"]:
            raise HTTPException(status_code=403, detail="验证码登录功能已关闭")
    return send_code(request.email, request.purpose)

@router.post("/api/auth/register")
async def register(request: RegisterRequest):
    """用户注册"""
    settings = get_auth_settings()
    if not settings["register_enabled"]:
        raise HTTPException(status_code=403, detail="注册功能已关闭")

    result = register_user(request.email, request.code, request.password, request.nickname)
    return {
        "access_token": result["access_token"],
        "token_type": result["token_type"],
        "user": UserResponse(**result["user"]),
    }


@router.post("/api/auth/login")
async def login(request: LoginRequest):
    """密码登录"""
    settings = get_auth_settings()
    if not settings["login_enabled"]:
        raise HTTPException(status_code=403, detail="登录功能已关闭")

    result = login_user(request.email, request.password)
    return {
        "access_token": result["access_token"],
        "token_type": result["token_type"],
        "user": UserResponse(**result["user"]),
    }


@router.post("/api/auth/login-with-code")
async def login_with_code_api(request: LoginWithCodeRequest):
    """验证码登录"""
    settings = get_auth_settings()
    if not settings["login_enabled"]:
        raise HTTPException(status_code=403, detail="登录功能已关闭")
    if not settings["login_with_code_enabled"]:
        raise HTTPException(status_code=403, detail="验证码登录功能已关闭")

    result = login_with_code(request.email, request.code)
    return {
        "access_token": result["access_token"],
        "token_type": result["token_type"],
        "user": UserResponse(**result["user"]),
    }


@router.get("/api/auth/settings", response_model=AuthSettingsResponse)
async def get_auth_settings_api():
    """获取认证开关配置（公开接口，前端用于控制 UI 显示）"""
    settings = get_auth_settings()
    settings["smtp_configured"] = is_email_configured()
    return AuthSettingsResponse(**settings)


@router.get("/api/auth/me", response_model=UserResponse)
async def get_me(user_id: Optional[int] = Depends(get_current_user)):
    """获取当前用户信息"""
    if not user_id:
        raise HTTPException(status_code=401, detail="未登录")
    return UserResponse(**get_user_profile(user_id))


@router.put("/api/auth/profile", response_model=UserResponse)
async def update_profile(
    request: UpdateProfileRequest,
    user_id: Optional[int] = Depends(get_current_user),
):
    """更新当前用户资料"""
    if not user_id:
        raise HTTPException(status_code=401, detail="未登录")
    return UserResponse(**update_user_profile(user_id, request.nickname))


@router.post("/api/auth/change-password")
async def change_password_api(
    request: ChangePasswordRequest,
    user_id: Optional[int] = Depends(get_current_user),
):
    """修改当前用户密码"""
    if not user_id:
        raise HTTPException(status_code=401, detail="未登录")

    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码至少6个字符")

    change_password(user_id, request.current_password, request.new_password)
    return {"message": "密码修改成功"}


@router.post("/api/auth/change-password-by-code")
async def change_password_by_code_api(
    request: ChangePasswordByCodeRequest,
    user_id: Optional[int] = Depends(get_current_user),
):
    """使用验证码修改当前用户密码"""
    if not user_id:
        raise HTTPException(status_code=401, detail="未登录")

    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码至少6个字符")

    change_password_by_code(user_id, request.code, request.new_password)
    return {"message": "密码修改成功"}


@router.post("/api/auth/change-email")
async def change_email_api(
    request: ChangeEmailRequest,
    user_id: Optional[int] = Depends(get_current_user),
):
    """修改当前用户邮箱"""
    if not user_id:
        raise HTTPException(status_code=401, detail="未登录")
    return UserResponse(**change_email(user_id, request.new_email, request.code))


@router.post("/api/auth/reset-password")
async def reset_password_api(request: ResetPasswordRequest):
    """重置密码（忘记密码）"""
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码至少6个字符")

    reset_password(request.email, request.code, request.new_password)
    return {"message": "密码重置成功"}


# ============== Private Share API ==============

@router.post("/api/shares")
async def create_share(
    request: CreateShareRequest,
    user_id: Optional[int] = Depends(get_current_user),
):
    """创建私密分享链接"""
    if not user_id:
        raise HTTPException(status_code=401, detail="请先登录")

    return create_private_share(
        request.snippet_id,
        user_id=user_id,
        password=request.password,
        expires_days=request.expires_days,
        max_views=request.max_views,
    )


@router.get("/api/shares/{share_token}/info")
async def get_share_info(share_token: str):
    """获取分享信息（验证前）"""
    return ShareInfoResponse(**get_private_share_info(share_token))


@router.post("/api/shares/{share_token}/verify")
async def verify_share(share_token: str, request: ShareVerifyRequest):
    """验证分享密码并返回代码"""
    result = verify_private_share(share_token, request.password)
    return {"snippet": SnippetResponse(**result["snippet"])}


# ============== My Snippets API ==============

@router.get("/api/my/snippets", response_model=MySnippetsResponse)
async def get_my_snippets(
    page: int = 1,
    page_size: int = 20,
    status: Optional[int] = None,
    user_id: Optional[int] = Depends(get_current_user),
):
    """获取我的代码列表"""
    if not user_id:
        raise HTTPException(status_code=401, detail="请先登录")

    result = list_my_snippets(user_id, page=page, page_size=page_size, status=status)
    return MySnippetsResponse(
        items=[MySnippetItem(**row) for row in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"],
    )


@router.patch("/api/my/snippets/{snippet_id}")
async def update_my_snippet_api(
    snippet_id: str,
    request: UpdateSnippetRequest,
    user_id: Optional[int] = Depends(get_current_user),
):
    """更新我的代码设置"""
    if not user_id:
        raise HTTPException(status_code=401, detail="请先登录")

    update_my_snippet(
        snippet_id,
        user_id=user_id,
        is_public=request.is_public,
        allow_fork=request.allow_fork,
        status=request.status,
    )
    return {"message": "更新成功"}


@router.delete("/api/my/snippets/{snippet_id}")
async def delete_my_snippet_api(
    snippet_id: str,
    user_id: Optional[int] = Depends(get_current_user),
):
    """删除我的代码（软删除）"""
    if not user_id:
        raise HTTPException(status_code=401, detail="请先登录")

    delete_my_snippet(snippet_id, user_id=user_id)
    return {"message": "已删除"}
