"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  ChangeEvent,
  KeyboardEvent,
} from "react";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import { Paperclip } from "lucide-react";
import GroupInfoModal from "./GroupInfoModal";
import AddMemberModal from "./AddMemberModal";
import EditGroupModal from "./EditGroupModal";
import ProfileModal from "./ProfileModal";
import Image from "next/image";

export interface User {
  _id: string;
  name: string;
  email?: string;
  profilePic?: string;
  token?: string;
  updatedAt?: string;
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

export interface Group {
  _id: string;
  name: string;
  profilePic?: string;
  isGroupChat?: boolean;
  users: User[];
  members: User[];
  admins?: User[];
  admin?: User;
}

interface RightPanelProps {
  selectedChat: Group | null;
  setSelectedChat: React.Dispatch<React.SetStateAction<Group | null>>;
  onGroupUpdated?: (group: Group) => void;
}

export default function RightPanel({
  selectedChat,
  setSelectedChat,
  onGroupUpdated,
}: RightPanelProps) {
  const { socket } = useSocket();
  const { user } = useAuth() as { user: User | null };

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sendingFile, setSendingFile] = useState<string | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch chat messages
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

  // Realtime Socket Listener
  useEffect(() => {
    if (!socket || !user) return;
    const handleReceiveMessage = (msg: Message) => {
      if (msg.chatId === selectedChat?._id)
        setMessages((prev) => [...prev, msg]);
    };
    socket.on("receive_message", handleReceiveMessage);
    return () => socket.off("receive_message", handleReceiveMessage);
  }, [socket, selectedChat, user]);

  // Send message handler
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

  const formatTime = (t?: string) =>
    t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

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

  const chatUser = !selectedChat.isGroupChat
    ? selectedChat.users.find((u) => u._id !== user._id)
    : null;

  return (
    <div className="flex flex-col h-full bg-gray-100 rounded-2xl p-2">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-t-2xl px-4 py-2 border-b">
        <div className="flex items-center gap-3">
          <Image
            src={
              selectedChat.isGroupChat
                ? selectedChat.profilePic || "/847969.png"
                : chatUser?.profilePic || "/847969.png"
            }
            alt="profile"
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <p className="font-medium">{chatUser?.name || selectedChat.name}</p>
            {selectedChat.isGroupChat && (
              <p className="text-xs text-gray-500">
                {selectedChat.members.length} members
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() =>
            selectedChat.isGroupChat
              ? setShowGroupInfo(true)
              : setShowProfile(true)
          }
          className="text-xl text-gray-600"
        >
          ⋮
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {messages.map((msg) => {
          const isSender = msg.sender === user._id;
          return (
            <div
              key={msg._id}
              className={`max-w-[70%] p-2 rounded-2xl ${
                isSender
                  ? "ml-auto bg-blue-500 text-white"
                  : "mr-auto bg-gray-200 text-black"
              }`}
            >
              {!isSender && msg.senderName && (
                <strong className="block text-xs">{msg.senderName}</strong>
              )}
              <p className="text-sm break-words">{msg.content}</p>
              <span className="block text-[10px] text-right opacity-70">
                {formatTime(msg.createdAt)}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center bg-white rounded-full p-2 mt-1">
        <button
          onClick={() => setShowTypeMenu((p) => !p)}
          className="mr-2 text-blue-500"
        >
          <Paperclip size={20} />
        </button>

        <input
          type="text"
          value={newMessage}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setNewMessage(e.target.value)
          }
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
            e.key === "Enter" && handleSend()
          }
          placeholder="Type a message..."
          className="flex-1 outline-none px-2 text-sm"
        />
        <button
          onClick={handleSend}
          className="ml-2 bg-blue-500 text-white px-4 py-1 rounded-full"
        >
          Send
        </button>
      </div>

      {/* Modals */}
      {showGroupInfo && (
        <GroupInfoModal
          selectedChat={selectedChat}
          onClose={() => setShowGroupInfo(false)}
          onAddMember={() => setShowAddMemberModal(true)}
          onEditGroup={() => setShowEditGroupModal(true)}
        />
      )}
      {showAddMemberModal && (
        <AddMemberModal
          groupId={selectedChat._id}
          onClose={() => setShowAddMemberModal(false)}
          onUpdated={onGroupUpdated}
        />
      )}
      {showEditGroupModal && (
        <EditGroupModal
          selectedChat={selectedChat}
          onClose={() => setShowEditGroupModal(false)}
          onUpdated={onGroupUpdated}
        />
      )}
      {showProfile && (
        <ProfileModal user={chatUser!} onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
