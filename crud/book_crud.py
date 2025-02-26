from motor.motor_asyncio import AsyncIOMotorDatabase
import requests
from models.models import Book
 
def book_serializer(book) -> dict:
    return {
        "_id": str(book["_id"]),  #Преобразуем ObjectId в строку
        "title": book["title"],
        "author": book["author"],
        "published_date":book["published_date"],
        "cover_url":book["cover_url"],
        "description":book["description"]
    }

async def add_book(db:AsyncIOMotorDatabase, book:Book):
    new_book = book.dict()
    result = await db.books.insert_one(new_book)
    return str(result.inserted_id)

async def get_books(db: AsyncIOMotorDatabase):
    books = await db.books.find().to_list(100)
    return [book_serializer(book) for book in books] 
 
async def get_books_by_title(db:AsyncIOMotorDatabase, title:str):
    book = await db.books.find_one({"title":title})
    return [book_serializer(book)]

async def update_book(db:AsyncIOMotorDatabase,book:Book):
    updated_book=book.dict(exclude_unset=True)
    result = await db.books.update_one({"title":book.title},{"$set":updated_book})
    if result.modified_count==0:
        return "Hasnt updated"
    else:
        return "Updated successfully"

async def delete_book(db:AsyncIOMotorDatabase, title:str):
    result = await db.books.delete_one({"title":title})
    return result.deleted_count

async def get_books_googleapi(query):
    API_KEY="AIzaSyBGh65pb-jiy5sUqrj9l3cUpbU-hWX_rVo"
    url = f"https://www.googleapis.com/books/v1/volumes?q={query}&key={API_KEY}"
    response = requests.get(url)
    if response.status_code == 200:
        books = response.json()
        return analyze_books(books.get("items", []))
    else:
        print(f"Ошибка: {response.status_code}")
        return []
    
def analyze_books(books):
    abooks=[]
    for book in books:
        volume_info = book.get("volumeInfo", {})
        image_links = volume_info.get("imageLinks", {})
        
        abook = Book(
            title = volume_info.get('title', 'Неизвестно'),
            author = volume_info.get('authors', ['Неизвестно']),
            published_date = volume_info.get('publishedDate','Неизвестно'),
            cover_url = image_links.get('thumbnail','Неизвестно'),
            description = volume_info.get('description','Неизвестно')
        )
        abooks.append(abook)
    return abooks

