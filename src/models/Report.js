// models/Report.js
const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    subcity: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    images: {
        type: [String],
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    verified_at: {
        type: Date,
        required: true
    },
    report_count: {
        type: Number,
        default: 1
    },
    description: {
        type: String,
        required: true 
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    announced: {
        type: Boolean
    },
    duration: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'verified'],
        default: 'pending'
    },
    resolved: {
        type:Boolean,
        default:false
    },
    metadata: {
        type: Object,
        required: true
    }
    // Add more fields as needed
});
 module.exports = mongoose.model('Report', ReportSchema);