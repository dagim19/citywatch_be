// module imports
const express = require('express');
const connectDB = require('./src/config/database');
const verifierReportsRoutes = require('./src/routes/verifierRoutes/reports');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const NotificationService = require('./src/services/notificationService');
const serviceAccount = require('./citywatch-d4a9a-firebase-adminsdk-fbsvc-014670c83f.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

const csRoutes = require('./src/routes/csRoutes/reports');
// user module route imports
const userAuth = require("./src/routes/userRoutes/auth");
const userAboutRoutes = require("./src/routes/userRoutes/about");
const userAnnouncementsRoutes = require("./src/routes/userRoutes/announcements");
const userReportsRoutes = require("./src/routes/userRoutes/reports");
const maintainersRoutes = require("./src/routes/maintainersRoutes/routes");

// dashboard module route imports
const dashboardAuth = require("./src/routes/dashboardRoutes/auth");
const dashboardReportsRoutes = require("./src/routes/dashboardRoutes/reports");
const messagesRoutes = require("./src/routes/messageRoutes");
const dashboardAnnouncementsRoutes = require('./src/routes/dashboardRoutes/announcements');
//const auhMiddleware = require('./src/middleware/auth');
const statusMonitor = require('express-status-monitor');




const cors = require("cors");
const app = express();

// dotenv configuration
require("dotenv").config();

// Connect Database
connectDB();
// app.use(statusMonitor());

// cors setup
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json({ extended: false }));

const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
        origin: '*',
        },
});

  // When a client (for example, a verifier web client) connects...
io.on('connection', (socket) => {
    console.log('A client connected: ', socket.id);
    
    // Clients can join a room (channel) based on their subcity.
    socket.on('joinSubcity', (subcity) => {
      socket.join(subcity);
      console.log(`Socket ${socket.id} joined room ${subcity}`);
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected: ', socket.id);
    });
  });
  
  // Initialize our Notification Service with Socket.io and Firebase Admin
  NotificationService.init({ io, admin });


// user module routes
app.use("/api/user/auth", userAuth);
app.use("/api/user/about", userAboutRoutes);
app.use("/api/user/announcements", userAnnouncementsRoutes);
app.use("/api/user/reports", userReportsRoutes);

// dashboard module routes
app.use('/api/dashboard/auth', dashboardAuth);
app.use('/api/dashboard/reports', dashboardReportsRoutes);
app.use('/api/dashboard/announcements', dashboardAnnouncementsRoutes);

app.use('/api/verifier/reports', verifierReportsRoutes);
app.use('/api/cs/reports', csRoutes);

app.use((req, res, next) => {
  res.status(404).json({
    message: "404 - Not Found",
    error: "The requested resource could not be found on this server.",
  });
});

// set port
const PORT = process.env.PORT || 5000;
const IP = '0.0.0.0';
;
// app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`Server is running on http://${IP}:5000`);
//   });

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://${IP}:${PORT}`);
});
