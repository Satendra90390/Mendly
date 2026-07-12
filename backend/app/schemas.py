from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# ---------------- Auth ----------------
class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CheckEmailRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class CompleteSignupRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)
    date_of_birth: str = Field(min_length=1, max_length=10)
    password: str = Field(min_length=6, max_length=72)


class LoginOtpRequest(BaseModel):
    email: EmailStr


# ——— Phone Auth ———
class SendPhoneOtpRequest(BaseModel):
    phone: str = Field(min_length=6, max_length=20)


class VerifyPhoneOtpRequest(BaseModel):
    phone: str = Field(min_length=6, max_length=20)
    otp: str = Field(min_length=6, max_length=6)


class PhoneSignupRequest(BaseModel):
    phone: str = Field(min_length=6, max_length=20)
    name: str = Field(min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    date_of_birth: Optional[str] = None
    password: str = Field(min_length=6, max_length=72)


# ——— Forgot Password ———
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=6, max_length=72)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    last_login: Optional[datetime] = None
    avatar_color: Optional[str] = "#4f46e5"
    is_blocked: Optional[bool] = False
    date_of_birth: Optional[str] = None
    blood_type: Optional[str] = None
    profile_photo: Optional[str] = None
    auth_provider: Optional[str] = "email"
    phone: Optional[str] = None

    class Config:
        from_attributes = True


TokenResponse.model_rebuild()


# ---------------- Profile ----------------
class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    avatar_color: Optional[str] = None
    date_of_birth: Optional[str] = None
    blood_type: Optional[str] = None
    profile_photo: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=72)


class AccountStats(BaseModel):
    total_messages: int = 0
    total_searches: int = 0
    total_activities: int = 0
    member_since: str = ""
    last_active: str = ""


# ---------------- Activity ----------------
class ActivityLogOut(BaseModel):
    id: int
    action: str
    detail: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------- Chat ----------------
class ConversationMessage(BaseModel):
    role: str   # "user" or "bot"
    content: str

class ChatRequest(BaseModel):
    message: str
    location: Optional[dict] = None
    history: Optional[List[ConversationMessage]] = None   # recent turns for context


class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------- Medicines / Diseases ----------------
class LocationRequest(BaseModel):
    lat: float
    lng: float
    radius: Optional[int] = 10
    query: Optional[str] = None


class MedicineSearch(BaseModel):
    query: str


class InteractionCheck(BaseModel):
    medication: str
    conditions: List[str]


class SavedSearchCreate(BaseModel):
    query_type: str  # "medicine" | "disease"
    query_value: str


class SavedSearchOut(BaseModel):
    id: int
    query_type: str
    query_value: str
    created_at: datetime

    class Config:
        from_attributes = True
