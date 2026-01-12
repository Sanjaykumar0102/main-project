const { serve } = require("inngest/express");
const { inngest } = require("../inngest/client");
const { helloWorld, taskReminder, dailySummary } = require("../inngest/functions");

const router = serve({
    client: inngest,
    functions: [
        helloWorld,
        taskReminder, // Future functions
        dailySummary
    ],
});

module.exports = router;
