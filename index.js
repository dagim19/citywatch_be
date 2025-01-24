// server.js
const express = require('express');

const connectDB = require('./src/config/database');
const authRoutes = require('./src/routes/auth');
const reportsRoutes = require('./src/routes/reports');
const aboutRoutes = require('./src/routes/about');
const auhMiddleware = require('./src/middleware/auth');
// const announcementsRoutes = require('./src/routes/announcements');
// const messagesRoutes = require('./src/routes/messages');
// cors setup
const cors = require('cors');

const app = express();


require('dotenv').config();
// Connect Database
connectDB();

// Init Middleware
// app.use(cors({
//     origin: '*',
//     methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow these HTTP methods
//     credentials: true, // Allow cookies and credentials (if needed)
// }));

app.use(cors({
    origin: '*',
}));
app.use(express.json({ extended: false }));


// Define Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/about', aboutRoutes);
// app.use('/api/announcements', announcementsRoutes);
// app.use('/api/messages', messagesRoutes);

app.use((req, res, next) => {
    res.status(404).json({
        message: "404 - Not Found",
        error: "The requested resource could not be found on this server."
    });
});



// set port 
const PORT = process.env.PORT || 5000;
const IP = '192.168.1.7';
// app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://${IP}:5000`);
  });