// ================================
// IMPORTS & BASIC SETUP
// ================================
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const port = 3000; // Server port (TODO: move to process.env.PORT for deploy)

// Serve static HTML, CSS, JS files from the project root
app.use(express.static(__dirname));
// Parse URL-encoded form data and JSON bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/* ------------------------------------------------------------------
   MONGODB SETUP
   - Connect to your MongoDB cluster with Mongoose
   - NOTE: credentials are hardcoded here. Consider .env:
     mongoose.connect(process.env.MONGO_URL)
-------------------------------------------------------------------*/
mongoose.connect(
    'mongodb+srv://dbuser:dbUserPassword@cluster0.aonlnhv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
    { useNewUrlParser: true, useUnifiedTopology: true }
)
    .then(() => console.log('MongoDB verbunden'))
    .catch(err => console.error('MongoDB Fehler:', err));

/* ------------------------------------------------------------------
   MONGOOSE SCHEMAS & MODELS
   - Book embedded in User
   - Post embedded in User
   - User holds profile + books + posts
-------------------------------------------------------------------*/
const bookSchema = new mongoose.Schema({
    id: String,
    title: String,
    author: String,
    thumbnail: String,
    progress: {
        type: String,
        enum: ['reading', 'read', 'want', 'none'],
        default: 'none'
    },
    mood: String,
    favourite: { type: Boolean, default: false },
    tags: [String],
    rating: Number
});

const postSchema = new mongoose.Schema({
    id: String,
    bookId: String,
    bookTitle: String,
    bookThumbnail: String,
    content: String,
    photoUrl: String,
    musicUrl: String,
    location: String,
    createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    username: String,
    password: String,   // NOTE: stored plaintext (TODO: hash with bcrypt)
    email: String,
    profile: {
        name: String,
        bio: String
    },
    books: [bookSchema],
    posts: [postSchema]
});

const User = mongoose.model('User', userSchema);

/* ------------------------------------------------------------------
   ROUTES
   - Auth (signup/login)
   - Books (save/remove/list)
   - Profile (basic)
   - Posts (add/list)
-------------------------------------------------------------------*/

// ---------- SIGNUP ----------
// Creates a new user document if the username is free
app.post('/signup', async (req, res) => {
    const { username, password, email, name, bio } = req.body;

    // Check if username is unique
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.send('Username already taken.');

    // Create and store
    const newUser = new User({
        username,
        password, // TODO: hash (bcrypt.hash(password, 12))
        email,
        profile: { name: name || '', bio: bio || '' },
        books: [],
        posts: []
    });

    await newUser.save();
    console.log(`🟢 New user registered: ${username}`);
    res.redirect('/'); // Go back to login page
});

// ---------- LOGIN ----------
// Login check (username+password match)
// NOTE: plaintext comparison (TODO: compare bcrypt hashes)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username, password });
    if (user) {
        console.log(`🔵 User logged in: ${username}`);
        res.redirect('/profile.html');
    } else {
        res.send('Login failed: Invalid username or password.');
    }
});

// ---------- SAVE BOOK ----------
app.post('/saveBook', async (req, res) => {
    try {
        const { username, book } = req.body;

        const user = await User.findOne({ username });
        if (!user) return res.status(404).send('User not found.');

        // Sensible fallbacks
        if (!book.progress) book.progress = 'want';
        if (book.favourite === undefined) book.favourite = false;

        // If thumbnail missing, try Google Books (server-side fetch)
        if (!book.thumbnail) {
            const fetch = (await import('node-fetch')).default;
            const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes/${book.id}`);
            const googleData = await googleRes.json();
            book.thumbnail = googleData.volumeInfo?.imageLinks?.thumbnail || '';
        }

        // Upsert logic: update if exists, else push
        const existing = user.books.find(b => b.id === book.id);
        if (existing) {
            Object.assign(existing, book);
        } else {
            user.books.push(book);
        }

        await user.save();
        res.send('Book saved (with categories & thumbnail)!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error saving book');
    }
});

// ---------- REMOVE BOOK ----------
// Deletes a book from the embedded books by ID
app.post('/removeBook', async (req, res) => {
    const { username, bookId } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.send('User not found.');

    user.books = user.books.filter(b => b.id !== bookId);
    await user.save();
    res.send('Book removed!');
});

// ---------- GET USER BOOKS ----------
// Returns the user’s embedded books as JSON
app.get('/getUserBooks/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username });
    if (user) {
        res.json(user.books);
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// ---------- GET PROFILE ----------
// Returns profile + books (simple profile API)
app.get('/getProfile/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username });
    if (user) {
        res.json({ profile: user.profile, books: user.books });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// ---------- ADD POST ----------
// Creates a post
app.post('/addPost', async (req, res) => {
    try {
        const { username, bookId, bookTitle, bookThumbnail, content, photoUrl, musicUrl, location } = req.body;

        const user = await User.findOne({ username });
        if (!user) return res.status(404).send('User not found.');

        let title = bookTitle || null;
        let thumb = bookThumbnail || null;

        // 1) Try from user's library first
        if (bookId && (!title || !thumb)) {
            const inLib = user.books.find(b => b.id === bookId);
            if (inLib) {
                title = title || inLib.title || null;
                thumb = thumb || inLib.thumbnail || null;
            }
        }

        // 2) Fallback: Google Books lookup
        if (bookId && (!title || !thumb)) {
            try {
                const fetch = (await import('node-fetch')).default;
                const r = await fetch(`https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(bookId)}`);
                if (r.ok) {
                    const j = await r.json();
                    const info = j?.volumeInfo || {};
                    title = title || info.title || null;
                    thumb = thumb || info.imageLinks?.thumbnail || null;
                }
            } catch (_) { /* ignore network errors gracefully */ }
        }

        // Compose and save embedded post
        const newPost = {
            id: Date.now().toString(),
            bookId: bookId || null,
            bookTitle: title,
            bookThumbnail: thumb,
            content,
            photoUrl: photoUrl || null,
            musicUrl: musicUrl || null,
            location: location || null,
            createdAt: new Date()
        };

        user.posts.push(newPost);
        await user.save();

        console.log(`🟡 New post for ${username}`);
        res.send('Post added!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding post');
    }
});

// ---------- GET USER POSTS ----------
// Returns only the posts for a given username
app.get('/getPosts/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username });
    res.json(user && user.posts ? user.posts : []);
});

// ---------- GET ALL POSTS ----------
// Flattens posts from all users, adds username, sorts by date desc
app.get('/getAllPosts', async (req, res) => {
    try {
        // Only fetch username + posts for efficiency
        const users = await User.find({}, { username: 1, posts: 1, _id: 0 });
        const allPosts = [];

        users.forEach(user => {
            (user.posts || []).forEach(post => {
                // Ensure plain object (handles Mongoose docs)
                const base = typeof post.toObject === 'function' ? post.toObject() : post;
                allPosts.push({ username: user.username, ...base });
            });
        });

        allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(allPosts);
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/* ------------------------------------------------------------------
   STATIC FILES & ROOT ROUTE
   - Root "/" -> index.html
   - Catch-all falls back to index.html
-------------------------------------------------------------------*/

// Serve everything inside the "public" folder (or project root if no folder)
app.use(express.static(path.join(__dirname, '../frontend')));

// Root route -> serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Catch-all for unknown routes (single-page app style)
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../frontend/index.html'));
});

/* ------------------------------------------------------------------
   START SERVER
-------------------------------------------------------------------*/
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

/* ==================================================================
   OPTIONAL IMPROVEMENTS (no behavior change in this file)
   - Move secrets to .env (MONGO_URL, PORT)
   - Hash passwords with bcrypt; use sessions/JWT for auth
   - Add CORS/rate limiting if you open APIs publicly
   - Validate inputs (celebrate/joi/zod) for /saveBook, /addPost, etc.
   - Handle Google Books fetch errors with timeouts/retries
================================================================== */