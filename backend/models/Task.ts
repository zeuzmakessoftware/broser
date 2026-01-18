import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
    title: string;
    completed: boolean;
    due?: Date;
    createdAt: Date;
}

const TaskSchema: Schema = new Schema({
    title: {
        type: String,
        required: true,
    },
    completed: {
        type: Boolean,
        default: false,
    },
    due: Date,
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model<ITask>('Task', TaskSchema);
