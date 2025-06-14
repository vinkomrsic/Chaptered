const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ No need to redirect '/' because express.static serves index.html automatically

// Fake in-memory "database"
const users = [];

// ✅ Sign-up route
app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    users.push({ username, password });
    console.log('User registered:', username);
    // Redirect back to login page — which is now index.html at '/'
    res.redirect('/');
});

// ✅ Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        console.log('User logged in:', username);
        res.redirect('/profile.html');
    } else {
        res.send('Login failed: Invalid username or password.');
    }
});

// ✅ Start server
app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
});