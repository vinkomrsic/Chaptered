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