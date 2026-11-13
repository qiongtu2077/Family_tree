"""验证邮件内容转义和未配置 SMTP 时的日志保密性。"""
from unittest.mock import MagicMock, Mock

import pytest

from app.services import email_service


# --- 邮件日志与 HTML 输出 --- #


def test_missing_smtp_never_logs_approval_capability(monkeypatch, capsys):
    """未配置 SMTP 时仅告知应用内审批，不能把随机授权链接写入日志。"""
    monkeypatch.setattr(email_service, "EMAIL_CONFIG", {"sender_email": "", "sender_password": ""})
    result = email_service.send_registration_approval_email("requester", "person@example.com",
                                                           "https://example.com/approve/test-capability", "https://example.com/reject/test-capability", "申请人")
    output = capsys.readouterr().out
    assert result is False
    assert "应用内审批" in output
    assert "test-capability" not in output and "/approve/" not in output and "/reject/" not in output


def test_approval_mail_escapes_all_untrusted_html(monkeypatch):
    """用户资料和包含查询参数的链接均正确转义，SMTP调用被本地模拟替代。"""
    monkeypatch.setattr(email_service, "EMAIL_CONFIG", {"smtp_server": "smtp.example.com", "smtp_port": 465,
                         "sender_email": "sender@example.com", "sender_password": "test-only-value", "admin_email": "admin@example.com"})
    smtp = MagicMock()
    monkeypatch.setattr(email_service.smtplib, "SMTP_SSL", smtp)
    mime_text = Mock(wraps=email_service.MIMEText)
    monkeypatch.setattr(email_service, "MIMEText", mime_text)
    assert email_service.send_registration_approval_email("<b>账号</b>", "<i>@example.com",
                   "https://example.com/approve/token?a=1&b=2", "https://example.com/reject/token", "<script>姓名</script>") is True
    html = mime_text.call_args.args[0]
    assert "<b>账号</b>" not in html and "&lt;b&gt;账号&lt;/b&gt;" in html
    assert "<script>姓名</script>" not in html and "&lt;script&gt;姓名&lt;/script&gt;" in html
    assert "<i>@example.com" not in html and "&lt;i&gt;@example.com" in html
    assert "?a=1&amp;b=2" in html
    smtp.return_value.__enter__.return_value.sendmail.assert_called_once()


@pytest.mark.parametrize("approved", [True, False])
def test_result_mail_escapes_username(monkeypatch, approved):
    """批准和拒绝通知都不能把申请账号当作 HTML 标签执行。"""
    monkeypatch.setattr(email_service, "EMAIL_CONFIG", {"smtp_server": "smtp.example.com", "smtp_port": 465,
                         "sender_email": "sender@example.com", "sender_password": "test-only-value"})
    monkeypatch.setattr(email_service.smtplib, "SMTP_SSL", MagicMock())
    mime_text = Mock(wraps=email_service.MIMEText)
    monkeypatch.setattr(email_service, "MIMEText", mime_text)
    assert email_service.send_registration_result_email("person@example.com", "<script>账号</script>", approved) is True
    html = mime_text.call_args.args[0]
    assert "<script>账号</script>" not in html
    assert "&lt;script&gt;账号&lt;/script&gt;" in html
