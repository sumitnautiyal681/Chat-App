"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import { Socket } from "socket.io-client";
import { Paperclip } from "lucide-react";
import Image from "next/image";
import { FiUserPlus } from "react-icons/fi";
import { Chat, Group } from "../types/chat";
import { IoArrowBack } from "react-icons/io5";

// --- Interfaces ---
export interface User {
  _id: string;
  name: string;
  email?: string;
  profilePic?: string;
  token?: string;
  updatedAt?: string;
}
export interface Friend {
  _id: string;
  name: string;
  profilePic?: string | null;
  email?: string;
}

export interface Message {
  _id: string;
  sender: string;
  senderName?: string;
  chatId: string;
  content: string;
  type: string;
  fileName?: string;
  fileUrl?: string;
  createdAt?: string;
}


interface RightPanelProps {
  selectedChat: Chat | Group | null;
  setSelectedChat: React.Dispatch<React.SetStateAction<Chat | Group | null>>;
  onGroupUpdated?: (updatedGroup: Group) => void;
}
interface SocketWithRooms extends Socket {
  joinedRooms?: Set<string>;
}

// --- Component ---
export default function RightPanel(
  { selectedChat,
    setSelectedChat,
    onGroupUpdated
  }: RightPanelProps) {
  const { socket } = useSocket();
  const { user } = useAuth() as { user: User | null };
  const [fileType, setFileType] = useState<"image" | "video" | "audio" | "file" | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sendingFile, setSendingFile] = useState<string | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [groupInfo, setGroupInfo] = useState<Group | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [editPreviewPic, setEditPreviewPic] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState<string>("");
  const [editGroupPic, setEditGroupPic] = useState<string | null>(null);
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<User | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [savingGroup, setSavingGroup] = useState(false);
  const [hover, setHover] = useState(false);


  // --- Auto scroll ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchGroupDetails = useCallback(async (): Promise<void> => {
    if (!user?.token || !selectedChat?._id) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/groups/${selectedChat._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch group details");

      const data: Group = await res.json();
      console.log("Fetched full group info ✅", data);

      setGroupInfo(data);
      setSelectedChat((prev) =>
        prev && prev._id === data._id ? { ...data, isGroupChat: true } : prev
      );
    } catch (err) {
      console.error("Error fetching group details:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat?._id, user?.token]); // ✅ This is correct




  // --- Fetch chat messages ---
  useEffect(() => {
    if (!selectedChat || !user?.token) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/messages/${selectedChat._id}`,
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
        setMessages(await res.json());
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };

    fetchMessages();
  }, [selectedChat, user]);

  // --- Realtime listener ---
  useEffect((): void | (() => void) => {
    if (!socket || !user) return;

    const handleReceiveMessage = (msg: Message) => {
      if (msg.chatId === selectedChat?._id) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket, selectedChat, user]);

  useEffect(() => {
    const typedSocket = socket as SocketWithRooms;
    if (!typedSocket || !selectedChat?._id) return;

    // Initialize joinedRooms if it doesn't exist
    if (!typedSocket.joinedRooms) typedSocket.joinedRooms = new Set<string>();

    if (!typedSocket.joinedRooms.has(selectedChat._id)) {
      typedSocket.emit("join_chat", selectedChat._id);
      typedSocket.joinedRooms.add(selectedChat._id);
      console.log("✅ Joined chat room:", selectedChat._id);
    }
  }, [socket, selectedChat?._id]);

  useEffect(() => {
    if (!socket) return;

    const onGroupUpdated = (updatedGroup: Group) => {
      if (selectedChat && selectedChat._id === updatedGroup._id) {
        setSelectedChat({ ...updatedGroup, isGroupChat: true });
      }
    };

    socket.on("group_updated", onGroupUpdated);

    return () => {
      socket.off("group_updated", onGroupUpdated);
    };
  }, [socket, selectedChat, setSelectedChat]);

  const fetchFriends = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingFriends(true);

      const res = await fetch( `${process.env.NEXT_PUBLIC_API_URL}/api/users/friends`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch friends");

      const data: Friend[] = await res.json();
      setFriends(data || []);
    } catch (err) {
      console.error(err);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }, [user]);

  useEffect(() => {
    if (showAddMemberModal) {
      fetchFriends();
    }
  }, [showAddMemberModal, fetchFriends]);

  // --- Send message handler ---
  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedChat || !user) return;

    let fileUrl: string | null = null;

    if (selectedFile) {
      setSendingFile(selectedFile.name);
      const fd = new FormData();
      fd.append("file", selectedFile);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, { method: "POST", body: fd });
      const data = await res.json();
      fileUrl = data.fileUrl;
    }

    const msgData = {
      sender: user._id,
      senderName: user.name,
      chatId: selectedChat._id,
      content: selectedFile ? fileUrl : newMessage.trim(),
      type: selectedFile ? "file" : "text",
      fileName: selectedFile?.name ?? null,
      fileUrl,
    };

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
      body: JSON.stringify(msgData),
    });

    const saved = await res.json();

    // Only emit to socket; the socket listener should handle adding it locally
    socket?.emit("send_message", saved);

    setNewMessage("");
    setSelectedFile(null);
    setSendingFile(null);
  };


  useEffect(() => {
    if (showGroupInfo && selectedChat?.isGroupChat) {
      fetchGroupDetails(); // fetch fresh members
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGroupInfo, selectedChat?._id, fetchGroupDetails]);

  const handleGroupPicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data: { fileUrl: string } = await res.json();
      console.log(data.fileUrl);

      setEditGroupPic(data.fileUrl); // URL from server
      setEditPreviewPic(`${data.fileUrl}?t=${Date.now()}`);
    } catch (err) {
      console.error(err);
      alert("Failed to upload image");
    }
  };


  const handleFileTypeSelect = (type: "image" | "video" | "audio" | "file") => {
    setFileType(type);
    setShowTypeMenu(false);

    const input = document.createElement("input");
    input.type = "file";

    input.accept =
      type === "image"
        ? "image/*"
        : type === "video"
          ? "video/*"
          : type === "audio"
            ? "audio/*"
            : "*/*";

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        setSelectedFile(target.files[0]);
      }
    };

    input.click();
  };

  const handleSaveGroup = async (): Promise<void> => {
    if (!user)
      return;
    if (!editGroupName.trim()) {
      alert("Group name cannot be empty");
      return;
    }

    setSavingGroup(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/groups/${selectedChat?._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ name: editGroupName, profilePic: editGroupPic }),
      });

      if (!res.ok) throw new Error("Failed to update group");

      const updatedGroup: Group = await res.json();

      setSelectedChat({ ...updatedGroup, isGroupChat: true });
      onGroupUpdated?.(updatedGroup); // notify Chats
      setShowEditGroupModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update group");
    } finally {
      setSavingGroup(false);
    }
  };
  // --- Helpers ---
  const formatTimestamp = (t?: string) =>
    t
      ? new Date(t).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
      : "";

  // --- UI ---
  if (!user)
    return (
      <div className="right-panel" style={{ padding: 20 }}>
        <p>Please log in to view or send messages.</p>
      </div>
    );

  if (!selectedChat)
    return (
      <div className="right-panel" style={{ padding: 20, alignItems: "center", fontSize: "40px" }}>
        <p><b>Hey {user.name} </b></p>
        <p style={{ paddingTop: "400px", alignItems: "center", fontSize: "20px", display: "flex" }}>Start Chatting with your friends!</p>
      </div>
    );


  const chatUser = !selectedChat?.isGroupChat
    ? (selectedChat as Chat).users?.find(u => u._id !== user._id) ?? null
    : null;


  const isAdmin = selectedChat.admins?.some(a => a._id === user._id);
  const isCreator = selectedChat?.admin?._id === user._id;


  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      padding: "10px",
      background: "#f5f5f5",
      borderRadius: "10px",
    }} >
      {/* 🔹 Chat Header Bar */}
      <div
      style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between", // <-- put everything together
    padding: "10px 15px",
    background: "#ffffff",
    borderBottom: "1px solid #ddd",
    borderRadius: "10px 10px 0 0",
    gap: "0px", // <-- space between arrow and profile
  }}
      >
        {/* 🔙 Back Button (Mobile Only) */}
        <button
          onClick={() => {
            setSelectedChat(null); // return to middle panel
            // also reset CSS variables for sliding
            document.documentElement.style.setProperty('--middle-translate', '0');
            document.documentElement.style.setProperty('--right-translate', '100%');
          }}
          className="mobile-back-btn"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            marginRight: "10px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IoArrowBack size={22} color="#0b93f6" />
        </button>
        {/* Left Section: Profile Image + Name */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px"}}>
          <Image
            key={selectedChat?.profilePic}
            src={
              selectedChat?.isGroupChat
                ? selectedChat.profilePic || "/group-dp.png"
                : chatUser?.profilePic || "/847969.png"
            }
            alt="profile"
            width={40}          // ✅ Required prop
            height={40}         // ✅ Required prop
            style={{
              borderRadius: "50%",
              objectFit: "cover",
            }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.src = "/847969.png";
            }}
          />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 500 }}>
              {chatUser?.name || selectedChat?.name || "Chat"}
            </span>
            {selectedChat?.isGroupChat && (
              <span style={{ fontSize: "0.8rem", color: "#666" }}>
                {selectedChat?.users?.length} members
              </span>
            )}
          </div>
        </div>

        {/* Right Section: 3-dot menu */}
        <div style={{ position: "relative",marginLeft:"80px"}}>
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "25px",
              color: "black",
            }}
          >
            ⋮
          </button>

          {showMenu && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "30px",
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "8px",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                width: "140px",
                zIndex: 10,
              }}
            >
              <div
                onClick={() => {
                  setShowMenu(false);
                  if (selectedChat?.isGroupChat) {
                    setShowGroupInfo(true);
                  } else {
                    setShowProfile(true);
                  }
                }}
                style={{
                  padding: "10px",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                }}
              >
                {selectedChat?.isGroupChat ? "View Group Info" : "View Profile"}
              </div>

              <div
                style={{
                  padding: "10px",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                }}
              >
                Help
              </div>
              <div style={{ padding: "10px", cursor: "pointer" }}>Report</div>
            </div>
          )}
        </div>

        {/* 🧾 View Group Info Modal */}
        {showGroupInfo && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 100,
              padding: "20px",
            }}
            onClick={() => setShowGroupInfo(false)}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "20px",
                maxWidth: "400px",
                width: "100%",
                maxHeight: "80%",
                overflowY: "auto",
                textAlign: "center",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Profile Picture & Editable Name */}
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <Image
                  src={selectedChat?.profilePic || "/847969.png"}
                  alt={selectedChat?.name}
                  width={100}
                  height={100}
                  style={{

                    borderRadius: "50%",
                    objectFit: "cover",
                    margin: "0 auto 10px",
                    display: "block",
                  }}
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    e.currentTarget.src = "/847969.png";
                  }}
                />

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    justifyContent: "center",
                  }}
                >
                  <h3 style={{ marginLeft: "41px" }}>{selectedChat?.name}</h3>
                  {(isCreator || isAdmin) && !showEditGroupModal && (
                    <button
                      onClick={() => {
                        setEditGroupName(selectedChat?.name || "");
                        setEditGroupPic(selectedChat?.profilePic || "");
                        setEditPreviewPic(selectedChat?.profilePic || "");
                        setShowEditGroupModal(true);
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: "1rem",
                      }}
                      title="Edit Group"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              </div>

              {/* Members List */}
              <div style={{ textAlign: "left" }}>
                {(groupInfo?.members || selectedChat?.members || []).map((member) => {
                  const isAdmin = selectedChat?.admins?.some(
                    (a) => a._id === member._id
                  );
                  const isCreator = selectedChat?.admin?._id === member._id;
                  const currentUserIsCreator = selectedChat?.admin?._id === user?._id;


                  return (
                    <div
                      key={member._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "10px",
                        gap: "10px",
                      }}
                    >
                      {/* Member Info */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Image
                          src={
                            member.profilePic
                              ? `${member.profilePic}?t=${member.updatedAt || Date.now()
                              }`
                              : "/847969.png"
                          }
                          alt={member.name}
                          width={35}
                          height={35}
                          style={{ borderRadius: "50%" }}
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            e.currentTarget.src = "/847969.png";
                          }}
                        />
                        <span style={{ fontWeight: 500 }}>{member.name}</span>
                        {isAdmin && (
                          <span
                            style={{
                              background: "#0b93f6",
                              color: "#fff",
                              fontSize: "0.7rem",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              marginLeft: "5px",
                            }}
                          >
                            Admin
                          </span>
                        )}
                        {isCreator && (
                          <span
                            style={{
                              background: "#28a745",
                              color: "#fff",
                              fontSize: "0.7rem",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              marginLeft: "5px",
                            }}
                          >
                            Creator
                          </span>
                        )}
                      </div>
                      {/* Member Actions Dropdown */}
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={() =>
                            setOpenDropdown((prev) => (prev === member._id ? null : member._id))
                          }
                          style={{ padding: "4px", border: "none", background: "transparent", cursor: "pointer", fontSize: "18px", color: "black" }}
                        >
                          ⋯
                        </button>

                        {openDropdown === member._id && (
                          <div style={{ position: "absolute", right: 0, top: "25px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)", zIndex: 20, minWidth: "140px" }}>
                            {/* View Profile */}
                            <div
                              onClick={() => {
                                setSelectedMemberProfile(member);
                                setOpenDropdown(null);
                              }}
                              style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #eee" }}
                            >
                              View Profile
                            </div>

                            {/* Assign / Remove Admin */}
                            {member &&
                              currentUserIsCreator &&
                              member._id !== user._id &&
                              !isCreator && (   // ✅ Correct variable name
                                <div
                                  onClick={async () => {
                                    if (!selectedChat || !member) return console.error("No selected chat or member to update.");

                                    try {
                                      // Optimistic local update
                                      setSelectedChat((prevGroup) => {
                                        if (!prevGroup) return null;

                                        const updatedAdmins = isAdmin
                                          ? (prevGroup.admins || []).filter((admin) => admin._id !== member._id)
                                          : [...(prevGroup.admins || []), member];

                                        return { ...prevGroup, admins: updatedAdmins };
                                      });

                                      // Backend request
                                      const res = await fetch(
                                        `${process.env.NEXT_PUBLIC_API_URL}api/groups/${selectedChat._id}/toggle-admin`,
                                        {
                                          method: "PATCH",
                                          headers: {
                                            "Content-Type": "application/json",
                                            Authorization: `Bearer ${user.token}`,
                                          },
                                          body: JSON.stringify({ memberId: member._id }),
                                        }
                                      );

                                      if (!res.ok) throw new Error("Failed to update admin status.");
                                      const updatedGroup: Group = await res.json();

                                      setSelectedChat(updatedGroup);
                                      onGroupUpdated?.(updatedGroup);
                                    } catch (err) {
                                      console.error(err);
                                    } finally {
                                      setOpenDropdown(null);
                                    }
                                  }}
                                  style={{
                                    padding: "8px 12px",
                                    cursor: "pointer",
                                    borderBottom: "1px solid #eee",

                                  }}
                                >
                                  {isAdmin ? "Remove Admin" : "Assign Admin"}
                                </div>
                              )}

                            {/* Remove Member */}
                            {currentUserIsCreator && member._id !== user._id && (
                              <div
                                onClick={async () => {
                                  try {
                                    setGroupInfo((prev) => ({
                                      ...prev!,
                                      members: prev!.members.filter((m) => m._id !== member._id),
                                      admins: prev!.admins?.filter((a) => a._id !== member._id),
                                    }));

                                    setSelectedChat((prev) => {
                                      if (!prev) return prev; // null guard
                                      if (!prev.isGroupChat) return prev; // only update if it's a group

                                      return {
                                        ...prev,
                                        members: prev.members.filter((m) => m._id !== member._id),
                                        admins: prev.admins?.filter((a) => a._id !== member._id),
                                      };
                                    });


                                    const res = await fetch(
                                      `${process.env.NEXT_PUBLIC_API_URL}/api/groups/${selectedChat._id}/remove-member`,
                                      {
                                        method: "PATCH",
                                        headers: {
                                          "Content-Type": "application/json",
                                          Authorization: `Bearer ${user.token}`,
                                        },
                                        body: JSON.stringify({ memberId: member._id }),
                                      }
                                    );

                                    if (!res.ok) throw new Error("Failed to remove member");
                                    const updatedGroup = await res.json();

                                    setGroupInfo(updatedGroup);
                                    setSelectedChat({ ...updatedGroup, isGroupChat: true });
                                    onGroupUpdated?.(updatedGroup);
                                    socket?.emit("group_updated", updatedGroup);
                                  } catch (err) {
                                    console.error(err);
                                  } finally {
                                    setOpenDropdown(null);
                                  }
                                }}
                                style={{ padding: "8px 12px", cursor: "pointer" }}
                              >
                                Remove
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Members Button */}
              {(isCreator || isAdmin) && (
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  style={{
                    background: "#0b93f6",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    marginTop: "15px",
                    width: "100%",
                  }}
                >
                  Add Members
                </button>
              )}

              {/* Leave Group Button */}
              <button
                onClick={async () => {
                  if (!window.confirm("Are you sure you want to leave this group?")) return;
                  try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/groups/${selectedChat._id}/leave`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
                    });
                    if (!res.ok) throw new Error("Failed to leave group");
                    const updatedGroup = { ...selectedChat, left: true };
                    socket?.emit("group_updated", updatedGroup);
                    setSelectedChat(null);
                  } catch (err) {
                    console.error(err);
                    alert("Failed to leave group. Try again.");
                  }
                }}
                style={{
                  marginTop: "10px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "#ff4d4d",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Leave Group
              </button>
            </div>
          </div>
        )}
        {showAddMemberModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}>
            <div style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "8px",
              width: "350px",
              maxHeight: "80vh",
              overflowY: "auto",
            }}>
              <h3 >
                Add Members to {selectedChat.name}
              </h3>

              {loadingFriends ? (
                <p>Loading friends...</p>
              ) : friends && friends.length > 0 ? (
                friends
                  .filter((f) => !selectedChat.members?.some((m) => m._id === f._id))
                  .map((f) => (
                    <div
                      key={f._id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        margin: "8px 0",
                      }}
                    >
                      <span>{f.name}</span>

                      <button
                        style={{
                          width: "40px",
                          height: "40px",
                          background: "#0b93f6",
                          color: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                        onClick={async () => {
                          if (!selectedChat) return;

                          try {
                            // 🔹 Optimistic UI: update members safely
                            setGroupInfo(prev => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                members: [
                                  ...prev.members,
                                  { _id: f._id, name: f.name, profilePic: f.profilePic || null },
                                ],
                              } as Group; // ✅ Cast to Group to satisfy TS
                            });

                            setSelectedChat(prev => {
                              if (!prev || !prev.isGroupChat) return prev;

                              return {
                                ...prev,
                                members: [
                                  ...(prev.members || []),
                                  {
                                    _id: f._id,
                                    name: f.name,
                                    profilePic: f.profilePic || undefined,
                                    email: f.email, // ✅ add email here
                                  },
                                ],
                              } as Group;
                            });




                            // 🔹 Backend request
                            const res = await fetch(
                              `${process.env.NEXT_PUBLIC_API_URL}/api/groups/${selectedChat._id}/add-members`,
                              {
                                method: "PATCH",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${user.token}`,
                                },
                                body: JSON.stringify({ memberIds: [f._id] }),
                              }
                            );

                            if (!res.ok) throw new Error("Failed to add member");
                            const updatedGroup: Group = await res.json();

                            setGroupInfo(updatedGroup);
                            setSelectedChat({ ...updatedGroup, isGroupChat: true });

                            onGroupUpdated?.(updatedGroup);
                            socket?.emit("group_updated", updatedGroup);

                          } catch (err) {
                            console.error("Error adding member:", err);
                          }
                        }}

                      >
                        <FiUserPlus size={20} />
                      </button>
                    </div>
                  ))
              ) : (
                <p>No friends available to add</p>
              )}

              <button
                style={{
                  marginTop: "10px",
                  background: "#ccc",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "4px",
                }}
                onClick={() => setShowAddMemberModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>


      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "10px",
        display: "flex",
        flexDirection: "column",
        marginBottom: "60px",
      }}>
        {messages.map((msg, i) => {
          const isSender = msg.sender === user._id;
          const isImage = msg.content?.match(/\.(jpeg|jpg|png|gif)$/i);
          const isVideo = msg.content?.match(/\.(mp4|webm|ogg)$/i);
          const isAudio = msg.content?.match(/\.(mp3|wav|m4a)$/i);

          return (
            <div
              key={`${msg._id}-${i}`}
              style={{
                alignSelf: isSender ? "flex-end" : "flex-start",
                background: isSender ? "#0b93f6" : "#e5e5ea",
                color: isSender ? "#fff" : "#000",
                padding: "8px 12px",
                borderRadius: "20px",
                marginBottom: "8px",
                maxWidth: "70%",
                wordBreak: "break-word",
              }}
            >
              {/* Sender Name */}
              {!isSender && msg.senderName && (
                <strong style={{ display: "block", marginBottom: "4px" }}>{msg.senderName}:</strong>
              )}

              {/* Message Content */}
              {isImage ? (
                <a
                  href={msg.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-1"
                >
                  <Image
                    src={msg.content}
                    alt="sent"
                    width={320}          // max-w-xs = 20rem = 320px
                    height={256}         // max-h-64 = 16rem = 256px
                    style={{
                      borderRadius: "0.75rem",  // rounded-xl
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)", // shadow-md
                      cursor: "pointer",        // cursor-pointer
                      objectFit: "cover",       // object-cover
                      transform: hover ? "scale(1.05)" : "scale(1)",
                      transition: "transform 0.2s, box-shadow 0.2s", // transition + duration
                    }}
                    onMouseEnter={() => setHover(true)}
                    onMouseLeave={() => setHover(false)}
                  />
                </a>
              ) : isVideo ? (
                <video
                  src={msg.content}
                  controls
                  style={{ maxWidth: "200px", borderRadius: "10px" }}
                />
              ) : isAudio ? (
                <audio
                  src={msg.content}
                  controls
                  style={{ width: "100%", marginTop: "5px" }}
                />
              ) : msg.type === "file" && msg.fileUrl ? (
                <a
                  href={msg.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: isSender ? "#fff" : "#007bff",
                    textDecoration: "underline",
                  }}
                >
                  {msg.fileName || "Download File"}
                </a>
              ) : (
                <span>{msg.content}</span>
              )}

              {/* Timestamp */}
              <div
                style={{
                  fontSize: "0.7rem",
                  color: isSender ? "rgba(255,255,255,0.8)" : "#555",
                  textAlign: "right",
                  marginTop: "4px",
                }}
              >
                {formatTimestamp(msg.createdAt)}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      {/* Input Area */}
      <div style={{ position: "relative", display: "flex", marginTop: "10px", alignItems: "center" }}>

        {/* 📎 Attach button */}
        <button
          onClick={() => setShowTypeMenu((prev) => !prev)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            marginRight: "10px",
            position: "relative",
            flex: 0,
          }}>
          <Paperclip size={22} color="#0b93f6" />
        </button>

        {/* 📋 Type selection popup */}
        {showTypeMenu && (
          <div style={{
            position: "absolute",
            bottom: "45px",
            left: "10px",
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            zIndex: 10,
          }}>
            {["image", "video", "audio", "file"].map((type) => (
              <div
                key={type}
                onClick={() => handleFileTypeSelect(type as "file" | "image" | "video" | "audio")}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderBottom: type !== "file" ? "1px solid #eee" : "none",
                  color: "#333",
                }}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input */}
        <input
          type="file"
          id="fileInput"
          style={{ display: "none" }}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) setSelectedFile(file);
          }}
        />

        {/* 🧾 File status indicator */}
        {selectedFile && (
          <span style={{ marginRight: "10px", fontSize: "0.9rem", color: "#666" }}>
            📁 {selectedFile.name.length > 20 ? selectedFile.name.slice(0, 20) + "..." : selectedFile.name}
          </span>
        )}

        {/* ✏️ Message input */}
        <input
          type="text"
          value={newMessage}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSend()}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "20px",
            border: "1px solid #ccc",
            outline: "none",
          }}
        />

        {/* 🚀 Send button */}
        <button
          onClick={handleSend}
          style={{
            marginLeft: "10px",
            padding: "10px 20px",
            borderRadius: "20px",
            background: "#0b93f6",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            flex: 0,
          }}>
          Send
        </button>
      </div>

      {/* 🧾 File status indicator */}
      {selectedFile && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: "8px",
            background: "#e5e5ea",
            padding: "6px 10px",
            borderRadius: "12px",
            fontSize: "0.9rem",
          }}
        >
          📁{" "}
          {selectedFile.name.length > 20
            ? `${selectedFile.name.slice(0, 20)}...`
            : selectedFile.name}
        </span>
      )}

      {/* Uploading overlay */}
      {sendingFile && (
        <div
          style={{
            position: "absolute",
            bottom: "70px",
            right: "20px",
            padding: "8px 14px",
            borderRadius: "10px",
            background: "#1e90ff",
            display: "flex",
            alignItems: "center",
            color: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            gap: "8px",
            fontSize: "0.9rem",
            animation: "fadeInOut 0.3s ease"
          }}
        >
          <span>
            Sending your {fileType || "file"} ⏳
          </span>
        </div>
      )}

      {selectedMemberProfile && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          padding: "20px",
          width: "300px",
          textAlign: "center",
          zIndex: 200,
        }}>
          {/* Profile Picture */}
          <Image
            src={
              selectedMemberProfile.profilePic
                ? `${selectedMemberProfile.profilePic}?t=${selectedMemberProfile.updatedAt || ""}`
                : "/847969.png"
            }
            alt="profile"
            width={100}
            height={100}
            style={{
              borderRadius: "50%",
              objectFit: "cover",
              marginBottom: "10px",
            }}
          />

          {/* Name */}
          <h2 >{selectedMemberProfile.name}</h2>

          {/* Email */}
          <p style={{ color: "#555" }}>{selectedMemberProfile.email}</p>

          {/* Close Button */}
          <button
            onClick={() => setSelectedMemberProfile(null)}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "#0b93f6",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      )}

      {showEditGroupModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowEditGroupModal(false)}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              width: "350px",
              maxHeight: "80%",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 >Edit Group</h3>

            {/* Group Name */}
            <div style={{ margin: "10px 0" }}>
              <label >Group Name:</label>
              <input
                type="text"
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                style={{ width: "100%", padding: "6px", marginTop: "4px", borderRadius: "6px", border: "1px solid #ccc" }}
              />
            </div>

            {/* Group Profile Picture */}
            <div style={{ margin: "10px 0" }}>
              <label >Group Profile Picture:</label>
              <input
                type="file"
                onChange={handleGroupPicChange}
                style={{ marginTop: "4px" }}
              />
              {editPreviewPic && (
                <Image
                  src={editPreviewPic}
                  alt="preview"
                  width={80}
                  height={80}
                  style={{ borderRadius: "50%", marginTop: "6px" }} />
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
              <button
                onClick={handleSaveGroup}
                disabled={savingGroup}
                style={{ flex: 1, padding: "8px", borderRadius: "6px", background: "#0b93f6", color: "#fff", border: "none" }}
              >
                {savingGroup ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setShowEditGroupModal(false)}
                style={{ flex: 1, padding: "8px", borderRadius: "6px", background: "#ccc", border: "none" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧑 View Profile Modal */}
      {showProfile && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#fff",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            padding: "20px",
            width: "300px",
            textAlign: "center",
            zIndex: 9999,
          }}
        >
          <Image
            src={
              selectedChat?.isGroupChat
                ? `${selectedChat.profilePic || "/847969.png"}?t=${selectedChat.updatedAt || Date.now()}`
                : `${chatUser?.profilePic || "/847969.png"}?t=${chatUser?.updatedAt || Date.now()}`
            }
            alt="profile"
            width={100}
            height={100}
            style={{
              borderRadius: "50%",
              objectFit: "cover",
              marginBottom: "10px",
            }}
          />
          <h2 >{chatUser?.name || "Friend"}</h2>
          <p style={{ color: "#555" }}>{chatUser?.email || "No email available"}</p>
          <button
            onClick={() => setShowProfile(false)}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "#0b93f6",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Close
          </button>

        </div>
      )}
    </div>
  );
}