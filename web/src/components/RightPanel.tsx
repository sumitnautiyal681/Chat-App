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
import { Chat, Group } from "../types/chat"

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



  // --- Auto scroll ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchGroupDetails = useCallback(async (): Promise<void> => {
    if (!user?.token || !selectedChat) return;

    try {
      const res = await fetch(`http://localhost:5000/api/groups/${selectedChat._id}`, {
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
  }, [selectedChat, user?.token, setSelectedChat]);


  // --- Fetch chat messages ---
  useEffect(() => {
    if (!selectedChat || !user?.token) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/messages/${selectedChat._id}`,
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

      const res = await fetch("http://localhost:5000/api/users/friends", {
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
      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: fd,
      });
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

    const res = await fetch("http://localhost:5000/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`,
      },
      body: JSON.stringify(msgData),
    });

    const saved = await res.json();
    socket?.emit("send_message", saved);
    setMessages((prev) => [...prev, saved]);
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
      const res = await fetch("http://localhost:5000/api/upload", {
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
      const res = await fetch(`http://localhost:5000/api/groups/${selectedChat?._id}`, {
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
      <div className="p-4 text-center text-gray-600">
        Please log in to view or send messages.
      </div>
    );

  if (!selectedChat)
    return (
      <div className="p-4 text-center text-gray-600">
        <p className="text-lg font-semibold">Hey {user.name} 👋</p>
        <p className="mt-2">Start chatting with your friends!</p>
      </div>
    );


  const chatUser = !selectedChat?.isGroupChat
    ? (selectedChat as Chat).users?.find(u => u._id !== user._id) ?? null
    : null;


  const isAdmin = selectedChat.admins?.some(a => a._id === user._id);
  const isCreator = selectedChat?.admin?._id === user._id;
  return (
    <div className="flex flex-col h-full p-2.5 bg-gray-100 rounded-xl">
      {/* 🔹 Chat Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 15px",
          background: "#ffffff",
          borderBottom: "1px solid #ddd",
          borderRadius: "10px 10px 0 0",
        }}
      >
        {/* Left Section: Profile Image + Name */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Image
            key={selectedChat?.profilePic}
            src={
              selectedChat?.isGroupChat
                ? selectedChat.profilePic || "847969.png"
                : chatUser?.profilePic || "847969.png"
            }
            alt="profile"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              objectFit: "cover",
            }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.src = "847969.png";
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
        <div style={{ position: "relative" }}>
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
                className="px-3 py-2 cursor-pointer border-b last:border-b-0"
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
                  src={selectedChat?.profilePic || "847969.png"}
                  alt={selectedChat?.name}
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    margin: "0 auto 10px",
                    display: "block",
                  }}
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    e.currentTarget.src = "847969.png";
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
                  const isAdminMember = selectedChat?.admins?.some(
                    (a) => a._id === member._id
                  );
                  const isCreatorMember = selectedChat?.admin?._id === member._id;
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
                              : "847969.png"
                          }
                          alt={member.name}
                          style={{ width: 35, height: 35, borderRadius: "50%" }}
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            e.currentTarget.src = "847969.png";
                          }}
                        />
                        <span style={{ fontWeight: 500 }}>{member.name}</span>
                        {isAdminMember && (
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
                        {isCreatorMember && (
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
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenDropdown((prev) => (prev === member._id ? null : member._id))
                          }
                          className="p-1 border-none bg-transparent cursor-pointer text-black text-lg"
                        >
                          ⋯
                        </button>

                        {openDropdown === member._id && (
                          <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-md shadow-md z-20 min-w-[140px]">
                            {/* View Profile */}
                            <div
                              onClick={() => {
                                setSelectedMemberProfile(member);
                                setOpenDropdown(null);
                              }}
                              className="px-3 py-2 cursor-pointer border-b border-gray-100 hover:bg-gray-100"
                            >
                              View Profile
                            </div>

                            {/* Assign/Remove Admin */}
                            {currentUserIsCreator && member._id !== user._id && !isCreator && (
                              <div
                                onClick={async () => {
                                  try {
                                    setSelectedChat((prev) => ({
                                      ...prev!,
                                      admins: isAdmin
                                        ? prev!.admins?.filter((a) => a._id !== member._id)
                                        : [...(prev!.admins || []), member],
                                    }));

                                    const res = await fetch(
                                      `http://localhost:5000/api/groups/${selectedChat._id}/toggle-admin`,
                                      {
                                        method: "PATCH",
                                        headers: {
                                          "Content-Type": "application/json",
                                          Authorization: `Bearer ${user.token}`,
                                        },
                                        body: JSON.stringify({ memberId: member._id }),
                                      }
                                    );
                                    const updatedGroup = await res.json();
                                    setSelectedChat({ ...updatedGroup, isGroupChat: true });
                                    onGroupUpdated?.(updatedGroup);
                                  } catch (err) {
                                    console.error(err);
                                  } finally {
                                    setOpenDropdown(null);
                                  }
                                }}
                                className="px-3 py-2 cursor-pointer border-b border-gray-100 hover:bg-gray-100"
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
                                      `http://localhost:5000/api/groups/${selectedChat._id}/remove-member`,
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
                                className="px-3 py-2 cursor-pointer hover:bg-gray-100"
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
                  className="bg-blue-500 text-white py-2 px-3 rounded-md w-full mt-4 cursor-pointer hover:bg-blue-600 transition-colors"
                >
                  Add Members
                </button>
              )}

              {/* Leave Group Button */}
              <button
                onClick={async () => {
                  if (!window.confirm("Are you sure you want to leave this group?")) return;
                  try {
                    const res = await fetch(`http://localhost:5000/api/groups/${selectedChat._id}/leave`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
                    });
                    if (!res.ok) throw new Error("Failed to leave group");
                    setSelectedChat(null);
                  } catch (err) {
                    console.error(err);
                    alert("Failed to leave group. Try again.");
                  }
                }}
                className="mt-2 w-full py-2 px-3 bg-red-500 text-white rounded-lg border-none cursor-pointer hover:bg-red-600 transition-colors"
              >
                Leave Group
              </button>
            </div>
          </div>
        )}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-white p-5 rounded-lg w-[350px] max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
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
                      className="flex justify-between items-center my-2"
                    >
                      <span>{f.name}</span>

                      <button
                        className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors"
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
                              `http://localhost:5000/api/groups/${selectedChat._id}/add-members`,
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
                className="mt-2 bg-gray-300 py-1 px-3 rounded hover:bg-gray-400 transition-colors"
                onClick={() => setShowAddMemberModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>


      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col mb-16">
        {messages.map((msg, i) => {
          const isSender = msg.sender === user._id;
          const isImage = msg.content?.match(/\.(jpeg|jpg|png|gif)$/i);
          const isVideo = msg.content?.match(/\.(mp4|webm|ogg)$/i);
          const isAudio = msg.content?.match(/\.(mp3|wav|m4a)$/i);

          return (
            <div
              key={`${msg._id}-${i}`}
              className={`
          max-w-[70%] break-words mb-2 p-2 rounded-2xl
          ${isSender ? "self-end bg-blue-500 text-white" : "self-start bg-gray-200 text-black"}
        `}
            >
              {/* Sender Name */}
              {!isSender && msg.senderName && (
                <strong className="block mb-1">{msg.senderName}:</strong>
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
                    className="max-w-xs rounded-xl shadow-md transition-transform duration-200 hover:scale-105 hover:shadow-lg cursor-pointer max-h-64 w-auto object-cover"
                  />
                </a>
              ) : isVideo ? (
                <video
                  src={msg.content}
                  controls
                  className="max-w-xs rounded-xl"
                />
              ) : isAudio ? (
                <audio
                  src={msg.content}
                  controls
                  className="w-full mt-1"
                />
              ) : msg.type === "file" && msg.fileUrl ? (
                <a
                  href={msg.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline ${isSender ? "text-white" : "text-blue-600"}`}
                >
                  {msg.fileName || "Download File"}
                </a>
              ) : (
                <span>{msg.content}</span>
              )}

              {/* Timestamp */}
              <div
                className={`text-[0.7rem] mt-1 text-right ${isSender ? "text-white/80" : "text-gray-600"
                  }`}
              >
                {formatTimestamp(msg.createdAt)}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      {/* Input Area */}
      <div className="relative flex items-center mt-2">

        {/* 📎 Attach button */}
        <button
          onClick={() => setShowTypeMenu((prev) => !prev)}
          className="flex-none mr-2 bg-transparent border-none cursor-pointer relative"
        >
          <Paperclip size={22} color="#0b93f6" />
        </button>

        {/* 📋 Type selection popup */}
        {showTypeMenu && (
          <div className="absolute bottom-12 left-2 bg-white border border-gray-200 rounded-lg shadow-md z-10">
            {["image", "video", "audio", "file"].map((type) => (
              <div
                key={type}
                onClick={() => handleFileTypeSelect(type as "file" | "image" | "video" | "audio")}
                className="px-3 py-2 cursor-pointer border-b last:border-b-0 text-gray-800 hover:bg-gray-100"
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
          className="hidden"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) setSelectedFile(file);
          }}
        />

        {/* 🧾 File status indicator */}
        {selectedFile && (
          <span className="mr-2 text-gray-600 text-sm">
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
          className="flex-1 px-4 py-2 rounded-full border border-gray-300 outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* 🚀 Send button */}
        <button
          onClick={handleSend}
          className="flex-none ml-2 px-4 py-2 rounded-full bg-blue-500 text-white border-none cursor-pointer hover:bg-blue-600 transition-colors"
        >
          Send
        </button>
      </div>

      {/* 🧾 File status indicator */}
      {selectedFile && (
        <span
          style={{
            marginRight: "10px",
            fontSize: "0.9rem",
            color: "#666",
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
            position: "absolute" as const,
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
            animation: "fadeInOut 0.3s ease",
          }}
        >
          <span>
            Sending your {fileType || "file"} ⏳
          </span>
        </div>
      )}

      {selectedMemberProfile && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                  bg-white rounded-xl shadow-lg p-5 w-72 text-center z-50">

          {/* Profile Picture */}
          <Image
            src={
              selectedMemberProfile.profilePic
                ? `${selectedMemberProfile.profilePic}?t=${selectedMemberProfile.updatedAt || ""}`
                : "/847969.png"
            }
            alt="profile"
            className="w-24 h-24 rounded-full object-cover mx-auto mb-2"
          />

          {/* Name */}
          <h2 className="text-lg font-semibold">{selectedMemberProfile.name}</h2>

          {/* Email */}
          <p className="text-gray-600">{selectedMemberProfile.email}</p>

          {/* Close Button */}
          <button
            onClick={() => setSelectedMemberProfile(null)}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {showEditGroupModal && (
        <div
          className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
          onClick={() => setShowEditGroupModal(false)}
        >
          <div
            className="bg-white p-5 rounded-lg w-80 max-h-[80%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Edit Group</h3>

            {/* Group Name */}
            <div className="mb-4">
              <label className="block font-medium">Group Name:</label>
              <input
                type="text"
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Group Profile Picture */}
            <div className="mb-4">
              <label className="block font-medium">Group Profile Picture:</label>
              <input
                type="file"
                onChange={handleGroupPicChange}
                className="mt-1"
              />
              {editPreviewPic && (
                <Image
                  src={editPreviewPic}
                  alt="preview"
                  className="w-20 h-20 rounded-full mt-2 object-cover"
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSaveGroup}
                disabled={savingGroup}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {savingGroup ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setShowEditGroupModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 transition-colors"
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
          className="fixed inset-0 flex justify-center items-center z-50"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowProfile(false)}
        >
          <div
            className="bg-white rounded-xl shadow-lg p-5 w-72 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={
                selectedChat?.isGroupChat
                  ? `${selectedChat.profilePic || "/847969.png"}?t=${selectedChat.updatedAt || Date.now()}`
                  : `${chatUser?.profilePic || "/847969.png"}?t=${chatUser?.updatedAt || Date.now()}`
              }
              alt="profile"
              className="w-24 h-24 rounded-full object-cover mx-auto mb-3"
            />
            <h2 className="text-lg font-semibold">{chatUser?.name || "Friend"}</h2>
            <p className="text-gray-600">{chatUser?.email || "No email available"}</p>
            <button
              onClick={() => setShowProfile(false)}
              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}



    </div>
  );
}