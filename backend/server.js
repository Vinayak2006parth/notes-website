import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Note from "./models/note.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Backend running");
});

app.get("/api/test", (_req, res) => {
  res.json({ message: "API working" });
});

app.get("/api/notes", async (req, res) => {
  try {
    const search = req.query.search?.trim();
    const filter = search
      ? {
          $or: [
            { title: { $regex: escapeRegex(search), $options: "i" } },
            { subject: { $regex: escapeRegex(search), $options: "i" } },
            {
              tags: {
                $elemMatch: { $regex: escapeRegex(search), $options: "i" },
              },
            },
          ],
        }
      : {};

    const notes = await Note.find(filter).sort({
      downloads: -1,
      updatedAt: -1,
      createdAt: -1,
    });

    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/suggestions", async (req, res) => {
  try {
    const search = req.query.search?.trim();

    if (!search) {
      return res.json([]);
    }

    const regex = new RegExp(escapeRegex(search), "i");

    const notes = await Note.find(
      {
        $or: [
          { title: regex },
          { subject: regex },
          { tags: { $elemMatch: { $regex: regex } } },
        ],
      },
      { title: 1, subject: 1, tags: 1 },
    )
      .sort({ downloads: -1, updatedAt: -1 })
      .limit(8)
      .lean();

    const suggestions = [];
    const seen = new Set();

    for (const note of notes) {
      const candidates = [note.title, note.subject, ...(note.tags ?? [])];

      for (const candidate of candidates) {
        const value = candidate?.trim();

        if (!value || !regex.test(value)) {
          continue;
        }

        const normalized = value.toLowerCase();

        if (seen.has(normalized)) {
          continue;
        }

        seen.add(normalized);
        suggestions.push(value);

        if (suggestions.length >= 8) {
          return res.json(suggestions);
        }
      }
    }

    return res.json(suggestions);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/download/:id", async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    note.downloads += 1;
    await note.save();

    return res.redirect(note.driveLink);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI in backend environment.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
