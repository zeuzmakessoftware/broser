import mongoose, { Schema, Document } from 'mongoose';

export interface ISource extends Document {
    url: string;
    title?: string;
    summary?: string;
    tags: string[];
    mlaCitation?: string;
    workspaceId?: mongoose.Types.ObjectId;
    createdAt: Date;
}

const sourceSchema: Schema = new Schema({
    url: { type: String, required: true },
    title: String,
    summary: String,
    tags: [String], // e.g., 'supporting', 'opposing', 'neutral'
    mlaCitation: String,
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ISource>('Source', sourceSchema);
