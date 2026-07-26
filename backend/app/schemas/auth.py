import re

from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Password must be at least 8 chars and include letters, numbers, and symbols."""
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("La contraseña debe incluir al menos una letra")
        if not re.search(r"[0-9]", v):
            raise ValueError("La contraseña debe incluir al menos un número")
        if not re.search(r"[^a-zA-Z0-9]", v):
            raise ValueError("La contraseña debe incluir al menos un signo especial")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, str]


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
