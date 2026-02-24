const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Student = require('../models/Student');
const Response = require('../models/Response');
const ExcelJS = require('exceljs');

function verifyAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ success: false, message: 'Admin authentication required' });
  try {
    req.admin = jwt.verify(auth.split(' ')[1], process.env.JWT_ADMIN_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid admin token' });
  }
}
// ── MULTER CONFIG ─────────────────────────────
const uploadDir = path.join(__dirname, '../uploads');

// Create uploads folder if not exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ admin: true }, process.env.JWT_ADMIN_SECRET, { expiresIn: '12h' });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  }
});

// ── EXAMS ────────────────────────────────────────────────
router.get('/exams', verifyAdmin, async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    // Attach counts
    const result = await Promise.all(exams.map(async e => {
      const qCount = await Question.countDocuments({ examId: e._id });
      const rCount = await Response.countDocuments({ examId: e._id });
      return { ...e.toObject(), questionCount: qCount, responseCount: rCount };
    }));
    res.json({ success: true, exams: result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/exams', verifyAdmin, async (req, res) => {
  try {
    const { examTitle, examCode, duration, instructions } = req.body;
    if (!examTitle || !examCode) return res.status(400).json({ success: false, message: 'Title and code required.' });
    const code = examCode.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const exists = await Exam.findOne({ examCode: code });
    if (exists) return res.status(400).json({ success: false, message: 'Exam code already exists. Choose a different one.' });
    const exam = await Exam.create({ examTitle, examCode: code, duration: duration || 30, instructions: instructions || '' });
    res.json({ success: true, exam });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/exams/:id', verifyAdmin, async (req, res) => {
  try {
    const { examTitle, duration, isActive, instructions } = req.body;
    const exam = await Exam.findByIdAndUpdate(req.params.id, { examTitle, duration, isActive, instructions }, { new: true });
    res.json({ success: true, exam });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/exams/:id', verifyAdmin, async (req, res) => {
  try {
    await Question.deleteMany({ examId: req.params.id });
    await Student.deleteMany({ examId: req.params.id });
    await Response.deleteMany({ examId: req.params.id });
    await Exam.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Exam and all related data deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── QUESTIONS ────────────────────────────────────────────
router.get('/exams/:examId/questions', verifyAdmin, async (req, res) => {
  try {
    const questions = await Question.find({ examId: req.params.examId }).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, questions });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post(
  '/exams/:examId/questions',
  verifyAdmin,
  upload.single('questionImage'),
  async (req, res) => {
    try {
      const {
        questionText,
        questionType,
        correctAnswer,
        marks,
        order
      } = req.body;

      let options = [];
      if (req.body.options) {
        options = JSON.parse(req.body.options);
      }

      const imagePath = req.file ? `uploads/${req.file.filename}` : null;

      const q = await Question.create({
        examId: req.params.examId,
        questionText,
        questionType,
        options,
        correctAnswer,
        marks,
        order,
        questionImage: imagePath
      });

      res.json({ success: true, question: q });

    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.put(
  '/questions/:id',
  verifyAdmin,
  upload.single('questionImage'),
  async (req, res) => {
    try {
      let updateData = { ...req.body };

      if (req.body.options) {
        updateData.options = JSON.parse(req.body.options);
      }

      if (req.file) {
        updateData.questionImage = `uploads/${req.file.filename}`;
      }

      const q = await Question.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      res.json({ success: true, question: q });

    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.delete('/questions/:id', verifyAdmin, async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── RESULTS ─────────────────────────────────────────────
router.get('/exams/:examId/results', verifyAdmin, async (req, res) => {
  try {
    const results = await Response.find({ examId: req.params.examId }).sort({ totalMarks: -1 });
    res.json({ success: true, results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/results/:id', verifyAdmin, async (req, res) => {
  try {
    const response = await Response.findById(req.params.id);
    if (!response) return res.status(404).json({ success: false, message: 'Response not found' });
    await Student.findOneAndUpdate(
      { examId: response.examId, rollNumber: response.rollNumber },
      { hasAttempted: false, examStartTime: null }
    );
    await Response.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Response deleted. Student can retake.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── EXPORT ───────────────────────────────────────────────
router.get('/exams/:examId/export', verifyAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    const results = await Response.find({ examId: req.params.examId }).sort({ totalMarks: -1 });
    const data = results.map((r, i) => ({
      Rank: i + 1, 'Roll No': r.rollNumber, Name: r.fullName,
      Score: r.totalMarks, 'Max Marks': r.maxMarks, '%': r.percentage,
      'Submitted At': r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '',
      Type: r.submissionType, 'Tab Switches': r.tabSwitchCount, 'FS Exits': r.fullscreenExitCount,
      'Time (sec)': r.timeTakenSeconds
    }));
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Results');
    if (data.length > 0) {
      ws.columns = Object.keys(data[0]).map(k => ({ header: k, key: k, width: 18 }));
      data.forEach(row => ws.addRow(row));
    }
    res.setHeader('Content-Disposition', `attachment; filename=${exam?.examCode || 'exam'}_results.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── DASHBOARD ────────────────────────────────────────────
router.get('/dashboard', verifyAdmin, async (req, res) => {
  try {
    const totalExams = await Exam.countDocuments();
    const totalStudents = await Student.countDocuments();
    const totalResponses = await Response.countDocuments();
    const activeExams = await Exam.countDocuments({ isActive: true });
    res.json({ success: true, stats: { totalExams, totalStudents, totalResponses, activeExams } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
