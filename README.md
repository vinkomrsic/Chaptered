# Chaptered — A Book Tracking Platform

Chaptered is a website that makes reading more personal, social, and fun.  
It blends book logging, progress tracking, mood journaling, and community posts  
into one clean experience.

──────────────────────────────────────────────────────────────────────────────

## Getting Started (Local)

1. Unzip the project archive into a folder of your choice.
2. Install dependencies (from the project root, where package.json is located):
   npm install
3. Configure environment:
   - A default MongoDB connection string is included in backend/.env.
   - If you want to use your own, create/modify backend/.env with:
     MONGO_URI=<your-mongodb-uri>
     PORT=3000
4. Start the server:
   - In WebStorm (or terminal)
   - This starts backend/server.js on port 3000.
5. Open the app in your browser:
   http://localhost:3000

Developed and tested on macOS with WebStorm.

──────────────────────────────────────────────────────────────────────────────

## MVP Features Implemented

• User accounts (signup / login)  
• Personal library: Reading, Read, Want to Read, Favourites, All Books  
• Book details: save/remove, set progress, mark favourite, set mood  
• Explore feed: global posts and my posts, with optional book link, photo, music, location  
• Profile: name, bio, favourites; logout  
• Search: Google Books API for live search and importing  
• Stats: Books This Year, Mood Tracker (dominant last 30d), Avg Mood (30d)

──────────────────────────────────────────────────────────────────────────────

## Tech Stack

Frontend: HTML, CSS, Vanilla JS, Font Awesome  
Backend: Node.js, Express.js  
Database: MongoDB (Atlas) + Mongoose  
External API: Google Books API

──────────────────────────────────────────────────────────────────────────────

## Backend API Endpoints (Node/Express)

### AUTH & PROFILE
• POST   /signup  
• POST   /login  
• GET    /getProfile/:username

### BOOKS
• POST   /saveBook  
• POST   /removeBook  
• GET    /getUserBooks/:username  
• POST   /books/:id/mood

### MOOD (profile-level)
• POST   /profile/mood

### STATS
• GET    /stats/:username  
Returns: booksThisYear, moodTracker, currentMood, avgMood30dScore, avgMood30dLabel, avgMood30dCount

### POSTS (Explore)
• POST   /addPost  
• GET    /getPosts/:username          (newest first)  
• GET    /getAllPosts                 (newest first, across all users)

──────────────────────────────────────────────────────────────────────────────

## Database Operations (Mongoose)

Create: saveBook, addPost, push mood entries  
Read: getUserBooks, getProfile, stats, getPosts, getAllPosts  
Update: saveBook (progress/favourite/mood), books/:id/mood, profile/mood  
Delete: removeBook

──────────────────────────────────────────────────────────────────────────────

## How Stats Work

• Books This Year  
Count of user.books where progress = "read" and finishedAt falls in current year.

• Mood Tracker (label)  
Most frequent mood value in the last 30 days; falls back to the most recent mood.

• Average Mood (30d)  
Each mood maps to a score (Great=5, Good=4, Average=3, Low=2, Bad=1).  
Collect events in last 30 days (profile-level and per-book history), average scores, then convert the numeric average to a label.

──────────────────────────────────────────────────────────────────────────────

## Sitemap

/                  → Login  
/dashboard.html    → Dashboard + quick stats  
/library.html      → Your library  
/explore.html      → Global feed and my posts  
/profile.html      → Profile + favourites  
/book.html         → Book details

──────────────────────────────────────────────────────────────────────────────

## Outlook

• Likes/comments, recommendations, charts, Local photo uploads, better error handling (Spotify/ Youtube links)

──────────────────────────────────────────────────────────────────────────────

## Requirements Checklist

• Multi-user with Node backend + database                  → YES  
• ≥ 3 backend APIs + ≥ 2 DB operations                     → YES  
• Frontend uses HTML, CSS, JS and calls backend APIs       → YES

──────────────────────────────────────────────────────────────────────────────

## Quick Test Script (manual)

1. Start server and open the app.
2. Sign up a new user, log in.
3. Search a book using the search bar; open a result; click Save.
4. In book page: set progress to "read" or "reading"; toggle Favourite; pick a mood.
5. Go to Dashboard: verify “Books This Year” and mood stats update.
6. Go to Explore: create a post (optionally link a saved book), verify it appears.
7. Switch tabs to “My Posts” and back to “Global”.
8. Remove a book from Library and confirm it disappears.

──────────────────────────────────────────────────────────────────────────────

## Troubleshooting

• Page shows placeholders for stats:  
– Ensure you’re logged in (username stored in localStorage)

• Mongo connection error:  
– Verify MONGO_URI in backend/.env or server.js  
– Whitelist your IP in MongoDB Atlas

• CORS or 404 for static files:  
– App serves /frontend as static; ensure paths match

──────────────────────────────────────────────────────────────────────────────

## Notes on Security (MVP scope)

• Passwords are stored plaintext in MVP — do not deploy as-is.  
• In future: hash passwords (bcrypt), add sessions, input validation.

──────────────────────────────────────────────────────────────────────────────

## License

MIT License — free to use, copy, modify, and distribute

──────────────────────────────────────────────────────────────────────────────

## Credits

• Vinko Mrsic — Design & Development  
• Documentation, design ideas and tutorials from:  
– MDN Web Docs (HTML, CSS, JS references)  
– W3Schools (HTML, CSS, JS tutorials)  
– Express.js official documentation  
– Mongoose documentation  
• Google Books API (book search and data import)  
• ChatGPT: used for assistance and for generating draft documentation (this README, debugging help)  