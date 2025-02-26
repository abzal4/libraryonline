document.addEventListener("DOMContentLoaded", function () {
    const currentPage = window.location.pathname.split("/").pop();

    if (currentPage === "library.html") {
        document.querySelector("#search")?.addEventListener("keyup", searchBooks);
    }

    const loginForm = document.querySelector("#loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
});

async function register(event) {
    event.preventDefault();  

    const formData = new FormData();
    formData.append("username", document.querySelector("#username").value);
    formData.append("email", document.querySelector("#email").value);
    formData.append("full_name", document.querySelector("#full_name").value);
    formData.append("password", document.querySelector("#password").value);

    try {
        const response = await fetch("/register", {
            method: "POST",
            body: formData 
        });

        const data = await response.json();
        if (response.ok) {
            alert("Registered successfully!");
            localStorage.setItem("access_token", data.access_token);
            window.location.href = "/login";
        } else {
            alert(data.detail);
        }
    } catch (error) {
        console.error("Registration error:", error);
        alert("An error occurred. Please try again.");
    }
}

async function handleLogin(event) {
    event.preventDefault();
    console.log("Login form submitted!");

    const formData = new FormData();
    formData.append("username", document.querySelector("#username").value);
    formData.append("password", document.querySelector("#password").value);

    try {
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
    } catch (error) {
        console.error("Login error:", error);
        alert("An error occurred. Please try again.");
    }
}

async function displayBooks() {
    const token = localStorage.getItem("access_token"); 
    if (!token) {
        alert("You need to log in first!");
        window.location.href = "/login"; 
        return;
    }

    try {
        const response = await fetch("/books/my", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,  
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch books");
        }

        const books = await response.json();
        const bookList = document.querySelector(".book-list"); 
        if (!bookList) {
            console.error("Element with class 'book-list' not found.");
            return;
        }

        bookList.innerHTML = ""; 
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
            bookCard.addEventListener("click", () => {
                openMyBookModal(book);
                openModal(book);
            });

            bookCards.appendChild(bookCard);  
        });

        bookList.appendChild(bookCards);

    } catch (error) {
        console.error("Error fetching books:", error);
        alert("Error fetching books. Please try again.");
    }
}

function readBook(event) {
    const pdfLink = event.target.getAttribute("data-pdf-link");

    if (!pdfLink) {
        alert("PDF link not found!");
        return;
    }

    window.open(pdfLink, "_blank");
}

async function deleteBook(event) {
    const bookId = event.target.getAttribute("data-book-id");

    if (!bookId) {
        alert("Book ID not found!");
        return;
    }
    
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
        event.target.closest(".col-md-3").remove();

    } catch (error) {
        console.error("Error deleting book:", error);
        alert("Error deleting book. Please try again.");
    }
}

document.addEventListener("click", function (event) {
    if (event.target.classList.contains("readButton")) {
        readBook(event);
    } else if (event.target.classList.contains("deleteButton")) {
        deleteBook(event);
    }
});

function logout() {
    localStorage.removeItem("user");
    window.location.href = "/register";
}

function navigateTo(page) {
    window.location.href = page;
}

function closeModal() {
    document.querySelector("#bookModal").style.display = "none";
}

displayBooks();

async function searchGoogleBooks() {
    const query = document.getElementById("searchInput").value.trim();
    const filter = document.querySelector('input[name="filter"]:checked')?.value || "";
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
        let url = `/books/googleapi?query=${encodeURIComponent(query)}`;
        if (filter) {
            url += `&filter=${encodeURIComponent(filter)}`;
        }
        const response = await fetch(url, {
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
                    <p class="card-text"><strong>Author:</strong> ${book.authors || "Unknown"}</p>
                    <p class="card-text"><strong>Subtitle:</strong> ${book.subtitle || "No subtitle"}</p>
                </div>
            </div>  
        `; 
        bookCard.addEventListener("click", () => openModal(book));
        bookCards.appendChild(bookCard);  
    });

    container.appendChild(bookCards);
}

function openMyBookModal(book) {
    if (book.saleability === 'FOR_SALE') {
        document.getElementById("modalBuyLink").href = book.buy_link || "#";
        document.getElementById("modalBuyLink").innerText = "Buy the book";
    }
}

function openModal(book) {
    document.getElementById("modalImage").src = book.image_link || "https://via.placeholder.com/150";
    document.getElementById("modalTitle").innerText = book.title;
    document.getElementById("modalAuthor").innerText = book.authors || "Unknown";
    document.getElementById("modalSubtitle").innerText = book.subtitle || "No subtitle";
    document.getElementById("modalDescription").innerText = book.description || "No description available.";
    document.getElementById("modalCategories").innerText = book.categories || "Unknown";
    document.getElementById("modalLanguage").innerText = book.language || "Unknown";
    document.getElementById("modalPages").innerText = book.pageCount || "Unknown";
    document.getElementById("modalSaleability").innerText = book.saleability || "Unknown";

    document.getElementById("submitReview").addEventListener("click", () => sendReview(book));
    document.getElementById("addBookBtn").setAttribute("data-book-id", book.google_book_id);
    document.getElementById("modalRating").innerText = book.rating ? `${book.rating}/5` : "No rating";

    document.getElementById("modalReviews").style.display = "none";
    document.getElementById("showReviewBtn").addEventListener("click", () => fetchReviews(book.google_book_id));

    document.getElementById("bookModal").style.display = "block";
}

document.getElementById("addBookBtn").addEventListener("click", async function () {
    const bookId = this.getAttribute("data-book-id");

    if (!bookId) {
        alert("Error: Book ID not found!");
        return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
        alert("You must be logged in!");
        return;
    }

    try {
        const response = await fetch(`/books/add_google_book?book_id=${bookId}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        if (response.ok) {
            alert("Book successfully added!");
        } else {
            alert(`Error: ${data.detail}`);
        }
    } catch (error) {
        console.error("Error adding book:", error);
        alert("Error adding book.");
    }
});

document.querySelectorAll('.star-rating').forEach(star => {
    star.addEventListener('change', function() {
        document.getElementById('review-text').style.display = 'block'; 
        document.getElementById('submit-review').style.display = 'block'; 
        document.getElementById('submitReview').style.display = 'block';
        document.getElementById('showReviewBtn').style.display = 'block';
    });
});

async function sendReview(book) {
    const rating = document.querySelector('input[name="rating"]:checked')?.value;
    const comment = document.getElementById('review-text').value;
    const bookId = book["google_book_id"];

    if (!rating) {
        alert("Please select a rating!");
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

        alert("Your review has been saved!");
        document.getElementById('review-text').style.display = 'none';
        document.getElementById('submit-review').style.display = 'none';

    } catch (error) {
        console.error("Error creating review:", error);
        alert("Error creating review. Please try again.");
    }
}

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
        displayReviews(reviews);
    } catch (error) {
        console.error("Error fetching reviews:", error);
    }
}

function displayReviews(reviews) {
    const reviewsContainer = document.getElementById("modalReviews");
    reviewsContainer.innerHTML = "";

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
