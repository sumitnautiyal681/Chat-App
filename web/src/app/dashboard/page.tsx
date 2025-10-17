"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import LeftPanel from "../../components/LeftPanel";
import MiddlePanel from "../../components/MiddlePanel";
import RightPanel from "../../components/RightPanel";
import { Chat,Group } from "../../types/chat";
import './dashboard.css';

type Section = "chats" | "groups" | "friends" | "profile";

export default function Dashboard() {
  const [selectedSection, setSelectedSection] = useState<Section>("chats");

  const [selectedChat, setSelectedChat] = useState<Chat | Group | null>(null);
  const [newGroup, setNewGroup] = useState<Group | null>(null);

  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (socket && user && user._id) {
      socket.emit("join_user_room", user._id);
    }
  }, [socket, user]);

  const handleGroupUpdated = (updatedGroup: Group) => {
    setSelectedChat((prev) =>
      prev && prev._id === updatedGroup._id ? { ...updatedGroup, isGroupChat: true } : prev
    );
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <LeftPanel setSelectedSection={setSelectedSection} />

      {/* Middle section */}
      <MiddlePanel
        selectedSection={selectedSection}
        setSelectedChat={setSelectedChat}
        newGroup={newGroup}
        setNewGroup={setNewGroup}
        onGroupUpdated={handleGroupUpdated}
      />

      {/* Right chat window */}
      <RightPanel
        selectedChat={selectedChat}
        setSelectedChat={setSelectedChat}
        onGroupUpdated={handleGroupUpdated}
      />
    </div>
  );
}
