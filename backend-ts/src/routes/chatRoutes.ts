import express, { Request, Response, Router } from "express";
import Chat from "../models/Chat";
import { getUserChats } from "../controllers/chatController";
import { protect } from "../middleware/authMiddleware";

const router: Router = express.Router();

// Create or fetch a 1-to-1 chat between two users
router.post("/one-to-one", async (req: Request, res: Response) => {
  const { userId1, userId2 } = req.body as { userId1: string; userId2: string };

  if (!userId1 || !userId2) {
    return res.status(400).json({ message: "Both user IDs are required" });
  }

  try {
    let chat = await Chat.findOne({
      isGroupChat: false,
      users: { $all: [userId1, userId2] },
    }).populate("users", "name profilePic email");

    if (!chat) {
      chat = await Chat.create({ users: [userId1, userId2], isGroupChat: false });
      chat = await Chat.findById(chat._id).populate("users", "name profilePic email");
    }

    res.json(chat);
  } catch (err) {
    console.error("Error creating/fetching chat:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/", protect, getUserChats);

export default router;
