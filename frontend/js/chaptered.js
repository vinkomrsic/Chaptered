// Cache for the user's books for explore posts and picker
let userBooksCache = [];

// ==============================
// GLOBAL INIT
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    setupLibraryTabs();
    setupSearch();
    setupShelfToggle();
    restoreBookState();

    const path = window.location.pathname;

    if (path.includes('dashboard') || path.includes('home')) {
        loadDashboardBooks();
    }
    if (path.includes('library')) {
        loadSavedBooks();
    }
    if (path.includes('profile')) {
        loadProfile();
    }
    if (path.includes('explore')) {
        setupExploreTabs();
        loadGlobalPosts();
    }
});

// ==============================
// LIBRARY – TABS FILTER
// ==============================
function setupLibraryTabs() {
    const tabButtons = document.querySelectorAll(".tab");
    const categories = document.querySelectorAll(".book-category");
    const searchSection = document.getElementById("search-results");

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
// PASSWORD FIELD – TOGGLE VISIBILITY
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
// SEARCH BAR – GOOGLE BOOKS API
// ==============================
function setupSearch() {
    const searchInput = document.querySelector("input[name='search']") || document.getElementById('dashboard-search');
    const searchResultsWrapper = document.getElementById("results-container") || document.getElementById("currently-reading");
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
// HOME PAGE – SHELF BUTTONS
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
// BOOK DETAIL PAGE – SAVE STATE
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

    const state = {
        progress: progressInput.value,
        mood: moodInput.value,
    };
    localStorage.setItem(`bookState-${bookId}`, JSON.stringify(state));

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
// BOOK DETAIL PAGE – RESTORE STATE
// ==============================
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
// FAVOURITE BUTTON – TOGGLE STAR
// ==============================
function toggleFavourite() {
    currentFavourite = !currentFavourite;
    const icon = document.getElementById('favIcon');
    if (icon) icon.className = currentFavourite ? 'fa fa-star' : 'fa fa-star-o';
    saveBookState();
}

// ==============================
// BOOK DETAIL – OPEN PAGE NAV
// ==============================
function openBookDetail(bookId) {
    window.location.href = `book.html?id=${bookId}`;
}

// ==============================
// LIBRARY PAGE – LOAD SAVED BOOKS
// ==============================
function loadSavedBooks() {
    const username = localStorage.getItem('username');
    if (!username) return alert("You must be logged in to view your library.");

    // Clear all library sections
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

            // If no books, show friendly message but no alert
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

                // Place in main progress categories
                if (book.progress === 'reading') document.getElementById('reading-books')?.appendChild(tile.cloneNode(true));
                if (book.progress === 'read') document.getElementById('read-books')?.appendChild(tile.cloneNode(true));
                if (book.progress === 'want') document.getElementById('want-books')?.appendChild(tile.cloneNode(true));

                // Always place in "All Books" as a fallback
                document.getElementById('all-books')?.appendChild(tile);

                // If favourite, also in favourites section
                if (book.favourite) {
                    document.getElementById('fav-books')?.appendChild(tile.cloneNode(true));
                }
            });
        })
        .catch(err => {
            // Only show alert for real network/server errors
            console.error("❌ Failed to load books:", err);
        });
}


// ==============================
// DASHBOARD – LOAD BOOKS & STATS
// ==============================
function loadDashboardBooks() {
    const username = localStorage.getItem('username');
    if (!username) return;

    // Clear dashboard book rows
    ['currently-reading', 'dashboard-read', 'dashboard-want', 'dashboard-fav', 'dashboard-all'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    fetch(`/getUserBooks/${username}`)
        .then(res => res.json())
        .then(books => {
            console.log("📊 Dashboard books:", books);

            // Example stats (you can calculate real ones later)
            const booksThisYear = books.filter(b => b.progress === 'read').length;
            const favouriteGenre = books.length > 0 ? "TBD Genre" : "—";
            const moodTracker = "Coming Soon";

            const statBox = document.querySelector('.quick-stat');
            if (statBox) {
                statBox.innerHTML = `
                    <p><i class="fa fa-calendar"></i> Books This Year <span>${booksThisYear}</span></p>
                    <p><i class="fa fa-book"></i> Favorite Genre <span>${favouriteGenre}</span></p>
                    <p><i class="fa fa-comment"></i> Mood Tracker <span>${moodTracker}</span></p>
                `;
            }

            if (!books || books.length === 0) {
                document.getElementById('dashboard-all').innerHTML = `<p>No books yet. Start reading!</p>`;
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

                // Dashboard categories
                if (book.progress === 'reading') document.getElementById('currently-reading')?.appendChild(tile.cloneNode(true));
                if (book.progress === 'read') document.getElementById('dashboard-read')?.appendChild(tile.cloneNode(true));
                if (book.progress === 'want') document.getElementById('dashboard-want')?.appendChild(tile.cloneNode(true));
                if (book.favourite) document.getElementById('dashboard-fav')?.appendChild(tile.cloneNode(true));

                // Always in "All Books"
                document.getElementById('dashboard-all')?.appendChild(tile);
            });
        })
        .catch(err => {
            console.error("❌ Failed to load dashboard books:", err);
        });
}

// ==============================
// POSTS – ADD & LOAD
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
        body: JSON.stringify({
            username,
            content,
            bookId,
            photoUrl,
            musicUrl,
            location
        })
    })
        .then(res => res.text())
        .then(msg => {
            alert(msg);
            document.getElementById('postContent').value = '';
            document.getElementById('postBook').value = '';
            document.getElementById('postPhoto').value = '';
            document.getElementById('postMusic').value = '';
            document.getElementById('postLocation').value = '';
            loadUserPosts();
        });
}

// ==============================
// PROFILE PAGE – LOAD PROFILE INFO
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

            const booksThisYear = "5";
            const favouriteGenre = "Mystery";
            const moodTracker = "Dynamic Mood";

            const statBox = document.querySelector('.quick-stat');
            if (statBox) {
                statBox.innerHTML = `
                    <p><i class="fa fa-calendar"></i> Books This Year <span>${booksThisYear}</span></p>
                    <p><i class="fa fa-book"></i> Favorite Genre <span>${favouriteGenre}</span></p>
                    <p><i class="fa fa-comment"></i> Mood Tracker <span>${moodTracker}</span></p>
                `;
            }

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
        });
}

// ==============================
// EXPLORE – Tabs
// ==============================
function setupExploreTabs() {
    const tabs = document.querySelectorAll('.explore-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const mode = tab.dataset.mode;
            if (mode === 'global') loadGlobalPosts();
            else loadMyPosts();
        });
    });
}

// ==============================
// EXPLORE – Load Global + My Posts
// ==============================
function loadGlobalPosts() {
    fetch('/getAllPosts')
        .then(res => res.json())
        .then(posts => renderExplorePosts(posts));
}

function loadMyPosts() {
    const username = localStorage.getItem('username');
    fetch(`/getPosts/${username}`)
        .then(res => res.json())
        .then(posts => renderExplorePosts(posts));
}

function renderExplorePosts(posts) {
    const container = document.getElementById('explore-posts');
    if (!container) return;
    container.innerHTML = '';

    if (posts.length === 0) {
        container.innerHTML = '<p>No posts yet.</p>';
        return;
    }

    posts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post';

        // ✅ If post has bookId, show TITLE + COVER from cache
        let bookHtml = '';
        if (post.bookId) {
            const match = userBooksCache.find(b => b.id === post.bookId);
            if (match) {
                bookHtml = `
                    <div class="post-book-info">
                        <img src="${match.thumbnail}" width="40" style="vertical-align:middle;">
                        <span>${match.title}</span>
                    </div>
                `;
            } else {
                bookHtml = `<strong>📖 Book:</strong> ${post.bookId}<br>`;
            }
        }

        div.innerHTML = `
            <strong>${post.username ? post.username : 'You'}</strong><br>
            ${bookHtml}
            <p>${post.content}</p>
            ${post.photoUrl ? `<img src="${post.photoUrl}" style="max-width:200px;"><br>` : ''}
            ${post.musicUrl ? `<a href="${post.musicUrl}" target="_blank">🎵 Listen</a><br>` : ''}
            ${post.location ? `<small>📍 ${post.location}</small><br>` : ''}
            <small>${new Date(post.createdAt).toLocaleString()}</small>
        `;

        container.appendChild(div);
    });
}

// ==============================
// EXPLORE – Open book picker with "No Book" option
// ==============================
function openBookPicker() {
    const username = localStorage.getItem('username');
    fetch(`/getUserBooks/${username}`)
        .then(res => res.json())
        .then(books => {
            userBooksCache = books; // ✅ Save to cache for later

            const list = document.getElementById('bookPickerList');
            list.innerHTML = '';

            // Add "No Book" option at top
            const none = document.createElement('div');
            none.className = 'book-picker-item';
            none.textContent = 'No Book';
            none.onclick = () => selectBook(null);
            list.appendChild(none);

            // Add all user books
            books.forEach(book => {
                const item = document.createElement('div');
                item.className = 'book-picker-item';
                item.innerHTML = `
                    <img src="${book.thumbnail}" width="40" height="auto">
                    <span>${book.title}</span>
                `;
                item.onclick = () => selectBook(book);
                list.appendChild(item);
            });

            document.getElementById('bookPickerModal').style.display = 'flex';
        });
}

// ==============================
// EXPLORE – Select a book or "No Book"
// ==============================
function selectBook(book) {
    if (book) {
        document.getElementById('postBook').value = book.id;
        document.getElementById('selectedBookTitle').textContent = book.title;
        const cover = document.getElementById('selectedBookCover');
        cover.src = book.thumbnail;
        cover.style.display = 'inline-block';
    } else {
        // No book selected
        document.getElementById('postBook').value = '';
        document.getElementById('selectedBookTitle').textContent = 'Click to select a book';
        document.getElementById('selectedBookCover').style.display = 'none';
    }

    closeBookPicker();
}

// ==============================
// EXPLORE – Close book picker modal
// ==============================
function closeBookPicker() {
    document.getElementById('bookPickerModal').style.display = 'none';
}
