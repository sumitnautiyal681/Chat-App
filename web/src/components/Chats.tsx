import { useEffect, useState } from "react";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

interface User {
  _id: string;
  name: string;
  profilePic: string;
  chatId?: string;
  updatedAt?: string;
}

interface Group {
  _id: string;
  name: string;
  members: User[];
  updatedAt?: string;
}

interface Message {
  _id: string;
  chatId: string;
  sender: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface ChatsProps {
  setSelectedChat: (chat: any) => void;
  newGroup?: Group | null;
  onGroupUpdated?: (group: Group) => void;
}

export default function Chats({ setSelectedChat, newGroup, onGroupUpdated }: ChatsProps) {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [friends, setFriends] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [latestMessages, setLatestMessages] = useState<Record<string, Message>>({});
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "chats" | "groups">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch friends and groups
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const friendsRes = await fetch("http://localhost:5000/api/users/friends", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const friendsData: User[] = await friendsRes.json();
        setFriends(friendsData);

        const groupsRes = await fetch("http://localhost:5000/api/groups/user-groups", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const groupsData: Group[] = await groupsRes.json();
        setGroups(groupsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Handle newly created group
  useEffect(() => {
    if (!newGroup) return;
    setGroups(prev => [newGroup, ...prev]);
  }, [newGroup]);

  // Online users
  useEffect(() => {
    if (!socket) return;
    socket.emit("getOnlineUsers");

    socket.on("onlineUsers", (users: string[]) => setOnlineUsers(users));
    socket.on("userOnline", (id: string) => setOnlineUsers(prev => [...new Set([...prev, id])]));
    socket.on("userOffline", (id: string) => setOnlineUsers(prev => prev.filter(uid => uid !== id)));

    return () => {
      socket.off("onlineUsers");
      socket.off("userOnline");
      socket.off("userOffline");
    };
  }, [socket]);

  const isOnline = (id: string) => onlineUsers.includes(id);

  if (loading) return <p className="p-4">Loading chats...</p>;

  const displayedList = [
    ...friends.map(f => ({ ...f, type: "friend" })),
    ...groups.map(g => ({ ...g, type: "group" })),
  ].filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col h-full p-2">
      {/* Header + Search */}
      <div className="sticky top-0 bg-white z-10 pb-2">
        <h3 className="text-2xl font-semibold mt-2">Chats</h3>

        <input
          type="text"
          placeholder="Search chats or groups..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 mt-2 mb-3 border rounded-md outline-none focus:border-blue-500"
        />

        <div className="flex gap-2 mb-2">
          {["all", "chats", "groups"].map(type => (
            <button
              key={type}
              onClick={() => setFilter(type as "all" | "chats" | "groups")}
              className={`px-3 py-1 rounded-full border text-sm capitalize ${
                filter === type ? "border-black bg-blue-100 font-semibold" : "border-gray-300"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Chat list */}
      <ul className="overflow-y-auto flex-1">
        {displayedList.length ? (
          displayedList.map(item => (
            <li
              key={item._id}
              onClick={() => setSelectedChat(item)}
              className="flex items-center gap-2 p-2 border-b border-gray-200 cursor-pointer hover:bg-gray-100"
            >
              <div className="relative">
                <Image src={item.profilePic} alt={item.name} className="w-10 h-10 rounded-full object-cover" />
                {item.type === "friend" && (
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${
                      isOnline(item._id) ? "bg-green-500" : "bg-gray-300"
                    }`}
                  ></span>
                )}
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="font-medium text-black truncate">{item.name}</span>
                {latestMessages[item._id] ? (
                  <span className="text-gray-500 text-sm truncate">
                    {latestMessages[item._id].sender === user?._id ? "You: " : `${latestMessages[item._id].senderName}: `}
                    {latestMessages[item._id].content.slice(0, 40)}
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm">No messages yet</span>
                )}
              </div>
            </li>
          ))
        ) : (
          <p className="text-gray-500 p-2">No chats found.</p>
        )}
      </ul>
    </div>
  );
}
