from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Book(BaseModel):
    google_book_id: str
    title: str
    authors: List[str]
    published_date: Optional[str] = None
    subtitle: Optional[str] = None
    categories: Optional[List[str]] = None
    image_link: Optional[str] = None
    description: str
    saleability: str 
    language: Optional[str] = None
    pdf_is_available: bool
    pageCount: int
    rating: Optional[float] = 0
    pdf_link: Optional[str] = None
    buy_link: Optional[str] = None
    priceKZT: Optional[float] = None
    user: str 

class User(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    disabled: Optional[bool] = False

class Review(BaseModel):
    book_id: str
    rating: float
    comment: str
    created_at: datetime = datetime.utcnow()

class UserInDB(User):
    hashed_password: str
    is_admin: bool = False

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None