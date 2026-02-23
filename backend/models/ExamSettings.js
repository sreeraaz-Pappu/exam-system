const mongoose = require('mongoose');

const examSettingsSchema = new mongoose.Schema({
  examTitle: {
    type: String,
    default: 'Online Examination'
  },
  duration: {
    type: Number, // in minutes
    default: 30
  },
  isActive: {
    type: Boolean,
    default: false
  },
  instructions: {
    type: String,
    default: 'Read all questions carefully before answering.'
  }
}, { timestamps: true });

module.exports = mongoose.model('ExamSettings', examSettingsSchema);
