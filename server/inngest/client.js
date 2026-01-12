const { Inngest } = require("inngest");

// Create a client to send and receive events
const inngest = new Inngest({
    id: "flowdesk-app",
    eventKey: process.env.INNGEST_EVENT_KEY,
    // Ensure it points to the correct URL if needed, 
    // but for express it usually works fine with the serve handler.
});

module.exports = { inngest };
