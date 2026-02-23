const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  rollNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  hasAttempted: {
    type: Boolean,
    default: false
  },
  examToken: {
    type: String,
    default: null
  },
  loginTime: {
    type: Date,
    default: null
  },
  examStartTime: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
