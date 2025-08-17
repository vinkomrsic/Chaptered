// ==============================
// BOOK DETAIL PAGE – FETCH / SAVE / REMOVE / FAVOURITE
// ==============================

let savedTitle = "";
let savedThumbnail = "";
let isSaved = false;
let currentFavourite = false;

document.addEventListener('DOMContentLoaded', () => {
    const isBookPage = /book\.html/i.test(window.location.pathname);
    if (!isBookPage) return;

    const params = new URLSearchParams(window.location.search);
    const bookId = params.get("id");
    if (!bookId) return;

    // Fetch and render book info from Google Books API
    fetch(`https://www.googleapis.com/books/v1/volumes/${bookId}`)
        .then(res => res.json())
        .then(data => {
            const info = data.volumeInfo;
            savedTitle = info.title || "No Title";
            savedThumbnail = info.imageLinks?.thumbnail || "booksymbol.jpg";

            document.getElementById("book-detail").innerHTML = `
                <h2>${savedTitle}</h2>
                <p><strong>Author:</strong> ${info.authors?.join(", ") || "Unknown"}</p>
                <p><strong>Published:</strong> ${info.publishedDate || "N/A"}</p>
                <p><strong>Description:</strong> ${info.description || "No description available."}</p>
                <img src="${savedThumbnail}" class="book-cover" alt="Book cover of ${savedTitle}">
            `;

            document.getElementById("extra-info").innerHTML = `
                <p><strong>Rating:</strong> ${info.averageRating ?? "Not rated"}</p>
                <p><strong>Pages:</strong> ${info.pageCount ?? "Unknown"}</p>
                <p><strong>Tags:</strong> ${info.categories?.join(", ") ?? "None"}</p>
            `;

            checkIfSaved();
        })
        .catch(() => {
            document.getElementById("book-detail").innerHTML = "<p>Error loading book details.</p>";
        });
});

function checkIfSaved() {
    const username = localStorage.getItem('username');
    const bookId = new URLSearchParams(window.location.search).get("id");
    if (!username || !bookId) return;

    fetch(`/getUserBooks/${username}`)
        .then(res => res.json())
        .then(books => {
            const match = books.find(b => b.id === bookId);
            isSaved = !!match;
            if (match) {
                document.getElementById("progress").value = match.progress || "none";
                document.getElementById("mood").value = match.mood || "";
                currentFavourite = !!match.favourite;
            } else {
                currentFavourite = false;
            }
            updateFavIcon();
            updateSaveRemoveButton();
        });
}

function toggleSaveRemove() {
    const username = localStorage.getItem('username');
    const bookId = new URLSearchParams(window.location.search).get("id");
    const progress = document.getElementById("progress").value;
    const mood = document.getElementById("mood").value;
    if (!username || !bookId) return;

    if (isSaved) {
        fetch('/removeBook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, bookId })
        }).then(() => {
            isSaved = false;
            updateSaveRemoveButton();
            alert("Book removed from your library!");
        });
    } else {
        fetch('/saveBook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                book: {
                    id: bookId,
                    title: savedTitle,
                    thumbnail: savedThumbnail,
                    progress,
                    mood,
                    favourite: currentFavourite
                }
            })
        }).then(() => {
            isSaved = true;
            updateSaveRemoveButton();
            alert("Book saved to your library!");
        });
    }
}

function toggleFavourite() {
    currentFavourite = !currentFavourite;
    updateFavIcon();

    const username = localStorage.getItem('username');
    const bookId = new URLSearchParams(window.location.search).get("id");
    if (!username || !bookId) return;

    if (isSaved) {
        const progress = document.getElementById("progress").value;
        const mood = document.getElementById("mood").value;
        fetch('/saveBook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                book: {
                    id: bookId,
                    title: savedTitle,
                    thumbnail: savedThumbnail,
                    progress,
                    mood,
                    favourite: currentFavourite
                }
            })
        }).catch(() => alert("Failed to update favourite on server."));
    } else {
        alert("Please save this book first to mark it as favourite.");
    }
}

function updateSaveRemoveButton() {
    const btn = document.getElementById("saveRemoveButton");
    if (btn) btn.textContent = isSaved ? "Remove" : "Save";
}

function updateFavIcon() {
    const icon = document.getElementById('favIcon');
    if (icon) icon.className = currentFavourite ? 'fa fa-star' : 'fa fa-star-o';
}

// ==============================
// BOOK DETAILS – MOOD PICKER bridge (ADD-ONLY)
// Keeps your existing #mood value flow intact.
// ==============================

function resolveCurrentBookId() {
    try {
        const url = new URL(window.location.href);
        const byId = url.searchParams.get('id') || url.searchParams.get('bookId');
        if (byId) return byId;
    } catch (_) {}
    if (window.currentBookId) return String(window.currentBookId);
    const detail = document.getElementById('book-detail');
    if (detail && detail.dataset && detail.dataset.bookId) return detail.dataset.bookId;
    return null;
}

async function postBookMood(bookId, mood) {
    const username = localStorage.getItem('username');
    if (!username) { alert('You must be logged in to set a mood.'); return; }
    try {
        const res = await fetch(`/books/${encodeURIComponent(bookId)}/mood`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, mood })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        console.log('✅ Mood saved:', data);
    } catch (err) {
        console.error('❌ Failed to save mood:', err);
        alert('Failed to save mood for this book.');
    }
}

function setPickerActive(picker, moodValue) {
    picker.querySelectorAll('button').forEach(b => {
        const isActive = (b.dataset.mood === moodValue);
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

function setupMoodPicker() {
    const picker = document.getElementById('mood-picker');
    const hidden = document.getElementById('mood'); // compatibility input
    if (!picker || !hidden) return;

    picker.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', async () => {
            // clear active
            picker.querySelectorAll('button').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false'); // accessibility reset
            });
            // set active
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true'); // accessibility feedback

            const moodValue = btn.dataset.mood;
            hidden.value = moodValue; // keep your existing save/remove flow intact

            // If book isn't saved yet, don't call the backend — just store & highlight.
            // Uses your existing top-level `isSaved` flag.
            if (!window.isSaved && typeof isSaved !== 'undefined' && !isSaved) {
                console.log('Mood set locally (book not saved yet). Will be saved with /saveBook.');
                return;
            }

            // Book is already saved -> send to backend immediately
            const bookId = resolveCurrentBookId();
            if (!bookId) { console.warn('No bookId found for mood update.'); return; }
            await postBookMood(bookId, moodValue);
        });
    });

    // Initial sync from hidden (set by checkIfSaved()) so the correct button shows active
    const trySyncFromHidden = () => {
        const v = (hidden.value || '').trim();
        if (!v) return;
        picker.querySelectorAll('button').forEach(b => {
            const active = b.dataset.mood === v;
            b.classList.toggle('active', active);
            b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    };
    trySyncFromHidden();
    setTimeout(trySyncFromHidden, 400);
    setTimeout(trySyncFromHidden, 1000);
}

document.addEventListener('DOMContentLoaded', setupMoodPicker);