const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth"); // Assuming you have an auth middleware
const {multipleUploadMiddleware} = require("../middleware/handleUpload")
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

router.post(
  "/",
  auth,
  upload.array('images', 5),
  async (req, res) => {
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
    }
    catch (err){
      console.error(err.message);
      res.status(500).json({ msg: "Server Error", error: err.message });
    }
  }
);
router.get(
  "/", auth,
  async(req,res)=>{
    try{
      const unresolvedReports = await Report.find({ status: 'pending', resolved: false })
      .sort({ createdAt: -1 });      

      res.status(200).json(unresolvedReports);
    }
    catch(err){
      console.error(err.message);
      res.status(500).json({ msg: "Server Error", error: err.message });
    }
  }
)
module.exports = router;
