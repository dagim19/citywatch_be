const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth"); // Assuming you have an auth middleware
const { multipleUploadMiddleware } = require("../middleware/handleUpload");
const Report = require("../models/Report"); // Assuming you have a Report model
const User = require("../models/User"); // Assuming you have a User model
const router = express.Router();
const upload = require("../config/storage");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
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
      console.log("Received metadata:", metadata);


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
    catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error", error: err.message });
    }
  }
);


router.get("/", auth, async (req, res) => {
  try {
    // Get reports for the currently authenticated user
    const reports = await Report.find({ subcity: req.user.subcity })
      .sort({ createdAt: -1 });
    // console.log('Reports: ', reports);
    res.status(200).json(reports);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
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
router.get('/around', auth, async (req, res) => {
  try {
    // Get reports for the currently authenticated user
    const reports = await Report.find({
      subcity: req.user.subcity,
      user_id: { $ne: req.user.id }
    })
      .sort({ createdAt: -1 });
    // console.log('Reports: ', reports);

    // Transform the reports to include current user's support status
    const transformedReports = reports.map(report => {
      const supporters = report.supporters || [];
      return {
        _id: report._id,
        category: report.category,
        description: report.description,
        createdAt: report.createdAt,
        status: report.status,
        // Include any other fields you're using

        // Add these fields specifically for UI display
        supporters: supporters,
        supportersCount: supporters.length,
        userHasSupported: supporters.some(id => id.toString() === req.user._id.toString())
      };
    });

    res.json(transformedReports);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    // Get reports for the currently authenticated user
    const reports = await Report.find({ user_id: req.user.id })
      .sort({ createdAt: -1 });
    // console.log('Reports: ', reports);
    res.status(200).json(reports);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

// router.get('/:id', auth, async (req, res) => {
//   try {
//     const report_id = req.params.id;

//     // Convert the report_id to an ObjectId
//     const objectId = new ObjectId(report_id);

//     // Use the ObjectId in findById
//     const report = await Report.findById(objectId);

//     if (!report) {
//       return res.status(404).json({ msg: 'Report not found' });
//     }

//     res.status(200).json(report);
//   } catch (error) {
//     console.error(error.message);

//     // Handle invalid ObjectId errors
//     if (error.kind === 'ObjectId') {
//       return res.status(400).json({ msg: 'Invalid report ID' });
//     }

//     res.status(500).send('Server Error');
//   }
// });

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
router.get('/road/locations', auth, async (req, res) => {
  try {
    // Fetch road-related issues that are verified and not resolved
    const roadReports = await Report.find({
      category: "2", // Assuming "2" is the category for road issues
      status: "verified",
      resolved: false,
    }).select('metadata'); // Only fetch the metadata field which contains location data

    // Extract latitude and longitude from metadata
    const locations = roadReports.map(report => ({
      latitude: report.metadata.latitude,
      longitude: report.metadata.longitude,
      title: 'Road Issue', // You can customize this based on your data
      description: 'Reported road issue', // You can customize this based on your data
      icon: 'road-variant', // Icon for road issues
    }));

    res.status(200).json(locations);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});


router.get("/supported", auth, async (req, res) => {
  try {

    console.log('User @ /support: ', req.user);
    const supportedReports = await Report.find({
      _id: { $in: req.user.reportsSupported },
    });

    res.status(200).json(supportedReports);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Server Error" });
  }

});


// router.post("/support/:id", auth, async (req, res) => {
//   try {


//     // if the user already supported the report, un-support it and update the report_count of the report
//     if (req.user.reportsSupported.includes(req.params.id)) {
//       req.user.reportsSupported = req.user.reportsSupported.filter(
//         (reportId) => reportId.toString() !== req.params.id
//       );

//       const report = await Report.findById(req.params.id);

//       if (!report) {
//         return res.status(404).json({ msg: "Report not found" });
//       }


//       report.report_count = req.user.reportsSupported.length;
//       await report.save();
//     } else {
//       req.user.reportsSupported.push(req.params.id);
//       const report = await Report.findById(req.params.id);

//       if (!report) {
//         return res.status(404).json({ msg: "Report not found" });
//       }
//       report.report_count = req.user.reportsSupported.length;
//       await report.save();

//     }

//     await req.user.save();
//     res.status(200).json({ msg: "Report supported successfully" });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).json({ msg: "Server Error" });
//   }
// });


router.post("/support/:id", auth, async (req, res) => {
  try {
    const reportId = req.params.id;
    const userId = req.user._id;

    // Check if user already supported this report
    const user = await User.findById(userId);
    const alreadySupported = user.reportsSupported.some(id => id.toString() === reportId);

    if (alreadySupported) {
      // Remove support with atomic operations
      await User.updateOne(
        { _id: userId },
        { $pull: { reportsSupported: reportId } }
      );

      await Report.updateOne(
        { _id: reportId },
        { $pull: { supporters: userId } }
      );
    } else {
      // Add support with atomic operations
      await User.updateOne(
        { _id: userId },
        { $addToSet: { reportsSupported: reportId } }
      );

      await Report.updateOne(
        { _id: reportId },
        { $addToSet: { supporters: userId } }
      );
    }

    // Get updated count
    const updatedReport = await Report.findById(reportId);

    res.status(200).json({
      msg: alreadySupported ? "Support removed" : "Report supported successfully",
      supportersCount: updatedReport.supporters.length,
      supported: !alreadySupported
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Server Error" });
  }
});


// router.post('/support', auth, async (req, res) => {
//   try {
//     const { reportId } = req.body; // Get reportId from the request body
//     if (!reportId) {
//       return res.status(400).json({ msg: 'Report ID is required' });
//     }

//     const report = await Report.findById(reportId); // Find the report by ID
//     if (!report) {
//       return res.status(404).json({ msg: 'Report not found' });
//     }

//     const userId = req.user.id; // Get the user ID from the authenticated user

//     // Check if the user has already supported the report
//     if (report.supporters.includes(userId)) {
//       return res.status(400).json({ msg: 'You have already supported this report' });
//     }

//     // Add the user to the supporters array
//     report.supporters.push(userId);
//     await report.save();

//     // Return success response with updated supporters count
//     res.status(200).json({ 
//       msg: 'Report supported successfully', 
//       supportersCount: report.supporters.length 
//     });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).json({ error: error.message }); // Ensure JSON response
//   }
// });

router.post('/unsupport', auth, async (req, res) => {
  try {
    const { reportId } = req.body; // Get reportId from the request body
    if (!reportId) {
      return res.status(400).json({ msg: 'Report ID is required' });
    }

    const report = await Report.findById(reportId); // Find the report by ID
    if (!report) {
      return res.status(404).json({ msg: 'Report not found' });
    }

    const userId = req.user.id; // Get the user ID from the authenticated user

    // Check if the user has supported the report
    if (!report.supporters.includes(userId)) {
      return res.status(400).json({ msg: 'You have not supported this report' });
    }

    // Remove the user from the supporters array
    report.supporters = report.supporters.filter((id) => id.toString() !== userId.toString());
    await report.save();

    // Return success response with updated supporters count
    res.status(200).json({
      msg: 'Report unsupported successfully',
      supportersCount: report.supporters.length
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message }); // Ensure JSON response
  }
});
//const { ObjectId } = require('mongoose').Types;






module.exports = router;
