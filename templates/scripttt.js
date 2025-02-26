document.addEventListener("DOMContentLoaded", function () {
    let currentPage = window.location.pathname.split("/").pop();

    if (currentPage === "library.html") {
        document.getElementById("search").addEventListener("keyup", searchBooks);
    }
});

async function register(event) {
    event.preventDefault();  // Отменяем стандартную отправку формы

    const formData = new FormData();
    formData.append("username", document.getElementById("username").value);
    formData.append("email", document.getElementById("email").value);
    formData.append("full_name", document.getElementById("full_name").value);
    formData.append("password", document.getElementById("password").value);

    const response = await fetch("/register", {
        method: "POST",
        body: formData  // Отправляем form-data
    });

    const data = await response.json();
    if (response.ok) {
        alert("Registered successfully!");
        localStorage.setItem("access_token", data.access_token);
        window.location.href = "/login";
    } else {
        alert(data.detail);
    }
};

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async function(event) {
            event.preventDefault();
            console.log("Login form submitted!"); // Проверка

            const formData = new FormData();
            formData.append("username", document.getElementById("username").value);
            formData.append("password", document.getElementById("password").value);

            const response = await fetch("/token", {
                method: "POST",
                body: formData  
            });

            const data = await response.json();
            if (response.ok) {
                alert("Login successful!");
                localStorage.setItem("access_token", data.access_token);
                window.location.href = "/books";
            } else {
                alert(data.detail);
            }
        });
    } else {
        console.warn("loginForm не найден!");
    }
});


async function displayBooks() {
    const token = localStorage.getItem("access_token"); 
    if (!token) {
        alert("You need to log in first!");
        window.location.href = "/login"; // Перенаправление на страницу входа
        return;
    }

    try {
        const response = await fetch("/books/my", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,  // Отправляем токен в заголовке
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch books");
        }

        let books = await response.json();
    
        const bookList = document.querySelector(".book-list"); // Selects the first element with this class
        if (!bookList) {
            console.error("Element with class 'book-list' not found.");
            return;
        }
        bookList.innerHTML = ""; // Очищаем контейнер перед добавлением новых элементов
        const bookCards = document.createElement("div");
        bookCards.classList.add("row");
        books.forEach(book => {
            const bookCard = document.createElement("div");
            bookCard.classList.add("col-md-3");
            bookCard.innerHTML = `
                <div class="card mb-3">
                    <img src="${book.image_link}" class="card-img-top" alt="${book.title}">
                    <div class="card-body">
                        <h5 class="card-title">${book.title}</h5>
                        <p class="card-text"><strong></strong> ${book.authors}</p>
                        <p class="card-text"><strong></strong> ${book.subtitle}</p>
                        <button class="btn btn-primary w-100 readButton" data-pdf-link="${book.pdf_link}">Read</button>
                        <button class="btn btn-danger w-100 deleteButton" data-book-id="${book.id}">Delete</button>
                    </div>
                </div>
            `; 
            bookCard.addEventListener("click", () => openModal(book));
            bookCards.appendChild(bookCard);  
        });
        bookList.appendChild(bookCards);

    } catch (error) {
        console.error("Error fetching books:", error);
        alert("Error fetching books. Please try again.");
    
}}

function readButton(event) {
    const pdfLink = event.target.getAttribute("data-pdf-link");

    if (!pdfLink) {
        alert("PDF ссылка не найдена!");
        return;
    }

    window.open(pdfLink, "_blank"); // Открывает PDF в новой вкладке
};

document.addEventListener("click", function (event) {
    if (event.target.classList.contains("readButton")) {
        readButton(event);
    }
});

async function deleteBook(event) {
    const bookId = event.target.getAttribute("data-book-id");

    if (!bookId) {
        alert("Book ID not found!");
        return;
    }
    
    alert(bookId)
    if (!confirm("Are you sure you want to delete this book?")) {
        return;
    }

    try {
        const response = await fetch(`/books/${bookId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Failed to delete book");
        }

        alert("Book deleted successfully!");
        event.target.closest(".col-md-3").remove(); // Удаление карточки из DOM

    } catch (error) {
        console.error("Error deleting book:", error);
        alert("Error deleting book. Please try again.");
    }
}

document.addEventListener("click", function (event) {
    if (event.target.classList.contains("deleteButton")) {
        deleteBook(event);
    }
});


function logout() {
    localStorage.removeItem("user");
    window.location.href = "/register"; // Вернуться на регистрацию
}

displayBooks();

function loginPage() {
    window.location.href = "/login"; 
}
function myBooksPage() {
    window.location.href = "/books"; 
}
function booksPage() {
    window.location.href = "/books/google_books"; 
}

document.getElementById("registerButton").addEventListener("click", function() {
    window.location.href = "/register"; 
});

async function openModal(book) {
    document.getElementById("modalImage").src = book.image_link || "https://via.placeholder.com/150";
    document.getElementById("modalTitle").innerText = book.title;
    document.getElementById("modalAuthor").innerText = book.authors || "Unknown";
    document.getElementById("modalSubtitle").innerText = book.subtitle || "No subtitle";
    document.getElementById("modalDescription").innerText = book.description || "No description available.";
    document.getElementById("modalRating").innerText = book.rating + "/5" || "No rating";

    document.getElementById("modalReviews").style.display = "none";
    document.getElementById("showReviewBtn").addEventListener("click", () => fetchReviews(book.google_book_id));

    document.getElementById("addBookBtn").setAttribute("data-book-id", book.google_book_id);

    document.getElementById("bookModal").style.display = "block";
}

function closeModal() {
    document.getElementById("bookModal").style.display = "none";
}

async function searchGoogleBooks() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) {
        alert("Please enter a book title.");
        return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
        alert("You need to log in first!");
        window.location.href = "/login";
        return;
    }

    try {
        const response = await fetch(`/books/googleapi?query=${encodeURIComponent(query)}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch books from Google API.");
        }

        const books = await response.json();
        displayGoogleBooks(books);

    } catch (error) {
        console.error("Error:", error);
        alert("Error fetching books. Try again.");
    }
}

async function displayGoogleBooks(books) {
    const container = document.querySelector(".googleBooksContainer");
    container.innerHTML = "";

    if (books.length === 0) {
        container.innerHTML = "<p>No books found.</p>";
        return;
    }
    
        const bookList = document.querySelector(".googleBooksContainer"); // Selects the first element with this class
        if (!bookList) {
            console.error("Element with class googleBooksContainer not found.");
            return;
        }
        bookList.innerHTML = ""; // Очищаем контейнер перед добавлением новых элементов
        const bookCards = document.createElement("div");
        bookCards.classList.add("row");
        books.forEach(book => {
            const bookCard = document.createElement("div");
            bookCard.classList.add("col-md-3");
            bookCard.innerHTML = `
                <div class="card mb-3">
                    <img src="${book.image_link}" class="card-img-top" alt="${book.title}">
                    <div class="card-body">
                        <h5 class="card-title">${book.title}</h5>
                        <p class="card-text"><strong></strong> ${book.authors}</p>
                        <p class="card-text"><strong></strong> ${book.subtitle}</p>
                    </div>
                </div>
            `; 
            bookCard.addEventListener("click", () => openModal(book));
            bookCards.appendChild(bookCard);  
        });
        bookList.appendChild(bookCards);
}

document.getElementById("addBookBtn").addEventListener("click", async function () {
    const bookId = this.getAttribute("data-book-id"); // Получаем book_id из атрибута
    alert("hey")
    if (!bookId) {
        alert("Ошибка: ID книги не найден!");
        return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
        alert("Вы должны войти в систему!");
        return;
    }

    try {
        const response = await fetch("/books/add_google_book?book_id=" + bookId, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        if (response.ok) {
            alert("Книга успешно добавлена!");
        } else {
            alert("Ошибка: " + data.detail);
        }
        } catch (error) {
            console.error("Ошибка добавления книги:", error);
            alert("Ошибка при добавлении книги.");
        }
    });


document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append("username", document.getElementById("username").value);
    formData.append("password", document.getElementById("password").value);

    const response = await fetch("/token", {
        method: "POST",
        body: formData  // Важно: отправляем как form-data, а не JSON
    });

    const data = await response.json();
    if (response.ok) {
        alert("Login successful!");
        localStorage.setItem("access_token", data.access_token);
        window.location.href = "/books";
    } else {
        alert(data.detail);
    }
});

document.querySelectorAll('.star-rating input').forEach(star => {
    star.addEventListener('change', function() {
        document.getElementById('review-text').style.display = 'block'; // Показываем поле отзыва
        document.getElementById('submit-review').style.display = 'block'; // Показываем кнопку отправки
    });
});

async function sendReview(book) {
    const rating = document.querySelector('input[name="rating"]:checked')?.value;
    const comment = document.getElementById('review-text').value;
    const bookId = book["google_book_id"]

    if (!rating) {
        alert("Пожалуйста, выберите рейтинг!");
        return;
    }

    try {
        const response = await fetch("/reviews/", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                book_id: bookId,
                rating: parseFloat(rating),
                comment: comment
            })
        });

        if (!response.ok) {
            throw new Error("Failed to create review");
        }
        alert("Ваш отзыв сохранен!");
        document.getElementById('review-text').style.display = 'none';
        document.getElementById('submit-review').style.display = 'none';
        
        } 
    catch (error) {
        console.error("Error creating revuew:", error);
        alert("Error creating review. Please try again.");
    }
};

async function fetchReviews(bookId) {
    try {
        const response = await fetch(`/reviews/${bookId}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("access_token")}`
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch reviews");
        }
        const reviews = await response.json();
        displayReviews(reviews) 
    } catch (error) {
        console.error("Error fetching reviews:", error);
        return []; // Return empty array on error
    }
}
function displayReviews(reviews) {
    const reviewsContainer = document.getElementById("modalReviews");
    reviewsContainer.innerHTML = ""; // Clear existing reviews

    if (reviews.length === 0) {
        reviewsContainer.innerHTML = "<p>No reviews yet.</p>";
        return;
    }

    reviews.forEach(review => {
        const reviewElement = document.createElement("div");
        reviewElement.classList.add("review-card");
        reviewElement.innerHTML = `
            <p><strong>${review.user}</strong> - <span>${review.rating}⭐</span></p>
            <p>${review.comment}</p>
            <small>${new Date(review.created_at).toLocaleString()}</small>
        `;
        reviewsContainer.appendChild(reviewElement);
    });
    reviewsContainer.style.display = "block";
}
function closeReviews() {
    document.getElementById("modalReviews").style.display = "none";
}
