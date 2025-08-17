// =====================================
// COMMON, USED BY ALL PAGES
// =====================================

// Global cache used by Explore and picker
window.userBooksCache = [];

// Password visibility toggle
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

// Open a book's detail page
function openBookDetail(bookId) {
    window.location.href = `book.html?id=${bookId}`;
}