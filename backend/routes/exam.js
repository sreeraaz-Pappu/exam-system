const express = require('express');
const router = express.Router();
const { verifyStudent } = require('../middleware/auth');
const Question = require('../models/Question');
const Response = require('../models/Response');
const Student = require('../models/Student');
const ExamSettings = require('../models/ExamSettings');

// GET /api/exam/questions — serve questions WITHOUT correct answers
router.get('/questions', verifyStudent, async (req, res) => {
  try {
    // Check student hasn't already attempted
    const student = await Student.findById(req.student.id);
    if (!student || student.hasAttempted) {
      return res.status(403).json({ success: false, message: 'Exam already submitted or student not found' });
    }

    // Set exam start time
    if (!student.examStartTime) {
      student.examStartTime = new Date();
      await student.save();
    }

    const settings = await ExamSettings.findOne().sort({ createdAt: -1 });

    // Fetch questions — NEVER send correctAnswer to frontend
    const questions = await Question.find({}, {
      correctAnswer: 0,  // EXCLUDE correct answer
      __v: 0
    }).sort({ order: 1, createdAt: 1 });

    res.json({
      success: true,
      questions,
      examSettings: {
        title: settings?.examTitle || 'Online Examination',
        duration: settings?.duration || 30,
        instructions: settings?.instructions || '',
        startTime: student.examStartTime
      }
    });

  } catch (error) {
    console.error('Questions fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching questions' });
  }
});

// POST /api/exam/submit
router.post('/submit', verifyStudent, async (req, res) => {
  try {
    const { answers, submissionType, tabSwitchCount, fullscreenExitCount } = req.body;

    const student = await Student.findById(req.student.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (student.hasAttempted) {
      return res.status(403).json({ success: false, message: 'Exam already submitted' });
    }

    // Fetch all questions with correct answers (server side)
    const questions = await Question.find({});
    const questionMap = {};
    questions.forEach(q => { questionMap[q._id.toString()] = q; });

    let totalMarks = 0;
    let maxMarks = 0;
    const evaluatedAnswers = [];

    if (answers && Array.isArray(answers)) {
      for (const ans of answers) {
        const question = questionMap[ans.questionId];
        if (!question) continue;

        maxMarks += question.marks;
        let isCorrect = false;
        let marksAwarded = 0;

        const given = (ans.givenAnswer || '').toString().trim().toLowerCase();
        const correct = question.correctAnswer.toString().trim().toLowerCase();

        if (question.questionType === 'mcq') {
          isCorrect = given === correct;
        } else if (question.questionType === 'fill') {
          isCorrect = given === correct;
        }

        if (isCorrect) {
          marksAwarded = question.marks;
          totalMarks += marksAwarded;
        }

        evaluatedAnswers.push({
          questionId: question._id,
          questionText: question.questionText,
          givenAnswer: ans.givenAnswer || '',
          isCorrect,
          marksAwarded
        });
      }
    }

    const percentage = maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : 0;
    const now = new Date();
    const timeTaken = student.examStartTime
      ? Math.floor((now - student.examStartTime) / 1000)
      : null;

    // Save response
    const response = new Response({
      student: student._id,
      rollNumber: student.rollNumber,
      fullName: student.fullName,
      answers: evaluatedAnswers,
      totalMarks,
      maxMarks,
      percentage: parseFloat(percentage),
      submittedAt: now,
      submissionType: submissionType || 'manual',
      tabSwitchCount: tabSwitchCount || 0,
      fullscreenExitCount: fullscreenExitCount || 0,
      examStartTime: student.examStartTime,
      examEndTime: now,
      timeTakenSeconds: timeTaken
    });

    await response.save();

    // Mark student as attempted
    student.hasAttempted = true;
    await student.save();

    // Return ONLY confirmation — no scores shown to student
    res.json({
      success: true,
      message: 'Your response has been recorded.'
    });

  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ success: false, message: 'Error submitting exam' });
  }
});

module.exports = router;
