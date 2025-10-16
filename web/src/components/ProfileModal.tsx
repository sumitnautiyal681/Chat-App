"use client";

import { User } from "./RightPanel";
import Image from "next/image";

interface Props {
  user: User;
  onClose: () => void;
}

export default function ProfileModal({ user, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-5 text-center w-[90%] max-w-sm">
        <Image
          src={user.profilePic || "/847969.png"}
          alt="profile"
          className="w-24 h-24 rounded-full object-cover mx-auto mb-3"
        />
        <h2 className="text-lg font-semibold">{user.name}</h2>
        <p className="text-gray-500 text-sm mb-4">{user.email || "No email"}</p>
        <button
          onClick={onClose}
          className="bg-blue-500 text-white rounded-md px-4 py-1"
        >
          Close
        </button>
      </div>
    </div>
  );
}
