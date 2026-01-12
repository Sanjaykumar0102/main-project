const brevo = require('@getbrevo/brevo');

const baseStyle = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    border: 1px solid #eee;
    border-radius: 8px;
    overflow: hidden;
`;

const headerStyle = `
    background-color: #0070f3;
    color: white;
    padding: 20px;
    text-align: center;
    margin: 0;
`;

const contentStyle = `
    padding: 30px;
    background-color: #ffffff;
`;

const footerStyle = `
    padding: 20px;
    background-color: #f9f9f9;
    text-align: center;
    font-size: 12px;
    color: #888;
    border-top: 1px solid #eee;
`;

const badgeStyle = (priority) => {
    const colors = {
        high: '#dc3545',
        medium: '#ffc107',
        low: '#28a745'
    };
    return `
        display: inline-block;
        padding: 4px 12px;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        text-transform: uppercase;
        font-size: 12px;
        background-color: ${colors[priority] || '#6c757d'};
    `;
};

const templates = {
    TASK_ASSIGNED: (user, task) => `
        <div style="${baseStyle}">
            <h2 style="${headerStyle}">New Task Assigned</h2>
            <div style="${contentStyle}">
                <p>Hello <strong>${user.name}</strong>,</p>
                <p>You have been assigned a new task on FlowDesk. Please review the details below:</p>
                <div style="background: #f0f7ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #0070f3;">${task.title}</h3>
                    <p style="margin: 5px 0;"><strong>Priority:</strong> <span style="${badgeStyle(task.priority)}">${task.priority}</span></p>
                    <p style="margin: 5px 0;"><strong>Deadline:</strong> ${new Date(task.deadline).toLocaleString()}</p>
                    <p style="margin: 5px 0;"><strong>Estimated Time:</strong> ${task.timeRequired} minutes</p>
                    <p style="margin: 10px 0 0 0; border-top: 1px solid #ddd; padding-top: 10px;">
                        ${task.description || 'No description provided.'}
                    </p>
                </div>
                <p>Click the button below to view the task in your dashboard.</p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || '#'}/dashboard/user" style="background-color: #0070f3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Dashboard</a>
                </div>
            </div>
            <div style="${footerStyle}">
                &copy; 2026 FlowDesk - Streamlining your workflow.
            </div>
        </div>
    `,
    TASK_REMINDER: (user, task, timeLeft) => `
        <div style="${baseStyle}">
            <h2 style="${headerStyle}; background-color: #ffc107; color: #333;">Task Reminder</h2>
            <div style="${contentStyle}">
                <p>Hello <strong>${user.name}</strong>,</p>
                <p>This is a professional reminder regarding a pending task that requires your attention.</p>
                <div style="background: #fffef0; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">${task.title}</h3>
                    <p style="margin: 5px 0; color: #d39e00; font-weight: bold;">⏳ Time Remaining: ${timeLeft}</p>
                    <p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(task.deadline).toLocaleString()}</p>
                </div>
                <p>To maintain your workflow efficiency, please ensure this task is completed by the scheduled deadline.</p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || '#'}/dashboard/user" style="background-color: #0070f3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Update Status</a>
                </div>
            </div>
            <div style="${footerStyle}">
                &copy; 2026 FlowDesk - Keeping you on track.
            </div>
        </div>
    `,
    TASK_OVERDUE: (user, task) => `
        <div style="${baseStyle}">
            <h2 style="${headerStyle}; background-color: #dc3545;">Urgent: Task Overdue</h2>
            <div style="${contentStyle}">
                <p>Hello <strong>${user.name}</strong>,</p>
                <p>Our records indicate that the following task is currently past its scheduled deadline and remains incomplete.</p>
                <div style="background: #fff5f5; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #dc3545;">${task.title}</h3>
                    <p style="margin: 5px 0;"><strong>Missed Deadline:</strong> ${new Date(task.deadline).toLocaleString()}</p>
                    <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">OVERDUE</span></p>
                </div>
                <p>Please update the task status immediately or request an extension via the dashboard if required.</p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || '#'}/dashboard/user" style="background-color: #dc3545; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Resolve Task</a>
                </div>
            </div>
            <div style="${footerStyle}">
                &copy; 2026 FlowDesk - Managing critical deadlines.
            </div>
        </div>
    `
};

const sendEmail = async (to, subject, htmlContent) => {
    try {
        if (!process.env.BREVO_API_KEY) {
            console.error("❌ ERROR: BREVO_API_KEY is missing in .env file!");
            return;
        }

        const apiInstance = new brevo.TransactionalEmailsApi();
        apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

        const sendSmtpEmail = new brevo.SendSmtpEmail();
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = htmlContent;
        sendSmtpEmail.sender = {
            name: "FlowDesk App",
            email: "sanjaykumarkulla5@gmail.com"
        };
        sendSmtpEmail.to = [{ email: to }];

        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        return data;
    } catch (error) {
        console.error('❌ Error sending email via Brevo:', error.message);
        throw error;
    }
};

module.exports = { sendEmail, templates };
