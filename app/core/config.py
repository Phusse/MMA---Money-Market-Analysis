from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"  # Ignore extra fields from .env
    )
    
    PROJECT_NAME: str = "Daily AI Stock Intel"
    VERSION: str = "1.0.0"
    
    # Site URL
    SITE_URL: str = "http://localhost:8000"
    
    # API Keys
    GEMINI_API_KEY: str
    TWELVE_DATA_API_KEY: str = ""  # Optional - for real-time forex
    
    # Telegram Bot Settings (Optional)
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    
    # Supabase Settings (Optional)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    
    # Email Settings
    EMAIL_ADDRESS: str = ""
    EMAIL_PASSWORD: str = ""
    RECIPIENT_EMAIL: str = ""
    EMAIL_HOST: str = "smtp.gmail.com"
    EMAIL_PORT: int = 465

@lru_cache()
def get_settings():
    return Settings()
