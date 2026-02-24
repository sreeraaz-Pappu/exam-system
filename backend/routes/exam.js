const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Question = require('../models/Question');
const Student = require('../models/Student');
const Response = require('../models/Response');

function verifyStudent(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ success: false, message: 'No token provided.' });
  try {
    req.student = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token. Please login again.' });
  }
}

// GET /api/exam/questions
router.get('/questions', verifyStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.student.studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    if (student.hasAttempted) return res.status(403).json({ success: false, message: 'You have already submitted this exam.' });

    if (!student.examStartTime) {
      student.examStartTime = new Date();
      await student.save();
    }

    const questions = await Question.find(
      { examId: req.student.examId },
      { correctAnswer: 0 }
    ).sort({ order: 1, createdAt: 1 });

    res.json({ success: true, questions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/exam/submit
router.post('/submit', verifyStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.student.studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    if (student.hasAttempted) return res.status(403).json({ success: false, message: 'Already submitted.' });

    const { answers, submissionType, tabSwitchCount, fullscreenExitCount } = req.body;
    const questions = await Question.find({ examId: req.student.examId });

    const qMap = {};
    questions.forEach(q => { qMap[q._id.toString()] = q; });

    let totalMarks = 0;
    let maxMarks = 0;
    const processedAnswers = (answers || []).map(a => {
      const q = qMap[a.questionId];
      if (!q) return null;
      maxMarks += q.marks;
      const given = (a.givenAnswer || '').toString().trim().toLowerCase();
      const correct = (q.correctAnswer || '').toString().trim().toLowerCase();
      const isCorrect = given === correct;
      if (isCorrect) totalMarks += q.marks;
      return { questionId: q._id, questionText: q.questionText, givenAnswer: a.givenAnswer || '', isCorrect, marksAwarded: isCorrect ? q.marks : 0 };
    }).filter(Boolean);

    const now = new Date();
    const timeTaken = student.examStartTime ? Math.floor((now - student.examStartTime) / 1000) : 0;

    await Response.create({
      examId: req.student.examId,
      studentId: student._id,
      rollNumber: student.rollNumber,
      fullName: student.fullName,
      answers: processedAnswers,
      totalMarks,
      maxMarks,
      percentage: maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0,
      submissionType: submissionType || 'manual',
      tabSwitchCount: tabSwitchCount || 0,
      fullscreenExitCount: fullscreenExitCount || 0,
      examStartTime: student.examStartTime,
      examEndTime: now,
      timeTakenSeconds: timeTaken
    });

    student.hasAttempted = true;
    await student.save();

    res.json({ success: true, message: 'Exam submitted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
