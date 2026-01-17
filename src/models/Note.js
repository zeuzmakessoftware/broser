const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    tags: [String],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
});

module.exports = mongoose.model('Note', NoteSchema);
