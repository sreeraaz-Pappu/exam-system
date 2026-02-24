require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

connectDB().catch(err => console.error('DB Connection failed:', err.message));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));

const limiter = rateLimit({ windowMs: 15*60*1000, max: 100, message: { success: false, message: 'Too many requests.' } });
const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 20, message: { success: false, message: 'Too many login attempts.' } })


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));;

app.use('/api/', limiter);
app.use('/api/student', loginLimiter);
app.use('/api/admin/login', loginLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/student', require('./routes/studentAuth'));
app.use('/api/exam', require('./routes/exam'));
app.use('/api/admin', require('./routes/admin'));

// Static files
app.use('/shared', express.static(path.join(__dirname, '../frontend/shared')));
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));

// Serve uploaded question images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Dynamic exam routes - /exam/:examCode/* serves student files
app.use('/exam', express.static(path.join(__dirname, '../frontend/student')));

// Redirects
app.get('/', (req, res) => res.redirect('/admin/login.html'));
app.get('/admin', (req, res) => res.redirect('/admin/login.html'));
app.get('/admin/', (req, res) => res.redirect('/admin/login.html'));

// Dynamic exam entry point
app.get('/exam/:examCode', (req, res) => res.redirect(`/exam/${req.params.examCode}/login.html`));
app.get('/exam/:examCode/', (req, res) => res.redirect(`/exam/${req.params.examCode}/login.html`));
app.get('/exam/:examCode/login', (req, res) => res.redirect(`/exam/${req.params.examCode}/login.html`));
app.get('/exam/:examCode/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/student/login.html'));
});
app.get('/exam/:examCode/instructions.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/student/instructions.html'));
});
app.get('/exam/:examCode/exam.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/student/exam.html'));
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   EXAM SYSTEM SERVER RUNNING                 ║
  ║   Port: ${PORT}                                  ║
  ║   Admin: http://localhost:${PORT}/admin/login.html ║
  ║   Exam:  http://localhost:${PORT}/exam/:code/login ║
  ╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;
