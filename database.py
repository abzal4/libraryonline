from pymongo import MongoClient # type: ignore

client = MongoClient("mongodb://localhost:27017")
db = client.libraryonline

books_collection = db.books
users_collection = db.users
reviews_collection = db.reviews

books_collection.create_index("user")
reviews_collection.create_index("book_id")
