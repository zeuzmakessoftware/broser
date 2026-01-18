import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
    content: string;
    tags: string[];
    createdAt: Date;
    workspaceId?: mongoose.Types.ObjectId;
}

const NoteSchema: Schema = new Schema({
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

export default mongoose.model<INote>('Note', NoteSchema);
