const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth"); // Assuming you have an auth middleware
const {multipleUploadMiddleware} = require("../middleware/handleUpload")
const Report = require("../models/Report"); // Assuming you have a Report model
const User = require("../models/User"); // Assuming you have a User model
const Comment = require("../models/Comment");
const router = express.Router();
const upload = require("../config/storage");
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;


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


router.get('/', auth, async(req, res) => {
  try {
    const reports = await Report.find({});

    res.status(200).json(reports);
  }catch(error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
})


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

router.get('/my', auth, async (req, res) => {
  try {
    // 1. Get the user ID from the request object (provided by the 'auth' middleware)
    const userId = req.user.id;

    // 2. Find all reports where the user_id matches the logged-in user's ID
    const reports = await Report.find({ user_id: userId }).sort({ createdAt: -1 }); // Sort by creation date, newest first

    // 3. Send the reports back to the client
    console.log('Reports: ', reports);
    res.status(200).json(reports);
  } catch (error) {
    // 4. Handle errors
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
