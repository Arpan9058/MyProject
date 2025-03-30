import mongoose from "mongoose";

const registerSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: Number, required: true },
    password: { type: String, required: true },
});

export default mongoose.model('register', registerSchema);