const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth'); // Assuming you have an auth middleware
const Report = require('../models/Report'); // Assuming you have a Report model
const User = require('../models/User'); // Assuming you have a User model
const router = express.Router();

// // Configure Multer for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, './uploads'); // Specify the upload directory
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//     cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
//   },
// });

// const upload = multer({
//   storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024, // Limit files to 5MB
//   },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith('image/')) {
//       cb(null, true); // Accept only image files
//     } else {
//       cb(new Error('Only image files are allowed'), false); // Reject non-image files
//     }
//   },
// });

// // Add other report routes as needed
// router.post('/', auth, upload.array('images', 5), async (req, res) => {
//   console.log('called');
//   const { category, duration, description, metadata } = req.body;
//   const verifiedBy = req.user.id;

//   // get the user's subcity from the database
//   const user = await User.findById(req.user.id);
//   const subcity = user.subCity;
//   const verified_at = new Date();

//   console.log(user);

//   try {
//     // Initialize images array
//     const images = req.files ? req.files.map((file) => file.path) : [];

//     console.log(images);

//     // Create a new report
//     const newReport = new Report({
//       user_id: req.user.id,
//       subcity,
//       category,
//       duration,
//       verifiedBy,
//       verified_at,
//       images, // This will be an empty array if no files were uploaded
//       description,
//       metadata,
//     });

//     console.log(newReport);

//     // Save the report to the database
//     const report = await newReport.save();
//     res.json(report);

//     // Emit a new report event (if needed)
//     // Example: io.emit('newReport', report);

//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ msg: 'Server Error', error: err.message });
//   }
// });

router.post('/', auth, (req, res, next) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ msg: 'File size exceeds 5MB' });
      }
      return res.status(400).json({ msg: 'Multer error', error: err.message });
    } else if (err) {
      // Other errors (e.g., file filter)
      return res.status(400).json({ msg: err.message });
    }
    next();
  });
}, async (req, res) => {
  console.log('called');
  const { category, duration, description, metadata } = req.body;
  const verifiedBy = req.user.id;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const subcity = user.subCity;
    const verified_at = new Date();
    const images = req.files ? req.files.map((file) => file.path) : [];

    const newReport = new Report({
      user_id: req.user.id,
      subcity,
      category,
      duration,
      verifiedBy,
      verified_at,
      images,
      description,
      metadata,
    });

    const report = await newReport.save();
    res.json(report);

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});


module.exports = router;
