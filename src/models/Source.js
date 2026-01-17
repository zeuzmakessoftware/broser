const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema({
    url: { type: String, required: true },
    title: String,
    summary: String,
    tags: [String], // e.g., 'supporting', 'opposing', 'neutral'
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Source', sourceSchema);
