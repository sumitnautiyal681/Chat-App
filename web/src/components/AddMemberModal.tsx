"use client";

import { useState, useEffect } from "react";
import { User, Group } from "./RightPanel";

interface Props {
  groupId: string;
  onClose: () => void;
  onUpdated?: (group: Group) => void;
}

export default function AddMemberModal({ groupId, onClose, onUpdated }: Props) {
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFriends = async () => {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/users/friends", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      setFriends(data || []);
      setLoading(false);
    };
    fetchFriends();
  }, []);

  const addMember = async (id: string) => {
    const res = await fetch(
      `http://localhost:5000/api/groups/${groupId}/add-members`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ memberIds: [id] }),
      }
    );
    const updated = await res.json();
    onUpdated?.(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-5 rounded-lg w-[90%] max-w-md">
        <h3 className="text-lg font-semibold mb-3">Add Members</h3>
        {loading ? (
          <p>Loading...</p>
        ) : (
          friends.map((f) => (
            <div
              key={f._id}
              className="flex justify-between items-center mb-2 border-b pb-1"
            >
              <span>{f.name}</span>
              <button
                onClick={() => addMember(f._id)}
                className="bg-blue-500 text-white px-2 py-1 rounded-md text-sm"
              >
                Add
              </button>
            </div>
          ))
        )}
        <button
          onClick={onClose}
          className="mt-3 w-full bg-gray-300 rounded-md py-1"
        >
          Close
        </button>
      </div>
    </div>
  );
}
