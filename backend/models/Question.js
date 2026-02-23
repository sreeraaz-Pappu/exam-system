const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  questionType: {
    type: String,
    enum: ['mcq', 'fill'],
    required: true
  },
  options: {
    // Only for MCQ - stored as array of strings
    type: [String],
    default: []
  },
  correctAnswer: {
    // For MCQ: index (0,1,2,3) or the exact text
    // For fill: the expected answer string
    type: String,
    required: true
  },
  marks: {
    type: Number,
    default: 1
  },
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
