import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  subject: {
    type: String,
    trim: true,
    default: "",
  },
  tags: {
    type: [String],
    default: [],
  },
  driveLink: {
    type: String,
    required: true,
    trim: true,
  },
  downloads: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

export default mongoose.model("Note", noteSchema);
