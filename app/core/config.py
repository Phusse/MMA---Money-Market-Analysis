from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "Daily AI Stock Intel"
    VERSION: str = "1.0.0"
    
    # API Keys
    GEMINI_API_KEY: str
    TWELVE_DATA_API_KEY: str = ""  # Optional - for real-time forex
    
    # Telegram Bot Settings (Optional)
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    
    # Email Settings
    EMAIL_ADDRESS: str
    EMAIL_PASSWORD: str
    RECIPIENT_EMAIL: str
    EMAIL_HOST: str = "smtp.gmail.com"
    EMAIL_PORT: int = 465
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings()
