"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import './login.css';

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
    console.log("🔐 Sending login data:", { email, password });
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
   <div className="login-container">
        <h2>Login</h2>
        {user ? ( 
          <>
            <p className="welcome-message">Welcome, {user.name}</p>
            <button
              onClick={() => {
                logout();
                localStorage.removeItem("authToken");
              }}
            >
              Logout
            </button>
            </> 
        ) : (
          <>
            <div  className="input-group">
              <label >Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
               />
            </div>

             <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
             >
              {loading ? "Logging in..." : "Login"}
            </button>

            <p  style={{ marginTop: 15, textAlign: "center" }}>
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-blue-500 hover:underline">
                Register
              </Link>
            </p>
          </>
        )}
    </div>
  );
}
