"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext"; // your existing AuthContext

// Type definition for the Socket Context
interface SocketContextType {
  socket: Socket | null;
}

// Create Context
const SocketContext = createContext<SocketContextType>({
  socket: null,
});

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const { user } = useAuth() as { user: { _id: string } | null };
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user || !user._id) return;

    // Initialize socket connection
    const newSocket: Socket = io("http://localhost:5000", {
      transports: ["websocket"],
      query: { userId: user._id },
    });

    newSocket.on("connect", () => {
      console.log("✅ Connected to socket server:", newSocket.id);
      newSocket.emit("join_user_room", user._id);
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Disconnected from socket server");
    });

    newSocket.on("connect_error", (err) => {
      console.error("⚠️ Socket connection error:", err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

// Hook to access the socket anywhere
export const useSocket = () => useContext(SocketContext);
