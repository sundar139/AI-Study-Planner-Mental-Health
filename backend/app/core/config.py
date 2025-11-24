
from pydantic_settings import BaseSettings
from typing import List, Union
from pathlib import Path

class Settings(BaseSettings):
    PROJECT_NAME: str = "AssignWell"
    API_V1_STR: str = "/api/v1"
    
    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "assignwell"
    POSTGRES_PORT: str = "5432"
    SQLALCHEMY_DATABASE_URI: Union[str, None] = None
    DATABASE_URL: Union[str, None] = None

    # Auth
    SECRET_KEY: str = "YOUR_SECRET_KEY" # TODO: Change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # AI / LLM Configuration
    OPENAI_API_KEY: Union[str, None] = None  # Set this in .env to enable real AI features
    OPENAI_MODEL: str = "gpt-4o-mini"  # Can be changed to gpt-4, gpt-3.5-turbo, etc.
    OPENAI_FAST_MODEL: str = "gpt-3.5-turbo"  # Faster, lower-cost model for chat

    class Config:
        case_sensitive = True
        env_file = str(Path(__file__).resolve().parents[2] / ".env")

    def __init__(self, **data):
        super().__init__(**data)
        if self.DATABASE_URL:
            self.SQLALCHEMY_DATABASE_URI = self.DATABASE_URL
        elif not self.SQLALCHEMY_DATABASE_URI:
            if all([self.POSTGRES_SERVER, self.POSTGRES_USER, self.POSTGRES_DB, self.POSTGRES_PORT]):
                self.SQLALCHEMY_DATABASE_URI = (
                    f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                    f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
                )
            else:
                raise ValueError("SQLALCHEMY_DATABASE_URI is not configured. Set DATABASE_URL or POSTGRES_* in .env")

settings = Settings()
