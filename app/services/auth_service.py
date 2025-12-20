"""
Authentication Service using Supabase
Handles user registration, login, and session management
"""

import os
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from supabase import create_client, Client
from pydantic import BaseModel, EmailStr
import logging

logger = logging.getLogger(__name__)


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    account_type: str = "both"  # forex, stock, or both


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPreferences(BaseModel):
    telegram_enabled: bool = False
    telegram_chat_id: Optional[str] = None
    phone_number: Optional[str] = None  # Optional phone for notifications
    email_reports: bool = True
    report_frequency: str = "daily"  # daily, weekly, none
    default_markets: list = ["us_market", "forex"]
    risk_tolerance: str = "moderate"  # conservative, moderate, aggressive
    theme: str = "dark"  # dark, light
    default_currency: str = "USD"


class AuthService:
    """Service for handling authentication with Supabase"""
    
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        self.site_url = os.getenv("SITE_URL", "http://localhost:8000")
        self._client: Optional[Client] = None
        
    @property
    def client(self) -> Client:
        """Lazy-load Supabase client"""
        if self._client is None:
            if not self.supabase_url or not self.supabase_key:
                raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment")
            self._client = create_client(self.supabase_url, self.supabase_key)
        return self._client
    
    def is_configured(self) -> bool:
        """Check if Supabase is configured"""
        return bool(self.supabase_url and self.supabase_key)
    
    async def register(self, user_data: UserCreate) -> Dict[str, Any]:
        """Register a new user"""
        try:
            # Create user in Supabase Auth with redirect URL
            response = self.client.auth.sign_up({
                "email": user_data.email,
                "password": user_data.password,
                "options": {
                    "data": {
                        "name": user_data.name or user_data.email.split("@")[0]
                    },
                    "email_redirect_to": f"{self.site_url}/auth/callback"
                }
            })
            
            if response.user:
                # Create user profile in our profiles table
                await self._create_user_profile(response.user.id, user_data)
                
                # Send welcome email
                try:
                    from app.services.email_service import email_service
                    email_service.send_welcome_email(
                        to_email=user_data.email,
                        name=user_data.name or user_data.email.split("@")[0]
                    )
                except Exception as email_err:
                    logger.warning(f"Failed to send welcome email: {email_err}")
                
                return {
                    "success": True,
                    "message": "Registration successful! Please check your email to verify your account.",
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
                        "name": user_data.name
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "Registration failed. Please try again."
                }
                
        except Exception as e:
            logger.error(f"Registration error: {e}")
            error_msg = str(e)
            if "already registered" in error_msg.lower():
                return {"success": False, "error": "This email is already registered."}
            return {"success": False, "error": f"Registration failed: {error_msg}"}
    
    async def login(self, credentials: UserLogin) -> Dict[str, Any]:
        """Login user and return session"""
        try:
            response = self.client.auth.sign_in_with_password({
                "email": credentials.email,
                "password": credentials.password
            })
            
            if response.user and response.session:
                # Get user profile
                profile = await self.get_user_profile(response.user.id)
                
                return {
                    "success": True,
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
                        "name": profile.get("name") if profile else None,
                        "account_type": profile.get("account_type", "both") if profile else "both"
                    },
                    "session": {
                        "access_token": response.session.access_token,
                        "refresh_token": response.session.refresh_token,
                        "expires_at": response.session.expires_at
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "Login failed. Please check your credentials."
                }
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Login error: {error_msg}")
            
            # Parse common Supabase error messages
            if "Invalid login credentials" in error_msg:
                return {"success": False, "error": "Invalid email or password."}
            elif "Email not confirmed" in error_msg:
                return {"success": False, "error": "Please verify your email before logging in."}
            elif "rate limit" in error_msg.lower():
                return {"success": False, "error": "Too many attempts. Please wait a moment."}
            else:
                return {"success": False, "error": f"Login error: {error_msg}"}
    
    async def logout(self, access_token: str) -> Dict[str, Any]:
        """Logout user"""
        try:
            self.client.auth.sign_out()
            return {"success": True, "message": "Logged out successfully."}
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_current_user(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get current user from access token"""
        try:
            response = self.client.auth.get_user(access_token)
            if response.user:
                profile = await self.get_user_profile(response.user.id)
                return {
                    "id": response.user.id,
                    "email": response.user.email,
                    "name": profile.get("name") if profile else None,
                    "avatar_url": profile.get("avatar_url") if profile else None,
                    "plan": profile.get("plan", "free") if profile else "free",
                    "account_type": profile.get("account_type", "both") if profile else "both",
                    "created_at": str(response.user.created_at)
                }
            return None
        except Exception as e:
            logger.error(f"Get user error: {e}")
            return None
    
    async def refresh_session(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh session with refresh token"""
        try:
            response = self.client.auth.refresh_session(refresh_token)
            if response.session:
                return {
                    "success": True,
                    "session": {
                        "access_token": response.session.access_token,
                        "refresh_token": response.session.refresh_token,
                        "expires_at": response.session.expires_at
                    }
                }
            return {"success": False, "error": "Failed to refresh session"}
        except Exception as e:
            logger.error(f"Refresh session error: {e}")
            return {"success": False, "error": str(e)}
    
    async def _create_user_profile(self, user_id: str, user_data: UserCreate) -> None:
        """Create user profile in profiles table"""
        try:
            self.client.table("profiles").insert({
                "id": user_id,
                "email": user_data.email,
                "name": user_data.name or user_data.email.split("@")[0],
                "account_type": user_data.account_type,  # forex, stock, or both
                "plan": "free",
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            
            # Create default preferences
            self.client.table("user_preferences").insert({
                "user_id": user_id,
                "telegram_enabled": False,
                "email_reports": True,
                "report_frequency": "daily",
                "default_markets": ["us_market", "forex"],
                "risk_tolerance": "moderate",
                "theme": "dark"
            }).execute()
            
        except Exception as e:
            logger.error(f"Create profile error: {e}")
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile from database"""
        try:
            response = self.client.table("profiles").select("*").eq("id", user_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Get profile error: {e}")
            return None
    
    async def update_user_profile(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile"""
        try:
            response = self.client.table("profiles").update(data).eq("id", user_id).execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            logger.error(f"Update profile error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user preferences from database"""
        try:
            response = self.client.table("user_preferences").select("*").eq("user_id", user_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Get preferences error: {e}")
            return None
    
    async def update_user_preferences(self, user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Update user preferences"""
        try:
            # Remove fields that shouldn't be updated directly
            safe_prefs = {k: v for k, v in preferences.items() if k not in ['user_id', 'created_at']}
            safe_prefs['updated_at'] = datetime.utcnow().isoformat()
            
            response = self.client.table("user_preferences").update(safe_prefs).eq("user_id", user_id).execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            logger.error(f"Update preferences error: {e}")
            return {"success": False, "error": str(e)}
    
    async def save_telegram_chat_id(self, user_id: str, chat_id: str) -> Dict[str, Any]:
        """Save Telegram chat_id for a user and enable Telegram notifications"""
        try:
            response = self.client.table("user_preferences").update({
                "telegram_chat_id": chat_id,
                "telegram_enabled": True,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("user_id", user_id).execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            logger.error(f"Save telegram chat_id error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_user_by_telegram_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Get user by Telegram connection token"""
        try:
            # Token format: user_id encoded
            import base64
            user_id = base64.urlsafe_b64decode(token.encode()).decode()
            return await self.get_user_profile(user_id)
        except Exception as e:
            logger.error(f"Get user by telegram token error: {e}")
            return None
    
    def generate_telegram_token(self, user_id: str) -> str:
        """Generate a token for Telegram deep link"""
        import base64
        return base64.urlsafe_b64encode(user_id.encode()).decode()
    
    async def reset_password_request(self, email: str) -> Dict[str, Any]:
        """Send password reset email"""
        try:
            self.client.auth.reset_password_for_email(email)
            return {
                "success": True,
                "message": "If an account exists with this email, you will receive a password reset link."
            }
        except Exception as e:
            logger.error(f"Password reset error: {e}")
            return {"success": True, "message": "If an account exists with this email, you will receive a password reset link."}


# Singleton instance
auth_service = AuthService()
