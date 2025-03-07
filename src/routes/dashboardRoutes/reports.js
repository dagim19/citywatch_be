const express = require("express");
const router = express.Router();
const Report = require("../../models/Report");

router.get("/", async (req, res) => {
    try {
        // Get reports for the currently authenticated user

        console.log('Called...')
        const reports = await Report.find({ })
            .sort({ createdAt: -1 });
        // console.log('Reports: ', reports);
        res.status(200).json(reports);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});
router.get("/getReport/:userId", async (req, res) => {
    console.log("in the function ")
    try {
      const { userId } = req.params;
      const reports = await Report.find({ assignedTo: userId });
      res.status(200).json(reports); // Always returns an array
    } catch (error) {
      console.error("Error fetching assigned reports:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

module.exports = router;
