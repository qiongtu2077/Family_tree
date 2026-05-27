"""
邮件服务 - 发送注册审批邮件
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os

# 邮件配置（部署时需要修改）
EMAIL_CONFIG = {
    "smtp_server": "smtp.163.com",
    "smtp_port": 465,
    "sender_email": "",  # 发送邮箱，需要配置
    "sender_password": "",  # 邮箱授权码，需要配置
    "admin_email": "<ADMIN_EMAIL>"  # 管理员邮箱
}


def send_registration_approval_email(
    username: str,
    user_email: str,
    approve_url: str,
    reject_url: str,
    real_name: str = ""
) -> bool:
    """
    发送注册审批邮件给管理员
    
    Args:
        username: 申请用户名
        user_email: 申请用户邮箱
        approve_url: 同意链接
        reject_url: 拒绝链接
        real_name: 真实姓名
    
    Returns:
        是否发送成功
    """
    # 如果没有配置发送邮箱，使用简化模式（打印到控制台）
    if not EMAIL_CONFIG["sender_email"] or not EMAIL_CONFIG["sender_password"]:
        print("=" * 60)
        print("📧 新用户注册申请")
        print(f"用户名: {username}")
        print(f"真实姓名: {real_name}")
        print(f"邮箱: {user_email}")
        print(f"同意链接: {approve_url}")
        print(f"拒绝链接: {reject_url}")
        print("=" * 60)
        return True
    
    try:
        # 创建邮件
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"【族谱系统】新用户注册申请 - {username}"
        msg["From"] = EMAIL_CONFIG["sender_email"]
        msg["To"] = EMAIL_CONFIG["admin_email"]
        
        # HTML 邮件内容
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #fff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                h1 {{ color: #667eea; }}
                .info {{ background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }}
                .info p {{ margin: 8px 0; }}
                .btn {{ display: inline-block; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 10px 10px 10px 0; }}
                .btn-approve {{ background: #28a745; color: #fff; }}
                .btn-reject {{ background: #dc3545; color: #fff; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🌳 族谱系统 - 新用户注册申请</h1>
                <div class="info">
                    <p><strong>用户名：</strong>{username}</p>
                    <p><strong>真实姓名：</strong>{real_name}</p>
                    <p><strong>邮箱：</strong>{user_email}</p>
                </div>
                <p>请审批此注册申请：</p>
                <a href="{approve_url}" class="btn btn-approve">✅ 同意注册</a>
                <a href="{reject_url}" class="btn btn-reject">❌ 拒绝注册</a>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    此邮件由族谱查询系统自动发送，请勿回复。
                </p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_content, "html", "utf-8"))
        
        # 发送邮件
        with smtplib.SMTP_SSL(EMAIL_CONFIG["smtp_server"], EMAIL_CONFIG["smtp_port"]) as server:
            server.login(EMAIL_CONFIG["sender_email"], EMAIL_CONFIG["sender_password"])
            server.sendmail(
                EMAIL_CONFIG["sender_email"],
                EMAIL_CONFIG["admin_email"],
                msg.as_string()
            )
        
        print(f"✅ 审批邮件已发送至 {EMAIL_CONFIG['admin_email']}")
        return True
        
    except Exception as e:
        print(f"❌ 发送邮件失败: {e}")
        return False


def send_registration_result_email(
    user_email: str,
    username: str,
    approved: bool
) -> bool:
    """
    发送注册结果通知给用户
    
    Args:
        user_email: 用户邮箱
        username: 用户名
        approved: 是否通过
    
    Returns:
        是否发送成功
    """
    if not EMAIL_CONFIG["sender_email"] or not EMAIL_CONFIG["sender_password"]:
        status = "已通过" if approved else "已拒绝"
        print(f"📧 通知用户 {username} ({user_email}): 注册申请{status}")
        return True
    
    try:
        msg = MIMEMultipart("alternative")
        
        if approved:
            msg["Subject"] = f"【族谱系统】注册成功通知"
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #28a745;">🎉 恭喜！您的注册申请已通过</h2>
                <p>亲爱的 {username}：</p>
                <p>您的族谱系统账号已成功创建，现在可以登录使用了。</p>
                <p style="color: #999; font-size: 12px;">此邮件由族谱查询系统自动发送。</p>
            </body>
            </html>
            """
        else:
            msg["Subject"] = f"【族谱系统】注册申请结果"
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #dc3545;">注册申请未通过</h2>
                <p>亲爱的 {username}：</p>
                <p>很抱歉，您的注册申请未能通过审核。如有疑问，请联系管理员。</p>
                <p style="color: #999; font-size: 12px;">此邮件由族谱查询系统自动发送。</p>
            </body>
            </html>
            """
        
        msg["From"] = EMAIL_CONFIG["sender_email"]
        msg["To"] = user_email
        msg.attach(MIMEText(html_content, "html", "utf-8"))
        
        with smtplib.SMTP_SSL(EMAIL_CONFIG["smtp_server"], EMAIL_CONFIG["smtp_port"]) as server:
            server.login(EMAIL_CONFIG["sender_email"], EMAIL_CONFIG["sender_password"])
            server.sendmail(EMAIL_CONFIG["sender_email"], user_email, msg.as_string())
        
        return True
        
    except Exception as e:
        print(f"❌ 发送通知邮件失败: {e}")
        return False

