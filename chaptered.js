// ==============================
// GLOBAL PAGE INIT
// ==============================
document.addEventListener("DOMContentLoaded", function () {
    setupLibraryTabs();
    setupSearch();
    restoreBookState();
    setupShelfToggle();
});

// ==============================
// LIBRARY PAGE – Tab Filter
// ==============================
function setupLibraryTabs() {
    const tabButtons = document.querySelectorAll(".tab");
    const categories = document.querySelectorAll(".book-category");

    if (!tabButtons.length || !categories.length) return;

    tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            tabButtons.forEach((btn) => btn.classList.remove("active"));
            button.classList.add("active");

            const filter = button.textContent.trim().toLowerCase();

            categories.forEach((section) => {
                const heading = section.querySelector("h2").textContent.toLowerCase();
                const matches = filter === "all" || heading.includes(filter);
                section.style.display = matches ? "block" : "none";
            });
        });
    });
}
// ==============================
// SEARCH FUNCTION (Google Books API)
// - Used across pages with <input name="search">
// - Displays up to 8 books
// ==============================
function setupSearch() {
    const searchInput = document.querySelector("input[name='search']");
    const searchResultsWrapper =
        document.getElementById("results-container") ||
        document.querySelector(".book-row");

    if (!searchInput || !searchResultsWrapper) return;

    searchInput.addEventListener("input", function () {
        const query = this.value.trim();
        if (!query) return;

        fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`)
            .then((res) => res.json())
            .then((data) => {
                const books = data.items?.slice(0, 8) || [];
                searchResultsWrapper.innerHTML = "";

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
// HOME PAGE – Shelf Button Toggle
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
// BOOK DETAIL PAGE – Save State
// ==============================
function saveBookState() {
    const bookId = new URLSearchParams(window.location.search).get("id");
    if (!bookId) return;

    const progressInput = document.getElementById("progress");
    const moodInput = document.getElementById("mood");

    if (!progressInput || !moodInput) return;

    // Save state
    const state = {
        progress: progressInput.value,
        mood: moodInput.value,
    };
    localStorage.setItem(`bookState-${bookId}`, JSON.stringify(state));

    // Also mark the book as saved
    let savedBooks = JSON.parse(localStorage.getItem("savedBooks") || "[]");
    if (!savedBooks.includes(bookId)) {
        savedBooks.push(bookId);
        localStorage.setItem("savedBooks", JSON.stringify(savedBooks));
    }

    alert("Book saved to your library!");
}

// ==============================
// BOOK DETAIL PAGE – Load State
// ==============================
function loadSavedBooks() {
    const savedBooks = JSON.parse(localStorage.getItem("savedBooks") || "[]");

    savedBooks.forEach(bookId => {
        const state = JSON.parse(localStorage.getItem(`bookState-${bookId}`) || "{}");
        fetch(`https://www.googleapis.com/books/v1/volumes/${bookId}`)
            .then(res => res.json())
            .then(data => {
                const info = data.volumeInfo;
                const title = info.title || "No Title";
                const thumbnail = info.imageLinks?.thumbnail || "booksymbol.jpg";
                const shelf = state.progress || "none"; // read / want / fav etc

                const tile = document.createElement("div");
                tile.className = "book-tile";
                tile.setAttribute("onclick", `openBookDetail('${bookId}')`);
                tile.innerHTML = `
          <img src="${thumbnail}" alt="Book Cover" class="book-cover">
          <p class="book-title">${title}</p>
        `;

                if (shelf === "read") {
                    document.querySelector("#read-books")?.appendChild(tile);
                } else if (shelf === "want") {
                    document.querySelector("#want-books")?.appendChild(tile);
                } else if (shelf === "favourite" || shelf === "fav") {
                    document.querySelector("#fav-books")?.appendChild(tile);
                } else {
                    document.querySelector("#other-books")?.appendChild(tile);
                }
            });
    });
}

// ==============================
// BOOK DETAIL PAGE – Restore State
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
// DETAIL NAVIGATION FUNCTION
// ==============================
function openBookDetail(bookId) {
    window.location.href = `book.html?id=${bookId}`;
}
document.addEventListener("DOMContentLoaded", () => {
    loadSavedBooks();
});

// ==============================
// LOAD SAVED BOOKS
// ==============================
document.addEventListener("DOMContentLoaded", loadSavedBooks);

function loadSavedBooks() {
    const username = localStorage.getItem('username');
    if (!username) {
        alert("You must be logged in to view your library.");
        return;
    }

    fetch(`/getUserBooks/${username}`)
        .then(res => res.json())
        .then(books => {
            books.forEach(book => {
                // Build a tile for each saved book
                const tile = document.createElement('div');
                tile.className = 'book-tile';
                tile.setAttribute('onclick', `openBookDetail('${book.id}')`);
                tile.innerHTML = `
          <img src="booksymbol.jpg" alt="Book Cover" class="book-cover">
          <p class="book-title">${book.id}</p>
        `;

                // Decide where to place it
                const shelf = book.progress; // 'read', 'want', etc
                if (shelf === 'read') {
                    document.getElementById('read-books').appendChild(tile);
                } else if (shelf === 'want') {
                    document.getElementById('want-books').appendChild(tile);
                } else {
                    document.getElementById('fav-books').appendChild(tile); // or currently reading / favorites
                }
            });
        })
        .catch(err => {
            console.error(err);
        });
}

document.addEventListener("DOMContentLoaded", () => {
    loadSavedBooks();
});