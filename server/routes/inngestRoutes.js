const { serve } = require("inngest/express");
const { inngest } = require("../inngest/client");
const { helloWorld, taskReminder, pendingTaskReminder, dailySummary } = require("../inngest/functions");

const router = serve({
    client: inngest,
    functions: [
        helloWorld,
        taskReminder,
        pendingTaskReminder,
        dailySummary
    ],
});

module.exports = router;
