// models/Report.js
const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Add reference to User model
        required: true,
    },
    subcity: {
        type: String,
        required: true
    },
    category: {
        type: String
    },
    images: {
        type: [String],
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Verifier', // Add reference to a potential Verifier model (if applicable)
    },
    verified_at: {
        type: Date,
    },
    report_count: {
        type: Number,
        default: 1
    },
    upvotes: {  //new field to keep track of upvotes separately
        type: Number,
        default: 0
    },
    downvotes: { //new field to keep track of downvotes separately
        type: Number,
        default: 0
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
    metadata: {
        type: Object,
        required: true
    },
    comments: [{ // Array of comment IDs associated with this report
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }]
});

module.exports = mongoose.model('Report', ReportSchema);