import { useState } from "react";
import axios from "axios";

export default function AdminLogin({ setPage, setIsAdmin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    if (!username || !password) return alert("Enter username and password");

    try {
      const res = await axios.post(
        "http://localhost:5000/admin/login",
        { username, password },
        { withCredentials: true }
      );

      if (res.data.success) {
        setIsAdmin(true);
        setPage("upload"); // redirect admin to upload page
      } else {
        alert("Invalid login");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Server error");
    }
  };

  return (
    <div>
      <h2>Admin Login</h2>
      <input placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={login}>Login</button>
    </div>
  );
}