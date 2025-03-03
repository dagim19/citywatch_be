const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Message = require("../models/Message");
const Report = require("../models/Report");
const User = require("../models/User");

// Get verifier information for a report
router.get("/reports/:reportId/verifier", auth, async (req, res) => {
  try {
    const reportId = req.params.reportId;
    
    const report = await Report.findById(reportId);
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Check if user owns the report
    if (report.user_id.toString() !== req.user.id && 
        report.verifiedBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized access to this report" });
    }
    
    // Get verifier information
    if (!report.verifiedBy) {
      return res.status(200).json({ 
        name: "Not yet assigned",
        email: "",
        role: "Pending assignment"
      });
    }
    
    const verifier = await User.findById(report.verifiedBy);
    
    if (!verifier) {
      return res.status(200).json({ 
        name: "Unknown verifier",
        email: "",
        role: "Verifier"
      });
    }
    
    return res.status(200).json({
      name: verifier.name,
      email: verifier.email,
      role: verifier.role || "Verifier"
    });
    
  } catch (error) {
    console.error("Error fetching verifier info:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all messages for a report
router.get("/reports/:reportId/messages", auth, async (req, res) => {
  try {
    const reportId = req.params.reportId;
    
    const report = await Report.findById(reportId);
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Check if user owns the report or is the verifier
    if (report.user_id.toString() !== req.user.id && 
        report.verifiedBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized access to messages" });
    }
    
    const messages = await Message.find({ reportId })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email');
      
    // Format messages for frontend
    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      text: msg.text,
      createdAt: msg.createdAt,
      sender: msg.sender._id,
      senderName: msg.sender.name,
      isUser: msg.sender._id.toString() === req.user.id
    }));
    
    res.json(formattedMessages);
    
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Send a new message
router.post("/reports/:reportId/messages", auth, async (req, res) => {
  try {
    const { message } = req.body;
    const reportId = req.params.reportId;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ message: "Message text is required" });
    }
    
    const report = await Report.findById(reportId);
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Check if user owns the report or is the verifier
    if (report.user_id.toString() !== req.user.id && 
        report.verifiedBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to send messages" });
    }
    
    const newMessage = new Message({
      reportId,
      sender: req.user.id,
      text: message
    });
    
    await newMessage.save();
    
    res.status(201).json({
      _id: newMessage._id,
      text: newMessage.text,
      createdAt: newMessage.createdAt,
      sender: req.user.id,
      isUser: true
    });
    
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;