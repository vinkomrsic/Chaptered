// ==============================
// GLOBAL INIT
// ------------------------------
// Runs when DOM is ready:
// - Sets up library tabs, search bar, shelf toggle on Home
// - Restores book state on Book Detail page
// - Loads saved books or profile if needed
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    setupLibraryTabs();
    setupSearch();
    restoreBookState();
    setupShelfToggle();

    if (window.location.pathname.includes('dashboard')) {
        loadDashboardBooks();
    }
    if (window.location.pathname.includes('library')) {
        loadSavedBooks();
    }
    if (window.location.pathname.includes('profile')) {
        loadProfile();
    }
});

// ==============================
// LIBRARY – TABS FILTER
// ------------------------------
// Filters library page sections (Read, Favourites, etc)
// when user clicks a tab
// ==============================
function setupLibraryTabs() {
    const tabButtons = document.querySelectorAll(".tab");
    const categories = document.querySelectorAll(".book-category");
    const searchSection = document.getElementById("search-results");

    if (!tabButtons.length || !categories.length) return;

    tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            tabButtons.forEach((btn) => btn.classList.remove("active"));
            button.classList.add("active");

            const filter = button.textContent.trim().toLowerCase();

            categories.forEach((section) => {
                if (section.id === "search-results") return; // Never hide search
                const heading = section.querySelector("h2").textContent.trim().toLowerCase();
                const matches = filter === "all" || heading === filter;
                section.style.display = matches ? "block" : "none";
            });
        });
    });
}

// ==============================
// PASSWORD FIELD – TOGGLE VISIBILITY
// ------------------------------
// Used in login/signup forms to show/hide password text
// ==============================
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// ==============================
// SEARCH BAR – GOOGLE BOOKS API
// ------------------------------
// Works on Home & Library pages
// Shows live results for up to 8 books
// ==============================
function setupSearch() {
    const searchInput = document.querySelector("input[name='search']");
    const searchResultsWrapper =
        document.getElementById("results-container") ||
        document.getElementById("currently-reading");

    const searchSection = document.getElementById("search-results");

    if (!searchInput || !searchResultsWrapper) return;

    searchInput.addEventListener("input", function () {
        const query = this.value.trim();

        if (!query) {
            searchResultsWrapper.innerHTML = "";
            if (searchSection) searchSection.style.display = "none";
            return;
        }

        fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`)
            .then((res) => res.json())
            .then((data) => {
                const books = data.items?.slice(0, 8) || [];
                searchResultsWrapper.innerHTML = "";

                if (searchSection) {
                    searchSection.style.display = books.length ? "block" : "none";
                }

                books.forEach((item) => {
                    const info = item.volumeInfo;
                    const title = info.title || "No title";
                    const thumbnail = info.imageLinks?.thumbnail || "booksymbol.jpg";
                    const bookId = item.id;

                    const tile = document.createElement("div");
                    tile.className = "book-tile";
                    tile.setAttribute("onclick", `openBookDetail('${bookId}')`);
                    tile.innerHTML = `
                        <img src="${thumbnail}" alt="Book Cover" class="book-cover">
                        <p class="book-title">${title}</p>
                    `;
                    searchResultsWrapper.appendChild(tile);
                });
            });
    });
}

// ==============================
// HOME PAGE – SHELF BUTTONS
// ------------------------------
// Toggles visibility for Read, Want to Read, Favourites
// on the dashboard/home page
// ==============================
function setupShelfToggle() {
    const shelfButtons = document.querySelectorAll(".shelf-button");
    const shelfContents = document.querySelectorAll(".shelf-content");

    if (!shelfButtons.length || !shelfContents.length) return;

    shelfButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const targetId = "shelf-" + button.dataset.target;

            shelfButtons.forEach((btn) => btn.classList.remove("active"));
            button.classList.add("active");

            shelfContents.forEach((content) => {
                content.style.display = content.id === targetId ? "block" : "none";
            });
        });
    });
}

// ==============================
// BOOK DETAIL PAGE – SAVE STATE
// ------------------------------
// Saves reading status, mood, and favourite flag to server
// Also updates localStorage state for progress & mood
// ==============================
function saveBookState() {
    const bookId = new URLSearchParams(window.location.search).get("id");
    if (!bookId) return;

    const progressInput = document.getElementById("progress");
    const moodInput = document.getElementById("mood");
    if (!progressInput || !moodInput) return;

    // Use the global `currentFavourite` flag (set in toggleFavourite)
    const state = {
        progress: progressInput.value,
        mood: moodInput.value,
    };
    localStorage.setItem(`bookState-${bookId}`, JSON.stringify(state));

    let savedBooks = JSON.parse(localStorage.getItem("savedBooks") || "[]");
    if (!savedBooks.includes(bookId)) {
        savedBooks.push(bookId);
        localStorage.setItem("savedBooks", JSON.stringify(savedBooks));
    }

    // Also send updated book to server with favourite flag
    const username = localStorage.getItem('username');
    fetch('/saveBook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: username,
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
// BOOK DETAIL PAGE – RESTORE STATE
// ------------------------------
// Loads local reading status, mood and checks server for favourite flag
// ==============================
let currentFavourite = false; // global for toggleFavourite()

function restoreBookState() {
    const bookId = new URLSearchParams(window.location.search).get("id");
    if (!bookId) return;

    const saved = localStorage.getItem(`bookState-${bookId}`);
    if (saved) {
        const { progress, mood } = JSON.parse(saved);
        const progressInput = document.getElementById("progress");
        const moodInput = document.getElementById("mood");
        if (progressInput) progressInput.value = progress || "none";
        if (moodInput) moodInput.value = mood || "";
    }

    // Also get favourite flag from server
    const username = localStorage.getItem('username');
    if (username) {
        fetch(`/getUserBooks/${username}`)
            .then(res => res.json())
            .then(books => {
                const savedBook = books.find(b => b.id === bookId);
                if (savedBook && savedBook.favourite) {
                    currentFavourite = true;
                    document.getElementById('favIcon').className = 'fa fa-star';
                }
            });
    }
}

// ==============================
// FAVOURITE BUTTON – TOGGLE STAR
// ------------------------------
// Updates global flag + icon, then re-saves to server
// ==============================
function toggleFavourite() {
    currentFavourite = !currentFavourite;
    const icon = document.getElementById('favIcon');
    icon.className = currentFavourite ? 'fa fa-star' : 'fa fa-star-o';

    // Also push to server immediately
    saveBookState();
}

// ==============================
// BOOK DETAIL – OPEN PAGE NAV
// ------------------------------
// Universal helper to open detail page for given ID
// ==============================
function openBookDetail(bookId) {
    window.location.href = `book.html?id=${bookId}`;
}

// ==============================
// LIBRARY PAGE – LOAD SAVED BOOKS
// ------------------------------
// Loads saved books from server & displays in the correct shelf
// ==============================
function loadSavedBooks() {
    const username = localStorage.getItem('username');
    if (!username) {
        alert("You must be logged in to view your library.");
        return;
    }

    document.getElementById('reading-books').innerHTML = '';
    document.getElementById('read-books').innerHTML = '';
    document.getElementById('want-books').innerHTML = '';
    document.getElementById('fav-books').innerHTML = '';

    fetch(`/getUserBooks/${username}`)
        .then(res => res.json())
        .then(books => {
            books.forEach(book => {
                const tile = document.createElement('div');
                tile.className = 'book-tile';
                tile.setAttribute('onclick', `openBookDetail('${book.id}')`);
                tile.innerHTML = `
                    <img src="${book.thumbnail}" alt="Book Cover" class="book-cover">
                    <p class="book-title">${book.title}</p>
                `;

                const shelf = book.progress;
                if (shelf === 'reading') {
                    document.getElementById('reading-books').appendChild(tile);
                } else if (shelf === 'read') {
                    document.getElementById('read-books').appendChild(tile);
                } else if (shelf === 'want') {
                    document.getElementById('want-books').appendChild(tile);
                } else if (book.favourite === true) {
                    document.getElementById('fav-books').appendChild(tile);
                } else {
                    document.getElementById('fav-books').appendChild(tile);
                }
            });
        })
        .catch(err => console.error(err));
}

// ==============================
// DASHBOARD – LOAD BOOKS FOR HOME
// ------------------------------
// Shows current reading, read, want, fav on home
// ==============================
function loadDashboardBooks() {
    const username = localStorage.getItem('username');
    if (!username) return;

    fetch(`/getUserBooks/${username}`)
        .then(res => res.json())
        .then(books => {
            books.forEach(book => {
                const tile = document.createElement('div');
                tile.className = 'book-tile';
                tile.setAttribute('onclick', `openBookDetail('${book.id}')`);
                tile.innerHTML = `
                    <img src="${book.thumbnail}" alt="Book Cover" class="book-cover">
                    <p class="book-title">${book.title}</p>
                `;

                if (book.progress === 'reading') {
                    document.getElementById('currently-reading').appendChild(tile);
                } else if (book.progress === 'read') {
                    document.getElementById('dashboard-read').appendChild(tile);
                } else if (book.progress === 'want') {
                    document.getElementById('dashboard-want').appendChild(tile);
                } else if (book.favourite === true) {
                    document.getElementById('dashboard-fav').appendChild(tile);
                } else {
                    document.getElementById('dashboard-fav').appendChild(tile);
                }
            });
        });
}

// ==============================
// PROFILE PAGE – LOAD PROFILE
// ------------------------------
// Loads name, bio, stats, favourites for profile page
// ==============================
function loadProfile() {
    const username = localStorage.getItem('username');
    if (!username) return;

    fetch(`/getProfile/${username}`)
        .then(res => res.json())
        .then(data => {
            const profile = data.profile;
            const books = data.books;

            document.querySelector('.profile-info h2').textContent = profile.name;
            document.querySelector('.profile-bio').textContent = profile.bio;

            const booksThisYear = books.filter(b => b.progress === 'read').length;
            const favouriteGenre = "Mystery"; // Placeholder
            const moodTracker = "Dynamic Mood"; // Placeholder

            document.querySelector('.quick-stat').innerHTML = `
                <p>📅 Books This Year <span>${booksThisYear}</span></p>
                <p>📚 Favorite Genre <span>${favouriteGenre}</span></p>
                <p>💭 Mood Tracker <span>${moodTracker}</span></p>
            `;

            const favBooks = books.filter(b => b.favourite === true);
            const favContainer = document.querySelector('.book-category .book-row');
            favContainer.innerHTML = '';

            favBooks.forEach(book => {
                const tile = document.createElement('div');
                tile.className = 'book-tile';
                tile.setAttribute('onclick', `openBookDetail('${book.id}')`);
                tile.innerHTML = `
                    <img src="${book.thumbnail}" alt="Book Cover" class="book-cover">
                    <p class="book-title">${book.title}</p>
                `;
                favContainer.appendChild(tile);
            });
        })
        .catch(err => console.error(err));
}