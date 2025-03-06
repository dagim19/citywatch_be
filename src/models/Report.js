// models/Report.js
const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  subcity: {
    type: String,
    required: true,
  },
  category: {
    type: Number,
    required: true,
  },
  images: {
    type: [String],
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
  },
  verified_at: {
    type: Date,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
  },
  report_count: {
    type: Number,
    default: 1,
  },
  description: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  announced: {
    type: Boolean,
  },
  duration: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "verified","rejected"],
    default: "pending",
  },
  issueType: {
    type: String,
    required: false, //to be filled by maintenance
  },
  resolved: {
    type: String,
    enum: ["waiting", "inProgress", "attempted", "resolved"],
    default: "waiting",
  },
  priority: {
    type: String,
    enum: ["normal", "high"],
    default: "normal",
  },
  supporters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  metadata: {
    type: Object,
    required: false,
  }, // contains location data
  // Add more fields as needed
});
ReportSchema.index({ supporters: 1 });
module.exports = mongoose.model("Report", ReportSchema);

