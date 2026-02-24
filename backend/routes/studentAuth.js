const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Exam = require('../models/Exam');
const Student = require('../models/Student');

// POST /api/student/:examCode/login
router.post('/:examCode/login', async (req, res) => {
  try {
    const { examCode } = req.params;
    const { rollNumber, fullName } = req.body;

    if (!rollNumber || !fullName)
      return res.status(400).json({ success: false, message: 'Roll number and full name are required.' });

    const exam = await Exam.findOne({ examCode: examCode.toLowerCase() });
    if (!exam)
      return res.status(404).json({ success: false, message: 'Exam not found. Check your URL.' });
    if (!exam.isActive)
      return res.status(403).json({ success: false, message: 'This exam is not currently active. Contact your administrator.' });

    const roll = rollNumber.trim().toUpperCase();
    const name = fullName.trim();

    let student = await Student.findOne({ examId: exam._id, rollNumber: roll });

    if (student) {
      if (student.hasAttempted)
        return res.status(403).json({ success: false, message: 'You have already attempted this exam. Results will be shared by your administrator.' });
      // Update name if changed
      student.fullName = name;
      student.loginTime = new Date();
      await student.save();
    } else {
      student = await Student.create({ examId: exam._id, rollNumber: roll, fullName: name, loginTime: new Date() });
    }

    const token = jwt.sign(
      { studentId: student._id, rollNumber: roll, fullName: name, examId: exam._id, examCode },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    res.json({
      success: true,
      token,
      student: { rollNumber: roll, fullName: name },
      examSettings: { examTitle: exam.examTitle, duration: exam.duration, instructions: exam.instructions, examCode }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

module.exports = router;
