"use client";

import { FaComments, FaUserPlus, FaUsers, FaUserCircle } from "react-icons/fa";

interface LeftPanelProps {
  setSelectedSection: (section: "chats" | "friends" | "groups" | "profile") => void;
}

export default function LeftPanel({ setSelectedSection }: LeftPanelProps) {
  const buttons = [
    { icon: <FaComments size={22} />, title: "Chats", section: "chats" },
    { icon: <FaUserPlus size={22} />, title: "Friends", section: "friends" },
    { icon: <FaUsers size={22} />, title: "Create Group", section: "groups" },
    { icon: <FaUserCircle size={22} />, title: "Profile", section: "profile" },
  ];

  return (
    <div className="flex flex-col w-20 bg-gray-100 border-r border-gray-200 p-2 gap-4 items-center shadow-sm">
      {buttons.map((btn) => (
        <button
          key={btn.section}
          className="w-12 h-12 rounded-lg bg-blue-100 text-gray-600 flex items-center justify-center transition-all hover:bg-blue-500 hover:text-white"
          onClick={() => setSelectedSection(btn.section as any)}
          title={btn.title}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}
