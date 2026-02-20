import { useEffect, useState } from "react";
import api from "./api";
import BASE_URL from "./config";
import ParticleBackground from "./ParticleBackground";

const STORAGE_KEY = (studentId, subject, year, cls) =>
  `cbt_answers_${studentId}_${subject}_${year}_${cls}`;

export default function TestPage({ selection, studentId, setPage }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [time, setTime] = useState(3600);
  const [current, setCurrent] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [toast, setToast] = useState(null);
  const [tabWarning, setTabWarning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selection) return;
    const { year, subject, mode } = selection;
    setLoading(true);
    api.get(`/questions?year=${year}&subject=${subject}&mode=${mode}&class=${selection.class}`)
      .then((res) => {
        setQuestions(res.data);
        if (mode === "exam") setTime(3600);
        else setTime(0);
        const saved = localStorage.getItem(STORAGE_KEY(studentId, subject, year, selection?.class));
        if (saved) {
          setAnswers(JSON.parse(saved));
          showToast("Previous answers restored!", "success");
        }
      })
      .catch((err) => showToast(err.response?.data?.error || "Failed to fetch questions", "error"))
      .finally(() => setLoading(false));
  }, [selection]);

  useEffect(() => {
    if (time <= 0 || submitted) {
      if (time <= 0 && selection?.mode === "exam" && !submitted) submit(true);
      return;
    }
    const timer = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [time, submitted]);

  useEffect(() => {
    window.onbeforeunload = () => "Exam in progress!";
    const handler = () => {
      if (document.hidden && !submitted) {
        setTabWarning(true);
        setTimeout(() => setTabWarning(false), 4000);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [submitted]);

  useEffect(() => {
    if (!selection || answers.length === 0) return;
    localStorage.setItem(
      STORAGE_KEY(studentId, selection.subject, selection.year, selection.class),
      JSON.stringify(answers)
    );
  }, [answers]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const select = (qid, selected, correct) => {
    if (submitted) return;
    setAnswers((prev) => {
      const filtered = prev.filter((a) => a.qid !== qid);
      return [...filtered, { qid, selected, correct }];
    });
  };

  const submit = async (auto = false) => {
    if (!studentId) return showToast("Student ID missing. Please login again.", "error");
    if (submitted) return;
    try {
      const res = await api.post("/submit", {
        student_id: studentId,
        answers,
        year: selection.year,
        subject: selection.subject,
        mode: selection.mode,
        class: selection.class
      });
      setScore(res.data.score);
      setSubmitted(true);
      localStorage.removeItem(STORAGE_KEY(studentId, selection.subject, selection.year, selection.class));
      if (auto) showToast("Time is up! Exam automatically submitted.", "error");
    } catch (err) {
      showToast(err.response?.data?.error || "Submission failed", "error");
    }
  };

  const handleSubmitClick = () => setShowConfirm(true);

  if (loading) return (
    <div className="h-full w-full bg-white flex flex-col items-center justify-center shadow-xl" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="w-10 h-10 border-4 border-[#0b2545]/20 border-t-[#0b2545] rounded-full animate-spin mb-4" />
      <p className="text-[#0b2545]/50 text-sm uppercase tracking-widest">Loading questions...</p>
    </div>
  );

  if (submitted) {
    return (
      <div className="h-full w-full bg-[#0b2545] flex items-center justify-center relative overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <ParticleBackground />
        <div className="relative z-10 text-center px-6">
          <div className="text-7xl mb-6">🎓</div>
          <h2 className="text-4xl font-bold text-white mb-3 tracking-wide">
            {selection?.mode === "demo" ? "Demo Complete!" : "Exam Submitted!"}
          </h2>
          {selection?.mode === "demo" ? (
            <p className="text-white/60 mb-2 text-lg">
              Your score: <span className="text-white font-bold text-2xl">{score}</span>
            </p>
          ) : (
            <p className="text-white/60 mb-2 text-lg">Your exam has been submitted successfully.</p>
          )}
          <p className="text-white/30 text-sm mb-10 uppercase tracking-widest">
            {selection?.class} · {selection?.subject} · {selection?.year}
          </p>
          <button
            onClick={() => setPage("student")}
            className="bg-white text-[#0b2545] px-10 py-3 font-bold text-base hover:bg-white/90 transition-all active:scale-95"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const selectedAnswer = answers.find((a) => a.qid === q?.id)?.selected;
  const mins = Math.floor(time / 60);
  const secs = time % 60;
  const isLowTime = time <= 300 && selection?.mode === "exam";
  const answeredCount = answers.length;
  const totalCount = questions.length;
  const unanswered = totalCount - answeredCount;

  return (
    <div className="h-full w-full bg-white shadow-xl flex flex-col overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {tabWarning && (
        <div className="shrink-0 w-full bg-red-500 text-white text-center text-sm font-semibold py-2 px-4 animate-pulse">
          ⚠️ Warning: Tab switch detected! Please stay on this page during the exam.
        </div>
      )}

      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 text-sm font-semibold shadow-lg transition-all
          ${toast.type === "error" ? "bg-red-500 text-white" : toast.type === "warning" ? "bg-amber-400/90 text-[#0b2545]" : "bg-[#0b2545] text-white"}`}>
          {toast.message}
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-full max-w-sm mx-4 p-6 shadow-2xl">
            <h3 className="text-[#0b2545] font-bold text-lg mb-2">
              {unanswered > 0 ? "Unanswered Questions!" : "Submit Exam?"}
            </h3>
            {unanswered > 0 ? (
              <p className="text-[#0b2545]/70 text-sm mb-6">
                You have <span className="font-bold text-amber-500">{unanswered} unanswered question{unanswered !== 1 ? "s" : ""}</span>. Unanswered questions will be marked wrong. Are you sure you want to submit?
              </p>
            ) : (
              <p className="text-[#0b2545]/70 text-sm mb-6">
                You have answered all <span className="font-bold">{totalCount}</span> questions. Are you ready to submit?
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 border-2 border-[#0b2545]/30 text-[#0b2545] font-semibold text-sm hover:border-[#0b2545] transition-all"
              >
                Go Back
              </button>
              <button
                onClick={() => { setShowConfirm(false); submit(); }}
                className="flex-1 py-2 bg-[#0b2545] text-white font-bold text-sm hover:bg-[#0b2545]/90 transition-all"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between border-b border-[#0b2545]/10 shrink-0">
        <div>
          <p className="text-[#0b2545] font-bold text-sm sm:text-base">{selection?.subject}</p>
          <p className="text-[#0b2545]/40 text-xs uppercase tracking-widest">
            {selection?.class} · {selection?.year} · {selection?.mode} mode
          </p>
        </div>

        {selection?.mode === "exam" && (
          <div className={`px-3 sm:px-5 py-1.5 sm:py-2 border-2 font-bold text-base sm:text-lg tabular-nums tracking-widest transition-all
            ${isLowTime ? "border-red-500 text-red-500 animate-pulse" : "border-[#0b2545]/30 text-[#0b2545]"}`}>
            {mins}:{secs < 10 ? "0" : ""}{secs}
          </div>
        )}

        <div className="text-right">
          <p className="text-[#0b2545] font-bold text-sm sm:text-base">{answeredCount}/{totalCount}</p>
          <p className="text-[#0b2545]/40 text-xs uppercase tracking-widest">Answered</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-[#0b2545]/10 shrink-0">
        <div className="h-1 bg-[#0b2545] transition-all duration-500" style={{ width: `${(answeredCount / totalCount) * 100}%` }} />
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6">
        <p className="text-[#0b2545]/40 text-xs uppercase tracking-widest mb-1">Question {current + 1} of {totalCount}</p>
        <p className="text-[#0b2545] text-base sm:text-xl font-semibold mb-4 leading-relaxed">{q?.question}</p>

        {q?.image && (
          <img
            src={`${BASE_URL}/uploads/${q.image}`}
            alt="question"
            className="mb-4 w-full max-w-sm max-h-48 object-contain border border-[#0b2545]/20"
          />
        )}

        <div className="flex flex-col gap-2 mb-6">
          {q?.options.map((opt, idx) => {
            const isSelected = selectedAnswer === opt;
            return (
              <button
                key={idx}
                onClick={() => select(q.id, opt, q.answer)}
                disabled={submitted}
                className={`w-full text-left px-4 sm:px-5 py-3 border-2 font-medium transition-all duration-150 text-sm sm:text-base
                  ${isSelected
                    ? "bg-[#0b2545] text-white border-[#0b2545]"
                    : "bg-white text-[#0b2545] border-[#0b2545]/20 hover:border-[#0b2545]/60"
                  }`}
              >
                <span className="mr-3 font-bold text-xs opacity-50">{String.fromCharCode(65 + idx)}.</span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="shrink-0 px-4 sm:px-8 py-3 border-t border-[#0b2545]/10 flex justify-between items-center">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0 || submitted}
          className="px-4 sm:px-6 py-2 border-2 border-[#0b2545]/30 text-[#0b2545] text-sm font-semibold hover:border-[#0b2545] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>

        <div className="hidden sm:flex gap-1 flex-wrap justify-center max-w-sm">
          {questions.map((_, idx) => {
            const isAnswered = answers.find((a) => a.qid === questions[idx].id);
            const isCurrent = idx === current;
            return (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`w-7 h-7 text-xs font-bold transition-all
                  ${isCurrent ? "bg-[#0b2545] text-white"
                    : isAnswered ? "bg-[#0b2545]/20 text-[#0b2545]"
                    : "bg-white text-[#0b2545]/30 border border-[#0b2545]/20"
                  }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <span className="sm:hidden text-[#0b2545]/50 text-xs font-medium">
          {current + 1} / {totalCount}
        </span>

        {current < questions.length - 1 ? (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            disabled={submitted}
            className="px-4 sm:px-6 py-2 border-2 border-[#0b2545]/30 text-[#0b2545] text-sm font-semibold hover:border-[#0b2545] transition-all disabled:opacity-20"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmitClick}
            disabled={submitted}
            className="px-4 sm:px-6 py-2 bg-[#0b2545] text-white text-sm font-bold hover:bg-[#0b2545]/90 transition-all disabled:opacity-20"
          >
            Submit
          </button>
        )}
      </div>
    </div>
  );
}
