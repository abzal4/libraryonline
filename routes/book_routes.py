import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Request
import requests
from database import books_collection, reviews_collection
from models.models import Book, User
from auth import get_current_active_user, get_current_admin_user
from bson import ObjectId # type: ignore
from typing import List
from config import templates

router=APIRouter()

def get_average_rating(book_id):
    reviews = list(reviews_collection.find({"book_id": book_id}))
    if not reviews:
        return None  # Если отзывов нет, возвращаем None

    total_rating = sum(review.get("rating", 0) for review in reviews)
    return round(total_rating / len(reviews),1)  # Средний рейтинг

def analyze_book(book, username: str):
    volume_info = book.get("volumeInfo", {})
    sale_info = book.get("saleInfo", {})
    access_info = book.get("accessInfo", {})
    
    
    pdf_link = access_info.get("webReaderLink", 'Unknown')
    
    price = sale_info.get("listPrice", {}).get("amount", 0)
    
    rating = get_average_rating(book.get('id'))

    google_book = Book(
        google_book_id = book.get('id'),
        title = volume_info.get('title', 'Unknown'),
        authors = volume_info.get('authors', ['Unknown']),
        published_date = volume_info.get('publishedDate','Unknown'),
        subtitle = volume_info.get("subtitle", "Unknown"),
        categories = volume_info.get("categories", ['Unknown']),
        image_link = volume_info.get("imageLinks", {}).get("thumbnail", 'Unknown'),
        description = volume_info.get('description','Unknown'),
        saleability = sale_info.get("saleability"),
        language = volume_info.get("language", 'Unknown'),
        pdf_is_available = access_info.get("pdf", {}).get("isAvailable", {}),
        pageCount = volume_info.get("pageCount", 0),
        rating = rating,
        pdf_link=pdf_link,
        buy_link = sale_info.get("buyLink"),
        priceKZT = price,
        user=username
    )
    return google_book


# -----------------------BOOKS----------------------------------------------------------------------------------------
@router.post("/books/create", response_model=dict)
async def create_books(book: Book, current_user: User = Depends(get_current_active_user)):
    new_book = book.dict()
    result = books_collection.insert_one(new_book)
    return {"id": str(result.inserted_id)}

@router.get("/books/get", response_model=List[dict])
async def get_books(current_user: User = Depends(get_current_admin_user)):
    books = list(books_collection.find())
    for book in books:
        book["id"] = str(book["_id"])
        del book["_id"]  
    return books

@router.get("/books")
async def show_books_page(request: Request):
    return templates.TemplateResponse("my_books.html", {"request": request})

@router.get("/books/my", response_model=List[dict])
async def get_user_books(current_user: User = Depends(get_current_active_user)):
    books = list(books_collection.find({"user": current_user.username}))
    for book in books:
        book["id"] = str(book["_id"])
        del book["_id"]
        book["rating"] = get_average_rating(book["google_book_id"])
    return books

@router.get("/books/google_books")
async def show_books_page(request: Request):
    return templates.TemplateResponse("books.html", {"request": request})

@router.get("/books/googleapi")
async def get_google_books(query: str = Query(..., description="Book title"), current_user: User = Depends(get_current_active_user), filter: str = Query(None, description="Filter books (partial, full, free-ebooks, paid-ebooks, ebooks)")):
    API_KEY="AIzaSyBGh65pb-jiy5sUqrj9l3cUpbU-hWX_rVo"
    url = f"https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=40&key={API_KEY}"
    valid_filters = {"partial", "full", "free-ebooks", "paid-ebooks", "ebooks"}
    if filter and filter in valid_filters:
        url += f"&filter={filter}"
    response = requests.get(url)
    if response.status_code != 200:
        logging.error(f"Google Books API error: {response.status_code}")
        raise HTTPException(status_code=500, detail="Error with Google Books API")
    result = response.json()
    books = result.get("items", [])
    google_books=[]
    for book in books: 
        google_books.append(analyze_book(book, current_user.username))
    return google_books
    
@router.post("/books/add_google_book", response_model=dict)
async def add_google_book(book_id: str = Query(..., description="Google book id"), current_user: User = Depends(get_current_active_user)):
    url = f"https://www.googleapis.com/books/v1/volumes/{book_id}"
    response = requests.get(url)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Error fetching book from Google API")
    result = response.json()
    new_book = analyze_book(result, current_user.username)
    book_data = new_book.dict()
    book_data["user"] = current_user.username
    result = books_collection.insert_one(new_book.dict())
    return {"id": str(result.inserted_id)}

@router.put("/books/{book_id}", response_model=dict)
async def update_book(book_id: str, book: Book, current_user: User = Depends(get_current_active_user)):
    result = books_collection.update_one({"_id": ObjectId(book_id)}, {"$set": book.dict()})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Book not found")
    return {"message": "Book updated successfully"}

@router.delete("/books/deleteall", response_model=dict, )
def delete_all_books(current_user: User = Depends(get_current_admin_user)):
    result = books_collection.delete_many({})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No books in database")
    return {"message": "Books deleted successfully"}

@router.delete("/books/{book_id}", response_model=dict)
async def delete_book(book_id: str, current_user: User = Depends(get_current_active_user)):
    try:
        object_id = ObjectId(book_id)
    except :
        raise HTTPException(status_code=400, detail="Invalid book ID format")
    result = books_collection.delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Book not found")
    return {"message": "Book deleted successfully"}

