from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "MTG Life Counter API"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/mtg_counter"
    secret_key: str = "change-this-in-production-please"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    class Config:
        env_file = ".env"


settings = Settings()
