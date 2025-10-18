"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, User } from "@/context/AuthContext";
import '../login/login.css';

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/register`, {
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
     <div className="login-container">
      
        <h2 >Register</h2>

          <div className="input-group">
           <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          
          />
        </div>

          <div className="input-group">
         <label>Email</label>
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
          onClick={handleRegister}
          disabled={loading}
          
        >
          {loading ? "Registering..." : "Register"}
        </button>
      
    </div>
  );
}
