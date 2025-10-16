import express, { Request, Response } from "express";
import Message from "../models/Message";
import multer from "multer";
import cloudinary from "../config/cloudinary";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();
const upload = multer();

interface IMessageRequestBody {
  sender: string;
  senderName?: string;
  chatId: string;
  content: string;
  type: string;
  fileName?: string;
}

// Create new message
router.post("/", protect, upload.none(), async (req: Request<{}, {}, IMessageRequestBody>, res: Response) => {
  try {
    const { sender, senderName, chatId, content, type, fileName } = req.body;

    const newMessage = new Message({
      sender,
      senderName,
      chatId,
      content,
      type,
      fileName,
      fileUrl: type === "file" ? content : null,
    });

    const savedMessage = await newMessage.save();
    res.json(savedMessage);
  } catch (error) {
    console.error("Error creating message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all messages for a chat
router.get("/:chatId", async (req: Request<{ chatId: string }>, res: Response) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch messages", error: err });
  }
});

// Upload file to Cloudinary
router.post("/upload", protect, upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file provided" });
    const result = await cloudinary.uploader.upload_stream({ resource_type: "auto" }, (err, result) => {
      if (err) return res.status(500).json({ message: "Failed to upload file", error: err });
      if (result) return res.json({ url: result.secure_url });
    });
    if (req.file.buffer) result.end(req.file.buffer);
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({ message: "Failed to upload file" });
  }
});

export default router;
