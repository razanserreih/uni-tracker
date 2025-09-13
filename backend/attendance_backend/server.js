// attendance_backend/server.js
const express = require('express');
const cors = require('cors');

// Routers
const courses    = require('./routes/courses');
const lookup     = require('./routes/lookup');
const students   = require('./routes/students');
const attendance = require('./routes/attendance');
const grades     = require('./routes/grades');   // << only once
const offeringsRouter = require('./routes/offerings');
const lecturesRouter  = require('./routes/lectures');
const semesters = require('./routes/semesters');


const app = express();

// CORS + body
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health check (handy for Postman/browser)
app.get('/health', (_req, res) => res.json({ ok: true }));

// Mount routers
app.use('/courses',    courses);
app.use('/lookup',     lookup);
app.use('/students',   students);
app.use('/attendance', attendance);
app.use('/grades',     grades);                 // << only once
app.use('/offerings', offeringsRouter);
app.use('/lectures', lecturesRouter);
app.use('/semesters', semesters);

// 404 + error handlers
app.use((req, res) => res.status(404).json({ message: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Server error' });
});

const PORT = 4000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`API up on http://127.0.0.1:${PORT}`);
});
