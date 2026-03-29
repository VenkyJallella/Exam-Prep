"""Email service for sending OTP, notifications, and alerts."""
import logging
import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from functools import partial

from app.config import settings

logger = logging.getLogger("examprep.email")


def _send_email_sync(to_email: str, subject: str, html_body: str) -> bool:
    """Send email via SMTP (synchronous — run in thread pool)."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured. Email to %s skipped. Subject: %s", to_email, subject)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info("Email sent to %s: %s", to_email, subject)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e)
        return False


async def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send email asynchronously (runs SMTP in thread pool)."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_send_email_sync, to_email, subject, html_body))


async def send_otp_email(to_email: str, otp: str) -> bool:
    """Send OTP verification email."""
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5; margin: 0;">ExamPrep</h1>
        </div>
        <h2 style="color: #1f2937;">Verify Your Email</h2>
        <p style="color: #6b7280;">Use the following OTP to verify your email address. This code is valid for 5 minutes.</p>
        <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5;">{otp}</span>
        </div>
        <p style="color: #9ca3af; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 11px; text-align: center;">ExamPrep — AI-Powered Exam Preparation</p>
    </div>
    """
    return await send_email(to_email, f"ExamPrep - Your OTP is {otp}", html)


async def send_welcome_email(to_email: str, full_name: str) -> bool:
    """Send welcome email after registration."""
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4f46e5;">Welcome to ExamPrep!</h1>
        <p>Hi {full_name},</p>
        <p>Your account has been created successfully. Here's what you can do:</p>
        <ul>
            <li><strong>Practice</strong> — 10 sessions/day with AI-generated questions</li>
            <li><strong>Daily Quiz</strong> — 20 questions, 20 minutes, daily leaderboard</li>
            <li><strong>Coding</strong> — Solve problems with in-browser code editor</li>
            <li><strong>AI Tutor</strong> — Chat with an AI that knows your performance</li>
        </ul>
        <a href="https://examprep.in/dashboard" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Start Practicing</a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">Happy preparing!<br/>Team ExamPrep</p>
    </div>
    """
    return await send_email(to_email, "Welcome to ExamPrep — Start Practicing!", html)


async def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Send password reset email with token."""
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4f46e5;">Reset Your Password</h1>
        <p>You requested a password reset. Use this token to reset your password:</p>
        <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0;">
            <code style="font-size: 14px; word-break: break-all;">{reset_token}</code>
        </div>
        <p style="color: #9ca3af; font-size: 12px;">This token expires in 30 minutes. If you didn't request this, ignore this email.</p>
    </div>
    """
    return await send_email(to_email, "ExamPrep — Password Reset", html)
