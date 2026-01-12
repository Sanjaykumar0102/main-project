const mongoose = require('mongoose');

const taskSchema = mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a task title']
    },
    description: {
        type: String,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    deadline: {
        type: Date,
        required: [true, 'Please add a deadline']
    },
    timeRequired: {
        type: Number, // in minutes
        required: [true, 'Please add estimated time required'],
        default: 30
    },
    status: {
        type: String,
        enum: ['yet-to-start', 'pending', 'completed'],
        default: 'yet-to-start'
    },
    extensionReason: {
        type: String,
        default: ''
    },
    extensionRequest: {
        requested: { type: Boolean, default: false },
        reason: { type: String },
        extraTimeNeeded: { type: Number }, // in minutes
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        }
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Task', taskSchema);
