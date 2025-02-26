from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from models.models import Token, User
from database import users_collection
from auth import get_user, get_password_hash, authenticate_user, create_access_token, get_current_active_user, get_current_admin_user, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta
from fastapi.security import OAuth2PasswordRequestForm
from config import templates

router = APIRouter()


# registration 
@router.get("/register")
async def show_register_form(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@router.post("/register", response_model=dict)
async def register( 
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    full_name: str = Form("")):
    if get_user(username):
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = get_password_hash(password)
    new_user = {
        "username": username,
        "email": email,
        "full_name": full_name,
        "hashed_password": hashed_password,
        "disabled": False,
        "is_admin": False
    }
    users_collection.insert_one(new_user)
    return {"message": "User registered successfully"}

# login and getting token
@router.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
    return Token(access_token=access_token, token_type="bearer")

# current user
@router.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user