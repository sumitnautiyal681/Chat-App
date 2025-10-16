import { useState, useEffect, ChangeEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useNavigate } from "react-router-dom";
import Image from "next/image";

import "./Dashboard.css";

interface ProfileProps { }

export default function Profile({ }: ProfileProps) {
    const { user, login, logout } = useAuth();
    const navigate = useNavigate();
    const { socket } = useSocket();

    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [profilePic, setProfilePic] = useState<string>("");
    const [previewPic, setPreviewPic] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [showConfirm, setShowConfirm] = useState<boolean>(false);

    // Initialize profile fields
    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");
            setProfilePic(user.profilePic || "");
            setPreviewPic(user.profilePic || "");
        }
    }, [user]);

    // Handle profile picture upload
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
            setProfilePic(data.fileUrl);
            setPreviewPic(data.fileUrl);
        } catch (err) {
            console.error("Upload failed:", err);
        }
    };

    // Update profile
    const handleUpdateProfile = async () => {
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

    // Logout with cleanup
    const handleLogout = () => {
        try {
            if (socket) {
                socket.emit("userOffline", user?._id);
                socket.removeAllListeners();
                socket.disconnect();
            }

            logout();
            localStorage.removeItem("authToken");

            setTimeout(() => navigate("/"), 100);
        } catch (err) {
            console.error("Error during logout cleanup:", err);
            navigate("/"); // fallback
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
                                <Image
                                    src={previewPic}
                                    alt="Preview"
                                    width={100}
                                    height={100}
                                    style={{ borderRadius: "50%", objectFit: "cover" }}
                                />

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
                            <Image
                                src={user.profilePic}
                                alt="Profile"
                                width={100}
                                height={100}
                                style={{ borderRadius: "50%", objectFit: "cover" }}
                            />
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
