const eventEmitter = require('../utils/eventEmitter');
const { sendEmail, templates } = require('../services/emailService');
const User = require('../models/User');
const socketUtil = require('../utils/socket'); // Import socket util

eventEmitter.on('task.assigned', async (data) => {
    try {
        const { task, assignedToId } = data;
        const user = await User.findById(assignedToId);

        // 1. Emit Real-Time Update
        try {
            const io = socketUtil.getIO();
            io.to(assignedToId.toString()).emit('task.new', task);
            console.log(`Socket event emitted to room ${assignedToId}`);
        } catch (socketError) {
            console.error("Socket emit failed:", socketError.message);
        }

        // 2. Send Email
        if (user && user.email) {
            console.log(`Processing task.assigned event for user: ${user.email}`);
            const subject = `[FlowDesk] New Task Assigned: ${task.title}`;
            const htmlContent = templates.TASK_ASSIGNED(user, task);

            await sendEmail(user.email, subject, htmlContent);
        }
    } catch (error) {
        console.error('Error in task.assigned listener:', error);
    }
});

module.exports = eventEmitter; // Exporting primarily to ensure it's required and initialized
