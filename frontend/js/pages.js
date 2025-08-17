// ==============================
// GLOBAL INIT (core pages only)
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    // Always-available UI hooks
    setupLibraryTabs();
    setupSearch();
    setupShelfToggle();

    const path = window.location.pathname;

    // Bootstraps per page
    if (path.includes('dashboard') || path.includes('home')) loadDashboardBooks();
    if (path.includes('library')) loadSavedBooks();
    if (path.includes('profile')) loadProfile();

    // If stats box exists, load stats
    if (document.querySelector('.quick-stat')) fetchAndRenderStats();

    // Explore & Book pages initialize in their own files
});

// ==============================
// LIBRARY – Tabs filter
// ==============================
function setupLibraryTabs() {
    const tabButtons = document.querySelectorAll(".tab");
    const categories = document.querySelectorAll(".book-category");
    if (!tabButtons.length || !categories.length) return;

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            tabButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            const filter = button.textContent.trim().toLowerCase();
            categories.forEach(section => {
                if (section.id === "search-results") return;
                const heading = section.querySelector("h2").textContent.trim().toLowerCase();
                section.style.display = (filter === "all" || heading === filter) ? "block" : "none";
            });
        });
    });
}

// ==============================
// SEARCH BAR – Google Books API
// ==============================
function setupSearch() {
    const searchInput = document.querySelector("input[name='search']") || document.getElementById('dashboard-search');
    const searchResultsWrapper = document.getElementById("results-container") || document.getElementById("currently-reading");
    const searchSection = document.getElementById("search-results");
    if (!searchInput || !searchResultsWrapper) return;

    searchInput.addEventListener("input", function () {
        const query = this.value.trim();

        // Clear when empty
        if (!query) {
            searchResultsWrapper.innerHTML = "";
            if (searchSection) searchSection.style.display = "none";
            return;
        }

        // Query Google Books
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
// HOME PAGE – Shelf toggle
// ==============================
function setupShelfToggle() {
    const shelfButtons = document.querySelectorAll(".shelf-button");
    const shelfContents = document.querySelectorAll(".shelf-content");
    if (!shelfButtons.length || !shelfContents.length) return;

    shelfButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetId = "shelf-" + button.dataset.target;

            shelfButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            shelfContents.forEach(content => {
                content.style.display = (content.id === targetId) ? "block" : "none";
            });
        });
    });
}

// ==============================
// LIBRARY PAGE – Load saved books
// ==============================
function loadSavedBooks() {
    const username = localStorage.getItem('username');
    if (!username) return alert("You must be logged in to view your library.");

    // Clear all sections
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
            if (!books || books.length === 0) {
                const all = document.getElementById('all-books');
                if (all) all.innerHTML = `<p>No books in your library yet.</p>`;
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

                if (book.progress === 'reading') document.getElementById('reading-books')?.appendChild(tile.cloneNode(true));
                if (book.progress === 'read') document.getElementById('read-books')?.appendChild(tile.cloneNode(true));
                if (book.progress === 'want') document.getElementById('want-books')?.appendChild(tile.cloneNode(true));
                document.getElementById('all-books')?.appendChild(tile);
                if (book.favourite) document.getElementById('fav-books')?.appendChild(tile.cloneNode(true));
            });
        })
        .catch(err => console.error("Failed to load books:", err));
}

// ==============================
// DASHBOARD – Load books
// ==============================
function loadDashboardBooks() {
    const username = localStorage.getItem('username');
    if (!username) return;

    // Clear all dashboard sections
    ['currently-reading', 'dashboard-read', 'dashboard-want', 'dashboard-fav', 'dashboard-all'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    // Fetch stats right away
    fetchAndRenderStats();

    fetch(`/getUserBooks/${username}`)
        .then(res => res.json())
        .then(books => {
            if (!books || books.length === 0) {
                const all = document.getElementById('dashboard-all');
                if (all) all.innerHTML = `<p>No books yet. Start reading!</p>`;
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

                if (book.progress === 'reading') document.getElementById('currently-reading')?.appendChild(tile.cloneNode(true));
                if (book.progress === 'read') document.getElementById('dashboard-read')?.appendChild(tile.cloneNode(true));
                if (book.progress === 'want') document.getElementById('dashboard-want')?.appendChild(tile.cloneNode(true));
                if (book.favourite) document.getElementById('dashboard-fav')?.appendChild(tile.cloneNode(true));
                document.getElementById('dashboard-all')?.appendChild(tile);
            });
        })
        .catch(err => console.error("Failed to load dashboard books:", err));
}

// ==============================
// POSTS – Add new post
// ==============================
function addPost() {
    const username = localStorage.getItem('username');
    const content = document.getElementById('postContent').value.trim();
    const bookId = document.getElementById('postBook').value.trim();
    const photoUrl = document.getElementById('postPhoto').value.trim();
    const musicUrl = document.getElementById('postMusic').value.trim();
    const location = document.getElementById('postLocation').value.trim();

    if (!content) return alert('Write something!');

    fetch('/addPost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, content, bookId, photoUrl, musicUrl, location })
    })
        .then(res => res.text())
        .then(msg => {
            alert(msg);
            document.getElementById('postContent').value = '';
            document.getElementById('postBook').value = '';
            document.getElementById('postPhoto').value = '';
            document.getElementById('postMusic').value = '';
            document.getElementById('postLocation').value = '';
            loadUserPosts?.(); // optional refresh; doesnt seem to work
        });
}

// ==============================
// PROFILE – Load profile info
// ==============================
function loadProfile() {
    const username = localStorage.getItem('username');
    if (!username) return;

    // Stats immediately
    fetchAndRenderStats();

    fetch(`/getProfile/${username}`)
        .then(res => res.json())
        .then(data => {
            const profile = data.profile;
            const books = data.books;

            document.querySelector('.profile-info h2').textContent = profile.name;
            document.querySelector('.profile-bio').textContent = profile.bio;

            // Show favourites
            const favBooks = books.filter(b => b.favourite);
            const favContainer = document.querySelector('.book-category .book-row');
            if (favContainer) {
                favContainer.innerHTML = '';
                favBooks.forEach(book => {
                    const tile = document.createElement('div');
                    tile.className = 'book-tile';
                    tile.setAttribute('onclick', `openBookDetail('${book.id}')`);
                    tile.innerHTML = `<img src="${book.thumbnail}" class="book-cover"><p class="book-title">${book.title}</p>`;
                    favContainer.appendChild(tile);
                });
            }
        })
        .catch(err => console.error('Failed to load profile:', err));
}

// ==============================
// PROFILE – Logout button
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }
});

// ==============================
// DASHBOARD & PROFILE – Stats box
// ==============================
async function fetchAndRenderStats() {
    const statBox = document.querySelector('.quick-stat');
    const username = localStorage.getItem('username');
    if (!statBox) return;
    if (!username) {
        statBox.innerHTML = `
          <p><i class="fa fa-calendar"></i> Books This Year <span>—</span></p>
          <p><i class="fa fa-book"></i> Favorite Genre <span>—</span></p>
          <p><i class="fa fa-comment"></i> Mood Tracker <span>— (login required)</span></p>
        `;
        return;
    }

    try {
        const res = await fetch(`/stats/${encodeURIComponent(username)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const stats = await res.json();
        renderQuickStatBox(stats);
    } catch (err) {
        console.error('Failed to load stats:', err);
        statBox.innerHTML = `
          <p><i class="fa fa-calendar"></i> Books This Year <span>—</span></p>
          <p><i class="fa fa-book"></i> Favorite Genre <span>—</span></p>
          <p><i class="fa fa-comment"></i> Mood Tracker <span>— (failed to load)</span></p>
        `;
    }
}

// Render stats into .quick-stat
function renderQuickStatBox(stats) {
    const statBox = document.querySelector('.quick-stat');
    if (!statBox) return;

    const booksThisYear = typeof stats.booksThisYear === 'number' ? stats.booksThisYear : '—';
    const moodTrackerPrimary = (stats.moodTracker && stats.moodTracker !== '—')
        ? stats.moodTracker
        : (stats.avgMood30dLabel || '—');

    const avg30Label = stats.avgMood30dLabel || '—';
    const avg30Score = (typeof stats.avgMood30dScore === 'number') ? `${stats.avgMood30dScore}/5` : '—';

    statBox.innerHTML = `
      <p><i class="fa fa-calendar"></i> Books This Year <span>${booksThisYear}</span></p>
      <p><i class="fa fa-comment"></i> Mood Tracker <span>${moodTrackerPrimary}</span></p>
      <p><i class="fa fa-smile-o"></i> Avg Mood (30d) <span>${avg30Label} • ${avg30Score}</span></p>
    `;
}