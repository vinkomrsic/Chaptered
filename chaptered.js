// ==============================
// GLOBAL PAGE INIT
// ==============================

// Runs once DOM is ready
// - Sets up tabs, search, shelf toggles
// - Restores book state if on detail page
document.addEventListener("DOMContentLoaded", function () {
    setupLibraryTabs();
    setupSearch();
    restoreBookState();
    setupShelfToggle();
});

// ==============================
// LIBRARY PAGE – TAB FILTERS
// - Shows matching book sections when tab is clicked
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
                if (section.id === "search-results") return; // never hide search
                const heading = section.querySelector("h2").textContent.trim().toLowerCase();
                const matches = filter === "all" || heading === filter;
                section.style.display = matches ? "block" : "none";
            });
        });
    });
}

// ==============================
// UTILITY – TOGGLE PASSWORD EYE
// - Used on login/signup forms to see the password
// ==============================
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

// ==============================
// SEARCH FUNCTION (Google Books API)
// - Active on pages with <input name="search">
// - Shows live results, max 8 books
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
// HOME PAGE – SHELF BUTTON TOGGLE
// - Toggles shelf content visibility
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
// BOOK DETAIL PAGE – SAVE BOOK STATE
// - Stores reading status & mood in localStorage + marks book as saved
// ==============================
function saveBookState() {
    const bookId = new URLSearchParams(window.location.search).get("id");
    if (!bookId) return;

    const progressInput = document.getElementById("progress");
    const moodInput = document.getElementById("mood");
    if (!progressInput || !moodInput) return;

    const state = {
        progress: progressInput.value,
        mood: moodInput.value,
    };
    localStorage.setItem(`bookState-${bookId}`, JSON.stringify(state));

    // Mark as saved in list
    let savedBooks = JSON.parse(localStorage.getItem("savedBooks") || "[]");
    if (!savedBooks.includes(bookId)) {
        savedBooks.push(bookId);
        localStorage.setItem("savedBooks", JSON.stringify(savedBooks));
    }

    alert("Book saved to your library!");
}

// ==============================
// BOOK DETAIL PAGE – RESTORE STATE
// - Loads saved status & mood if exists
// ==============================
function restoreBookState() {
    const bookId = new URLSearchParams(window.location.search).get("id");
    if (!bookId) return;

    const saved = localStorage.getItem(`bookState-${bookId}`);
    if (!saved) return;

    const { progress, mood } = JSON.parse(saved);
    const progressInput = document.getElementById("progress");
    const moodInput = document.getElementById("mood");

    if (progressInput) progressInput.value = progress || "none";
    if (moodInput) moodInput.value = mood || "";
}

// ==============================
// DETAIL PAGE – OPEN BOOK DETAIL VIEW
// ==============================
function openBookDetail(bookId) {
    window.location.href = `book.html?id=${bookId}`;
}

// ==============================
// LIBRARY PAGE – LOAD SAVED BOOKS
// - Fetches from server and shows books in correct shelf
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
                } else if (shelf === 'favourite' || shelf === 'fav') {
                    document.getElementById('fav-books').appendChild(tile);
                } else {
                    document.getElementById('fav-books').appendChild(tile);
                }
            });
        })
        .catch(err => console.error(err));
}

// ==============================
// DASHBOARD PAGE – LOAD USER BOOKS
// - Shows current reading, read, want to read on home
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
                } else {
                    document.getElementById('dashboard-fav').appendChild(tile);
                }
            });
        });
}

// ==============================
// PROFILE PAGE – LOAD PROFILE DATA
// - Shows name, bio, stats, favourite books
// ==============================
function loadProfile() {
    const username = localStorage.getItem('username');
    if (!username) return;

    fetch(`/getProfile/${username}`)
        .then(res => res.json())
        .then(data => {
            const profile = data.profile;
            const books = data.books;

            // Update name & bio
            document.querySelector('.profile-info h2').textContent = profile.name;
            document.querySelector('.profile-bio').textContent = profile.bio;

            // Stats
            const booksThisYear = books.filter(b => b.progress === 'read').length;
            const favouriteGenre = "Mystery"; // TODO: could calculate
            const moodTracker = "Dynamic Mood"; // TODO: could calculate

            document.querySelector('.quick-stat').innerHTML = `
        <p>📅 Books This Year <span>${booksThisYear}</span></p>
        <p>📚 Favorite Genre <span>${favouriteGenre}</span></p>
        <p>💭 Mood Tracker <span>${moodTracker}</span></p>
      `;

            // Favourite books
            const favBooks = books.filter(b => b.progress === 'favourite' || b.progress === 'fav');
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

// ==============================
// MASTER INIT – DECIDE WHICH PAGE NEEDS WHICH DATA
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