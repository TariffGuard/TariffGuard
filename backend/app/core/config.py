from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "TariffGuard API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "mysql+pymysql://tariffguard_user:tariffguard_pass@localhost:3306/tariffguard"
    
    # Alibaba Cloud
    ALCHEMY_KEY: Optional[str] = None
    QWEN_API_KEY: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()