const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const { verifyAdmin } = require('../middleware/auth');
const Question = require('../models/Question');
const Response = require('../models/Response');
const Student = require('../models/Student');
const ExamSettings = require('../models/ExamSettings');

// ─── ADMIN LOGIN ────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign(
      { username, role: 'admin' },
      process.env.JWT_ADMIN_SECRET,
      { expiresIn: '8h' }
    );
    return res.json({ success: true, token });
  }

  return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
});

// ─── EXAM SETTINGS ──────────────────────────────────────────────────────────
router.get('/settings', verifyAdmin, async (req, res) => {
  let settings = await ExamSettings.findOne().sort({ createdAt: -1 });
  if (!settings) settings = { examTitle: 'Online Examination', duration: 30, isActive: false, instructions: '' };
  res.json({ success: true, settings });
});

router.put('/settings', verifyAdmin, async (req, res) => {
  try {
    const { examTitle, duration, isActive, instructions } = req.body;
    let settings = await ExamSettings.findOne().sort({ createdAt: -1 });

    if (!settings) settings = new ExamSettings();
    if (examTitle !== undefined) settings.examTitle = examTitle;
    if (duration !== undefined) settings.duration = parseInt(duration);
    if (isActive !== undefined) settings.isActive = isActive;
    if (instructions !== undefined) settings.instructions = instructions;

    await settings.save();
    res.json({ success: true, message: 'Settings updated', settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── QUESTIONS CRUD ──────────────────────────────────────────────────────────
router.get('/questions', verifyAdmin, async (req, res) => {
  const questions = await Question.find().sort({ order: 1, createdAt: 1 });
  res.json({ success: true, questions });
});

router.post('/questions', verifyAdmin, async (req, res) => {
  try {
    const { questionText, questionType, options, correctAnswer, marks, order } = req.body;
    if (!questionText || !questionType || !correctAnswer) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const question = new Question({ questionText, questionType, options: options || [], correctAnswer, marks: marks || 1, order: order || 0 });
    await question.save();
    res.json({ success: true, message: 'Question added', question });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/questions/:id', verifyAdmin, async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    res.json({ success: true, message: 'Question updated', question });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/questions/:id', verifyAdmin, async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── RESULTS ────────────────────────────────────────────────────────────────
router.get('/results', verifyAdmin, async (req, res) => {
  const results = await Response.find()
    .select('-answers')
    .sort({ totalMarks: -1 });
  res.json({ success: true, results });
});

router.get('/results/:id', verifyAdmin, async (req, res) => {
  const result = await Response.findById(req.params.id);
  if (!result) return res.status(404).json({ success: false, message: 'Result not found' });
  res.json({ success: true, result });
});

// ─── EXPORT RESULTS TO EXCEL ────────────────────────────────────────────────
router.get('/export/results', verifyAdmin, async (req, res) => {
  try {
    const results = await Response.find().sort({ totalMarks: -1 });

    const data = results.map((r, i) => ({
      'Rank': i + 1,
      'Roll Number': r.rollNumber,
      'Full Name': r.fullName,
      'Total Marks': r.totalMarks,
      'Max Marks': r.maxMarks,
      'Percentage (%)': r.percentage,
      'Submitted At': r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '',
      'Submission Type': r.submissionType,
      'Tab Switches': r.tabSwitchCount,
      'Fullscreen Exits': r.fullscreenExitCount,
      'Time Taken (sec)': r.timeTakenSeconds || ''
    }));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Results');
    if (data.length > 0) {
      ws.columns = Object.keys(data[0]).map(k => ({ header: k, key: k, width: 20 }));
      data.forEach(row => ws.addRow(row));
    }
    res.setHeader('Content-Disposition', 'attachment; filename=exam_results.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── EXPORT STUDENTS LOGIN DATA ─────────────────────────────────────────────
router.get('/export/students', verifyAdmin, async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: 1 });

    const data = students.map(s => ({
      'Roll Number': s.rollNumber,
      'Full Name': s.fullName,
      'Login Time': s.loginTime ? new Date(s.loginTime).toLocaleString() : 'Not logged in',
      'Exam Started': s.examStartTime ? new Date(s.examStartTime).toLocaleString() : 'Not started',
      'Has Attempted': s.hasAttempted ? 'Yes' : 'No',
      'Registered At': new Date(s.createdAt).toLocaleString()
    }));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Students');
    if (data.length > 0) {
      ws.columns = Object.keys(data[0]).map(k => ({ header: k, key: k, width: 22 }));
      data.forEach(row => ws.addRow(row));
    }
    res.setHeader('Content-Disposition', 'attachment; filename=student_data.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── STUDENTS LIST ───────────────────────────────────────────────────────────
router.get('/students', verifyAdmin, async (req, res) => {
  const students = await Student.find().sort({ createdAt: -1 });
  res.json({ success: true, students });
});

router.delete('/students/:id', verifyAdmin, async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE RESPONSE ────────────────────────────────────────────────────────
router.delete('/results/:id', verifyAdmin, async (req, res) => {
  try {
    const response = await Response.findById(req.params.id);
    if (!response) return res.status(404).json({ success: false, message: 'Response not found' });

    // Reset student hasAttempted flag so they can retake
    await Student.findOneAndUpdate(
      { rollNumber: response.rollNumber },
      { hasAttempted: false, examStartTime: null }
    );

    await Response.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Response deleted. Student can now retake the exam.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────
router.get('/dashboard', verifyAdmin, async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const attempted = await Student.countDocuments({ hasAttempted: true });
    const totalQuestions = await Question.countDocuments();
    const results = await Response.find().sort({ totalMarks: -1 }).limit(5)
      .select('rollNumber fullName totalMarks maxMarks percentage submittedAt');

    const settings = await ExamSettings.findOne().sort({ createdAt: -1 });

    res.json({
      success: true,
      stats: { totalStudents, attempted, totalQuestions, examActive: settings?.isActive || false },
      topStudents: results,
      settings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
