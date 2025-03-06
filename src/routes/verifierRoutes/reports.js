const express = require("express");
const multer = require("multer");
const auth = require("../../middleware/auth"); // Assuming you have an auth middleware
const { multipleUploadMiddleware } = require("../../middleware/handleUpload");
const Message = require("../../models/Message");
const Report = require("../../models/Report");
const User = require("../../models/User");
const router = express.Router();
const upload = require("../../config/storage");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
router.get("/getVerified", auth, async (req, res) => {
    try {
        console.log("Received request for pending reports");

        // 🔹 Get the authenticated user from the auth middleware
        const user = req.user;  
        if (!user || !user.subcity) {
            console.log("Invalid user object:", user);
            return res.status(400).json({ msg: "User subcity is required" });
        }

        // 🔹 Fetch reports for the user's subcity
        const verifiedReports = await Report.find({ status: "verified"||"rejected", verifiedBy: user.id}).sort({ createdAt: 1 });

        console.log("Fetched pending reports:", verifiedReports.length);
        res.status(200).json(verifiedReports);
    } catch (err) {
        console.error("Error fetching pending reports:", err.message);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
});
router.get("/getPending", auth, async (req, res) => {
    try {
        console.log("Received request for pending reports");

        // 🔹 Get the authenticated user from the auth middleware
        const user = req.user;  
        if (!user || !user.subcity) {
            console.log("Invalid user object:", user);
            return res.status(400).json({ msg: "User subcity is required" });
        }

        // 🔹 Fetch reports for the user's subcity
        const pendingReports = await Report.find({ status: "pending", subcity: user.subcity }).sort({ createdAt: 1 });

        console.log("Fetched pending reports:", pendingReports.length);
        res.status(200).json(pendingReports);
    } catch (err) {
        console.error("Error fetching pending reports:", err.message);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
});
router.patch("/verify", auth, async (req, res) => {
    try {
      const { reportId} = req.body;  // Extract reportId and phone from request body
  
      // Validate that the reportId and phone are provided
      if (!reportId ) {
        return res.status(400).json({ msg: "Report ID and phone are required" });
      }
  
      // Find the report by ID
      const report = await Report.findById(reportId);
      if (!report) {
        return res.status(404).json({ msg: "Report not found" });
      }
  
      // Get userId from the authenticated user (set by the auth middleware)
      const userId = req.user.id;
  
      // Check if the user is authorized to verify the report (you can add more logic here if needed)
      if (!userId) {
        return res.status(400).json({ msg: "User ID is required for verification" });
      }
  
      // Update report status to verified
      report.status = "verified";
      report.verifiedBy = userId;
      report.verified_at = new Date();
  
      // Save the updated report
      await report.save();
  
      // Return success response with updated report data
      res.status(200).json({
        msg: "Report verified successfully",
        report: {
          _id: report._id,
          status: report.status,
          verifiedBy: report.verifiedBy,
          verified_at: report.verified_at
        }
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ msg: "Server error", error: error.message });
    }
  });
  
  router.patch("/reject", auth, async (req, res) => {
    try {
      const { reportId} = req.body;  // Extract reportId and phone from request body
  
      // Validate that the reportId and phone are provided
      if (!reportId ) {
        return res.status(400).json({ msg: "Report ID and phone are required" });
      }
  
      // Find the report by ID
      const report = await Report.findById(reportId);
      if (!report) {
        return res.status(404).json({ msg: "Report not found" });
      }
  
      // Get userId from the authenticated user (set by the auth middleware)
      const userId = req.user.id;
  
      // Check if the user is authorized to verify the report (you can add more logic here if needed)
      if (!userId) {
        return res.status(400).json({ msg: "User ID is required for verification" });
      }
  
      // Update report status to verified
      report.status = "rejected";
      report.verifiedBy = userId;
      report.verified_at = new Date();
  
      // Save the updated report
      await report.save();
  
      // Return success response with updated report data
      res.status(200).json({
        msg: "Report verified successfully",
        report: {
          _id: report._id,
          status: report.status,
          verifiedBy: report.verifiedBy,
          verified_at: report.verified_at
        }
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ msg: "Server error", error: error.message });
    }
  });
  



module.exports = router;
