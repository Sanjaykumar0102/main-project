const jwt = require('jsonwebtoken'); // You might need this if using JWT tokens manually, but for NextAuth we might just rely on the session if we were proxying. However, user asked for backend protection.
// ideally we verify the NextAuth session token, but for simplicity in this "separate backend" architecture, 
// we initially built it with simple login returns. 
// Given the requirement "Sessions must persist", NextAuth handles frontend. 
// For backend protection, since NextAuth is on client, we usually send the session token to backend? 
// OR we can implement a simple JWT on backend for non-NextAuth flows?
// BUT user is using NextAuth. 
// Let's assume for now we are checking specific fields sent from frontend or implementing a basic check.
// ACTUALLY, usually with separate backend, we'd verify the JWT signed by NextAuth (if compatible) or issuing our own.
// Let's stick to the simplest "role" check based on the user object fetched from DB if we have the ID.

const User = require('../models/User');

// Middleware to protect routes (Simulated for this architecture if we don't have full JWT passing yet, 
// but let's assume we will pass a header/ID or just implementation placeholder)
// REAL WORLD: We should verify the JWT token from NextAuth.
// For this stage, let's assume we pass a user ID in headers or similar for "testing" OR we implement simple JWT in backend login.
// The prompt said "Maintain secure sessions using JWT or database sessions".
// NextAuth does this on frontend/edge.
// Let's implement a basic `protect` that assumes we get a User ID or Token.
// WAIT - The prompt said "Admin routes must be protected via middleware".
// Let's assume standard Bearer token flow.

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            console.log(`[MIDDLEWARE] Token received: ${token.substring(0, 10)}...`);

            // VERIFY TOKEN
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            console.log(`[MIDDLEWARE] Token verified for user ID: ${decoded.id}`);

            // Get user from the token
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                console.log(`[MIDDLEWARE] User not found in DB for ID: ${decoded.id}`);
                return res.status(401).json({ message: 'User no longer exists' });
            }

            next();
        } catch (error) {
            console.error(`[MIDDLEWARE] JWT verification failed: ${error.message}`);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        if (!token) {
            console.log(`[MIDDLEWARE] No Authorization header or malformed Bearer token`);
            return res.status(401).json({ message: 'Not authorized, no token' });
        }
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
