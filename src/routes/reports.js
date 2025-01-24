const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth"); // Assuming you have an auth middleware
const { multipleUploadMiddleware } = require("../middleware/handleUpload");
const Report = require("../models/Report"); // Assuming you have a Report model
const User = require("../models/User"); // Assuming you have a User model
const router = express.Router();
const upload = require("../config/storage");

router.post(
  "/",
  auth,
  upload.array('images', 5),
  async (req, res) => {
    try {
      const { category, duration, description, metadata } = req.body;
      const user_id = req.user.id;
      const subcity = req.user.subcity;
      console.log('Reporter: ', req.user);
      // Get the file paths of uploaded images
      console.log("subcity: ", subcity);
      console.log('Request Recieved: ', req.body);
      const imageUrls = req.files.map(
        (file) => `http://localhost/images/${file.filename}`
      );
  
      // Create a new report document
      const report = new Report({
        user_id,
        subcity,
        category,
        duration,
        description,
        metadata: JSON.parse(metadata),
        images: imageUrls,
      });
  
      // console.log(report);
      await report.save();

      // send sucess message
      res.status(201).json({
        success: true,
        message: "Report submitted successfully",
        report: {
          id: report._id,
          category: report.category,
          createdAt: report.createdAt,
          images: report.images
        }
      });

    }
    catch (err){
      console.error(err.message);
      res.status(500).json({ msg: "Server Error", error: err.message });
    }
  }
);


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

router.get("/admin/:user_id", auth, async (req, res) => {
  try {
    const { user } = req.body;
    const { report_id } = req.body;
    const searchedReport = await Report.findById(report_id);
    res.status(200).json(searchedReport);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});
router.get("/verifier/:user_id", auth, async (req, res) => {
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
router.patch("/verifier/report_Id", auth, async (req, res) => {
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
// assigning to maintenance
router.patch("/maintenance/assign/report_id", auth, async (req, res) => {
  try {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    const availableUser = await User.findOne({
      subCity: report.subcity,
      maintainerAvailable: true,
    });

    if (!availableUser) {
      throw new Error("No maintenance worker available");
    }

    report.assignedTo = availableUser._id;
    await report.save();

    console.log(`Report assigned to user: ${availableUser.name}`);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});


router.get('/my', auth, async (req, res) => {
  try {
    // Get reports for the currently authenticated user
    const reports = await Report.find({ user_id: req.user.id })
                                .sort({ createdAt: -1 });
                                console.log('Reports: ', reports);
    res.status(200).json(reports);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const report_id = req.params.id;

    // Convert the report_id to an ObjectId
    const objectId = new ObjectId(report_id);

    // Use the ObjectId in findById
    const report = await Report.findById(objectId);

    if (!report) {
      return res.status(404).json({ msg: 'Report not found' });
    }

    res.status(200).json(report);
  } catch (error) {
    console.error(error.message);

    // Handle invalid ObjectId errors
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ msg: 'Invalid report ID' });
    }

    res.status(500).send('Server Error');
  }
});

router.post('/:id/comment', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Create a new comment
    const comment = new Comment({
      text: req.body.text,          // Get comment text from request body
      report_id: report._id,        // Associate comment with the report
      user_id: req.user.id,         // Associate comment with the authenticated user (auth middleware should provide req.user)
    });

    // Save the comment to the database
    await comment.save();

    // Add the comment's ID to the report's 'comments' array
    report.comments.push(comment._id);
    await report.save();

    // Populate the 'user_id' field of the new comment to include user details in the response (if applicable)
    await comment.populate('user_id');

    res.status(201).json(comment); // Return the newly created comment
  } catch (error) {
    console.error(error.message);
    res.status(400).json({ error: error.message });
  }
});


module.exports = router;