import { useState, useEffect, ChangeEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import Image from "next/image";
import '../app/dashboard/dashboard.css';
import { useRouter } from "next/navigation";


// --- Define User type (should match your AuthContext) ---
interface User {
  _id: string;
  name: string;
  email: string;
  profilePic?: string;
  token: string;
  friends?: string[];
  friendRequests?: string[];
}

// --- AuthContext type ---
interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
}

export default function Profile() {
  const { user, login, logout } = useAuth() as AuthContextType;
  const { socket } = useSocket();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewPic, setPreviewPic] = useState("");

  const router = useRouter();

  // Initialize profile fields
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setProfilePic(user.profilePic || "");
      setPreviewPic(user.profilePic || "");
    }
  }, [user]);

  // --- Handle profile picture upload ---
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "YOUR_UPLOAD_PRESET"); // Cloudinary preset

    try {
      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.fileUrl) {
        setProfilePic(data.fileUrl);
        setPreviewPic(data.fileUrl);
      } else {
        console.error("Upload failed:", data.message);
        alert("Failed to upload image");
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Error uploading file");
    }
  };

  // --- Update profile ---
  const handleUpdateProfile = async () => {
    if (!user) return;
    if (!name || !email) {
      alert("Name and email cannot be empty");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`http://localhost:5000/api/users/${user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ name, email, profilePic }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Profile updated successfully!");
        login({
          ...user,
          name: data.name,
          email: data.email,
          profilePic: data.profilePic,
        });
        setIsEditing(false);
      } else {
        alert(data.message || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // --- Logout handler ---
  const handleLogout = () => {
    try {
      if (socket && user) {
        socket.emit("userOffline", user._id);
        socket.removeAllListeners();
        socket.disconnect();
      }

      logout();
      localStorage.removeItem("authToken");

      setTimeout(() => router.push("/"), 100);
    } catch (err) {
      console.error("Error during logout cleanup:", err);
      router.push("/");
    }
  };

  if (!user) {
    return (
      <div className="profile-container">
        <p>Logging out... Redirecting to login page...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <h3>Your Profile</h3>

      {isEditing ? (
        <>
          <div className="input-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label>Profile Picture</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={loading}
            />
            {previewPic && (
              <div className="preview-section">
                <strong>Preview:</strong>
                <br />
                <Image src={previewPic} alt="Preview" width="100" />
              </div>
            )}
          </div>

          <button onClick={handleUpdateProfile} disabled={loading}>
            {loading ? "Updating..." : "Save Changes"}
          </button>
          <button
            onClick={() => setIsEditing(false)}
            style={{ marginLeft: 10 }}
            disabled={loading}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <p>
            <strong>Name:</strong> {user.name}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Profile Picture:</strong>
            <br />
            {user.profilePic && (
              <Image src={user.profilePic} alt="Profile" width="100" />
            )}
          </p>
          <button onClick={() => setIsEditing(true)}>Edit Profile</button>
          <hr />
          <button
            onClick={() => setShowConfirm(true)}
            style={{ backgroundColor: "#f44336" }}
          >
            Logout
          </button>
        </>
      )}

      {showConfirm && (
        <div className="confirm-modal">
          <div className="confirm-modal-content">
            <h4>Are you sure you want to logout?</h4>
            <div className="confirm-buttons">
              <button onClick={handleLogout}>Yes</button>
              <button onClick={() => setShowConfirm(false)}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
