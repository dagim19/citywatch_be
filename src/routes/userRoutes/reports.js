const express = require("express");
const auth = require("../../middleware/auth"); 
const Message = require("../../models/Message");
const Report = require("../../models/Report");
const User = require("../../models/User");
const router = express.Router();
const upload = require("../../config/storage");
const NotificationService = require("../../services/notificationService");

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

router.post(
    "/",
    auth,
    upload.array('images', 5),
    async (req, res) => {
        try {
            const { category, duration, description, metadata } = req.body;
            const user_id = req.user.id;
            const subcity = req.user.subcity;
            
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

            NotificationService.notifyNewReportForVerifier(report);

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
        console.log('Recieved message: ', req.body);
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

