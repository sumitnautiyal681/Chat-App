// app/page.tsx
import React from "react";
import Login from "./login/page"; // path to your login page

export default function HomePage() {
  return <Login />; // redirect / show login as default
}
