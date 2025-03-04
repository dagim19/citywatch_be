const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth"); // Assuming you have an auth middleware
const { multipleUploadMiddleware } = require("../middleware/handleUpload");
const Message = require("../models/Message");
const Report = require("../models/Report");
const User = require("../models/User");
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

router.post("/checkSubmission", auth, async (req, res) => {
  try {
    const { location } = req.body; // Expecting { latitude, longitude, category }

    if (!location || !location.latitude || !location.longitude || !location.category) {
      return res.status(400).json({ msg: "Invalid location data" });
    }

    console.log("Received location:", location);

    // Find reports in the same subcity and category
    const reports = await Report.find({
      subcity: req.user.subcity,
      category: location.category,
      "metadata.location": { $exists: true }
    });

    if (reports.length === 0) {
      return res.json({ nearestReport: null }); // No reports found
    }

    // Calculate distances and sort by distance (asc), then by createdAt (asc)
    const sortedReports = reports
      .map(report => ({
        report,
        distance: haversineDistance(location, report.metadata.location)
      }))
      .filter(item => item.distance <= 1) // Keep only reports within 1km
      .sort((a, b) => a.distance - b.distance || a.report.createdAt - b.report.createdAt);

    // Send only the nearest report (if any exist within 1km)
    const nearestReport = sortedReports.length > 0 ? sortedReports[0].report : null;
    
    res.json({ nearestReport });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});



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
    const roadReports = await Report.find({
      category: 2, // Ensure category is a number, not a string
    }).sort({ createdAt: -1 });

    if (!roadReports.length) {
      return res.status(404).json({ msg: 'No road reports found' });
    }

    res.status(200).json(roadReports);
  } catch (err) {
    console.error('Error fetching road reports:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
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



/**
 * CHATTING ROUTES BELOW
 * 
 */

// Get verifier information for a report
router.get("/:reportId/verifier", auth, async (req, res) => {
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
router.get("/:reportId/messages", auth, async (req, res) => {
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
router.post("/:reportId/messages", auth, async (req, res) => {
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
