import express, { Express, Request, Response } from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import userRoutes from "./routes/userRoutes";
import messageRoutes from "./routes/messageRoutes";
import chatRoutes from "./routes/chatRoutes";
import groupRoutes from "./routes/groupRoutes";
import uploadRoutes from "./routes/uploadRoutes";

dotenv.config();
connectDB();

const app: Express = express();
app.use(express.json());
app.use(cors());

app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/upload", uploadRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// Save io instance in express app locals
app.set("io", io);

// Use Set<string> for online user IDs
let onlineUsers = new Set<string>();

app.get("/socket-test", (_req: Request, res: Response) => {
  res.send("Socket server is running ✅");
});

io.on("connection", (socket: Socket) => {
  

  const userIdFromQuery = socket.handshake.query.userId as string | undefined;
  if (userIdFromQuery) {
    socket.join(userIdFromQuery);
    onlineUsers.add(userIdFromQuery);
    io.emit("onlineUsers", Array.from(onlineUsers));
    io.emit("userOnline", userIdFromQuery);
  }

  // Join chat room
  socket.on("join_chat", (chatId: string) => {
    socket.join(chatId);
    
  });

  // Join personal user room for notifications
  socket.on("join_user_room", (userId: string) => {
    socket.join(userId);
    onlineUsers.add(userId);
    io.emit("onlineUsers", Array.from(onlineUsers));
    io.emit("userOnline", userId);
    
  });

  // Send message to chat
  socket.on("send_message", (message: any) => {
    io.to(message.chatId).emit("receive_message", message);
    io.to(message.chatId).emit("getNotification", {
      senderId: message.senderId,
      isRead: false,
      date: new Date(),
    });
  });

  // Notify members of a new group
  socket.on("new_group_created", (group: any) => {
    group.members.forEach((member: any) => {
      io.to(member._id ? member._id.toString() : member.toString()).emit("receive_new_group", group);
    });
  });

  socket.on("group_updated", (group: any) => {
    if (group.members && Array.isArray(group.members)) {
      group.members.forEach((member: any) => {
        const memberIdStr = member._id ? member._id.toString() : member.toString();
        io.to(memberIdStr).emit("group_updated", group);
      });
    }
  });

  socket.on("disconnect", () => {
    const qUserId = socket.handshake.query.userId as string | undefined;
    if (qUserId && onlineUsers.has(qUserId)) {
      onlineUsers.delete(qUserId);
      io.emit("onlineUsers", Array.from(onlineUsers));
      io.emit("userOffline", qUserId);
      
    }
  });
});

const PORT: number = parseInt(process.env.PORT || "5000", 10);
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
