const express = require("express");
const router = express.Router();
const Report = require("../../models/Report");
const auth = require("../../middleware/auth");

router.get("/", auth, async (req, res) => {
    try {
        // Get reports for the currently authenticated user

        const { subcity, institution } = req.user;
        let category = 1;
        switch (institution) {
            case 'elpa':
                category = 1;
                break;
            case 'aaca':
                category = 2;
                break;
            case 'aawsa':
                category = 3;
                break;
        }
        
       // reports with same category and same subicty
        const reports = await Report.find({ subcity, category }).sort({ createdAt: -1 });
            // .sort({ createdAt: -1 });
        
        console.log('Reports to be sent', reports);
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
