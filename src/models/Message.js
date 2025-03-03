const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Report",
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  }
});

// Index for efficient queries
MessageSchema.index({ reportId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", MessageSchema);