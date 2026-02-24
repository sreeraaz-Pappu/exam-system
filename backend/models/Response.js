const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  rollNumber: String,
  fullName: String,
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    questionText: String,
    givenAnswer: String,
    isCorrect: Boolean,
    marksAwarded: Number
  }],
  totalMarks: { type: Number, default: 0 },
  maxMarks: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
  submissionType: { type: String, enum: ['manual','auto_timer','auto_tab_switch','auto_fullscreen'], default: 'manual' },
  tabSwitchCount: { type: Number, default: 0 },
  fullscreenExitCount: { type: Number, default: 0 },
  examStartTime: Date,
  examEndTime: Date,
  timeTakenSeconds: Number
}, { timestamps: true });

module.exports = mongoose.model('Response', responseSchema);
