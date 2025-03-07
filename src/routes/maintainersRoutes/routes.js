const express = require("express");
const auth = require("../../middleware/auth"); // Assuming you have an auth middleware
const Report = require("../../models/Report");
const User = require("../../models/User");
const router = express.Router();
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

//maintenance routes

// Function to calculate distance between two coordinates using Haversine formula
const haversineDistance = (coords1, coords2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Radius of Earth in km
  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};
router.get("/getDistance"),async(req,res)=>{
  try{
    lat=req.body.lat;
    lon=req.body.lon;
    

  }
  catch{

  }
}
// GET /maintenance/assignReports
router.patch("/assignReports/:userId", async (req, res) => {
  try {
    console.log("🔵 Route hit: assignReports");
    const { userId } = req.params;
    const { currentLocation } = req.body;  // Expecting currentLocation to be sent in the request body
    console.log("🟢 Received userId:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log("🔴 Invalid user ID format");
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const maintainer = await User.findById(userId);
    if (!maintainer) {
      console.log("🔴 Maintainer not found");
      return res.status(404).json({ message: "Maintainer not found" });
    }

    if (currentLocation) {
      // Update maintainer's current location
      maintainer.currentLocation = {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
      };
      await maintainer.save();
      console.log("🟢 Maintainer's location updated successfully");
    }

    if (!maintainer.maintainerAvailable) {
      console.log("🟡 Maintainer is already busy");
      return res.status(200).json({ message: "Maintainer is already busy" });
    }

    console.log("🟢 Searching for the closest report...");

    // 🔹 Find the nearest unassigned report with status 'verified' and resolved 'waiting'
    const report = await Report.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [maintainer.currentLocation.lng, maintainer.currentLocation.lat], // Use updated currentLocation
          },
          distanceField: "distance",
          spherical: true,
          query: {
            assignedTo: null,
            resolved: "waiting",
            status: "verified",
          },
        },
      },
      { $limit: 1 }, // Get the nearest report
    ]);

    if (!report.length) {
      console.log("🔴 No unassigned reports found");
      return res.status(404).json({ message: "No unassigned reports found" });
    }

    const closestReport = await Report.findById(report[0]._id);

    console.log("🟢 Assigning closest report:", closestReport._id);
    closestReport.assignedTo = new mongoose.Types.ObjectId(userId);
    closestReport.resolved = "inProgress";
    maintainer.maintainerAvailable = false;

    await closestReport.save();
    await maintainer.save();

    console.log("✅ Report assigned successfully");
    res.status(200).json({ message: "Report assigned successfully", report: closestReport });
  } catch (error) {
    console.error("🚨 Error assigning report:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// used to fetch the assigned report

router.get("/getReport/:userId", async (req, res) => {
  console.log("Get reports is working ");
  try {
    const { userId } = req.params;
    const report = await Report.findOne({ assignedTo: userId }); // Get only one report
    console.log("This is the location of the report",report.metadata.location);
    if (!report) {
      return res.status(404).json({ message: "No report found" });
    }

    res.status(200).json([report]); // Wrap the single object in an array
  } catch (error) {
    console.error("Error fetching assigned reports:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/initializeLocation/:reportId", async (req, res) => {
  try {
    console.log("Fetching location for report ID:");

    const { reportId } = req.params;

    // Validate report ID
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: "Invalid report ID format" });
    }

    // Find the report
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    console.log(report.metada)
    // Initialize the location object
    const location = {
      latitude: report.metadata.location.latitude || 9, 
      longitude: report.metadata.location.longitude || 38.7525,
    };
    console.log(location)
    res.status(200).json(location);
  } catch (error) {
    console.error("Error initializing location:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//Once the maintenance submits the form the resolution status should be changed along with freeing up the maintainer
router.patch("/submitForm/:reportId", async (req, res) => {
  console.log("submitting form");
  try {
    const { reportId } = req.params;
    const { resolution, issueType, maintainerId } = req.body;

    // Validate required fields
    if (
      !resolution ||
      !issueType ||
      !maintainerId 
    ) {
      return res.status(400).json({
        success: false,
        message:resolution +" "+ issueType+ " " + maintainerId + " resolution, issueType and maintainerId are required",
      });
    }

    // Find and update the report
    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        resolved: resolution,
        issueType: issueType,
        assignedTo: null,
      },
      { new: true, runValidators: true }
    );
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }
    const maintainer = await User.findOne({ _id: maintainerId });
    maintainer.maintainerAvailable = true;
    await maintainer.save();
    res.status(200).json({
      success: true,
      data: report,
    });
    console.log("report saved successfully");
  } catch (error) {
    // Handle different error types
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID format",
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});
router.get("/getId", auth, async (req, res) => {
  try {
    // Assuming the user ID is stored in req.user after authentication
    const userId = req.user.id;
    const username = req.user.name
    console.log("id is found")
    if (!userId) {
      return res.status(400).json({ error: "User ID not found" });
    }
    console.log(userId);
    // Return the user ID
    res.json({ userId, username });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
