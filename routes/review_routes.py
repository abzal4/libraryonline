from fastapi import APIRouter, Depends, HTTPException
from database import reviews_collection, books_collection
from models.models import Review, User
from auth import get_current_active_user, get_current_admin_user
from bson import ObjectId # type: ignore
from typing import List

router=APIRouter()

# -----------------------REVIEWS ----------------------------------------------------------------------------------------
@router.post("/reviews/", response_model=dict, )
def create_review(review: Review, current_user: User = Depends(get_current_active_user)):
    new_review = review.dict()
    new_review["user"] = current_user.username
    result = reviews_collection.insert_one(new_review)
    return {"id": str(result.inserted_id)}

@router.get("/reviews/{book_id}", response_model=List[dict])
def get_reviews(book_id: str, current_user: User = Depends(get_current_active_user)):
    reviews = list(reviews_collection.find({"book_id": book_id}))
    for review in reviews:
        review["id"] = str(review["_id"])
        del review["_id"]
    return reviews

@router.put("/reviews/{review_id}", response_model=dict)
def update_review(review_id: str, review: Review, current_user: User = Depends(get_current_active_user)):
    result = reviews_collection.update_one({"_id": ObjectId(review_id)}, {"$set": review.dict()})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review updated successfully"}

@router.delete("/reviews/{review_id}", response_model=dict)
def delete_review(review_id: str, current_user: User = Depends(get_current_admin_user)):
    result = reviews_collection.delete_one({"_id": ObjectId(review_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted successfully"}

@router.get("/books/", response_model=List[dict])
async def get_books_with_reviews(current_user: User = Depends(get_current_admin_user)):
    books_with_reviews = books_collection.aggregate([
        {
            "$lookup": {
                "from": "reviews", 
                "localField": "google_book_id", 
                "foreignField": "book_id",  
                "as": "reviews" 
            }},
            {
            "$match": {
                "reviews": {"$ne": []} 
            }
            },
            {   
                "$project": {
                    "_id": 1, 
                    "title": 1,
                    "reviews": 1 
                    }}
    ])
    books = []
    for book in books_with_reviews:
        book["_id"] = str(book["_id"])  
        for review in book["reviews"]:
            review["_id"] = str(review["_id"])  
        books.append(book)

    return books
