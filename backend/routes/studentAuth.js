const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const ExamSettings = require('../models/ExamSettings');

// POST /api/student/login
router.post('/login', async (req, res) => {
  try {
    const { rollNumber, fullName } = req.body;

    if (!rollNumber || !fullName) {
      return res.status(400).json({ success: false, message: 'Roll number and full name are required' });
    }

    const roll = rollNumber.trim().toUpperCase();
    const name = fullName.trim();

    // Find student by roll number
    let student = await Student.findOne({ rollNumber: roll });

    if (!student) {
      // Auto-register on first login (or can be pre-registered by admin)
      student = new Student({ rollNumber: roll, fullName: name });
    } else {
      // Verify name matches
      if (student.fullName.toLowerCase() !== name.toLowerCase()) {
        return res.status(401).json({ success: false, message: 'Name does not match records for this Roll Number' });
      }
    }

    // Check if already attempted
    if (student.hasAttempted) {
      return res.status(403).json({ success: false, message: 'You have already submitted this exam. Only one attempt is allowed.' });
    }

    // Check exam is active
    const settings = await ExamSettings.findOne().sort({ createdAt: -1 });
    if (!settings || !settings.isActive) {
      return res.status(403).json({ success: false, message: 'Exam is not currently active. Please contact your administrator.' });
    }

    student.loginTime = new Date();
    await student.save();

    // Issue JWT
    const token = jwt.sign(
      { id: student._id, rollNumber: student.rollNumber, fullName: student.fullName },
      process.env.JWT_SECRET,
      { expiresIn: `${(settings.duration || 30) + 10}m` }
    );

    res.json({
      success: true,
      token,
      student: { rollNumber: student.rollNumber, fullName: student.fullName },
      examSettings: {
        title: settings.examTitle,
        duration: settings.duration,
        instructions: settings.instructions
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

module.exports = router;
