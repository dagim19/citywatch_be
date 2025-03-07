// routes/maintainer.js
const express = require("express");
const router = express.Router();
const Report = require("../../models/Report");
const User = require("../../models/User");
const auth = require("../../middleware/auth");

// Middleware to ensure user is a maintainer
const ensureMaintainer = async (req, res, next) => {
  try {
    if (req.user.role !== "maintainer") {
      return res.status(403).json({ message: "Access denied. Not a maintainer" });
    }
    next();
  } catch (error) {
    console.error("Maintainer middleware error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get maintainer ID and username
router.get("/getId", auth, ensureMaintainer, async (req, res) => {
  try {
    return res.status(200).json({ 
      userId: req.user._id, 
      username: req.user.name 
    });
  } catch (error) {
    console.error("Error fetching maintainer ID:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Assign reports to maintainer based on subcity and availability
router.patch("/assignReports", auth, ensureMaintainer, async (req, res) => {
  try {
    const maintainer = await User.findById(req.user._id);
    
    // Update maintainer's current location
    if (req.body.currentLocation) {
      maintainer.currentLocation = req.body.currentLocation;
      await maintainer.save();
    }

    // Check if maintainer is already assigned to reports
    const assignedReports = await Report.find({ 
      assignedTo: req.user._id, 
      resolved: { $in: ["waiting", "inProgress"] },
      status: "verified"
    });

    if (assignedReports.length > 0) {
      return res.status(200).json({ 
        message: "Maintainer is already busy", 
        assignedCount: assignedReports.length 
      });
    }

    // Set maintainer as available
    await User.findByIdAndUpdate(req.user._id, { maintainerAvailable: true });

    // Find verified reports in maintainer's subcity that aren't assigned yet
    const reports = await Report.find({
      subcity: maintainer.subcity,
      status: "verified",
      resolved: "waiting",
      assignedTo: { $exists: false }
    }).sort({ priority: -1, createdAt: 1 }).limit(1);

    if (reports.length === 0) {
      return res.status(200).json({ message: "No reports available for assignment" });
    }

    // Assign the report to this maintainer
    const report = reports[0];
    report.assignedTo = req.user._id;
    report.resolved = "inProgress";
    await report.save();

    return res.status(200).json({ 
      message: "Report assigned successfully", 
      reportId: report._id 
    });
  } catch (error) {
    console.error("Error assigning reports:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get reports assigned to the maintainer
router.get("/getReport", auth, ensureMaintainer, async (req, res) => {
  try {
    const reports = await Report.find({ 
      assignedTo: req.user._id,
      resolved: { $in: ["waiting", "inProgress"] },
      status: "verified"
    }).populate("user_id", "name phone");


    // Format reports for frontend
    const formattedReports = reports.map(report => ({
      _id: report._id,
      category: report.category,
      subcity: report.subcity,
      description: report.description,
      createdAt: report.createdAt,
      status: report.status,
      resolved: report.resolved,
      priority: report.priority,
      images: report.images,
      metadata: report.metadata,
      reporter: {
        name: report.user_id.name,
        phone: report.user_id.phone
      }
    }));

    res.json(formattedReports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get location data for a specific report
router.get("/initializeLocation/:reportId", async (req, res) => {
  try {
    const report = await Report.findById(req.params.reportId);
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Extract location from metadata
    if (!report.metadata || !report.metadata.location) {
      return res.status(404).json({ message: "Location data not available" });
    }

    const { latitude, longitude } = report.metadata.location;
    
    res.json({ latitude, longitude });
  } catch (error) {
    console.error("Error fetching location:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Submit maintenance form data
router.patch("/submitForm/:reportId", auth, ensureMaintainer, async (req, res) => {
  try {
    const { resolution, issueType } = req.body;
    
    if (!resolution || !issueType) {
      return res.status(400).json({ message: "Resolution and issue type are required" });
    }

    const report = await Report.findById(req.params.reportId);
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Verify this report is assigned to the current maintainer
    if (report.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this report" });
    }

    // Update report with maintenance data
    report.resolved = resolution === "resolved" ? "resolved" : "attempted";
    report.issueType = issueType;
    
    await report.save();

    // Update maintainer availability
    await User.findByIdAndUpdate(req.user._id, { maintainerAvailable: true });

    res.json({ 
      message: "Report updated successfully", 
      status: report.resolved 
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;