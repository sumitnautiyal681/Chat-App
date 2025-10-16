"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, User } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth(); // AuthContext hook
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          profilePic: "https://cdn-icons-png.flaticon.com/512/847/847969.png",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Registration successful! Logging you in...");

        // Create a normalized User object for AuthContext
        const newUser: User = {
          _id: data._id,
          name: data.name,
          email: data.email,
          profilePic: data.profilePic,
          token: data.token,
          friends: data.friends || [],
          friendRequests: data.friendRequests || [],
        };

        // Log in user automatically
        login(newUser);

        // Redirect to dashboard
        router.push("/dashboard");

        // Clear form
        setName("");
        setEmail("");
        setPassword("");
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-10 rounded-xl shadow-md w-full max-w-md font-sans">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Register</h2>

        <div className="mb-5 flex flex-col">
          <label className="mb-1 font-semibold text-gray-600">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:border-blue-500 focus:shadow-md"
          />
        </div>

        <div className="mb-5 flex flex-col">
          <label className="mb-1 font-semibold text-gray-600">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:border-blue-500 focus:shadow-md"
          />
        </div>

        <div className="mb-5 flex flex-col">
          <label className="mb-1 font-semibold text-gray-600">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:border-blue-500 focus:shadow-md"
          />
        </div>

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-3 font-semibold rounded-md hover:bg-blue-600"
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </div>
    </div>
  );
}
