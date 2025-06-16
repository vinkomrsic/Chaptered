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

// Load users from JSON file
function loadUsers() {
    // If file doesn't exist, create empty array
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
// - Accepts POST form data for signup
// - Adds new user with profile & empty book list
// ----------

app.post('/signup', (req, res) => {
    const { username, password, email, name, bio } = req.body;

    let users = loadUsers();

    // Prevent duplicate usernames
    if (users.some(u => u.username === username)) {
        return res.send('Username already taken.');
    }

    // Create user object with nested profile
    const newUser = {
        username,
        password,
        email,
        profile: {
            name: name || '',
            bio: bio || ''
        },
        books: [] // empty at first
    };

    users.push(newUser);
    saveUsers(users);

    console.log(`New user registered: ${username}`);
    res.redirect('/');
});

// ----------
// LOGIN ROUTE
// - Checks submitted username & password
// - Redirects to profile on success
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
// - Accepts JSON with username and book object
// - Adds the book to the user's books array
// ----------

app.post('/saveBook', (req, res) => {
    const { username, book } = req.body;
    let users = loadUsers();

    const user = users.find(u => u.username === username);
    if (user) {
        user.books.push(book);
        saveUsers(users);
        res.send('Book saved!');
    } else {
        res.send('User not found.');
    }
});

// ----------
// GET USER'S SAVED BOOKS
// - Returns JSON array of books for given username
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
// - Returns profile fields + books for given username
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