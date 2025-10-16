import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Camera } from "lucide-react";
import Image from "next/image";

interface User {
  _id: string;
  name: string;
  profilePic?: string;
}

interface Group {
  _id: string;
  name: string;
  members: string[];
  admin: string;
  profilePic?: string;
}

interface CreateGroupProps {
  onGroupCreated: (group: Group) => void;
}

export default function CreateGroup({ onGroupCreated }: CreateGroupProps) {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch all users except the logged-in user
  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/users/all", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data: User[] = await res.json();
        const otherUsers = data.filter((u) => u._id !== user._id);
        setUsers(otherUsers);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [user]);

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName || selectedUsers.length === 0) {
      alert("Please enter a group name and select members");
      return;
    }

    setCreating(true);
    let imageUrl: string | null = null;

    if (groupImage) {
      const formData = new FormData();
      formData.append("file", groupImage);

      try {
        const res = await fetch("http://localhost:5000/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Image upload failed");
        const data = await res.json();
        imageUrl = data.fileUrl;
      } catch (err) {
        console.error(err);
        alert("Failed to upload group image");
        setCreating(false);
        return;
      }
    }

    try {
      const res = await fetch("http://localhost:5000/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          name: groupName,
          members: selectedUsers,
          admin: user._id,
          profilePic: imageUrl,
        }),
      });

      const data: Group = await res.json();
      if (!res.ok) throw new Error(data?.name || "Failed to create group");

      alert(`Group "${data.name}" created successfully!`);

      // Reset inputs
      setGroupName("");
      setSelectedUsers([]);
      setGroupImage(null);
      setPreviewUrl(null);

      onGroupCreated(data);
    } catch (err: any) {
      console.error(err);
      alert("Error creating group: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <p className="p-4">Loading users...</p>;

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg p-5 shadow-md max-w-md mx-auto">
      <h3 className="text-center text-xl font-semibold mb-4">Create Group</h3>

      {/* Group Image */}
      <div className="flex justify-center mb-5 relative">
        <div className="relative">
          <Image
            src={previewUrl || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
            alt="Group"
            className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
          />
          <label
            htmlFor="groupImage"
            className="absolute bottom-0 right-0 bg-blue-500 w-9 h-9 rounded-full flex items-center justify-center text-white cursor-pointer shadow-md"
          >
            <Camera size={18} />
          </label>
          <input
            type="file"
            id="groupImage"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>
      </div>

      {/* Group Name */}
      <input
        type="text"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        placeholder="Enter group name"
        className="w-full p-2 mb-4 border rounded outline-none"
      />

      {/* Member Selection */}
      <div className="relative mb-4">
        <div
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="border rounded p-2 cursor-pointer bg-gray-50"
        >
          {selectedUsers.length > 0
            ? `${selectedUsers.length} member(s) selected`
            : "Select members"}
        </div>

        {dropdownOpen && (
          <div className="absolute top-full left-0 w-full bg-white border rounded max-h-52 overflow-y-auto p-2 z-10">
            <input
              type="text"
              placeholder="Search friends..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 mb-2 border rounded"
            />

            {filteredUsers.map((u) => (
              <div
                key={u._id}
                className={`flex items-center p-2 cursor-pointer rounded ${
                  selectedUsers.includes(u._id) ? "bg-blue-100" : ""
                }`}
                onClick={() => toggleSelectUser(u._id)}
              >
                <Image
                  src={u.profilePic || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                  alt={u.name}
                  className="w-9 h-9 rounded-full object-cover mr-2"
                />
                <span>{u.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleCreateGroup}
        disabled={creating}
        className="w-full bg-blue-500 text-white py-2 rounded font-bold hover:bg-blue-600 disabled:opacity-50"
      >
        {creating ? "Creating..." : "Create Group"}
      </button>
    </div>
  );
}
