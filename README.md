# 📚 Chaptered — A Modern Book Tracking Platform

Chaptered is a web application that makes reading more personal, social, and fun.
It blends book logging, progress tracking, mood journaling, and community posts
into one clean experience.

──────────────────────────────────────────────────────────────────────────────

## 🚀 Getting Started (Local)

1) Clone the repo "https://github.com/vinkomrsic/Chaptered"

2) Configure environment
   • If you’re using the provided connection string, you can skip this.
   • Otherwise create backend/.env with:
   MONGO_URI=<your-mongodb-uri>
   PORT=3000

3) Install dependencies (from the project root)
   $ npm install

4) Start the server
   $ node backend/server.js
   (or set "start": "node backend/server.js" and run: npm start)

5) Open the app
   http://localhost:3000

Default login flow is simple: after signup, your username is stored client-side
(localStorage) and used for calls. No session yet in the MVP.

──────────────────────────────────────────────────────────────────────────────

## 🧱 Project Structure

chaptered/
├─ backend/
│  ├─ server.js               # Express app (routes + DB)
│  └─ (optional) .env         # MONGO_URI, PORT
├─ frontend/
│  ├─ index.html              # Login page
│  ├─ dashboard.html          # Main dashboard + quick stats
│  ├─ library.html            # Your shelves
│  ├─ explore.html            # Global feed + my posts
│  ├─ profile.html            # Profile + favourites
│  ├─ book.html               # Book details
│  ├─ css/
│  │  └─ chaptered.css
│  └─ js/
│     ├─ common.js            # Core page bootstraps, stats fetch, helpers
│     ├─ book.js              # Book detail (save/remove/fav/mood)
│     └─ explore.js           # Explore (tabs, feeds, picker)
└─ package.json

──────────────────────────────────────────────────────────────────────────────

## ✨ MVP Features Implemented

• User accounts (signup / login)  
• Personal library: Reading, Read, Want to Read, Favourites, All Books  
• Book details: save/remove, set progress, mark favourite, set mood  
• Explore feed: global posts and my posts, with optional book link, photo, music, location  
• Profile: name, bio, favourites; logout  
• Search: Google Books API for live search and importing  
• Stats: Books This Year, Mood Tracker (dominant last 30d), Avg Mood (30d)

──────────────────────────────────────────────────────────────────────────────

## 🛠️ Tech Stack

Frontend: HTML, CSS, Vanilla JS, Font Awesome  
Backend: Node.js, Express.js  
Database: MongoDB (Atlas) + Mongoose  
External API: Google Books API

──────────────────────────────────────────────────────────────────────────────

## 🌐 Backend API Endpoints (Node/Express)

AUTH & PROFILE
• POST   /signup
• POST   /login
• GET    /getProfile/:username

BOOKS
• POST   /saveBook
• POST   /removeBook
• GET    /getUserBooks/:username
• POST   /books/:id/mood

MOOD (profile-level)
• POST   /profile/mood

STATS
• GET    /stats/:username
Returns: booksThisYear, moodTracker, currentMood,
avgMood30dScore, avgMood30dLabel, avgMood30dCount

POSTS (Explore)
• POST   /addPost
• GET    /getPosts/:username          (newest first)
• GET    /getAllPosts                 (newest first, across all users)

These provide more than the required “3 APIs” and cover multiple DB operations.

──────────────────────────────────────────────────────────────────────────────

## 🗄️ Database Operations (Mongoose)

Create: saveBook, addPost, push mood entries  
Read: getUserBooks, getProfile, stats, getPosts, getAllPosts  
Update: saveBook (progress/favourite/mood), books/:id/mood, profile/mood  
Delete: removeBook

──────────────────────────────────────────────────────────────────────────────

## 📊 How Stats Work

• Books This Year
Count of user.books where progress = "read" and finishedAt falls in current year.

• Mood Tracker (label)
Most frequent mood value in the last 30 days; falls back to the most recent mood.

• Average Mood (30d)
Each mood maps to a score (Great=5, Good=4, Average=3, Low=2, Bad=1).
Collect events in last 30 days (profile-level and per-book history), average scores,
then convert the numeric average to a label.

──────────────────────────────────────────────────────────────────────────────

## 🗺️ Sitemap

/                  → Login  
/dashboard.html    → Dashboard + quick stats  
/library.html      → Your library  
/explore.html      → Global feed and my posts  
/profile.html      → Profile + favourites  
/book.html         → Book details

──────────────────────────────────────────────────────────────────────────────

Outlook
• JWT auth, likes/comments, recommendations, charts, uploads, better error handling

──────────────────────────────────────────────────────────────────────────────

## ✅ Requirements Checklist (course)

• Multi-user with Node backend + database                 → YES  
• ≥ 3 backend APIs + ≥ 2 DB operations                     → YES (many)  
• Frontend uses HTML, CSS, JS and calls backend APIs       → YES  
• Source ZIP submission by Aug 18, 8pm CET                 → Remember to export  
• Presentation by Jul 25; slides due Jul 24, 8pm CET       → Include idea, sitemap, MVP

──────────────────────────────────────────────────────────────────────────────

## 🧪 Quick Test Script (manual)

1) Start server and open the app.
2) Sign up a new user, log in.
3) Search a book using the search bar; open a result; click Save.
4) In book page: set progress to "read" or "reading"; toggle Favourite; pick a mood.
5) Go to Dashboard: verify “Books This Year” and mood stats update.
6) Go to Explore: create a post (optionally link a saved book), verify it appears.
7) Switch tabs to “My Posts” and back to “Global”.
8) Remove a book from Library and confirm it disappears.

──────────────────────────────────────────────────────────────────────────────

## 🧯 Troubleshooting

• Page shows placeholders for stats:
– Ensure you’re logged in (username stored in localStorage)
– Check /stats/:username returns JSON in the browser

• Posts don’t refresh after adding:
– Explore.js calls loadGlobalPosts() or loadMyPosts() after success
– If you bypassed the provided code, call those functions after add

• Mongo connection error:
– Verify MONGO_URI in backend/.env or server.js
– Whitelist your IP in MongoDB Atlas

• CORS or 404 for static files:
– App serves /frontend as static; ensure paths match

──────────────────────────────────────────────────────────────────────────────

## 🔐 Notes on Security (MVP scope)

• Passwords are stored plaintext in MVP — do not deploy as-is.
• For production: hash passwords (bcrypt), add JWT sessions, input validation,
and CSRF protection. Lock down CORS and secrets via environment variables.

──────────────────────────────────────────────────────────────────────────────

## 📄 License

MIT License — free to use, copy, modify, and distribute. See LICENSE file if included.

──────────────────────────────────────────────────────────────────────────────

## 👥 Credits

• Vinko Mrsic — Design & Development