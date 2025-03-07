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


// Route to get all reports with populated user details
router.get("/getall", auth, async (req, res) => {
    try {
        console.log("Received request for all reports");

        // 🔹 Get the authenticated user from the auth middleware
        const user = req.user;
        if (!user || !user.subcity) {
            console.log("Invalid user object:", user);
            return res.status(400).json({ msg: "User subcity is required" });
        }

        // 🔹 Fetch all reports and populate the `user_id` and `verifiedBy` fields
        const reports = await Report.find()
            .sort({ createdAt: 1 }) // Sort by creation date
            .populate({
                path: "user_id", // Populate the user_id field
                select: "name fatherName phone", // Select only the required fields
            })
            .populate({
                path: "verifiedBy", // Populate the verifiedBy field
                select: "name", // Select only the name of the verifier
            });

        console.log("Fetched reports:", reports.length);

        // 🔹 Send the populated reports as the response
        res.status(200).json(reports);
    } catch (err) {
        console.error("Error fetching reports:", err.message);
        res.status(500).json({ msg: "Server Error", error: err.message });
    }
});

module.exports = router;
