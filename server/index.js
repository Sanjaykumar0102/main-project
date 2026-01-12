require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { createServer } = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
require('./listeners/taskListeners'); // Initialize listeners




const socketUtil = require('./utils/socket'); // Import socket util

const app = express();
const httpServer = createServer(app);
// Initialize Socket.io via Util
const io = socketUtil.init(httpServer);

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express.json());

// Database Connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tasks', require('./routes/taskRoutes')); // Mount User Task Routes
app.use('/api/inngest', require('./routes/inngestRoutes'));


// Basic Route
app.get('/', (req, res) => {
    res.send('FlowDesk API is running');
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join User Room
    socket.on('joinRoom', (userId) => {
        if (userId) {
            socket.join(userId);
            console.log(`User ${userId} joined room ${userId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
