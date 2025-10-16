"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/context/SocketContext";
import { useAuth, User } from "@/context/AuthContext";
import LeftPanel from "@/components/LeftPanel";
import MiddlePanel from "@/components/MiddlePanel";
import RightPanel from "@/components/RightPanel";

interface Message {
  _id: string;
  sender: string;
  content: string;
  type?: string;
  fileUrl?: string;
  senderName?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [selectedSection, setSelectedSection] = useState<"chats" | "friends" | "groups" | "profile">("chats");
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [newGroup, setNewGroup] = useState<Message[] | null>(null);
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (socket && user?._id) {
      socket.emit("join_user_room", user._id);
    }
  }, [socket, user]);

  return (
    <div className="flex h-[95vh] w-[95%] max-w-[1400px] bg-white rounded-xl overflow-hidden shadow-lg mx-auto">
      {/* Left Sidebar */}
      <LeftPanel setSelectedSection={setSelectedSection} />

      {/* Middle Section */}
      <MiddlePanel
        selectedSection={selectedSection}
        setSelectedChat={setSelectedChat}
        newGroup={newGroup}
        setNewGroup={setNewGroup}
        onGroupUpdated={(updatedGroup: any) =>
          setSelectedChat((prev) =>
            prev && prev._id === updatedGroup._id ? { ...updatedGroup, isGroupChat: true } : prev
          )
        }
      />

      {/* Right Panel */}
      <RightPanel
        selectedChat={selectedChat}
        setSelectedChat={setSelectedChat}
        onGroupUpdated={(updatedGroup: any) =>
          setSelectedChat((prev) =>
            prev && prev._id === updatedGroup._id ? { ...updatedGroup, isGroupChat: true } : prev
          )
        }
      />
    </div>
  );
}
