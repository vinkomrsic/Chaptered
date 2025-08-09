// ==============================
// GLOBAL CACHE
// ==============================

// Stores user's books in memory so we don't keep fetching them again
let userBooksCache = [];

// ==============================
// GLOBAL INIT – Page-specific setups
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    // Setup interactive elements common to multiple pages
    setupLibraryTabs();
    setupSearch();
    setupShelfToggle();
    restoreBookState();

    const path = window.location.pathname;

    // Load dashboard data
    if (path.includes('dashboard') || path.includes('home')) {
        loadDashboardBooks();
    }
    // Load library data
    if (path.includes('library')) {
        loadSavedBooks();
    }
    // Load profile data
    if (path.includes('profile')) {
        loadProfile();
    }
    // Setup explore page
    if (path.includes('explore')) {
        setupExploreTabs();
        loadGlobalPosts();
    }
});

// ==============================
// LIBRARY – Tabs to filter books by category
// ==============================
function setupLibraryTabs() {
    const tabButtons = document.querySelectorAll(".tab");
    const categories = document.querySelectorAll(".book-category");

    if (!tabButtons.length || !categories.length) return;

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Reset active state
            tabButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            const filter = button.textContent.trim().toLowerCase();
            categories.forEach(section => {
                if (section.id === "search-results") return; // Skip search results section
                const heading = section.querySelector("h2").textContent.trim().toLowerCase();
                // Show only matching category or "All"
                section.style.display = (filter === "all" || heading === filter) ? "block" : "none";
            });
        });
    });
}

// ==============================
// PASSWORD FIELD – Toggle password visibility
// ==============================
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    if (passwordInput && eyeIcon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeIcon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            eyeIcon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    }
}

// ==============================
// SEARCH BAR – Uses Google Books API to fetch book data
// ==============================
function setupSearch() {
    const searchInput = document.querySelector("input[name='search']") || document.getElementById('dashboard-search');
    const searchResultsWrapper = document.getElementById("results-container") || document.getElementById("currently-reading");
    const searchSection = document.getElementById("search-results");

    if (!searchInput || !searchResultsWrapper) return;

    searchInput.addEventListener("input", function () {
        const query = this.value.trim();
        if (!query) {
            // Clear results if query is empty
            searchResultsWrapper.innerHTML = "";
            if (searchSection) searchSection.style.display = "none";
            return;
        }

        // Fetch from Google Books API
        fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
                const books = data.items?.slice(0, 8) || [];
                searchResultsWrapper.innerHTML = "";
                if (searchSection) searchSection.style.display = books.length ? "block" : "none";
                books.forEach(item => {
                    const info = item.volumeInfo;
                    const tile = document.createElement("div");
                    tile.className = "book-tile";
                    tile.setAttribute("onclick", `openBookDetail('${item.id}')`);
                    tile.innerHTML = `
                        <img src="${info.imageLinks?.thumbnail || 'booksymbol.jpg'}" alt="Book Cover" class="book-cover">
                        <p class="book-title">${info.title || 'No title'}</p>
                    `;
                    searchResultsWrapper.appendChild(tile);
                });
            });
    });
}

// ==============================
// HOME PAGE – Toggle book shelves (Reading, Read, Want, etc.)
// ==============================
function setupShelfToggle() {
    const shelfButtons = document.querySelectorAll(".shelf-button");
    const shelfContents = document.querySelectorAll(".shelf-content");
    if (!shelfButtons.length || !shelfContents.length) return;

    shelfButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetId = "shelf-" + button.dataset.target;
            // Update active button and show only the matching shelf
            shelfButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            shelfContents.forEach(content => {
                content.style.display = (content.id === targetId) ? "block" : "none";
            });
        });
    });
}

// ==============================
// BOOK DETAIL PAGE – Save current progress & mood to DB + localStorage
// ==============================
let savedTitle = "";
let savedThumbnail = "";
let currentFavourite = false;

function saveBookState() {
    const bookId = new URLSearchParams(window.location.search).get("id");
    if (!bookId) return;

    const progressInput = document.getElementById("progress");
    const moodInput = document.getElementById("mood");
    if (!progressInput || !moodInput) return;

    // Save to localStorage
    const state = {
        progress: progressInput.value,
        mood: moodInput.value,
    };
    localStorage.setItem(`bookState-${bookId}`, JSON.stringify(state));

    // Save to backend
    const username = localStorage.getItem('username');
    fetch('/saveBook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username,
            book: {
                id: bookId,
                title: savedTitle,
                thumbnail: savedThumbnail,
                progress: progressInput.value,
                mood: moodInput.value,
                favourite: currentFavourite || false
            }
        })
    });

    alert("Book saved to your library!");
}

// ==============================
// BOOK DETAIL PAGE – Restore progress/mood from localStorage + backend
// ==============================
function restoreBookState() {
    const bookId = new URLSearchParams(window.location.search).get("id");
    if (!bookId) return;

    // Restore from localStorage
    const saved = localStorage.getItem(`bookState-${bookId}`);
    if (saved) {
        const { progress, mood } = JSON.parse(saved);
        const progressInput = document.getElementById("progress");
        const moodInput = document.getElementById("mood");
        if (progressInput) progressInput.value = progress || "none";
        if (moodInput) moodInput.value = mood || "";
    }

    // Fetch from backend to update title, thumbnail, favourite state
    const username = localStorage.getItem('username');
    if (username) {
        fetch(`/getUserBooks/${username}`)
            .then(res => res.json())
            .then(books => {
                const savedBook = books.find(b => b.id === bookId);
                if (savedBook) {
                    savedTitle = savedBook.title;
                    savedThumbnail = savedBook.thumbnail;
                    if (savedBook.favourite) {
                        currentFavourite = true;
                        const icon = document.getElementById('favIcon');
                        if (icon) icon.className = 'fa fa-star';
                    }
                }
            });
    }
}

// ==============================
// Toggle favourite state (star icon)
// ==============================
function toggleFavourite() {
    currentFavourite = !currentFavourite;
    const icon = document.getElementById('favIcon');
    if (icon) icon.className = currentFavourite ? 'fa fa-star' : 'fa fa-star-o';
    saveBookState();
}

// ==============================
// Open a book's detail page
// ==============================
function openBookDetail(bookId) {
    window.location.href = `book.html?id=${bookId}`;
}

// ==============================
// LIBRARY PAGE – Load books from backend & display them in categories
// ==============================
function loadSavedBooks() {
    const username = localStorage.getItem('username');
    if (!username) return alert("You must be logged in to view your library.");

    // Clear book sections
    ['reading-books', 'read-books', 'want-books', 'fav-books', 'all-books'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    fetch(`/getUserBooks/${username}`)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(books => {
            console.log("📚 Loaded books:", books);

            // Show message if empty
            if (!books || books.length === 0) {
                document.getElementById('all-books').innerHTML = `<p>No books in your library yet.</p>`;
                return;
            }

            books.forEach(book => {
                const tile = document.createElement('div');
                tile.className = 'book-tile';
                tile.setAttribute('onclick', `openBookDetail('${book.id}')`);
                tile.innerHTML = `
                    <img src="${book.thumbnail}" class="book-cover">
                    <p class="book-title">${book.title}</p>
                `;

                // Categorize book
                if (book.progress === 'reading') document.getElementById('reading-books')?.appendChild(tile.cloneNode(true));
                if (book.progress === 'read') document.getElementById('read-books')?.appendChild(tile.cloneNode(true));
                if (book.progress === 'want') document.getElementById('want-books')?.appendChild(tile.cloneNode(true));
                if (book.favourite) document.getElementById('fav-books')?.appendChild(tile.cloneNode(true));

                // Always in All Books
                document.getElementById('all-books')?.appendChild(tile);
            });
        })
        .catch(err => {
            console.error("❌ Failed to load books:", err);
        });
}