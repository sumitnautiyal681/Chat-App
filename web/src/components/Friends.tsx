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
                const res = await fetch("http://localhost:5000/api/users/all", {
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
                const res = await fetch("http://localhost:5000/api/users/friend-requests", {
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
            const res = await fetch("http://localhost:5000/api/users/friend-request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user.token}`,
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
            const res = await fetch("http://localhost:5000/api/users/accept-request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user.token}`,
                },
                body: JSON.stringify({ fromUserId }),
            });
            const data = await res.json();
            if (res.ok) {
                updateUser({ ...data.user, token: user.token });
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
        <div className="p-2">
            {/* Header */}
            <div className="flex justify-between items-center relative">
                <h3 className="text-2xl font-semibold m-5">Find Friends</h3>
                <div className="relative">
                    <FaBell
                        size={22}
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="text-gray-800 mr-5 cursor-pointer"
                    />
                    {friendRequests.length > 0 && (
                        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">{friendRequests.length}</span>
                    )}
                    {showDropdown && (
                        <div ref={dropdownRef} className="absolute top-7 right-0 w-60 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded shadow-md z-10">
                            {friendRequests.length === 0 ? (
                                <p className="text-center p-2 text-gray-600">No new requests</p>
                            ) : (
                                friendRequests.map(req => (
                                    <div key={req._id} className="flex justify-between items-center p-2 border-b border-gray-100">
                                        <div className="flex items-center gap-2">

                                            <Image
                                                src={req.profilePic || "/placeholder.png"} // better to have local fallback
                                                alt={req.name}
                                                width={30}
                                                height={30}
                                                style={{
                                                    borderRadius: "50%",
                                                    objectFit: "cover",
                                                }}
                                            />

                                            <span className="text-sm">{req.name}</span>
                                        </div>
                                        <button
                                            onClick={() => acceptFriendRequest(req._id)}
                                            className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600"
                                        >
                                            Accept
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Search */}
            <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-11/12 mx-2 p-2 border border-gray-300 rounded outline-none text-sm"
            />

            {/* Users List */}
            <ul className="p-2">
                {filteredUsers.length === 0 ? (
                    <p>No users found.</p>
                ) : (
                    filteredUsers.map(u => {
                        const isFriend = user?.friends?.includes(u._id) || u.isNowFriend;
                        return (
                            <li key={u._id} className="flex justify-between items-center p-2 mb-2 bg-gray-50 rounded hover:bg-gray-100 transition">
                                <div className="flex items-center gap-2">
                                    <Image
                                        src={u.profilePic || "/placeholder.png"}
                                        alt={u.name}
                                        width={40}
                                        height={40}
                                        style={{
                                            borderRadius: "50%",
                                            objectFit: "cover",
                                        }}
                                    />

                                    <span className="font-medium">{u.name}</span>
                                </div>
                                {isFriend ? (
                                    <span className="text-green-600 font-bold">Friends</span>
                                ) : (
                                    <FaUserPlus
                                        onClick={() => sendFriendRequest(u._id)}
                                        size={20}
                                        className={`mr-2 cursor-pointer ${sendingRequest === u._id ? "opacity-50 cursor-not-allowed" : ""}`}
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
