"""
Email Service
Handles all email notifications - welcome emails, signal alerts, reports, etc.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)

# Email configuration from environment
EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS', '')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', '')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '465'))


class EmailService:
    """Service for sending various types of emails"""
    
    def __init__(self):
        self.email_address = EMAIL_ADDRESS
        self.email_password = EMAIL_PASSWORD
        self.email_host = EMAIL_HOST
        self.email_port = EMAIL_PORT
        
    def is_configured(self) -> bool:
        """Check if email service is configured"""
        return bool(self.email_address and self.email_password)
    
    def send_email(self, to_email: str, subject: str, html_body: str) -> bool:
        """Send an email with HTML content"""
        if not self.is_configured():
            logger.warning("Email credentials not configured. Skipping email.")
            return False
            
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = self.email_address
            msg['To'] = to_email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(html_body, 'html'))
            
            # Connect via SSL
            server = smtplib.SMTP_SSL(self.email_host, self.email_port)
            server.login(self.email_address, self.email_password)
            server.sendmail(self.email_address, to_email.split(','), msg.as_string())
            server.quit()
            
            logger.info(f"Email sent to {to_email}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    def send_welcome_email(self, to_email: str, name: str) -> bool:
        """Send welcome email to new user"""
        subject = "Welcome to Money Market Intelligence! 🚀"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #7c3aed, #6366f1); color: white; padding: 40px 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 28px; }}
                .content {{ padding: 40px 30px; }}
                .feature {{ display: flex; align-items: flex-start; margin-bottom: 20px; }}
                .feature-icon {{ width: 40px; height: 40px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; margin-right: 15px; flex-shrink: 0; }}
                .feature-text h3 {{ margin: 0 0 5px 0; color: #1f2937; }}
                .feature-text p {{ margin: 0; color: #6b7280; font-size: 14px; }}
                .cta-button {{ display: inline-block; background: linear-gradient(135deg, #7c3aed, #6366f1); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
                .footer {{ background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 13px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to MMA! 🎉</h1>
                </div>
                <div class="content">
                    <p>Hi <strong>{name}</strong>,</p>
                    <p>Thank you for joining <strong>Money Market Intelligence</strong>! You now have access to AI-powered trading insights that help you make smarter investment decisions.</p>
                    
                    <h2>What you can do now:</h2>
                    
                    <div class="feature">
                        <div class="feature-icon">📊</div>
                        <div class="feature-text">
                            <h3>AI Market Intelligence</h3>
                            <p>Get real-time insights on US stocks, forex, and Nigerian markets</p>
                        </div>
                    </div>
                    
                    <div class="feature">
                        <div class="feature-icon">🎯</div>
                        <div class="feature-text">
                            <h3>Trading Signals</h3>
                            <p>Receive buy/sell alerts with entry, stop-loss, and take-profit levels</p>
                        </div>
                    </div>
                    
                    <div class="feature">
                        <div class="feature-icon">📱</div>
                        <div class="feature-text">
                            <h3>Telegram Alerts</h3>
                            <p>Get instant notifications on your phone for new signals</p>
                        </div>
                    </div>
                    
                    <div class="feature">
                        <div class="feature-icon">📈</div>
                        <div class="feature-text">
                            <h3>Performance Tracking</h3>
                            <p>Monitor your trading performance with detailed analytics</p>
                        </div>
                    </div>
                    
                    <center>
                        <a href="https://mma.yourdomain.com" class="cta-button">Start Trading Smarter →</a>
                    </center>
                    
                    <p>If you have any questions, just reply to this email!</p>
                    <p>Happy trading! 💹</p>
                </div>
                <div class="footer">
                    <p>© 2025 Money Market Intelligence. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_body)
    
    def send_signal_alert(self, to_email: str, signal_data: dict) -> bool:
        """Send trading signal alert via email"""
        symbol = signal_data.get('symbol', 'UNKNOWN')
        signal = signal_data.get('signal', 'Hold')
        price = signal_data.get('price', 0)
        rsi = signal_data.get('rsi', 'N/A')
        
        emoji = "🟢" if "Buy" in signal else "🔴" if "Sell" in signal else "🟡"
        subject = f"{emoji} {signal} Signal: {symbol}"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; color: white; padding: 20px; }}
                .card {{ max-width: 500px; margin: 0 auto; background: linear-gradient(145deg, #12121a, #1a1a2e); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }}
                .header {{ background: {'linear-gradient(135deg, #10b981, #059669)' if 'Buy' in signal else 'linear-gradient(135deg, #ef4444, #dc2626)' if 'Sell' in signal else 'linear-gradient(135deg, #f59e0b, #d97706)'}; padding: 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 32px; }}
                .header h2 {{ margin: 10px 0 0 0; font-size: 18px; opacity: 0.9; }}
                .content {{ padding: 30px; }}
                .stat {{ display: flex; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }}
                .stat:last-child {{ border-bottom: none; }}
                .stat-label {{ color: #9ca3af; }}
                .stat-value {{ font-weight: 600; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="header">
                    <h1>{emoji} {signal.upper()}</h1>
                    <h2>{symbol}</h2>
                </div>
                <div class="content">
                    <div class="stat">
                        <span class="stat-label">Entry Price</span>
                        <span class="stat-value">{price}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">RSI</span>
                        <span class="stat-value">{rsi}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Time</span>
                        <span class="stat-value">{datetime.now().strftime('%Y-%m-%d %H:%M')}</span>
                    </div>
                </div>
                <div class="footer">
                    <p>Money Market Intelligence</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_body)
    
    def send_daily_report(self, to_email: str, report_data: dict) -> bool:
        """Send daily market report email"""
        date = report_data.get('date', datetime.now().strftime('%Y-%m-%d'))
        subject = f"📊 Daily Market Report - {date}"
        
        # Build report HTML (simplified version)
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }}
                .header {{ background: linear-gradient(135deg, #7c3aed, #6366f1); color: white; padding: 30px; text-align: center; }}
                .content {{ padding: 30px; }}
                .section {{ margin-bottom: 25px; }}
                .section h3 {{ color: #7c3aed; margin-bottom: 10px; }}
                .footer {{ background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Daily Market Report</h1>
                    <p>{date}</p>
                </div>
                <div class="content">
                    <div class="section">
                        <h3>Market Summary</h3>
                        <p>{report_data.get('summary', 'Market analysis for today.')}</p>
                    </div>
                    <div class="section">
                        <h3>Key Signals</h3>
                        <p>{report_data.get('signals_summary', 'Check the dashboard for latest signals.')}</p>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 Money Market Intelligence</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_body)


# Singleton instance
email_service = EmailService()

# Log configuration status
if email_service.is_configured():
    logger.info("✅ Email service configured")
else:
    logger.info("ℹ️ Email service not configured - emails disabled")
