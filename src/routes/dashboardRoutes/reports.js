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

module.exports = router;
