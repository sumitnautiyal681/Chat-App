"use client";

import { Group } from "./RightPanel";
import Image from "next/image";

interface Props {
  selectedChat: Group;
  onClose: () => void;
  onAddMember: () => void;
  onEditGroup: () => void;
}

export default function GroupInfoModal({
  selectedChat,
  onClose,
  onAddMember,
  onEditGroup,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg p-5 w-[90%] max-w-md shadow-lg text-center"
      >
        <Image
          src={selectedChat.profilePic || "/847969.png"}
          alt="group"
          className="w-24 h-24 rounded-full object-cover mx-auto mb-3"
        />
        <h2 className="text-lg font-semibold">{selectedChat.name}</h2>
        <p className="text-gray-500 text-sm mb-2">
          {selectedChat.members.length} members
        </p>

        <div className="space-y-2 text-left max-h-[200px] overflow-y-auto mb-3">
          {selectedChat.members.map((m) => (
            <div key={m._id} className="flex items-center gap-2 border-b pb-1">
              <Image
                src={m.profilePic || "/847969.png"}
                alt={m.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <p className="text-sm">{m.name}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onAddMember}
            className="flex-1 bg-blue-500 text-white rounded-md py-1"
          >
            Add Member
          </button>
          <button
            onClick={onEditGroup}
            className="flex-1 bg-gray-300 text-black rounded-md py-1"
          >
            Edit
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-3 text-sm text-gray-600 hover:text-black"
        >
          Close
        </button>
      </div>
    </div>
  );
}
