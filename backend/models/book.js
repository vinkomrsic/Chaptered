const mongoose = require('mongoose');

const MoodEntrySchema = new mongoose.Schema({
    mood: { type: String, trim: true },
    at:   { type: Date, default: Date.now }
}, { _id: false });

const BookSchema = new mongoose.Schema({
    user: { type: String, index: true },          // username
    id: { type: String, index: true },            // Google Books volume ID
    title: String,
    author: String,
    thumbnail: String,
    progress: { type: String, enum: ['reading', 'read', 'want', 'none'], default: 'none' },
    favourite: { type: Boolean, default: false },
    rating: Number,
    finishedAt: Date,                             // set when progress becomes 'read'

    //  Mood tracking
    mood: { type: String, trim: true, default: '' },      // latest mood
    moodHistory: { type: [MoodEntrySchema], default: [] }
}, { timestamps: true });

BookSchema.index({ user: 1, id: 1 }, { unique: true }); // one entry per user+book

module.exports = mongoose.model('Book', BookSchema);