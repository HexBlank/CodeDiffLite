import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.services.system_config import get_email_config


def send_verification_email(email: str, code: str, purpose: str = "register") -> bool:
    config = get_email_config()
    if not all([config["host"], config["port"], config["user"], config["password"], config["from"]]):
        return False

    try:
        subject_map = {
            "register": "CodeDiff - 注册验证码",
            "login": "CodeDiff - 登录验证码",
            "change_email": "CodeDiff - 修改邮箱验证码",
            "change_password": "CodeDiff - 修改密码验证码",
            "reset_password": "CodeDiff - 找回密码验证码",
        }
        subject = subject_map.get(purpose, "CodeDiff - 验证码")

        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #111827;">
            <div style="max-width: 520px; margin: 0 auto; padding: 24px;">
                <h2 style="margin-bottom: 12px;">CodeDiff 验证码</h2>
                <p>你的验证码如下：</p>
                <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 16px 0;">
                    {code}
                </div>
                <p style="color: #6b7280; font-size: 14px;">
                    验证码将在 {5 if purpose == 'register' else 10} 分钟内有效，请勿泄露给他人。
                </p>
            </div>
        </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = config["from"]
        msg["To"] = email
        msg.attach(MIMEText(body, "html", "utf-8"))

        with smtplib.SMTP(config["host"], config["port"]) as server:
            server.starttls()
            server.login(config["user"], config["password"])
            server.sendmail(config["from"], [email], msg.as_string())
        return True
    except Exception as exc:
        print(f"[Email Error] {exc}")
        return False


def send_test_email(email: str) -> bool:
    """发送测试连通性邮件（不含验证码，仅用于测试 SMTP 配置）"""
    config = get_email_config()
    if not all([config["host"], config["port"], config["user"], config["password"], config["from"]]):
        return False

    try:
        body = """
        <html>
        <body style="font-family: Arial, sans-serif; color: #111827;">
            <div style="max-width: 520px; margin: 0 auto; padding: 24px;">
                <h2 style="margin-bottom: 12px;">CodeDiff 邮件测试</h2>
                <p>如果你收到此邮件，说明 SMTP 配置正确。</p>
                <p style="color: #6b7280; font-size: 14px;">此消息由管理后台的"测试邮件"功能发送。</p>
            </div>
        </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "CodeDiff - SMTP 配置测试"
        msg["From"] = config["from"]
        msg["To"] = email
        msg.attach(MIMEText(body, "html", "utf-8"))

        with smtplib.SMTP(config["host"], config["port"]) as server:
            server.starttls()
            server.login(config["user"], config["password"])
            server.sendmail(config["from"], [email], msg.as_string())
        return True
    except Exception as exc:
        print(f"[Email Test Error] {exc}")
        return False
