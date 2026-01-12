const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Task = require('../models/Task');
const eventEmitter = require('../utils/eventEmitter');
const { inngest } = require('../inngest/client');



// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', protect, admin, async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Assign a task to a user
// @route   POST /api/admin/tasks
// @access  Private/Admin
router.post('/tasks', protect, admin, async (req, res) => {
    try {
        const { title, description, assignedTo, priority, deadline, timeRequired } = req.body;

        // Check if user exists
        const user = await User.findById(assignedTo);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const task = await Task.create({
            title,
            description,
            priority,
            deadline,
            timeRequired: timeRequired || 30,
            assignedTo,
            assignedBy: req.user._id, // From the admin token
            status: 'pending'
        });

        // Event Trigger: Task Assigned (Immediate Email)
        eventEmitter.emit('task.assigned', { task, assignedToId: assignedTo });

        // Event Trigger: Inngest (Delayed Reminder)
        try {
            await inngest.send({
                name: "task.created",
                data: {
                    taskId: task._id,
                    title: task.title,
                    assignedTo: assignedTo,
                    deadline: task.deadline // Pass Deadline
                }
            });
        } catch (inngestErr) {
            console.error(`[ADMIN] Inngest Error (task.created): ${inngestErr.message}`);
        }

        res.status(201).json(task);
    } catch (error) {
        console.error(`[ADMIN] Task Creation Error: ${error.message}`);
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
});

// @desc    Get all tasks (for admin dashboard)
// @route   GET /api/admin/all-tasks
// @access  Private/Admin
router.get('/all-tasks', protect, admin, async (req, res) => {
    try {
        const tasks = await Task.find().populate('assignedTo', 'name email').sort({ deadline: -1 });
        res.json(tasks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Update task (admin can edit any field)
// @route   PUT /api/admin/tasks/:id
// @access  Private/Admin
router.put('/tasks/:id', protect, admin, async (req, res) => {
    try {
        const { status, deadline, timeRequired, extensionReason } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Store original deadline for comparison
        const originalDeadline = task.deadline;
        const originalStatus = task.status;

        if (status) task.status = status;
        if (deadline) task.deadline = deadline;
        if (timeRequired) task.timeRequired = timeRequired;
        if (extensionReason) task.extensionReason = extensionReason;

        const updatedTask = await task.save();

        // Trigger smart reminder if status became pending
        if (status === 'pending') {
            try {
                await inngest.send({
                    name: "task.status.pending",
                    data: {
                        taskId: updatedTask._id,
                        title: updatedTask.title,
                        deadline: updatedTask.deadline,
                        timeRequired: updatedTask.timeRequired
                    }
                });
            } catch (err) {
                console.error(`[ADMIN] Inngest Error: ${err.message}`);
            }
        }

        res.json(updatedTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Approve/Reject extension request
// @route   PUT /api/admin/extension-request/:id
// @access  Private/Admin
router.put('/extension-request/:id', protect, admin, async (req, res) => {
    try {
        const { approved, newDeadline, newTimeRequired } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (approved) {
            task.extensionRequest.status = 'approved';
            if (newDeadline) task.deadline = newDeadline;
            if (newTimeRequired) task.timeRequired = newTimeRequired;
        } else {
            task.extensionRequest.status = 'rejected';
        }

        const updatedTask = await task.save();
        res.json(updatedTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
