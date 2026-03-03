import { useEffect, useState } from "react";
import api from "./api";

export default function StudentLogin({ setPage, setSelection, setStudentId }) {
  const [name, setName] = useState("");
  const [regno, setRegno] = useState("");
  const [year, setYear] = useState("");
  const [subject, setSubject] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [mode, setMode] = useState("exam");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [checking, setChecking] = useState(false);

  const [years, setYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    api.get("/questions/meta")
      .then((res) => {
        setYears(res.data.years || []);
        setSubjects(res.data.subjects || []);
        setClasses(res.data.classes || []);
      })
      .catch((err) => console.error(err));
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Full name is required";
    if (!regno.trim()) newErrors.regno = "Reg No is required";
    if (!studentClass) newErrors.studentClass = "Please select a class";
    if (!year) newErrors.year = "Please select a year";
    if (!subject) newErrors.subject = "Please select a subject";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const login = async () => {
    setServerError("");
    if (!validate()) return;

    setChecking(true);
    try {
      const check = await api.get(
        `/questions/check?year=${year}&subject=${subject}&mode=${mode}&class=${studentClass}`
      );
      if (!check.data.exists) {
        setServerError(`⚠ No questions available for ${subject} — ${studentClass} (${year}). Please select a different combination.`);
        setChecking(false);
        return;
      }
    } catch (err) {
      setServerError("Could not verify questions. Please try again.");
      setChecking(false);
      return;
    }

    try {
      const res = await api.post("/student/login", {
        name: name.trim(),
        regno: regno.trim(),
        subject,
        year,
        mode,
        class: studentClass
      });

      if (res.data.success) {
        setStudentId(res.data.student_id);
        setSelection({ year, subject, mode, class: studentClass });
        setPage("test");
      } else {
        setServerError(res.data.error || "Login failed");
      }
    } catch (err) {
      console.error(err);
      setServerError(err.response?.data?.error || "Server error. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const inputClass = (field) =>
    `w-full mb-1 px-4 py-3 rounded-none bg-white border-0 text-[#0b2545] placeholder-[#0b2545]/40 font-medium focus:outline-none focus:ring-2 transition
    ${errors[field] ? "ring-2 ring-amber-400" : "focus:ring-white"}`;

  const selectClass = (field) =>
    `w-full px-4 py-3 rounded-none bg-white border-0 text-[#0b2545] font-medium focus:outline-none focus:ring-2 transition
    ${errors[field] ? "ring-2 ring-amber-400" : "focus:ring-white"}`;

  const errorMsg = (field) =>
    errors[field] ? (
      <p className="text-amber-300 text-xs mb-3 pl-1">⚠ {errors[field]}</p>
    ) : (
      <div className="mb-3" />
    );

  return (
    <div className="w-full max-w-sm px-4 py-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-wide">CBT Login</h2>
      <p className="text-center text-white/50 text-sm mb-8 tracking-widest uppercase">Phrankstar School</p>

      {serverError && (
        <div className="bg-amber-400/20 border border-amber-400 text-amber-300 text-sm px-4 py-3 mb-4 text-center">
          {serverError}
        </div>
      )}

      <input
        placeholder="Full Name"
        value={name}
        onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
        className={inputClass("name")}
      />
      {errorMsg("name")}

      <input
        placeholder="Reg No"
        value={regno}
        onChange={(e) => { setRegno(e.target.value); setErrors((p) => ({ ...p, regno: "" })); setServerError(""); }}
        className={inputClass("regno")}
      />
      {errorMsg("regno")}

      <div>
        <select
          value={studentClass}
          onChange={(e) => { setStudentClass(e.target.value); setErrors((p) => ({ ...p, studentClass: "" })); setServerError(""); }}
          className={selectClass("studentClass")}
        >
          <option value="">Select Class</option>
          {classes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {errorMsg("studentClass")}
      </div>

      <div>
        <select
          value={year}
          onChange={(e) => { setYear(e.target.value); setErrors((p) => ({ ...p, year: "" })); setServerError(""); }}
          className={selectClass("year")}
        >
          <option value="">Select Year</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {errorMsg("year")}
      </div>

      <div>
        <select
          value={subject}
          onChange={(e) => { setSubject(e.target.value); setErrors((p) => ({ ...p, subject: "" })); setServerError(""); }}
          className={selectClass("subject")}
        >
          <option value="">Select Subject</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {errorMsg("subject")}
      </div>

      <div className="mb-8">
        <select
          value={mode}
          onChange={(e) => { setMode(e.target.value); setServerError(""); }}
          className={selectClass("mode")}
        >
          <option value="exam">Exam Mode</option>
          <option value="demo">Demo Mode</option>
        </select>
      </div>

      <button
        onClick={login}
        disabled={checking}
        className="w-full bg-white text-[#0b2545] py-3 font-bold text-base sm:text-lg hover:bg-white/90 transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {checking ? "Checking..." : "Start Exam"}
      </button>
    </div>
  );
}
