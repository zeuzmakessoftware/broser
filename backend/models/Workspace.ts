import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkspace extends Document {
    title: string;
    createdAt: Date;
}

const workspaceSchema: Schema = new Schema({
    title: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IWorkspace>('Workspace', workspaceSchema);
