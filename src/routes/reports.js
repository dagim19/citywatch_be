const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth"); // Assuming you have an auth middleware
const { multipleUploadMiddleware } = require("../middleware/handleUpload");
const Report = require("../models/Report"); // Assuming you have a Report model
const User = require("../models/User"); // Assuming you have a User model
const router = express.Router();
const upload = require("../config/storage");

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
      status: "verified",
      resolved: false,
    }).sort({ createdAt: 1 });

    res.status(200).json(unresolvedReports);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});

router.get("/power", auth, async (req, res) => {
  try {
    const unresolvedReports = await Report.find({
      status: "verified",
      resolved: false,
      category: 0,
    }).sort({ createdAt: 1 });

    res.status(200).json(unresolvedReports);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});

router.get("/water", auth, async (req, res) => {
  try {
    const unresolvedReports = await Report.find({
      status: "verified",
      resolved: false,
      category: 1,
    }).sort({ createdAt: 1 });

    res.status(200).json(unresolvedReports);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});

router.get("/road", auth, async (req, res) => {
  try {
    const unresolvedReports = await Report.find({
      status: "verified",
      resolved: false,
      category: 2,
    }).sort({ createdAt: 1 });

    res.status(200).json(unresolvedReports);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});

router.get("/admin/getReport/:report_id", auth, async (req, res) => {
  // used to fetch the specific report when the report gets clicked from the admin dashboard containing all reports
  try {
    const { user } = req.body;
    const searchedReport = await Report.findById(report_id);
    res.status(200).json(searchedReport);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});
router.get("/verifier/getPending", auth, async (req, res) => {
  try {
    const { user } = req.body;

    const pendingReports = await Report.findOne({ status: "pending" }).sort({
      createdAt: 1,
    });

    res.status(200).json(pendingReports);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});
router.patch("/verifier/verify/:report_Id", auth, async (req, res) => {
  // verifying report
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
    report.verifiedBy = user.user_id;
    report.verified_at = new Date();

    await report.save();

    res.status(200).json({ msg: "Report updated successfully", report });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});


router.patch(
  "/reports/:report_id/attempted",
  auth,
  async (req, res) => {
    try {
      const report = await Report.findOne({
        _id: req.params.report_id,
        assignedTo: req.user.id, // Ensure report is assigned to current user
      });

      if (!report) {
        return res.status(404).json({ msg: "Report not found or unauthorized" });
      }

      report.resolved = "attempted";
      report.priority = "high";
      await report.save();

      res.json({
        msg: "Report marked as attempted",
        report: {
          id: report._id,
          priority: report.priority,
          status: report.resolved,
        },
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);


router.get(
  "/admin/reports/attempted",
  auth,
  async (req, res) => {
    try {
      const attemptedReports = await Report.find({
        resolved: "attempted",
        priority: "high",
      })
        .sort({
          priority: -1, // High priority first
          createdAt: -1, // Newest first
        })

      res.json({
        count: attemptedReports.length,
        reports: attemptedReports.map(report => ({
          id: report._id,
          subcity: report.subcity,
          category: report.category,
          priority: report.priority,
          assignedTo: report.assignedTo,
          createdAt: report.createdAt,
        })),
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);


//an admin route to assign a maintenance worker

router.patch("/maintenance/assign/:report_id", auth, async (req, res) => {
  const { report_id } = req.params;

  try {
    // Fetch the report
    const report = await Report.findById(report_id);
    if (!report) {
      return res.status(404).json({ msg: "Report not found" });
    }
    // Extract the report's location from metadata
    const reportLocation = report.metadata.location; // Ensure this is in GeoJSON format: { type: "Point", coordinates: [longitude, latitude] }
    // Find the closest available worker within the same subcity
    const closestWorker = await User.findOne({
      subCity: report.subcity,
      maintainerAvailable: true,
      currentLocation: {
        $near: {
          $geometry: reportLocation,
          $maxDistance: 10000, 
          // we can add a max distance but probably not necessary since we are only assigning to maintenace employees from within the same sub city as the report
          
        },
      },
    });
    if (!closestWorker) {
      return res.status(404).json({ msg: "No maintenance worker available nearby" });
    }
    // Assign the worker to the report
    report.assignedTo = closestWorker._id;
    await report.save();
    console.log(`Report assigned to user: ${closestWorker.name}`);
    res.status(200).json({ msg: "Report assigned successfully", worker: closestWorker.name });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});
module.exports = router;
