import { useEffect, useState, useRef } from "react";
import api from "./api";

export default function Leaderboard({ setPage }) {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const printRef = useRef();

  useEffect(() => {
    api.get("/questions/meta")
      .then((res) => {
        setSubjects(res.data.subjects || []);
        setClasses(res.data.classes || []);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    const url = selectedClass
      ? `/leaderboard/${selectedSubject}?class=${selectedClass}`
      : `/leaderboard/${selectedSubject}`;
    api.get(url)
      .then((res) => { setData(res.data); setCurrentPage(1); setSearch(""); })
      .catch((err) => console.error(err));
  }, [selectedSubject, selectedClass]);

  const filtered = data.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.year?.toString().includes(search) ||
    r.class?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = pageSize === filtered.length ? 1 : Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

  const getRank = (i) => {
    if (i === 0) return "1st 🥇";
    if (i === 1) return "2nd 🥈";
    if (i === 2) return "3rd 🥉";
    return `${i + 1}th`;
  };

  const getRankDisplay = (i) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return i + 1;
  };

  const rowClass = (i) => {
    if (i === 0) return "bg-white text-[#0b2545] font-bold";
    if (i === 1) return "bg-white/20 text-white font-semibold";
    if (i === 2) return "bg-white/10 text-white font-semibold";
    return "text-white/70";
  };

  const exportCSV = () => {
    if (!data.length) return;
    const headers = ["Rank", "Name", "Score", "Class", "Year", "Subject"];
    const rows = filtered.map((r, i) => [i + 1, r.name, r.score, r.class, r.year, selectedSubject]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leaderboard_${selectedSubject}${selectedClass ? "_" + selectedClass : ""}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printResults = () => {
    const printContent = `
      <html>
        <head>
          <title>Leaderboard - ${selectedSubject}${selectedClass ? " - " + selectedClass : ""}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #0b2545; }
            h1 { text-align: center; font-size: 24px; margin-bottom: 4px; }
            p { text-align: center; color: #999; font-size: 12px; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 2px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background: #0b2545; color: white; padding: 10px 14px; text-align: left; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; }
            td { padding: 10px 14px; border-bottom: 1px solid #e5e7eb; }
            tr:nth-child(1) td { background: #fef9c3; font-weight: bold; }
            tr:nth-child(2) td { background: #f3f4f6; font-weight: 600; }
            tr:nth-child(3) td { background: #fdf2f8; font-weight: 600; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; }
          </style>
        </head>
        <body>
          <h1>Phrankstar School</h1>
          <p>${selectedSubject}${selectedClass ? " — " + selectedClass : ""} Leaderboard — Printed on ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr><th>Rank</th><th>Name</th><th>Score</th><th>Class</th><th>Year</th></tr>
            </thead>
            <tbody>
              ${filtered.map((r, i) => `
                <tr>
                  <td>${getRank(i)}</td>
                  <td>${r.name}</td>
                  <td>${r.score}</td>
                  <td>${r.class}</td>
                  <td>${r.year}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="footer">Total students: ${filtered.length} &nbsp;|&nbsp; Subject: ${selectedSubject}${selectedClass ? " &nbsp;|&nbsp; Class: " + selectedClass : ""}</div>
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="w-full h-full" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="w-full max-w-3xl mx-auto px-4 py-8">

        <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-wide">Leaderboard</h2>
        <p className="text-center text-white/50 text-sm mb-8 tracking-widest uppercase">Phrankstar School</p>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select
            value={selectedSubject}
            onChange={(e) => { setSelectedSubject(e.target.value); setSelectedClass(""); setData([]); }}
            className="flex-1 min-w-0 px-4 py-3 rounded-none bg-white border-0 text-[#0b2545] font-medium focus:outline-none focus:ring-2 focus:ring-white transition"
          >
            <option value="">Select Subject</option>
            {subjects.map((s, i) => <option key={i} value={s}>{s}</option>)}
          </select>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={!selectedSubject}
            className="flex-1 min-w-0 px-4 py-3 rounded-none bg-white border-0 text-[#0b2545] font-medium focus:outline-none focus:ring-2 focus:ring-white transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">All Classes</option>
            {classes.map((c, i) => <option key={i} value={c}>{c}</option>)}
          </select>

          <button
            onClick={() => setPage("upload")}
            className="px-5 py-3 border-2 border-white/40 text-white text-sm font-semibold hover:border-white transition-all whitespace-nowrap"
          >
            ← Back
          </button>
        </div>

        {/* Active filter badge */}
        {selectedSubject && selectedClass && (
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-white/10 border border-white/20 text-white text-xs px-3 py-1 font-semibold">
              {selectedClass} · {selectedSubject}
            </span>
            <button onClick={() => setSelectedClass("")} className="text-white/40 hover:text-white text-xs underline transition">
              Clear class filter
            </button>
          </div>
        )}

        {/* Search + Controls */}
        {data.length > 0 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <div className="flex-1 min-w-0 relative">
              <input
                type="text"
                placeholder="Search by name, class or year..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 rounded-none bg-white border-0 text-[#0b2545] placeholder-[#0b2545]/40 font-medium focus:outline-none focus:ring-2 focus:ring-white transition"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0b2545]/40 hover:text-[#0b2545] text-lg font-bold">✕</button>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white/50 text-xs whitespace-nowrap">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-3 py-3 rounded-none bg-white border-0 text-[#0b2545] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-white transition"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={filtered.length || 100}>All</option>
              </select>
            </div>
            <button onClick={exportCSV} className="shrink-0 px-4 py-3 bg-white text-[#0b2545] text-sm font-bold hover:bg-white/90 transition-all active:scale-95 whitespace-nowrap">↓ CSV</button>
            <button onClick={printResults} className="shrink-0 px-4 py-3 border-2 border-white/40 text-white text-sm font-semibold hover:border-white transition-all whitespace-nowrap">🖨 Print</button>
          </div>
        )}

        {!selectedSubject && (
          <p className="text-center text-white/30 text-sm py-12">Select a subject to view the leaderboard</p>
        )}
        {selectedSubject && data.length === 0 && (
          <p className="text-center text-white/40 text-sm py-12">
            No results yet for <span className="text-white font-semibold">{selectedSubject}{selectedClass ? ` — ${selectedClass}` : ""}</span>
          </p>
        )}
        {data.length > 0 && filtered.length === 0 && (
          <p className="text-center text-amber-300 text-sm py-12">
            ⚠ No student found matching "<span className="font-semibold">{search}</span>"
          </p>
        )}

        {paginated.length > 0 && (
          <>
            <div className="w-full overflow-x-auto" ref={printRef}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/10 text-white/60 uppercase tracking-widest text-xs">
                    <th className="px-4 py-3 text-left font-semibold">Rank</th>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Score</th>
                    {!selectedClass && <th className="px-4 py-3 text-left font-semibold">Class</th>}
                    <th className="px-4 py-3 text-left font-semibold">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r, i) => {
                    const globalIndex = filtered.indexOf(r);
                    return (
                      <tr key={i} className={`border-b border-white/10 transition-all ${rowClass(globalIndex)}`}>
                        <td className="px-4 py-3">{getRankDisplay(globalIndex)}</td>
                        <td className="px-4 py-3">{r.name}</td>
                        <td className="px-4 py-3">{r.score}</td>
                        {!selectedClass && <td className="px-4 py-3">{r.class}</td>}
                        <td className="px-4 py-3">{r.year}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border-2 border-white/30 text-white text-sm font-semibold hover:border-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >← Prev</button>

                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 text-xs font-bold transition-all
                        ${currentPage === p ? "bg-white text-[#0b2545]" : "bg-transparent text-white/50 border border-white/20 hover:border-white hover:text-white"}`}
                    >{p}</button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border-2 border-white/30 text-white text-sm font-semibold hover:border-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >Next →</button>
              </div>
            )}

            <p className="text-white/30 text-xs text-center mt-4">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} student{filtered.length !== 1 ? "s" : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
