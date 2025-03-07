const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const Announcement = require("../../models/Announcement");


router.post("/", auth, async (req, res) => { 
    
    const {title, subtitle, text} = req.body;
    const header = subtitle;

    const {_id, subcity, institution } = req.user;
    const user_id = _id;

    let source = 1;
    switch (institution) {
        case 'elpa':
            source = 1;
            break;
        case 'aaca':
            source = 2;
            break;
        case 'aawsa':
            source = 3;
            break;
    }

    try {
        const newAnnouncement = new Announcement({
            user_id,
            subcity,
            source,
            text,
            header,
            title
        });
        const announcement = await newAnnouncement.save();
        res.status(200).json(announcement);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;