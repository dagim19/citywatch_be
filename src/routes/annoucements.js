const express = require("express");
const auth = require("../middleware/auth"); // Assuming you have an auth middleware
const User = require("../models/User"); // Assuming you have a User model
const Announcement=require("../models/Announcement");
const router = express.Router();

router.get("/my", auth, async (req, res) => {
  try {
    const user  = req.user;
    const relevantAnnouncements = await Announcement.find({
      subCity: user.subcity,
    }).sort({ createdAt: -1 });

    res.status(200).json(relevantAnnouncements);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
});


module.exports = router;
