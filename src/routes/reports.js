const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth"); // Assuming you have an auth middleware
const { multipleUploadMiddleware } = require("../middleware/handleUpload");
const Report = require("../models/Report"); // Assuming you have a Report model
const User = require("../models/User"); // Assuming you have a User model
const router = express.Router();
const upload = require("../config/storage");

const isValidLocation = (location) => {
  const { lat, lng } = location;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

router.post("/", auth, upload.array("images", 5), async (req, res) => {
  try {
    const { category, duration, description, metadata } = req.body;

    // Get the file paths of uploaded images
    const imageUrls = req.files.map(
      (file) => `http://localhost/images/${file.filename}`
    );

    // Create a new report document
    const report = new Report({
      category,
      duration,
      description,
      metadata: JSON.parse(metadata),
      images: imageUrls,
    });

    console.log(report);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});
router.get("/", auth, async (req, res) => {
  try {
    const unresolvedReports = await Report.find({
      status: "pending",
      resolved: false,
    }).sort({ createdAt: 1 });

    res.status(200).json(unresolvedReports);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});

router.get("/verifier", auth, async (req, res) => {
  try {
    const pendingReports = await Report.findOne({ status: "pending" }).sort({
      createdAt: 1,
    });

    res.status(200).json(pendingReports);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});
router.patch("/verifier", auth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { user } = req.body;

    if (!user || !user.phone) {
      return res
        .status(400)
        .json({ msg: "User object with a phone number is required" });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ msg: "Report not found" });
    }

    report.status = "verified";
    report.verifiedBy = user.phone;
    report.verified_at = new Date();

    await report.save();

    res.status(200).json({ msg: "Report updated successfully", report });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});

module.exports = router;
