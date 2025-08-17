const mongoose = require('mongoose');

const moodEnum = ['Great', 'Good', 'Average', 'Low', 'Bad'];

// Profile mood entry
const MoodSchema = new mongoose.Schema({
    value: { type: String, enum: moodEnum, required: true },
    at: { type: Date, default: Date.now }
});

// Post entry
const PostSchema = new mongoose.Schema({
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

// User
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, index: true },
    password: String, // TODO: hash
    email: String,
    profile: {
        name: String,
        bio: String
    },
    posts: [PostSchema],
    moods: [MoodSchema]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);