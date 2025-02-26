from fastapi import FastAPI
from database import db
from routes import auth_routes, book_routes, review_routes
from fastapi.openapi.utils import get_openapi
from fastapi.staticfiles import StaticFiles


app = FastAPI()

app.include_router(auth_routes.router)
app.include_router(review_routes.router)
app.include_router(book_routes.router)

app.mount("/static", StaticFiles(directory="templates/static"), name="static")

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="Books API",
        version="1.0.0",
        description="API for managing books and reviews",
        routes=app.routes,
    )
    app.openapi_schema = openapi_schema
    return app.openapi_schema

@app.get("/")
async def root():
    return {"message": "Welcome to Books API"}
 