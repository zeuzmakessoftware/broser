import mongoose from 'mongoose';

const HistorySchema = new mongoose.Schema({
    url: { type: String, required: true },
    title: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

export default mongoose.models.History || mongoose.model('History', HistorySchema);
