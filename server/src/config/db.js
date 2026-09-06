import mongoose from 'mongoose';

export const connectDB = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set in server/.env');
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Mongodb connected: ${mongoose.connection.name}`);
};
