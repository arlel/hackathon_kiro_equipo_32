from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = "MTG Life Counter API"
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS_ORIGINS into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
