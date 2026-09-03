import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load .env from backend folder or root folder
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
root_env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"

if env_path.exists():
    load_dotenv(dotenv_path=env_path)
elif root_env_path.exists():
    load_dotenv(dotenv_path=root_env_path)
else:
    load_dotenv()

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "TariffGuard API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./test.db")
    
    # AI Keys (Supports Google Gemini, Qwen / Alibaba Cloud, OpenAI)
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    QWEN_API_KEY: Optional[str] = os.getenv("QWEN_API_KEY", None)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    
    # Base URLs & Models
    QWEN_BASE_URL: str = os.getenv("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    QWEN_MODEL: str = os.getenv("QWEN_MODEL", "qwen-plus")
    GEMINI_BASE_URL: str = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    ALCHEMY_KEY: Optional[str] = os.getenv("ALCHEMY_KEY", None)

    # Weather / Solar (Open-Meteo — free, no key required)
    OPEN_METEO_BASE_URL: str = "https://archive-api.open-meteo.com/v1/archive"
    FAISALABAD_LAT: float = 31.4167
    FAISALABAD_LON: float = 73.0833
    FAISALABAD_TZ: str = "Asia/Karachi"
    
    class Config:
        env_file = ".env"
        extra = "ignore"
        case_sensitive = False

settings = Settings()
