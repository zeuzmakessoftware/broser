const mongoose = require('mongoose');

const citationSchema = new mongoose.Schema({
    sourceUrl: String,
    content: { type: String, required: true }, // The quote itself
    citationStyle: String, // e.g., "APA", "MLA" auto-generated
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Citation', citationSchema);
