const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

const USERS_FILE = path.join(__dirname, 'users.json');

// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Helper: Load users from JSON
function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, '[]');
    }
    const data = fs.readFileSync(USERS_FILE);
    return JSON.parse(data);
}

// Helper: Save users to JSON
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Root serves index.html automatically

// Signup route — with profile fields
app.post('/signup', (req, res) => {
    const { username, password, email, name, bio } = req.body;

    let users = loadUsers();

    // Check if username exists
    if (users.some(u => u.username === username)) {
        return res.send('Username already taken.');
    }

    // Create new user with empty books list and profile
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

// Login route — check credentials
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

// Save book
app.post('/saveBook', (req, res) => {
    const { username, book } = req.body;
    let users = loadUsers();

    const user = users.find(u => u.username === username);
    if (user) {
        user.books.push(book); // book can be title, author, cover, whatever
        saveUsers(users);
        res.send('Book saved!');
    } else {
        res.send('User not found.');
    }
});

// Get saved books
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

// Debug route to see users
app.get('/users', (req, res) => {
    const users = loadUsers();
    res.json(users);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Profile data
app.get('/getProfile/:username', (req, res) => {
    const username = req.params.username;
    const users = loadUsers();
    const user = users.find(u => u.username === username);
    if (user) {
        // Return profile + books
        res.json({
            profile: user.profile,
            books: user.books
        });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});