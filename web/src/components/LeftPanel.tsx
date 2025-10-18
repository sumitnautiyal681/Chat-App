"use client";

import { FaComments, FaUserPlus, FaUsers, FaUserCircle } from "react-icons/fa";

interface LeftPanelProps {
  setSelectedSection: (section: "chats" | "friends" | "groups" | "profile") => void;
}

// ✅ Define button type
interface ButtonType {
  icon:  React.ReactNode;
  title: string;
  section: "chats" | "friends" | "groups" | "profile";
}

export default function LeftPanel({ setSelectedSection }: LeftPanelProps) {
  // ✅ Explicitly type the buttons array
  const buttons: ButtonType[] = [
    { icon: <FaComments size={22} />, title: "Chats", section: "chats" },
    { icon: <FaUserPlus size={22} />, title: "Friends", section: "friends" },
    { icon: <FaUsers size={22} />, title: "Create Group", section: "groups" },
    { icon: <FaUserCircle size={22} />, title: "Profile", section: "profile" },
  ];

  return (
    <div className="left-panel">
      {buttons.map((btn) => (
        <button
          key={btn.section}
          className="sidebar-btn"
          onClick={() => setSelectedSection(btn.section)}
          title={btn.title}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}
