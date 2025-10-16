"use client";

import Chats from "./Chats";
import Friends from "./Friends";
import CreateGroup from "./CreateGroup";
import Profile from "./Profile";

interface MiddlePanelProps {
  selectedSection: "chats" | "friends" | "groups" | "profile";
  setSelectedChat: (chat: any) => void;
  newGroup: any | null;
  setNewGroup: (group: any) => void;
  onGroupUpdated: (updatedGroup: any) => void;
}

export default function MiddlePanel({
  selectedSection,
  setSelectedChat,
  newGroup,
  setNewGroup,
  onGroupUpdated,
}: MiddlePanelProps) {
  switch (selectedSection) {
    case "chats":
      return (
        <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
          <Chats
            setSelectedChat={setSelectedChat}
            newGroup={newGroup}
            onGroupUpdated={onGroupUpdated}
          />
        </div>
      );
    case "friends":
      return (
        <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
          <Friends />
        </div>
      );
    case "groups":
      return (
        <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
          <CreateGroup onGroupCreated={(group: any) => setNewGroup(group)} />
        </div>
      );
    case "profile":
      return (
        <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
          <Profile />
        </div>
      );
    default:
      return null;
  }
}
