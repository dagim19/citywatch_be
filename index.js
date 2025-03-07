// module imports
const express = require('express');
const connectDB = require('./src/config/database');
const verifierReportsRoutes = require('./src/routes/verifierRoutes/reports');
const csRoutes = require('./src/routes/csRoutes/reports');
// user module route imports
const userAuth = require('./src/routes/userRoutes/auth');
const userAboutRoutes = require('./src/routes/userRoutes/about');
const userAnnouncementsRoutes = require('./src/routes/userRoutes/announcements');
const userReportsRoutes = require('./src/routes/userRoutes/reports');

// dashboard module route imports
const dashboardAuth = require('./src/routes/dashboardRoutes/auth');
const dashboardReportsRoutes = require('./src/routes/dashboardRoutes/reports');
const messagesRoutes = require("./src/routes/messageRoutes");
//const auhMiddleware = require('./src/middleware/auth');
const statusMonitor = require('express-status-monitor');


const cors = require('cors');
const app = express();

// dotenv configuration
require('dotenv').config();


// Connect Database
connectDB();
app.use(statusMonitor());

// cors setup
app.use(cors({
    origin: '*',
}));
app.use(express.json({ extended: false }));


// user module routes
app.use('/api/user/auth', userAuth);
app.use('/api/user/about', userAboutRoutes);
app.use('/api/user/announcements', userAnnouncementsRoutes);
app.use('/api/user/reports', userReportsRoutes);

// dashboard module routes
app.use('/api/dashboard/auth', dashboardAuth);
app.use('/api/dashboard/reports', dashboardReportsRoutes);

app.use('/api/verifier/reports', verifierReportsRoutes);
app.use('/api/cs/reports', csRoutes);

app.use((req, res, next) => {
    res.status(404).json({
        message: "404 - Not Found",
        error: "The requested resource could not be found on this server."
    });
});



// set port 
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server started on port ${PORT}"));