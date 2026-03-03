import { useState } from "react";
import api from "./api";

export default function AdminLogin({ setPage, setIsAdmin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  const validate = () => {
    const newErrors = {};
    if (!username.trim()) newErrors.username = "Username is required";
    if (!password.trim()) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const login = async () => {
    setServerError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post("/admin/login", { username, password });
      if (res.data.success) {
        setIsAdmin(true);
        setPage("upload");
      } else {
        setServerError(res.data.error || "Invalid login");
      }
    } catch (err) {
      console.error(err);
      setServerError("Server error or connection failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full mb-1 px-4 py-3 rounded-none bg-white border-0 text-[#0b2545] placeholder-[#0b2545]/40 font-medium focus:outline-none focus:ring-2 transition
    ${errors[field] ? "ring-2 ring-amber-400" : "focus:ring-white"}`;

  const errorMsg = (field) =>
    errors[field] ? (
      <p className="text-amber-300 text-xs mb-3 pl-1">⚠ {errors[field]}</p>
    ) : (
      <div className="mb-3" />
    );

  return (
     <div className="w-full max-w-sm px-4 py-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-wide">Admin Login</h2>
      <p className="text-center text-white/50 text-sm mb-8 tracking-widest uppercase">Phrankstar School</p>

      {serverError && (
        <div className="bg-amber-400/20 border border-amber-400 text-amber-300 text-sm px-4 py-3 mb-4 text-center">
          ⚠ {serverError}
        </div>
      )}

      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => { setUsername(e.target.value); setErrors((p) => ({ ...p, username: "" })); }}
        className={inputClass("username")}
      />
      {errorMsg("username")}

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
        className={inputClass("password")}
      />
      {errorMsg("password")}

      <button
        onClick={login}
        disabled={loading}
        className="w-full mt-4 bg-white text-[#0b2545] py-3 font-bold text-base sm:text-lg hover:bg-white/90 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}
