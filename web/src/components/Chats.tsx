"use client";

import React, { useEffect, useState } from "react";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import { Socket } from "socket.io-client";
import Image from "next/image";
import { Chat, Group } from "../types/chat"; // ✅ Single source of truth

// --- Type Definitions ---

interface BaseUser {
  _id: string;
  name: string;
  profilePic?: string;
}

interface AuthUser extends BaseUser {
  token: string;
}

interface Friend extends BaseUser {
  chatId?: string;
  lastMessageAt?: string;
  latestMessage?: Message;
  updatedAt?: string;
}

interface Message {
  _id: string;
  chatId: string;
  sender: string;
  senderName?: string;
  content: string;
  createdAt: string;
  timestamp?: string;
}


interface ChatsProps {
  setSelectedChat: React.Dispatch<React.SetStateAction<Chat | Group | null>>;
  newGroup: Group | null;
  onGroupUpdated?: (updatedGroup: Group) => void;
}

type DisplayedItem =
  | (Friend & { type: "friend"; lastActivity: string | number })
  | (Group & { type: "group"; lastActivity: string | number });

declare global {
  interface Window {
    currentChatId?: string;
  }
}

// --- Component ---
export default function Chats({
  setSelectedChat,
  newGroup,
  onGroupUpdated,
}: ChatsProps) {
  const { socket }: { socket: Socket | null } = useSocket();
  const { user }: { user: AuthUser | null } = useAuth();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "chats" | "groups">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [latestMessages, setLatestMessages] = useState<Record<string, Message>>(
    {}
  );


  // --- Fetch friends & groups ---
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [friendsRes, groupsRes] = await Promise.all([
          fetch("http://localhost:5000/api/users/friends", {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          fetch("http://localhost:5000/api/groups/user-groups", {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
        ]);

        const friendsData = (await friendsRes.json()) as Friend[];
        const groupsData = (await groupsRes.json()) as Group[];
        setFriends(friendsData);
        setGroups(groupsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // --- Attach chatIds to friends ---
  useEffect(() => {
    if (!user) return;

    const attachChatIds = async () => {
      if (friends.length === 0 || friends.every((f) => f.chatId)) return;

      const updatedFriends = await Promise.all(
        friends.map(async (friend) => {
          if (friend.chatId) return friend;

          const res = await fetch("http://localhost:5000/api/chats/one-to-one", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
            body: JSON.stringify({ userId1: user._id, userId2: friend._id }),
          });

          const chat = (await res.json()) as Chat;
          return { ...friend, chatId: chat._id };
        })
      );

      setFriends(updatedFriends);
    };

    attachChatIds();
  }, [friends, user]);

  // --- Fetch latest messages ---
  useEffect(() => {

    const fetchLatestMessages = async () => {
      try {
        const chatIds = [
          ...friends.map((f) => f.chatId || f._id),
          ...groups.map((g) => g._id),
        ];

        const newLatestMessages: Record<string, Message> = {};

        await Promise.all(
          chatIds.map(async (id) => {
            const res = await fetch(`http://localhost:5000/api/messages/${id}`, {
              headers: { Authorization: `Bearer ${user?.token}` },
            });

            if (res.ok) {
              const msgs = await res.json();
              if (msgs.length > 0) {
                newLatestMessages[id] = msgs[msgs.length - 1];
              }
            }
          })
        );

        setLatestMessages(newLatestMessages);
      } catch (err) {
        console.error("Error fetching latest messages:", err);
      }
    };

    fetchLatestMessages();
  }, [friends, groups, user]);

  // --- Handle new group creation ---
  useEffect(() => {
    if (!newGroup || !socket || !user) return;

    setGroups((prev) =>
      prev.find((g) => g._id === newGroup._id) ? prev : [newGroup, ...prev]
    );

    (newGroup.members as BaseUser[]).forEach((member: BaseUser) => {
      if (member._id !== user._id) {
        socket.emit("inform_new_group", { newGroup, targetUserId: member._id });
      }
    });

  }, [newGroup, socket, user]);

  // --- Listen for group updates ---
  useEffect(() => {
    if (!socket) return;

    const handleGroupUpdated = (updatedGroup: Group) => {
      console.log("🔁 group_updated received:", updatedGroup);

      // Update groups list
      setGroups((prev) =>
        updatedGroup.left
          ? prev.filter((g) => g._id !== updatedGroup._id)
          : prev.some((g) => g._id === updatedGroup._id)
            ? prev.map((g) =>
              g._id === updatedGroup._id ? updatedGroup : g
            )
            : [updatedGroup, ...prev]
      );

      // Update selectedChat if needed
      setSelectedChat?.((prev) =>
        prev && prev._id === updatedGroup._id
          ? { ...updatedGroup, isGroupChat: true }
          : prev
      );

      // Notify parent (Dashboard)
      onGroupUpdated?.(updatedGroup);
    };



    socket.on("group_updated", handleGroupUpdated);
    return () => {
      socket.off("group_updated", handleGroupUpdated);
    };
  }, [socket, setSelectedChat, onGroupUpdated]);

  // --- Listen for real-time message updates ---
  useEffect(() => {
    if (!socket || !user) return;

    const handleReceiveMessage = async (message: Message) => {
      try {
        console.log("socket receive_message:", message);
        const chatId = message.chatId;
        const time = message.createdAt || message.timestamp || new Date().toISOString();

        // ✅ Update latestMessages instantly (real-time preview)
        setLatestMessages(prev => ({
          ...prev,
          [chatId]: message
        }));

        // 🔸 Fetch minimal chat metadata to know if it's group or one-to-one
        const res = await fetch(`http://localhost:5000/api/chats/${chatId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        if (!res.ok) {
          console.warn("Couldn't fetch chat info for chatId", chatId);
          return;
        }

        const chat = await res.json();

        if (chat.isGroupChat) {
          // 🟢 Update groups list — move group up if exists or add if new
          setGroups(prev => {
            const exists = prev.some(g => g._id === chat._id);
            const updated = exists
              ? prev.map(g => (g._id === chat._id ? { ...g, updatedAt: time } : g))
              : [{ ...chat, updatedAt: time }, ...prev];

            // Sort by updatedAt to bring the active chat to top
            return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          });
        } else {
          // 🟡 One-to-one chat
          const otherUser = chat.users?.find((u: BaseUser) => u._id !== user._id);
          if (otherUser) {
            setFriends(prev => {
              const found = prev.find(f => f._id === otherUser._id);
              let updated;

              if (found) {
                updated = prev.map(f =>
                  f._id === otherUser._id
                    ? {
                      ...f,
                      lastMessageAt: time,
                      latestMessage: message,
                      chatId: chat._id,
                    }
                    : f
                );
              } else {
                // If not in friend list, add them
                const newEntry = {
                  _id: otherUser._id,
                  name: otherUser.name,
                  profilePic: otherUser.profilePic,
                  lastMessageAt: time,
                  latestMessage: message,
                  chatId: chat._id,
                  type: "friend",
                };
                updated = [newEntry, ...prev];
              }

              // Sort by latest activity
              return updated.sort((a, b) =>
                new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
              );
            });
          } else {
            console.warn("⚠️ Could not find other user for chat", chat);
          }
        }
      } catch (err) {
        console.error("❌ Error handling receive_message in Chats:", err);
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket, user]);


  // --- Online Users ---
  useEffect(() => {
    if (!socket) return;

    socket.emit("getOnlineUsers");
    const handleOnlineUsers = (users: string[]) => setOnlineUsers(users);
    const handleUserOnline = (id: string) =>
      setOnlineUsers((prev) => [...new Set([...prev, id])]);
    const handleUserOffline = (id: string) =>
      setOnlineUsers((prev) => prev.filter((uid) => uid !== id));

    socket.on("onlineUsers", handleOnlineUsers);
    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);

    return () => {
      socket.off("onlineUsers", handleOnlineUsers);
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
    };
  }, [socket]);

  // --- Handle chat click ---
  const handleClick = async (item: DisplayedItem) => {
    if (!user) return;

    if (item.type === "group") {
      setSelectedChat({ ...item, isGroupChat: true });
    } else {
      try {
        const res = await fetch("http://localhost:5000/api/chats/one-to-one", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ userId1: user._id, userId2: item._id }),
        });
        if (!res.ok) throw new Error("Failed to fetch chat");
        const chat = (await res.json()) as Chat;
        setSelectedChat(chat);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- Filtered Display List ---
  const displayedList: DisplayedItem[] = (
    filter === "all"
      ? [
        ...friends.map((f) => ({
          ...f,
          type: "friend" as const,
          lastActivity:
            latestMessages[f.chatId!]?.createdAt || f.updatedAt || 0,
        })),
        ...groups.map((g) => ({
          ...g,
          type: "group" as const,
          lastActivity: latestMessages[g._id]?.createdAt || g.updatedAt || 0,
        })),
      ]
      : filter === "chats"
        ? friends.map((f) => ({
          ...f,
          type: "friend" as const,
          lastActivity:
            latestMessages[f.chatId!]?.createdAt || f.updatedAt || 0,
        }))
        : groups.map((g) => ({
          ...g,
          type: "group" as const,
          lastActivity: latestMessages[g._id]?.createdAt || g.updatedAt || 0,
        }))
  )
    .filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort(
      (a, b) =>
        new Date(b.lastActivity as string).getTime() -
        new Date(a.lastActivity as string).getTime()
    );

  if (loading) return <p>Loading chats...</p>;

  return (
    <div
      style={{
        padding: "10px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >

      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "white",
          zIndex: 10,
          padding: "10px 16px",
          display: "flex",
          flexDirection: "column",

          gap: "10px",
        }}
      >
        {/* Top row: title + icons */}
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
          <h3 style={{ fontSize: "27px", margin: 0, }}>Chats</h3>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>

            {/* Hamburger (only mobile) */}
            <button
              className="hamburger-btn"
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: "24px",
                display: "none", // hidden by default, show on mobile
                color: "black",
              }}
              onClick={() => {
                document.querySelector(".left-panel")?.classList.toggle("show");
              }}
            >
              ☰
            </button>
          </div>
        </div>

        {/* Search input */}
        <input
          type="text"
          placeholder="Search chats or groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            fontSize: "14px",
          }}
        />

        {/* Filter buttons */}
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          {(["all", "chats", "groups"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                border: filter === type ? "2px solid black" : "1px solid #ccc",
                background: filter === type ? "#e8f0ff" : "#fff",
                fontWeight: filter === type ? "600" : "400",
                cursor: "pointer",
                textTransform: "capitalize",
                color: "black",
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>



      {/* Chat List */}
      <div
        style={{
          overflowY: "auto",
          flex: 1,
          scrollbarWidth: "thin", // Firefox
          scrollbarColor: "rgba(0,0,0,0) rgba(0,0,0,0)",
        }}
      >
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {displayedList.length > 0 ? (
            displayedList.map((item) => {
              const lastMsg =
                latestMessages[item.type === "friend" ? item.chatId! : item._id];
              const isFromYou = lastMsg?.sender === user?._id;
              const senderLabel = isFromYou ? "You" : lastMsg?.senderName;

              return (
                <li
                  key={item._id}
                  onClick={() => handleClick(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px",
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                >
                  <div style={{ position: "relative" }}>
                    <Image
                      src={item.profilePic || "/globe.svg"}
                      alt={item.name}
                      width={40}
                      height={40}
                      style={{ borderRadius: "50%", objectFit: "cover" }}
                    />
                    {item.type === "friend" && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: "2px",
                          right: "2px",
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          backgroundColor: onlineUsers.includes(item._id)
                            ? "#00c851"
                            : "#ccc",
                          border: "2px solid white",
                        }}
                      />
                    )}
                  </div>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 500, color: "#000" }}>
                      {item.name}
                    </span>

                    {lastMsg ? (
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "#555",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginTop: "2px",
                        }}
                      >
                        {senderLabel ? `${senderLabel}: ` : ""}
                        {lastMsg.content.length > 40
                          ? lastMsg.content.slice(0, 40) + "…"
                          : lastMsg.content}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.85rem", color: "#aaa" }}>
                        No messages yet
                      </span>
                    )}
                  </div>
                </li>
              );
            })
          ) : (
            <p style={{ textAlign: "center", color: "#888", marginTop: "20px" }}>No chats found.</p>
          )}
        </ul>
      </div>

    </div>
  );
}
