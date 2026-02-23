require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// ─── Connect Database ──────────────────────────────────────────────────────
connectDB().catch(err => {
  console.error('DB Connection failed:', err.message);
  // Don't exit - keep server running so frontend still loads
});

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Configured separately for frontend serving
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts, please try again in 15 minutes.' }
});

app.use('/api/', limiter);
app.use('/api/student/login', loginLimiter);
app.use('/api/admin/login', loginLimiter);

// ─── Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ────────────────────────────────────────────────────────────
app.use('/api/student', require('./routes/studentAuth'));
app.use('/api/exam', require('./routes/exam'));
app.use('/api/admin', require('./routes/admin'));

// ─── Serve Static Frontend ─────────────────────────────────────────────────
app.use('/student', express.static(path.join(__dirname, '../frontend/student')));
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));
app.use('/shared', express.static(path.join(__dirname, '../frontend/shared')));

// Directory redirects
app.get('/', (req, res) => res.redirect('/student/login.html'));
app.get('/student', (req, res) => res.redirect('/student/login.html'));
app.get('/student/', (req, res) => res.redirect('/student/login.html'));
app.get('/admin', (req, res) => res.redirect('/admin/login.html'));
app.get('/admin/', (req, res) => res.redirect('/admin/login.html'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── Start Server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   EXAM SYSTEM SERVER RUNNING         ║
  ║   Port: ${PORT}                          ║
  ║   Student: http://localhost:${PORT}/student ║
  ║   Admin:   http://localhost:${PORT}/admin  ║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;
