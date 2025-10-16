import { Request, Response } from "express";
import Message from "../models/Message";
import Chat from "../models/Chat";
import Group from "../models/Group";
import { IUser } from "../models/User";

interface AuthRequest extends Request {
  user?: IUser;
}

// GET all messages in a chat
export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// POST a new message
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Not authorized" });

    const { chatId, content, isGroupChat } = req.body as { chatId: string; content: string; isGroupChat?: boolean };

    const newMessage = await Message.create({
      chatId,
      sender: req.user._id,
      senderName: req.user.name,
      content,
    });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: newMessage._id });

    if (isGroupChat) {
      await Group.findByIdAndUpdate(chatId, { lastMessageAt: new Date() });
    }

    const populatedMessage = await newMessage.populate("sender", "name profilePic");
    res.status(201).json(populatedMessage);
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
};
