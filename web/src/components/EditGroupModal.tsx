"use client";

import { useState } from "react";
import { Group } from "./RightPanel";

interface Props {
  selectedChat: Group;
  onClose: () => void;
  onUpdated?: (group: Group) => void;
}

export default function EditGroupModal({
  selectedChat,
  onClose,
  onUpdated,
}: Props) {
  const [name, setName] = useState(selectedChat.name);
  const [pic, setPic] = useState(selectedChat.profilePic || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(
      `http://localhost:5000/api/groups/${selectedChat._id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name, profilePic: pic }),
      }
    );
    const data = await res.json();
    onUpdated?.(data);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-5 w-[90%] max-w-md">
        <h3 className="text-lg font-semibold mb-3">Edit Group</h3>
        <label className="block text-sm">Group Name:</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded-md w-full px-2 py-1 mb-2"
        />
        <label className="block text-sm">Profile Pic URL:</label>
        <input
          value={pic}
          onChange={(e) => setPic(e.target.value)}
          className="border rounded-md w-full px-2 py-1 mb-2"
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-500 text-white py-1 rounded-md"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 py-1 rounded-md"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
