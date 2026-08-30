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
    QWEN_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    QWEN_MODEL: str = "qwen-plus"

    # Weather / Solar (Open-Meteo — free, no key required)
    OPEN_METEO_BASE_URL: str = "https://archive-api.open-meteo.com/v1/archive"
    FAISALABAD_LAT: float = 31.4167
    FAISALABAD_LON: float = 73.0833
    FAISALABAD_TZ: str = "Asia/Karachi"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
