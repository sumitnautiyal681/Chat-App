import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Camera } from "lucide-react";
import Image from "next/image";
import { Group } from "../types/chat";
interface User {
  _id: string;
  name: string;
  email?: string;
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/all`, {
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          name: groupName,
          members: selectedUsers,
          admin: user?._id,
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
    } catch (err) {
      console.error(err);
      alert("Error creating group: ");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <p className="p-4">Loading users...</p>;

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: 20,
      boxShadow: "0 0 10px rgba(0,0,0,0.1)",
      maxWidth: 400,
    }}>
   <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    width: "100%", // full width of middle panel
    background: "#fff",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  }}
>
  {/* Header Title */}
  <h3 style={{ fontSize: "25px", margin: 0 }}>Create Group</h3>

  {/* Hamburger Icon (mobile only) */}
  <button
    className="hamburger-btn"
    style={{
      border: "none",
      background: "none",
      cursor: "pointer",
      fontSize: "24px",
      display: "none", // will show on mobile via CSS
      color:"black"
    }}
    onClick={() => {
      document.querySelector(".left-panel")?.classList.toggle("show");
    }}
  >
    ☰
  </button>
</div>





      {/* Group Image */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 20,
          position: "relative",
        }}
      >
        <div style={{ position: "relative" }}>
          <Image
            src={previewUrl || "/group-dp.png"}
            alt="Group"
            width={120}           // explicitly required
            height={120}          // explicitly required
            style={{
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #ddd",
            }}
          />
          <label
            htmlFor="groupImage"
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              backgroundColor: "#007bff",
              borderRadius: "50%",
              width: 35,
              height: 35,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
              color: "#fff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            }}>
            <Camera size={18} />
          </label>
          <input
            type="file"
            id="groupImage"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageChange}
          />
        </div>
      </div>

      {/* Group Name */}
      <div style={{ marginBottom: 15 }}>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Enter group name"
          style={{
            width: "87%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            outline: "none",
          }} />
      </div>
      {/* Member Selection */}
      <div style={{ marginBottom: 15, position: "relative" }}>
        <div
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            border: "1px solid #ccc",
            borderRadius: 8,
            padding: "10px 12px",
            cursor: "pointer",
            backgroundColor: "#fafafa",
          }}
        >
          {selectedUsers.length > 0
            ? `${selectedUsers.length} member(s) selected`
            : "Select members"}
        </div>

        {dropdownOpen && (
          <div style={{
            position: "absolute",
            top: "105%",
            left: 0,
            width: "100%",
            backgroundColor: "#fff",
            border: "1px solid #ccc",
            borderRadius: 8,
            maxHeight: 200,
            overflowY: "auto",
            zIndex: 10,
            padding: 10,
          }}>
            <input
              type="text"
              placeholder="Search friends..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #ccc",
                marginBottom: 8,
              }}
            />

            {filteredUsers.map((u: User) => (
              <div
                key={u._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 8px",
                  cursor: "pointer",
                  backgroundColor: selectedUsers.includes(u._id)
                    ? "#e0f0ff"
                    : "transparent",
                  borderRadius: 6,
                }}
                onClick={() => toggleSelectUser(u._id)}
              >
                <Image
                  src={u.profilePic || "/group-dp.png"}
                  alt={u.name}
                  width={35}
                  height={35}
                  style={{
                    borderRadius: "50%",
                    objectFit: "cover",
                    marginRight: 10,
                  }}
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
        style={{
          width: "100%",
          padding: "10px 0",
          border: "none",
          backgroundColor: "#007bff",
          color: "#fff",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        {creating ? "Creating..." : "Create Group"}
      </button>
    </div>
  );
}
