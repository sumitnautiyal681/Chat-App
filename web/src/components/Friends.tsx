import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { FaBell, FaUserPlus } from "react-icons/fa";
import Image from "next/image";

interface User {
    _id: string;
    name: string;
    profilePic?: string;
    isNowFriend?: boolean;
}

interface Toast {
    message: string;
    type: "success" | "error" | "";
}

export default function Friends() {
    const { user, updateUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [friendRequests, setFriendRequests] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingRequest, setSendingRequest] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [toast, setToast] = useState<Toast>({ message: "", type: "" });

    // Fetch all users except current
    useEffect(() => {
        if (!user) return;
        const fetchUsers = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/all`, {
                    headers: { Authorization: `Bearer ${user.token}` },
                });
                const data = await res.json();
                if (Array.isArray(data)) setUsers(data);
            } catch (err) {
                console.error(err);
                setUsers([]);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [user]);

    // Fetch incoming friend requests
    useEffect(() => {
        if (!user) return;
        const fetchFriendRequests = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/friend-requests`, {
                    headers: { Authorization: `Bearer ${user.token}` },
                });
                const data = await res.json();
                if (Array.isArray(data)) setFriendRequests(data);
            } catch (err) {
                console.error(err);
                setFriendRequests([]);
            }
        };
        fetchFriendRequests();
    }, [user]);

    // Send friend request
    const sendFriendRequest = async (toUserId: string) => {
        setSendingRequest(toUserId);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/friend-request`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user?.token}`,
                },
                body: JSON.stringify({ toUserId }),
            });
            const data = await res.json();
            if (res.ok) {
                setToast({ message: "Friend request sent!", type: "success" });
            } else {
                setToast({ message: data.message || "Error sending request", type: "error" });
            }
        } catch (err) {
            console.error(err);
            setToast({ message: "Something went wrong", type: "error" });
        } finally {
            setSendingRequest(null);
            setTimeout(() => setToast({ message: "", type: "" }), 2500);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Accept friend request
    const acceptFriendRequest = async (fromUserId: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/accept-request`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user?.token}`,
                },
                body: JSON.stringify({ fromUserId }),
            });
            const data = await res.json();
            if (res.ok) {
                updateUser({ ...data.user, token: user?.token });
                setFriendRequests(prev => prev.filter(f => f._id !== fromUserId));
                localStorage.setItem("friendReqUpdate", Date.now().toString());
                setUsers(prev => prev.map(u => (u._id === fromUserId ? { ...u, isNowFriend: true } : u)));
                setToast({ message: "Friend request accepted!", type: "success" });
            } else {
                setTimeout(() => setToast({ message: "", type: "" }), 2500);
            }
        } catch (err) {
            console.error(err);
            setToast({ message: "Something went wrong", type: "error" });
        }
    };

    const filteredUsers = useMemo(() => {
        if (!search.trim()) return users;
        return users.filter(u => u.name?.toLowerCase().includes(search.trim().toLowerCase()));
    }, [users, search]);

    if (loading) return <p className="p-4">Loading users...</p>;

    const ToastComponent = ({ message, type }: Toast) => {
        if (!message) return null;
        return (
            <div className={`fixed top-5 right-5 px-5 py-3 rounded shadow-lg text-white ${type === "success" ? "bg-green-500" : "bg-red-500"}`}>
                {message}
            </div>
        );
    };

    return (
        <div >
            {/* Header */}
            <div
                style={{
    display: "flex",
    alignItems: "center", 
    justifyContent: "space-between",
    position: "sticky",      // stays on top while scrolling
    top: "10px",             // space from top
    padding: "12px 20px",    // more padding like other headers
    background: "#fff",      // white background
    borderRadius: "12px",    // rounded corners
    boxShadow: "0 0 10px rgba(0,0,0,0.1)", // subtle shadow
    zIndex: 10,
    marginBottom: "15px",    // spacing below header
  }}
            >
                {/* Header Title */}
                <h3 style={{ fontSize: "25px", margin: 0 }}>Find Friends</h3>

                {/* Icons: Bell + Hamburger */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* Bell Icon with dropdown */}
                    <div style={{ position: "relative", cursor: "pointer" }}>
                        <FaBell
                            size={22}
                            onClick={() => setShowDropdown(!showDropdown)}
                            style={{ color: "#333" }}
                        />
                        {friendRequests.length > 0 && (
                            <span
                                style={{
                                    position: "absolute",
                                    top: "-5px",
                                    right: "-5px",
                                    background: "red",
                                    color: "white",
                                    borderRadius: "50%",
                                    padding: "2px 6px",
                                    fontSize: "12px",
                                }}
                            >
                                {friendRequests.length}
                            </span>
                        )}

                        {showDropdown && (
                            <div
                                ref={dropdownRef}
                                style={{
                                    position: "absolute",
                                    top: "28px",
                                    right: "0",
                                    background: "white",
                                    border: "1px solid #ddd",
                                    borderRadius: "8px",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                    width: "240px",
                                    zIndex: 10,
                                    maxHeight: "300px",
                                    overflowY: "auto",
                                }}
                            >
                                {friendRequests.length === 0 ? (
                                    <p
                                        style={{
                                            textAlign: "center",
                                            padding: "10px",
                                            color: "#666",
                                        }}
                                    >
                                        No new requests
                                    </p>
                                ) : (
                                    friendRequests.map((req) => (
                                        <div
                                            key={req._id}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: "8px 10px",
                                                borderBottom: "1px solid #eee",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <Image
                                                    src={req.profilePic || "/placeholder.png"}
                                                    alt={req.name}
                                                    width={30}
                                                    height={30}
                                                    style={{
                                                        width: "30px",
                                                        height: "30px",
                                                        borderRadius: "50%",
                                                        objectFit: "cover",
                                                    }}
                                                />
                                                <span style={{ fontSize: "0.9rem" }}>{req.name}</span>
                                            </div>
                                            <button
                                                onClick={() => acceptFriendRequest(req._id)}
                                                style={{
                                                    background: "#0b93f6",
                                                    color: "#fff",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    padding: "4px 8px",
                                                    fontSize: "0.5rem",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                Accept
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Hamburger Icon (mobile only) */}
                    <button
                        className="hamburger-btn"
                        style={{
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            fontSize: "24px",
                            display: "none", // will show on mobile via CSS
                            color:"black",
                        }}
                        onClick={() => {
                            document.querySelector(".left-panel")?.classList.toggle("show");
                        }}
                    >
                        ☰
                    </button>
                </div>
            </div>


            {/* Search */}
            <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                    width: "90%",
                    padding: "8px 12px",
                    marginLeft: "10px",
                    marginRight: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    outline: "none",
                    fontSize: "14px",
                }}
            />

            {/* Users List */}
            <ul style={{ listStyle: "none", padding: 0 }}>
                {filteredUsers.length === 0 ? (
                    <p>No users found.</p>
                ) : (
                    filteredUsers.map(u => {
                        const isFriend = user?.friends?.includes(u._id) || u.isNowFriend;
                        return (
                            <li key={u._id} style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 10px",
                                borderRadius: "6px",
                                background: "#fafafa",
                                marginBottom: "8px",
                                transition: "background 0.2s",

                            }} onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f0f0")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#fafafa")}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <Image
                                        src={u.profilePic || "/placeholder.png"}
                                        alt={u.name}
                                        width={40}
                                        height={40}
                                        style={{
                                            width: "40px",
                                            height: "40px",
                                            borderRadius: "50%",
                                            objectFit: "cover",
                                        }}
                                    />

                                    <span style={{ fontWeight: "500" }}>{u.name}</span>
                                </div>
                                {isFriend ? (
                                    <span style={{ fontWeight: "bold", color: "green" }}>Friends</span>
                                ) : (
                                    <FaUserPlus
                                        onClick={() => sendFriendRequest(u._id)}
                                        size={20}
                                        style={{
                                            color: "#0b93f6",
                                            cursor: sendingRequest === u._id ? "not-allowed" : "pointer",
                                            opacity: sendingRequest === u._id ? 0.5 : 1,
                                            marginRight: "10px",
                                        }}
                                        title={sendingRequest === u._id ? "Sending..." : "Add Friend"}
                                    />
                                )}
                            </li>
                        );
                    })
                )}
            </ul>

            <ToastComponent message={toast.message} type={toast.type} />
        </div>
    );
}
