"""
TexVision Backend Configuration
Loads environment variables and app-wide settings.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_env: str = "development"
    secret_key: str = "change-this-in-production"
    access_token_expire_minutes: int = 1440

    firebase_credentials_path: str = "./firebase-service-account.json"
    firebase_storage_bucket: str = "texvision-app.appspot.com"

    model_path: str = "./app/ai/weights/defect_model.pt"
    confidence_threshold: float = 0.4

    local_storage_dir: str = "./uploads"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
