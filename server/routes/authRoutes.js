const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password, // In prod: hash this
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check for Admin Credentials from Env
        if (
            email === process.env.ADMIN_EMAIL &&
            password === process.env.ADMIN_PASSWORD
        ) {
            // Return simulated Admin User
            // Note: For a "pure" env admin, they might not exist in MongoDB.
            // However, middleware expects a User object in Request.
            // We can either create a temporary DB user or handle it.
            // Requirement: "Admin credentials must NEVER be hard-coded in frontend".
            // Let's return a special object.
            // Since we verify token -> findById in middleware, an env-only admin needs an ID or bypass.
            // SOLUTION: Create/Update the admin user in DB on login to ensure they have an ID for middleware.

            let adminUser = await User.findOne({ email: process.env.ADMIN_EMAIL });

            if (!adminUser) {
                adminUser = await User.create({
                    name: 'Admin',
                    email: process.env.ADMIN_EMAIL,
                    password: process.env.ADMIN_PASSWORD, // Storing for consistency, but we check env first
                    role: 'admin'
                });
            } else if (adminUser.role !== 'admin') {
                // Force update role if matched env email
                adminUser.role = 'admin';
                await adminUser.save();
            }

            return res.json({
                _id: adminUser.id,
                name: adminUser.name,
                email: adminUser.email,
                role: 'admin',
                token: generateToken(adminUser._id),
            });
        }

        // 2. Normal User Check
        const user = await User.findOne({ email });

        if (user && user.password === password) {
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
