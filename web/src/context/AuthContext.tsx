"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ---------------- Type Definitions ----------------
export interface User {
  _id: string;
  name: string;
  email: string;
  profilePic?: string;
  token: string;
  friends: unknown[]; // you can replace `any` with a Friend type later
  friendRequests: unknown[];
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
}

// ---------------- Create Context ----------------
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------- AuthProvider ----------------
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("userData");
    if (storedUser) {
      const parsedUser: User = JSON.parse(storedUser);
      setUser({
        ...parsedUser,
        friends: parsedUser.friends || [],
        friendRequests: parsedUser.friendRequests || [],
      });
    }
  }, []);

  const login = (userData: User) => {
    console.log("User logged in with data:", userData);
    const normalizedUser: User = {
      ...userData,
      friends: userData.friends || [],
      friendRequests: userData.friendRequests || [],
    };
    setUser(normalizedUser);
    localStorage.setItem("userData", JSON.stringify(normalizedUser));
    localStorage.setItem("authToken", userData.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("userData");
    localStorage.removeItem("authToken");
  };

  const updateUser = (updatedUser: User) => {
    const normalizedUser: User = {
      ...updatedUser,
      friends: updatedUser.friends || [],
      friendRequests: updatedUser.friendRequests || [],
    };
    setUser(normalizedUser);
    localStorage.setItem("userData", JSON.stringify(normalizedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// ---------------- Custom Hook ----------------
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
