import { Request, Response } from "express";
import Chat from "../models/Chat";
import User, { IUser } from "../models/User";
import mongoose from "mongoose";

interface AuthRequest extends Request {
  user?: IUser;
}

export const createGroupChat = async (req: AuthRequest, res: Response) => {
  try {
    const { name, users, adminId } = req.body as {
      name: string;
      users: string[];
      adminId: string;
    };

    if (!name || !users || users.length < 2) {
      return res.status(400).json({ message: "Group needs at least 2 members." });
    }

    const admin = await User.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found." });

    const groupChat = await Chat.create({
      name,
      isGroupChat: true,
      users: [...users, adminId],
      admin: adminId,
      messages: [],
    });

    const fullGroup = await groupChat.populate("users", "name email");
    res.status(201).json(fullGroup);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserChats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    const chats = await Chat.find({
      users: { $in: [req.user._id] },
    })
      .populate("users", "name email profilePic")
      .populate({
        path: "latestMessage",
        select: "content createdAt sender",
        populate: { path: "sender", select: "name profilePic" },
      })
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch chats" });
  }
};

export const getChatById = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID format" });
    }

    const chat = await Chat.findById(chatId)
      .populate("users", "name email profilePic")
      .populate({
        path: "latestMessage",
        select: "content createdAt sender",
        populate: { path: "sender", select: "name profilePic" },
      });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    res.json(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    res.status(500).json({ message: "Server error" });
  }
};