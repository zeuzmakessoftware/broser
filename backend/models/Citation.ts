import mongoose, { Schema, Document } from 'mongoose';

export interface ICitation extends Document {
    sourceUrl?: string;
    content: string;
    citationStyle?: string;
    workspaceId?: mongoose.Types.ObjectId;
    createdAt: Date;
}

const citationSchema: Schema = new Schema({
    sourceUrl: String,
    content: { type: String, required: true }, // The quote itself
    citationStyle: String, // e.g., "APA", "MLA" auto-generated
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ICitation>('Citation', citationSchema);
