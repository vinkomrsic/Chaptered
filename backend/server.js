// ===== IMPORTS & BASIC SETUP =====
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ===== MONGODB SETUP =====
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB verbunden'))
    .catch(err => console.error('MongoDB Fehler:', err));

// ===== MONGOOSE MODELS =====
const BookMoodEntrySchema = new mongoose.Schema({
    mood: { type: String, trim: true },
    note: { type: String, trim: true },
    at:   { type: Date, default: Date.now }
}, { _id: false });

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
    moodHistory: { type: [BookMoodEntrySchema], default: [] },
    favourite: { type: Boolean, default: false },
    rating: Number,
    finishedAt: Date
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

const moodEnum = ['Great', 'Good', 'Average', 'Low', 'Bad'];
const moodSchema = new mongoose.Schema({
    value: { type: String, enum: moodEnum },
    at: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    username: String,
    password: String,   // ⚠️ Plaintext, should be hashed with bcrypt in production
    email: String,
    profile: {
        name: String,
        bio: String
    },
    books: [bookSchema],
    posts: [postSchema],
    moods: [moodSchema]
});

const User = mongoose.model('User', userSchema);

// ===== HELPERS FOR STATS =====
function startOfYear(d = new Date()) { return new Date(d.getFullYear(), 0, 1); }
function endOfYear(d = new Date()) { return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999); }

function computeStats(user) {
    if (!user) return { booksThisYear: 0, moodTracker: '—', currentMood: '—' };

    const s = startOfYear(), e = endOfYear();

    const booksThisYear = (user.books || []).filter(
        b => b.progress === 'read' && b.finishedAt && b.finishedAt >= s && b.finishedAt <= e
    ).length;

    const currentMood = user.moods?.length ? user.moods[user.moods.length - 1].value : '—';
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const last30 = (user.moods || []).filter(m => m.at >= cutoff);
    const buckets = { Great: 0, Good: 0, Average: 0, Low: 0, Bad: 0 };
    last30.forEach(m => { if (buckets[m.value] !== undefined) buckets[m.value]++; });
    const top = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
    const moodTracker = top && top[1] > 0 ? `${top[0]} (30d)` : currentMood;

    return { booksThisYear, moodTracker, currentMood };
}

const MOOD_SCORE = { Great: 5, Good: 4, Average: 3, Low: 2, Bad: 1 };

function labelFromScore(score) {
    if (score === null || score === undefined) return '—';
    if (score >= 4.5) return 'Great';
    if (score >= 3.5) return 'Good';
    if (score >= 2.5) return 'Average';
    if (score >= 1.5) return 'Low';
    return 'Bad';
}

function averageMood(user, days = 30) {
    if (!user) return { score: null, label: '—', count: 0 };

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const scores = [];

    (user.books || []).forEach(b => {
        (b.moodHistory || []).forEach(entry => {
            if (entry?.at && entry.at >= since) {
                const s = MOOD_SCORE[entry.mood];
                if (s) scores.push(s);
            }
        });
    });

    (user.moods || []).forEach(m => {
        if (m?.at && m.at >= since) {
            const s = MOOD_SCORE[m.value];
            if (s) scores.push(s);
        }
    });

    if (scores.length === 0) return { score: null, label: '—', count: 0 };

    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = sum / scores.length;
    return { score: Number(avg.toFixed(2)), label: labelFromScore(avg), count: scores.length };
}

// ===== ROUTES =====

// --- SIGNUP ---
app.post('/signup', async (req, res) => {
    const { username, password, email, name, bio } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already taken' });

    const newUser = new User({
        username,
        password,
        email,
        profile: { name: name || '', bio: bio || '' },
        books: [],
        posts: [],
        moods: []
    });

    await newUser.save();
    console.log(`New user registered: ${username}`);
    res.redirect('/');
});

// --- LOGIN ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
        console.log(`User logged in: ${username}`);
        res.redirect('/profile.html');
    } else {
        res.status(401).json({ error: 'Invalid username or password' });
    }
});

// --- SAVE BOOK ---
app.post('/saveBook', async (req, res) => {
    try {
        const { username, book } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!book.progress) book.progress = 'want';
        if (book.favourite === undefined) book.favourite = false;

        const existing = user.books.find(b => b.id === book.id);
        if (existing) {
            const was = existing.progress;
            Object.assign(existing, book);
            if (existing.progress === 'read' && (!existing.finishedAt || was !== 'read')) {
                existing.finishedAt = new Date();
            }
        } else {
            if (book.progress === 'read') book.finishedAt = new Date();
            user.books.push(book);
        }

        await user.save();
        res.send('Book saved!');
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error saving book' });
    }
});

// --- REMOVE BOOK ---
app.post('/removeBook', async (req, res) => {
    const { username, bookId } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.books = user.books.filter(b => b.id !== bookId);
    await user.save();
    res.send('Book removed!');
});

// --- GET USER BOOKS ---
app.get('/getUserBooks/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username });
    if (user) res.json(user.books);
    else res.status(404).json({ error: 'User not found' });
});

// --- GET PROFILE + STATS ---
app.get('/getProfile/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username });
    if (user) {
        res.json({
            profile: user.profile,
            books: user.books,
            stats: computeStats(user)
        });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// --- SET PROFILE MOOD ---
app.post('/profile/mood', async (req, res) => {
    const { username, mood } = req.body;
    const allowed = ['Great', 'Good', 'Average', 'Low', 'Bad'];
    if (!allowed.includes(mood)) return res.status(400).json({ error: 'Invalid mood' });

    const user = await User.findOneAndUpdate(
        { username },
        { $push: { moods: { value: mood, at: new Date() } } },
        { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ ok: true, stats: computeStats(user) });
});

// --- SET MOOD FOR A BOOK ---
app.post('/books/:id/mood', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, mood = '' } = req.body || {};

        if (!username) return res.status(400).json({ error: 'username required' });

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const book = (user.books || []).find(b => b.id === id);
        if (!book) return res.status(404).json({ error: 'book not found for user' });

        book.mood = mood;
        book.moodHistory = book.moodHistory || [];
        book.moodHistory.push({ mood, at: new Date() });

        await user.save();

        res.json({
            ok: true,
            book: {
                id: book.id,
                mood: book.mood,
                lastMoodAt: book.moodHistory[book.moodHistory.length - 1]?.at
            }
        });
    } catch (e) {
        console.error('set book mood failed:', e);
        res.status(500).json({ error: 'internal error' });
    }
});

// --- USER STATS ---
app.get('/stats/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const base = computeStats(user);
        const avg30 = averageMood(user, 30);

        res.json({
            ...base,
            avgMood30dScore: avg30.score,
            avgMood30dLabel: avg30.label,
            avgMood30dCount: avg30.count
        });
    } catch (e) {
        console.error('stats failed:', e);
        res.status(500).json({ error: 'internal error' });
    }
});

// --- ADD POST ---
app.post('/addPost', async (req, res) => {
    try {
        const { username, bookId, bookTitle, bookThumbnail, content, photoUrl, musicUrl, location } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: 'User not found' });

        let title = bookTitle || null;
        let thumb = bookThumbnail || null;

        if (bookId && (!title || !thumb)) {
            const inLib = user.books.find(b => b.id === bookId);
            if (inLib) {
                title = title || inLib.title || null;
                thumb = thumb || inLib.thumbnail || null;
            }
        }

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
        res.send('Post added!');
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error adding post' });
    }
});

// --- GET USER POSTS (newest first) ---
app.get('/getPosts/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username });
    if (!user || !user.posts) return res.json([]);

    const posts = [...user.posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(posts);
});

// --- GET ALL POSTS (newest first) ---
app.get('/getAllPosts', async (req, res) => {
    try {
        const users = await User.find({}, { username: 1, posts: 1, _id: 0 });
        const allPosts = [];
        users.forEach(user => {
            (user.posts || []).forEach(post => {
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

// ===== STATIC FILES & ROOT ROUTE =====
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===== START SERVER =====
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});