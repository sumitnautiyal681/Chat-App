"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const { user, login, logout } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const router = useRouter();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) router.push("/dashboard");
  }, [user, router]);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const normalizedUser = {
          _id: data._id,
          name: data.name,
          email: data.email,
          profilePic: data.profilePic,
          token: data.token,
          friends: data.friends || [],
          friendRequests: data.friendRequests || [],
        };

        login(normalizedUser);

        setEmail("");
        setPassword("");
        router.push("/dashboard");
      } else {
        alert(data.message || "Login failed");
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
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login</h2>
        {user ? (
          <div className="text-center">
            <p className="text-center mb-5 text-lg text-gray-800">Welcome, {user.name}</p>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              onClick={() => {
                logout();
                localStorage.removeItem("authToken");
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-col">
              <label className="mb-1 font-semibold text-gray-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:border-blue-500 focus:shadow-md" /> 
            </div>

            <div className="mb-4">
              <label className="block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-3 font-semibold rounded-md hover:bg-blue-600">
              {loading ? "Logging in..." : "Login"}
            </button>

            <p className="mt-4 text-center">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-blue-500 hover:underline">
                Register
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
