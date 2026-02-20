import { useState, useEffect } from "react";
import api from "./api";

export default function AdminUpload() {
  const [file, setFile] = useState(null);
  const [img, setImg] = useState(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [toast, setToast] = useState(null);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [savingTime, setSavingTime] = useState(false);
  const [examStatus, setExamStatus] = useState(null);

  const [resetRegno, setResetRegno] = useState("");
  const [resetSubject, setResetSubject] = useState("");
  const [resetYear, setResetYear] = useState("");
  const [resetClass, setResetClass] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [showPassSection, setShowPassSection] = useState(false);

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showStudents, setShowStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    fetchExamTime();
    fetchMeta();
  }, []);

  const fetchMeta = async () => {
    try {
      const res = await api.get("/questions/meta");
      setSubjects(res.data.subjects || []);
      setYears(res.data.years || []);
      setClasses(res.data.classes || []);
    } catch (err) { console.error(err); }
  };

  const fetchExamTime = async () => {
    try {
      const res = await api.get("/admin/exam-time");
      setStartTime(res.data.start_time?.slice(0, 16) || "");
      setEndTime(res.data.end_time?.slice(0, 16) || "");
      updateStatus(res.data.start_time, res.data.end_time);
    } catch (err) { console.error(err); }
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await api.get("/admin/students");
      setStudents(res.data);
      setShowStudents(true);
    } catch (err) {
      showToast("Failed to load students", "error");
    } finally { setLoadingStudents(false); }
  };

  const updateStatus = (start, end) => {
    const now = new Date();
    if (now < new Date(start)) setExamStatus("upcoming");
    else if (now >= new Date(start) && now <= new Date(end)) setExamStatus("open");
    else setExamStatus("closed");
  };

  const saveExamTime = async () => {
    if (!startTime || !endTime) return showToast("Please set both start and end time", "warning");
    if (new Date(startTime) >= new Date(endTime)) return showToast("End time must be after start time", "warning");
    setSavingTime(true);
    try {
      await api.post("/admin/exam-time", { start_time: startTime, end_time: endTime });
      showToast("Exam time updated successfully!", "success");
      updateStatus(startTime, endTime);
    } catch (err) {
      showToast("Failed to update exam time", "error");
    } finally { setSavingTime(false); }
  };

  const handleResetClick = () => {
    if (!resetRegno.trim()) return showToast("Please enter a Reg No", "warning");
    if (!resetSubject) return showToast("Please select a subject", "warning");
    if (!resetClass) return showToast("Please select a class", "warning");
    if (!resetYear) return showToast("Please select a year", "warning");
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    setShowResetConfirm(false);
    setResetting(true);
    try {
      const res = await api.post("/admin/reset-student", {
        regno: resetRegno.trim(),
        subject: resetSubject,
        year: resetYear,
        class: resetClass
      });
      if (res.data.success) {
        showToast(`${resetRegno.trim()}'s ${resetSubject} (${resetClass} ${resetYear}) attempt has been reset`, "success");
        setResetRegno(""); setResetSubject(""); setResetYear(""); setResetClass("");
      } else {
        showToast(res.data.error || "Reset failed", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Reset failed. Check Reg No and try again.", "error");
    } finally { setResetting(false); }
  };

  const changePassword = async () => {
    if (!currentPass || !newPass || !confirmPass) return showToast("All fields are required", "warning");
    setChangingPass(true);
    try {
      const res = await api.post("/admin/change-password", {
        current: currentPass,
        new_password: newPass,
        confirm: confirmPass
      });
      if (res.data.success) {
        showToast("Password changed successfully!", "success");
        setCurrentPass(""); setNewPass(""); setConfirmPass("");
        setShowPassSection(false);
      } else {
        showToast(res.data.error || "Failed to change password", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to change password", "error");
    } finally { setChangingPass(false); }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const uploadExcel = async () => {
    if (!file) return showToast("Please select an Excel file first", "warning");
    const fd = new FormData();
    fd.append("file", file);
    setUploadingExcel(true);
    try {
      await api.post("/admin/upload", fd);
      showToast("Questions uploaded successfully!", "success");
      setFile(null);
      fetchMeta();
    } catch (err) {
      showToast("Upload failed: " + (err.response?.data || err.message), "error");
    } finally { setUploadingExcel(false); }
  };

  const uploadImage = async () => {
    if (!img) return showToast("Please select an image file first", "warning");
    const fd = new FormData();
    fd.append("file", img);
    setUploadingImg(true);
    try {
      const res = await api.post("/admin/upload-image", fd);
      showToast("Image saved as: " + res.data.filename, "success");
      setImg(null);
    } catch (err) {
      showToast("Image upload failed: " + (err.response?.data || err.message), "error");
    } finally { setUploadingImg(false); }
  };

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.regno.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const sectionClass = "bg-white/5 border border-white/10 p-6 mb-6";
  const labelClass = "block text-white/50 text-xs uppercase tracking-widest mb-2";
  const inputClass = "w-full px-4 py-3 rounded-none bg-white border-0 text-[#0b2545] font-medium focus:outline-none focus:ring-2 focus:ring-white transition";
  const selectClass = "w-full px-4 py-3 rounded-none bg-white border-0 text-[#0b2545] font-medium focus:outline-none focus:ring-2 focus:ring-white transition";

  const toastColors = {
    success: "bg-[#0b2545] border border-white/20 text-white",
    error: "bg-red-500/90 text-white",
    warning: "bg-amber-400/20 border border-amber-400 text-amber-300",
  };

  const statusBadge = {
    open: "bg-green-500/20 border border-green-400 text-green-300",
    closed: "bg-red-500/20 border border-red-400 text-red-300",
    upcoming: "bg-amber-400/20 border border-amber-400 text-amber-300",
  };

  const statusLabel = {
    open: "🟢 Exam is currently OPEN",
    closed: "🔴 Exam is currently CLOSED",
    upcoming: "🟡 Exam is UPCOMING",
  };

  return (
    <div className="w-full h-full" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 text-sm font-semibold shadow-lg ${toastColors[toast.type]}`}>
          {toast.message}
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white w-full max-w-sm mx-4 p-6 shadow-2xl">
            <h3 className="text-[#0b2545] font-bold text-lg mb-2">Reset Student Attempt?</h3>
            <div className="bg-[#0b2545]/5 border border-[#0b2545]/10 px-4 py-3 mb-4 text-sm">
              <p><span className="font-bold text-[#0b2545]">Reg No:</span> <span className="text-[#0b2545]/70">{resetRegno}</span></p>
              <p><span className="font-bold text-[#0b2545]">Subject:</span> <span className="text-[#0b2545]/70">{resetSubject}</span></p>
              <p><span className="font-bold text-[#0b2545]">Class:</span> <span className="text-[#0b2545]/70">{resetClass}</span></p>
              <p><span className="font-bold text-[#0b2545]">Year:</span> <span className="text-[#0b2545]/70">{resetYear}</span></p>
            </div>
            <p className="text-amber-600 text-xs mb-6">⚠ This will delete their submission and allow them to retake.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2 border-2 border-[#0b2545]/30 text-[#0b2545] font-semibold text-sm hover:border-[#0b2545] transition-all">Cancel</button>
              <button onClick={confirmReset} className="flex-1 py-2 bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all">Yes, Reset</button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-lg mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-wide">Admin Upload</h2>
        <p className="text-center text-white/50 text-sm mb-8 tracking-widest uppercase">Phrankstar School</p>

        {/* Exam Time */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-white font-semibold text-base">Exam Time Window</p>
            {examStatus && (
              <span className={`text-xs px-3 py-1 font-semibold ${statusBadge[examStatus]}`}>{statusLabel[examStatus]}</span>
            )}
          </div>
          <label className={labelClass}>Start Time</label>
          <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`${inputClass} mb-4`} />
          <label className={labelClass}>End Time</label>
          <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`${inputClass} mb-4`} />
          <button onClick={saveExamTime} disabled={savingTime} className="w-full bg-white text-[#0b2545] py-3 font-bold hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {savingTime ? "Saving..." : "Save Exam Time"}
          </button>
        </div>

        {/* View Students */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-semibold text-base">Registered Students</p>
              <p className="text-white/40 text-xs mt-1">View all students and their exam activity</p>
            </div>
            <button
              onClick={() => { if (!showStudents) fetchStudents(); else setShowStudents(false); }}
              className="px-4 py-2 border-2 border-white/30 text-white text-sm font-semibold hover:border-white transition-all whitespace-nowrap"
            >
              {loadingStudents ? "Loading..." : showStudents ? "Hide" : "View Students"}
            </button>
          </div>

          {showStudents && (
            <>
              <input
                type="text"
                placeholder="Search by name or reg no..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className={`${inputClass} mb-3`}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/10 text-white/50 uppercase tracking-widest text-xs">
                      <th className="px-3 py-2 text-left">Reg No</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-center">Exams Taken</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr><td colSpan={3} className="text-center text-white/30 py-4 text-xs">No students found</td></tr>
                    ) : filteredStudents.map((s, i) => (
                      <tr key={i} className="border-b border-white/10 text-white/70">
                        <td className="px-3 py-2">{s.regno}</td>
                        <td className="px-3 py-2">{s.name}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 text-xs font-bold ${s.exams_taken > 0 ? "bg-white/10 text-white" : "text-white/30"}`}>
                            {s.exams_taken}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredStudents.length > 0 && (
                  <p className="text-white/30 text-xs text-center mt-3">{filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Reset Student */}
        <div className={sectionClass}>
          <p className="text-white font-semibold text-base mb-1">Reset Student Attempt</p>
          <p className="text-white/40 text-xs mb-4">Allow a student to retake an exam due to a technical issue.</p>
          <label className={labelClass}>Student Reg No</label>
          <input type="text" placeholder="Enter Reg No" value={resetRegno} onChange={(e) => setResetRegno(e.target.value)} className={`${inputClass} mb-4`} />
          <label className={labelClass}>Subject</label>
          <select value={resetSubject} onChange={(e) => setResetSubject(e.target.value)} className={`${selectClass} mb-4`}>
            <option value="">Select Subject</option>
            {subjects.map((s, i) => <option key={i} value={s}>{s}</option>)}
          </select>
          <label className={labelClass}>Class</label>
          <select value={resetClass} onChange={(e) => setResetClass(e.target.value)} className={`${selectClass} mb-4`}>
            <option value="">Select Class</option>
            {classes.map((c, i) => <option key={i} value={c}>{c}</option>)}
          </select>
          <label className={labelClass}>Year</label>
          <select value={resetYear} onChange={(e) => setResetYear(e.target.value)} className={`${selectClass} mb-4`}>
            <option value="">Select Year</option>
            {years.map((y, i) => <option key={i} value={y}>{y}</option>)}
          </select>
          <button onClick={handleResetClick} disabled={resetting} className="w-full bg-red-500 text-white py-3 font-bold hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {resetting ? "Resetting..." : "Reset Attempt"}
          </button>
        </div>

        {/* Change Password */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-semibold text-base">Change Password</p>
              <p className="text-white/40 text-xs mt-1">Update your admin login password</p>
            </div>
            <button
              onClick={() => setShowPassSection(!showPassSection)}
              className="px-4 py-2 border-2 border-white/30 text-white text-sm font-semibold hover:border-white transition-all"
            >
              {showPassSection ? "Cancel" : "Change"}
            </button>
          </div>
          {showPassSection && (
            <>
              <label className={labelClass}>Current Password</label>
              <input type="password" placeholder="Current password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} className={`${inputClass} mb-4`} />
              <label className={labelClass}>New Password</label>
              <input type="password" placeholder="New password (min 6 characters)" value={newPass} onChange={(e) => setNewPass(e.target.value)} className={`${inputClass} mb-4`} />
              <label className={labelClass}>Confirm New Password</label>
              <input type="password" placeholder="Confirm new password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className={`${inputClass} mb-4`} />
              <button onClick={changePassword} disabled={changingPass} className="w-full bg-white text-[#0b2545] py-3 font-bold hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {changingPass ? "Saving..." : "Save New Password"}
              </button>
            </>
          )}
        </div>

        {/* Excel Upload */}
        <div className={sectionClass}>
          <p className="text-white font-semibold text-base mb-4">Upload Questions (Excel)</p>
          <label className={labelClass}>Select Excel File</label>
          <label className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-white/30 text-white/50 text-sm cursor-pointer hover:border-white/60 hover:text-white/80 transition-all">
            <span>{file ? file.name : "Click to browse .xlsx / .xls"}</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
          </label>
          <button onClick={uploadExcel} disabled={uploadingExcel} className="w-full mt-4 bg-white text-[#0b2545] py-3 font-bold hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {uploadingExcel ? "Uploading..." : "Upload Excel"}
          </button>
        </div>

        {/* Image Upload */}
        <div className={sectionClass}>
          <p className="text-white font-semibold text-base mb-4">Upload Question Image</p>
          <label className={labelClass}>Select Image File</label>
          <label className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-white/30 text-white/50 text-sm cursor-pointer hover:border-white/60 hover:text-white/80 transition-all">
            <span>{img ? img.name : "Click to browse .jpg / .png"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const selected = e.target.files[0];
              if (selected && selected.size > 2 * 1024 * 1024) {
                showToast("Image too large! Maximum size is 2MB", "warning");
                e.target.value = "";
                return;
              }
              setImg(selected);
            }} />
          </label>
          <button onClick={uploadImage} disabled={uploadingImg} className="w-full mt-4 bg-white text-[#0b2545] py-3 font-bold hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {uploadingImg ? "Uploading..." : "Upload Image"}
          </button>
        </div>
      </div>
    </div>
  );
}
