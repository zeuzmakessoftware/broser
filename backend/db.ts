import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || '');
        console.log('MongoDB Connected');

        // Fix for E11000 duplicate key error on legacy 'id' index
        try {
            const notesCollection = mongoose.connection.collection('notes');
            const indexExists = await notesCollection.indexExists('id_1');
            if (indexExists) {
                await notesCollection.dropIndex('id_1');
                console.log('Dropped legacy index id_1 from notes collection');
            }
        } catch (e) {
            console.log('Index cleanup check passed or failed safely', e);
        }

    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        process.exit(1);
    }
};

export default connectDB;
