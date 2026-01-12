const { inngest } = require("./client");
const { sendEmail, templates } = require("../services/emailService");
const User = require("../models/User");
const Task = require("../models/Task");

const helloWorld = inngest.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event, step }) => {
        await step.sleep("wait-a-moment", "1s");
        return { event, body: "Hello, World!" };
    }
);

// Delayed Job: Task Reminder (Overdue)
const taskReminder = inngest.createFunction(
    { id: "task-reminder" },
    { event: "task.created" },
    async ({ event, step }) => {
        if (event.data.deadline) {
            await step.sleepUntil("wait-for-deadline", event.data.deadline);
        } else {
            await step.sleep("default-wait", "2m");
        }

        const task = await step.run("fetch-task", async () => {
            return await Task.findById(event.data.taskId);
        });

        if (!task || task.status === 'completed') return "No intervention needed";

        await step.run("send-overdue-email", async () => {
            const user = await User.findById(task.assignedTo);
            if (user) {
                await sendEmail(
                    user.email,
                    `[URGENT] Overdue: Task "${task.title}" deadline has passed`,
                    templates.TASK_OVERDUE(user, task)
                );
            }
        });

        return "Overdue notification sent";
    }
);

// Smart Reminder: When task status changes to "pending"
const pendingTaskReminder = inngest.createFunction(
    { id: "pending-task-reminder" },
    { event: "task.status.pending" },
    async ({ event, step }) => {
        const task = await step.run("fetch-task-details", async () => {
            return await Task.findById(event.data.taskId);
        });

        if (!task) return "Task not found";

        // Calculate reminder time: deadline - timeRequired (in minutes)
        // User said: "last 2hrs left like that"
        // Let's remind them when timeRequired is exactly what's left.
        const deadline = new Date(task.deadline);
        const reminderTime = new Date(deadline.getTime() - (task.timeRequired * 60 * 1000));

        if (reminderTime > new Date()) {
            await step.sleepUntil("wait-for-reminder-time", reminderTime);
        }

        const currentTask = await step.run("check-current-status", async () => {
            return await Task.findById(event.data.taskId);
        });

        if (!currentTask || currentTask.status === 'completed') return "Task completed";

        await step.run("send-pending-reminder", async () => {
            const user = await User.findById(currentTask.assignedTo);
            if (user) {
                const timeLeft = `${currentTask.timeRequired} minutes`;
                await sendEmail(
                    user.email,
                    `[Action Required] Reminder: Task "${currentTask.title}" deadline approaching`,
                    templates.TASK_REMINDER(user, currentTask, timeLeft)
                );
            }
        });

        return "Reminder notification sent";
    }
);

// Scheduled Job: Daily Summary
// Runs every day at 9 AM
const dailySummary = inngest.createFunction(
    { id: "daily-summary" },
    { cron: "0 9 * * *" }, // Atomic Cron: At 09:00
    async ({ step }) => {
        await step.run("send-daily-summaries", async () => {
            // Logic to fetch all users and send their pending task count
            // Keeping it simple for now
            console.log("Running daily summary job...");
        });
        return "Daily summary job started";
    }
);

module.exports = { helloWorld, taskReminder, pendingTaskReminder, dailySummary };
