import { useState } from "react";
import StudentLogin from "./StudentLogin";
import TestPage from "./TestPage";
import AdminLogin from "./AdminLogin";
import AdminUpload from "./AdminUpload";
import Leaderboard from "./Leaderboard";
import ParticleBackground from "./ParticleBackground";

function App() {
  const [page, setPage] = useState("student");
  const [studentId, setStudentId] = useState(null);
  const [selection, setSelection] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const isLoginPage = page === "student" || page === "admin";
  const isTestPage = page === "test";
  const isAdminPage = page === "upload" || page === "leaderboard";

  const renderPage = () => {
    switch (page) {
      case "student":
        return (
          <StudentLogin
            setPage={setPage}
            setSelection={setSelection}
            setStudentId={setStudentId}
          />
        );
      case "test":
        return (
          <TestPage
            selection={selection}
            studentId={studentId}
            setPage={setPage}
          />
        );
      case "admin":
        return <AdminLogin setPage={setPage} setIsAdmin={setIsAdmin} />;
      case "upload":
        return isAdmin ? <AdminUpload /> : <p className="text-white p-8">Unauthorized</p>;
      case "leaderboard":
        return isAdmin ? <Leaderboard setPage={setPage} /> : <p className="text-white p-8">Unauthorized</p>;
      default:
        return <p className="text-white p-8">Unknown page</p>;
    }
  };

  const navBtn = (label, onClick, active = false) => (
    <button
      onClick={onClick}
      className={`px-2 py-1 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 border-2 whitespace-nowrap
        ${active
          ? "bg-white text-[#0b2545] border-white"
          : "bg-transparent text-white border-white/40 hover:border-white hover:text-white"
        }`}
    >
      {label}
    </button>
  );

  return (
    <div className="h-screen w-screen bg-[#0b2545] flex flex-col overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {isLoginPage && <ParticleBackground />}

      <div className="relative z-10 flex flex-col h-full w-full">
        {/* Nav */}
        <nav className="w-full px-3 sm:px-8 py-3 flex items-center gap-1 sm:gap-3 shrink-0">
          <span className="text-white font-bold text-sm sm:text-xl tracking-wide mr-auto truncate">Phrankstar School</span>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {navBtn("Student", () => setPage("student"), page === "student")}
            {!isAdmin && navBtn("Admin", () => setPage("admin"), page === "admin")}
            {isAdmin && navBtn("Leaderboard", () => setPage("leaderboard"), page === "leaderboard")}
            {isAdmin && navBtn("Logout", () => { setIsAdmin(false); setPage("admin"); })}
          </div>
        </nav>

        {isTestPage && (
          <div className="flex-1 min-h-0 px-3 sm:px-10 md:px-20 lg:px-48 xl:px-64 py-3 sm:py-5">
            {renderPage()}
          </div>
        )}

        {isAdminPage && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {renderPage()}
          </div>
        )}

        {!isTestPage && !isAdminPage && (
          <div className="flex-1 min-h-0 flex items-center justify-center px-4">
            {renderPage()}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
