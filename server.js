// ================================
// IMPORTS & BASIC SETUP
// ================================
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Location of the local JSON "database"
const USERS_FILE = path.join(__dirname, 'users.json');

// Serve static HTML, CSS, JS files
app.use(express.static(__dirname));

// Parse form submissions (URL encoded) and JSON bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ================================
// HELPER FUNCTIONS
// ================================

// Load users from JSON file (create empty if not exists)
function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, '[]');
    }
    const data = fs.readFileSync(USERS_FILE);
    return JSON.parse(data);
}

// Save updated users back to JSON file
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ================================
// ROUTES
// ================================

// ----------
// SIGNUP ROUTE
// - Adds new user with profile & empty books array
// ----------
app.post('/signup', (req, res) => {
    const { username, password, email, name, bio } = req.body;

    let users = loadUsers();

    if (users.some(u => u.username === username)) {
        return res.send('Username already taken.');
    }

    const newUser = {
        username,
        password,
        email,
        profile: {
            name: name || '',
            bio: bio || ''
        },
        books: []
    };

    users.push(newUser);
    saveUsers(users);

    console.log(`New user registered: ${username}`);
    res.redirect('/');
});

// ----------
// LOGIN ROUTE
// - Verifies username & password
// ----------
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    let users = loadUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        console.log(`User logged in: ${username}`);
        res.redirect('/profile.html');
    } else {
        res.send('Login failed: Invalid username or password.');
    }
});

// ----------
// SAVE BOOK ROUTE
// - Finds existing book by ID and updates its data
// - If not exists, pushes new
// ----------
app.post('/saveBook', (req, res) => {
    const { username, book } = req.body;
    let users = loadUsers();

    const user = users.find(u => u.username === username);
    if (user) {
        // Try to find existing book by ID
        const existing = user.books.find(b => b.id === book.id);
        if (existing) {
            // Update all fields
            Object.assign(existing, book);
        } else {
            user.books.push(book);
        }

        saveUsers(users);
        res.send('Book saved (updated if existed)!');
    } else {
        res.send('User not found.');
    }
});

// ----------
// REMOVE BOOK ROUTE
// - Deletes a book by ID for given user
// ----------
app.post('/removeBook', (req, res) => {
    const { username, bookId } = req.body;
    let users = loadUsers();

    const user = users.find(u => u.username === username);
    if (user) {
        user.books = user.books.filter(b => b.id !== bookId);
        saveUsers(users);
        res.send('Book removed!');
    } else {
        res.send('User not found.');
    }
});

// ----------
// GET USER'S SAVED BOOKS
// ----------
app.get('/getUserBooks/:username', (req, res) => {
    const username = req.params.username;
    const users = loadUsers();
    const user = users.find(u => u.username === username);
    if (user) {
        res.json(user.books);
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// ----------
// GET USER PROFILE INFO
// ----------
app.get('/getProfile/:username', (req, res) => {
    const username = req.params.username;
    const users = loadUsers();
    const user = users.find(u => u.username === username);
    if (user) {
        res.json({
            profile: user.profile,
            books: user.books
        });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// ================================
// START SERVER
// ================================
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});