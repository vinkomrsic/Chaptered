// ==============================
// EXPLORE – Tabs, Load, Picker, UI toggles
// ==============================

// Ensure the shared cache exists even if common.js wasn't loaded for some reason
window.userBooksCache = window.userBooksCache || [];

// Boot only on the explore page
document.addEventListener('DOMContentLoaded', () => {
    const isExplore = /explore\.html/i.test(window.location.pathname);
    if (!isExplore) return;

    // Wire the "Create a New Post" toggle
    const toggleBtn = document.getElementById("togglePostForm");
    const formContainer = document.getElementById("postFormContainer");
    if (toggleBtn && formContainer) {
        toggleBtn.addEventListener("click", () => {
            formContainer.classList.toggle("hidden");
        });
    }

    // Prefetch user's books so post rendering has titles/covers
    const username = localStorage.getItem('username');
    if (username) {
        fetch(`/getUserBooks/${username}`)
            .then(res => res.json())
            .then(books => { window.userBooksCache = books || []; })
            .catch(() => { window.userBooksCache = []; })
            .finally(() => {
                setupExploreTabs();
                loadGlobalPosts();
            });
    } else {
        setupExploreTabs();
        loadGlobalPosts();
    }
});

// ------------------------------
// Tabs
// ------------------------------
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

// ------------------------------
// Load posts
// ------------------------------
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

async function renderExplorePosts(posts) {
    const container = document.getElementById('explore-posts');
    if (!container) return;
    container.innerHTML = '';

    if (!posts || posts.length === 0) {
        container.innerHTML = '<p>No posts yet.</p>';
        return;
    }

    for (const post of posts) {
        let bookHtml = '';

        if (post.bookId) {
            let title = post.bookTitle || null;
            let thumb = post.bookThumbnail || null;

            // Fallback to viewer's cache if needed
            if ((!title || !thumb) && Array.isArray(window.userBooksCache)) {
                const match = window.userBooksCache.find(b => b.id === post.bookId);
                if (match) {
                    title = title || match.title;
                    thumb = thumb || match.thumbnail;
                }
            }

            if (title || thumb) {
                bookHtml = `
          <div class="post-book-info" style="display:flex;align-items:center;gap:.5rem;margin:.25rem 0;">
            ${thumb ? `<img src="${thumb}" alt="Book cover" width="40" height="60" style="object-fit:cover;border-radius:4px;">` : ''}
            <span>${title || ''}</span>
          </div>
        `;
            } else {
                bookHtml = `<strong>📖 Book:</strong> ${post.bookId}<br>`;
            }
        }

        const div = document.createElement('div');
        div.className = 'post';
        div.innerHTML = `
      <strong>${post.username ? post.username : 'You'}</strong><br>
      ${bookHtml}
      <p>${post.content || ''}</p>
      ${post.photoUrl ? `<img src="${post.photoUrl}" style="max-width:200px;border-radius:6px;"><br>` : ''}
      ${post.musicUrl ? `<a href="${post.musicUrl}" target="_blank" rel="noopener">🎵 Listen</a><br>` : ''}
      ${post.location ? `<small>📍 ${post.location}</small><br>` : ''}
      <small>${new Date(post.createdAt).toLocaleString()}</small>
    `;

        // Click the book area to open details
        if (post.bookId && div.querySelector('.post-book-info')) {
            const area = div.querySelector('.post-book-info');
            area.style.cursor = 'pointer';
            area.addEventListener('click', () => openBookDetail(post.bookId));
        }

        container.appendChild(div);
    }
}

// ------------------------------
// Picker
// ------------------------------
function openBookPicker() {
    const username = localStorage.getItem('username');
    fetch(`/getUserBooks/${username}`)
        .then(res => res.json())
        .then(books => {
            window.userBooksCache = books || [];

            const list = document.getElementById('bookPickerList');
            list.innerHTML = '';

            const none = document.createElement('div');
            none.className = 'book-picker-item';
            none.textContent = 'No Book';
            none.onclick = () => selectBook(null);
            list.appendChild(none);

            (books || []).forEach(book => {
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

function selectBook(book) {
    if (book) {
        document.getElementById('postBook').value = book.id;
        document.getElementById('selectedBookTitle').textContent = book.title;
        const cover = document.getElementById('selectedBookCover');
        cover.src = book.thumbnail;
        cover.style.display = 'inline-block';
    } else {
        document.getElementById('postBook').value = '';
        document.getElementById('selectedBookTitle').textContent = 'Click to select a book';
        document.getElementById('selectedBookCover').style.display = 'none';
    }

    closeBookPicker();
}

function closeBookPicker() {
    document.getElementById('bookPickerModal').style.display = 'none';
}