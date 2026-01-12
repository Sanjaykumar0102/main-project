const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Task = require('../models/Task');
const eventEmitter = require('../utils/eventEmitter');
const { inngest } = require('../inngest/client');

// @desc    Get my tasks
// @route   GET /api/tasks
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.user.id }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Create a task (Self-assign)
// @route   POST /api/tasks
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { title, description, priority, deadline } = req.body;

        const task = await Task.create({
            title,
            description,
            priority,
            deadline,
            assignedTo: req.user.id,
            assignedBy: req.user.id, // Self-assigned
            status: 'pending'
        });

        console.log(`[TASKS] User ${req.user.id} created task: ${task.title}`);

        // Event Trigger: Inngest (Delayed Reminder at Deadline)
        // Defensive: Don't let Inngest failures crash the whole request
        try {
            await inngest.send({
                name: "task.created",
                data: {
                    taskId: task._id,
                    title: task.title,
                    assignedTo: task.assignedTo,
                    deadline: task.deadline
                }
            });
        } catch (inngestErr) {
            console.error(`[TASKS] Inngest Error (task.created): ${inngestErr.message}`);
        }

        // We DON'T emit 'task.assigned' for self-created tasks to avoid spamming self with emails?
        // User request: "Add tasks for themselves".
        // Let's assume sending an email to yourself is unnecessary, OR we can keep it.
        // Let's SKIP the email/socket 'task.assigned' event for self-creation to keep it clean, 
        // BUT we will keep Inngest reminder.

        // Actually, for Socket.io, we might want to emit so it updates other devices?
        // Let's keep it simple. Return task.

        res.status(201).json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Update a task (Status, Deadline + Reason)
// @route   PUT /api/tasks/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const { status, deadline, extensionReason } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Check ownership or admin
        // For now, allow assignee to update status
        if (task.assignedTo.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (status) {
            const oldStatus = task.status;
            task.status = status;

            // If status changed from yet-to-start to pending, trigger smart reminder
            if (oldStatus === 'yet-to-start' && status === 'pending') {
                try {
                    await inngest.send({
                        name: "task.status.pending",
                        data: {
                            taskId: task._id,
                            title: task.title,
                            deadline: task.deadline,
                            timeRequired: task.timeRequired
                        }
                    });
                } catch (inngestErr) {
                    console.error(`[TASKS] Inngest Error (task.status.pending): ${inngestErr.message}`);
                }
            }
        }

        // Handle extension requests for admin-assigned tasks
        if (req.body.extensionRequest) {
            task.extensionRequest = {
                requested: true,
                reason: req.body.extensionRequest.reason,
                extraTimeNeeded: req.body.extensionRequest.extraTimeNeeded,
                status: 'pending'
            };
        }

        // Only allow direct deadline/timeRequired changes for self-created tasks
        const isAdminAssigned = task.assignedBy.toString() !== task.assignedTo.toString();
        if (!isAdminAssigned) {
            // Self-created task - allow direct changes
            if (deadline) {
                task.deadline = deadline;
                if (extensionReason) {
                    task.extensionReason = extensionReason;
                }
            }
        }

        await task.save();
        res.json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;

