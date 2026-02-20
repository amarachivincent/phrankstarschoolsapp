from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
import sqlite3, pandas as pd, os, random, datetime
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = "cbt-secret-key"

# NOTE: Change "yourusername" to your actual PythonAnywhere username below
DB = "/home/phrankstarschoolsapp/phrankstarschools/backend/cbt.db"
UPLOAD_FOLDER = "/home/phrakstarschoolsapp/phrankstarschools/backend/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config.update(
    SESSION_COOKIE_SAMESITE="None",
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_PERMANENT=False
)

# NOTE: Add your Netlify URL below after deployment
CORS(app, supports_credentials=True, origins=[
    "http://localhost:5173",
    "https://phrankstarschoolsapp.netlify.app",
    # "https://yourcustomdomain.com",  # uncomment and add if you have a custom domain
])

def get_db():
    return sqlite3.connect(DB)

# ---------------- INIT ----------------
@app.route("/init/<secret>")
def init(secret):
    if secret != "PSCBTinit2025":
        return "Forbidden", 403

    db = get_db()
    c = db.cursor()

    c.execute("CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY, username TEXT, password TEXT)")
    c.execute("CREATE TABLE IF NOT EXISTS students(id INTEGER PRIMARY KEY, name TEXT, regno TEXT UNIQUE)")

    c.execute("DROP TABLE IF EXISTS questions")
    c.execute("""
        CREATE TABLE questions(
            id INTEGER PRIMARY KEY,
            question TEXT,
            A TEXT, B TEXT, C TEXT, D TEXT,
            answer TEXT,
            image TEXT,
            year TEXT,
            subject TEXT,
            mode TEXT,
            class TEXT
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS results(
            id INTEGER PRIMARY KEY,
            student_id INTEGER,
            score INTEGER,
            year TEXT,
            subject TEXT,
            mode TEXT,
            class TEXT,
            UNIQUE(student_id, subject, year, class)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS exam(
            id INTEGER PRIMARY KEY,
            start_time TEXT,
            end_time TEXT
        )
    """)

    if not c.execute("SELECT * FROM admins").fetchone():
        c.execute("INSERT INTO admins(username,password) VALUES(?,?)",
                  ("admin", generate_password_hash("admin123")))

    if not c.execute("SELECT * FROM exam").fetchone():
        now = datetime.datetime.now()
        c.execute("INSERT INTO exam(start_time,end_time) VALUES(?,?)",
                  ((now - datetime.timedelta(minutes=5)).isoformat(),
                   (now + datetime.timedelta(hours=1)).isoformat()))

    db.commit()
    return "DB Initialized"


# ---------------- ADMIN LOGIN ----------------
@app.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.json
    db = get_db()
    c = db.cursor()
    admin = c.execute("SELECT * FROM admins WHERE username=?", (data["username"],)).fetchone()
    if admin and check_password_hash(admin[2], data["password"]):
        session["admin"] = True
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Invalid username or password"})


# ---------------- GET EXAM TIME ----------------
@app.route("/admin/exam-time", methods=["GET"])
def get_exam_time():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    db = get_db()
    c = db.cursor()
    e = c.execute("SELECT start_time, end_time FROM exam").fetchone()
    if not e:
        return jsonify({"start_time": None, "end_time": None})
    return jsonify({"start_time": e[0], "end_time": e[1]})


# ---------------- SET EXAM TIME ----------------
@app.route("/admin/exam-time", methods=["POST"])
def set_exam_time():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    start_time = data.get("start_time")
    end_time = data.get("end_time")
    if not start_time or not end_time:
        return jsonify({"error": "Start and end time required"}), 400
    db = get_db()
    c = db.cursor()
    existing = c.execute("SELECT id FROM exam").fetchone()
    if existing:
        c.execute("UPDATE exam SET start_time=?, end_time=? WHERE id=?",
                  (start_time, end_time, existing[0]))
    else:
        c.execute("INSERT INTO exam(start_time, end_time) VALUES(?,?)", (start_time, end_time))
    db.commit()
    return jsonify({"success": True})


# ---------------- UPLOAD QUESTIONS ----------------
@app.route("/admin/upload", methods=["POST"])
def upload_questions():
    if "file" not in request.files:
        return "No file", 400
    file = request.files["file"]
    df = pd.read_excel(file)
    required = ["question", "A", "B", "C", "D", "answer", "year", "subject", "mode", "class"]
    for col in required:
        if col not in df.columns:
            return f"Missing column: {col}", 400
    db = get_db()
    c = db.cursor()
    years = df["year"].astype(str).unique()
    subjects = df["subject"].astype(str).unique()
    modes = df["mode"].astype(str).str.lower().unique()
    classes = df["class"].astype(str).unique()
    for y in years:
        for s in subjects:
            for m in modes:
                for cl in classes:
                    c.execute("DELETE FROM questions WHERE year=? AND subject=? AND mode=? AND class=?", (y, s, m, cl))
    for _, r in df.iterrows():
        c.execute(
            "INSERT INTO questions(question,A,B,C,D,answer,image,year,subject,mode,class) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            (r["question"], r["A"], r["B"], r["C"], r["D"], r["answer"],
             str(r.get("image", "")), str(r["year"]), str(r["subject"]),
             str(r["mode"]).lower(), str(r["class"]))
        )
    db.commit()
    return "Questions uploaded successfully."


# ---------------- UPLOAD IMAGE ----------------
@app.route("/admin/upload-image", methods=["POST"])
def upload_image():
    file = request.files["file"]
    filename = secure_filename(file.filename)
    file.save(os.path.join(UPLOAD_FOLDER, filename))
    return jsonify({"filename": filename})


# ---------------- STUDENT LOGIN ----------------
@app.route("/student/login", methods=["POST"])
def student_login():
    data = request.json
    name = (data.get("name") or "").strip()
    regno = (data.get("regno") or "").strip()
    subject = (data.get("subject") or "").strip()
    year = (data.get("year") or "").strip()
    mode = (data.get("mode") or "exam").strip()
    student_class = (data.get("class") or "").strip()

    if not name or not regno:
        return jsonify({"error": "Name and RegNo required"}), 400

    try:
        db = get_db()
        c = db.cursor()
        student = c.execute("SELECT * FROM students WHERE regno=?", (regno,)).fetchone()
        if not student:
            c.execute("INSERT INTO students(name,regno) VALUES(?,?)", (name, regno))
            db.commit()
            student = c.execute("SELECT * FROM students WHERE regno=?", (regno,)).fetchone()

        if mode == "exam" and subject and year and student_class:
            duplicate = c.execute(
                "SELECT * FROM results WHERE student_id=? AND subject=? AND year=? AND class=? AND mode='exam'",
                (student[0], subject, year, student_class)
            ).fetchone()
            if duplicate:
                return jsonify({
                    "error": f"{regno} has already taken the {subject} exam for {student_class} ({year}). Switch to Demo Mode to practice."
                }), 403

        session["student_id"] = student[0]
        return jsonify({"success": True, "student_id": student[0]})

    except Exception as e:
        print("Student login error:", e)
        return jsonify({"error": str(e)}), 500


# ---------------- CHECK EXAM TIME ----------------
def exam_open():
    db = get_db()
    c = db.cursor()
    e = c.execute("SELECT start_time,end_time FROM exam").fetchone()
    now = datetime.datetime.now()
    return datetime.datetime.fromisoformat(e[0]) <= now <= datetime.datetime.fromisoformat(e[1])


# ---------------- GET QUESTIONS ----------------
@app.route("/questions")
def questions():
    if "student_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    year = request.args.get("year")
    subject = request.args.get("subject")
    mode = request.args.get("mode")
    student_class = request.args.get("class")
    if not year or not subject or not mode or not student_class:
        return jsonify({"error": "Year, class, subject, and mode required"}), 400
    if mode == "exam" and not exam_open():
        return jsonify({"error": "Exam is currently closed"}), 403
    db = get_db()
    c = db.cursor()
    rows = c.execute(
        "SELECT * FROM questions WHERE year=? AND subject=? AND mode=? AND class=?",
        (year, subject, mode, student_class)
    ).fetchall()
    result = []
    for q in rows:
        img = q[7] if q[7] not in ["", "nan", None] else None
        options = [q[2], q[3], q[4], q[5]]
        random.shuffle(options)
        result.append({
            "id": q[0],
            "question": q[1],
            "options": options,
            "answer": q[6],
            "image": img
        })
    random.shuffle(result)
    return jsonify(result)


# ---------------- META ----------------
@app.route("/questions/meta")
def questions_meta():
    db = get_db()
    c = db.cursor()
    years = [r[0] for r in c.execute("SELECT DISTINCT year FROM questions").fetchall()]
    subjects = [r[0] for r in c.execute("SELECT DISTINCT subject FROM questions").fetchall()]
    classes = [r[0] for r in c.execute("SELECT DISTINCT class FROM questions").fetchall()]
    return {"years": years, "subjects": subjects, "classes": classes}


# ---------------- PUBLIC CHECK ----------------
@app.route("/questions/check")
def questions_check():
    year = request.args.get("year")
    subject = request.args.get("subject")
    mode = request.args.get("mode")
    student_class = request.args.get("class")
    if not year or not subject or not mode or not student_class:
        return jsonify({"exists": False})
    db = get_db()
    c = db.cursor()
    count = c.execute(
        "SELECT COUNT(*) FROM questions WHERE year=? AND subject=? AND mode=? AND class=?",
        (year, subject, mode, student_class)
    ).fetchone()[0]
    return jsonify({"exists": count > 0})


# ---------------- SUBMIT ----------------
@app.route("/submit", methods=["POST"])
def submit():
    if "student_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    score = sum(1 for a in data["answers"] if a["selected"] == a["correct"])
    mode = data.get("mode")
    year = data.get("year")
    subject = data.get("subject")
    student_class = data.get("class")
    if mode == "demo":
        session.clear()
        return jsonify({"score": score, "note": "Demo result not saved"})
    db = get_db()
    c = db.cursor()
    try:
        c.execute(
            "INSERT INTO results(student_id,score,year,subject,mode,class) VALUES(?,?,?,?,?,?)",
            (session["student_id"], score, year, subject, mode, student_class)
        )
        db.commit()
    except sqlite3.IntegrityError:
        return jsonify({"error": f"Exam for {subject} ({student_class} {year}) already submitted."}), 403
    session.clear()
    return jsonify({"score": score})


# ---------------- LEADERBOARD ----------------
@app.route("/leaderboard")
def leaderboard():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    db = get_db()
    c = db.cursor()
    rows = c.execute("""
        SELECT students.name, results.score, results.year, results.subject, results.class
        FROM results
        JOIN students ON students.id = results.student_id
        WHERE results.mode != 'demo'
        ORDER BY score DESC
    """).fetchall()
    return jsonify([
        {"name": r[0], "score": r[1], "year": r[2], "subject": r[3], "class": r[4]}
        for r in rows
    ])


# ---------------- LEADERBOARD BY SUBJECT ----------------
@app.route("/leaderboard/<subject>")
def leaderboard_subject(subject):
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    student_class = request.args.get("class")
    db = get_db()
    c = db.cursor()
    if student_class:
        rows = c.execute("""
            SELECT students.name, results.score, results.year, results.class
            FROM results
            JOIN students ON students.id = results.student_id
            WHERE results.mode != 'demo' AND results.subject=? AND results.class=?
            ORDER BY results.score DESC
        """, (subject, student_class)).fetchall()
    else:
        rows = c.execute("""
            SELECT students.name, results.score, results.year, results.class
            FROM results
            JOIN students ON students.id = results.student_id
            WHERE results.mode != 'demo' AND results.subject=?
            ORDER BY results.score DESC
        """, (subject,)).fetchall()
    return jsonify([
        {"name": r[0], "score": r[1], "year": r[2], "class": r[3]}
        for r in rows
    ])


# ---------------- RESET STUDENT ATTEMPT ----------------
@app.route("/admin/reset-student", methods=["POST"])
def reset_student():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    regno = (data.get("regno") or "").strip()
    subject = (data.get("subject") or "").strip()
    year = (data.get("year") or "").strip()
    student_class = (data.get("class") or "").strip()
    if not regno or not subject or not year or not student_class:
        return jsonify({"error": "Reg No, class, subject and year are required"}), 400
    db = get_db()
    c = db.cursor()
    student = c.execute("SELECT id FROM students WHERE regno=?", (regno,)).fetchone()
    if not student:
        return jsonify({"error": f"No student found with Reg No: {regno}"}), 404
    result = c.execute(
        "SELECT id FROM results WHERE student_id=? AND subject=? AND year=? AND class=? AND mode='exam'",
        (student[0], subject, year, student_class)
    ).fetchone()
    if not result:
        return jsonify({"error": f"{regno} has no exam record for {subject} ({student_class} {year})"}), 404
    c.execute(
        "DELETE FROM results WHERE student_id=? AND subject=? AND year=? AND class=? AND mode='exam'",
        (student[0], subject, year, student_class)
    )
    db.commit()
    return jsonify({"success": True})


# ---------------- CHANGE ADMIN PASSWORD ----------------
@app.route("/admin/change-password", methods=["POST"])
def change_password():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    current = (data.get("current") or "").strip()
    new_pass = (data.get("new_password") or "").strip()
    confirm = (data.get("confirm") or "").strip()
    if not current or not new_pass or not confirm:
        return jsonify({"error": "All fields are required"}), 400
    if new_pass != confirm:
        return jsonify({"error": "New passwords do not match"}), 400
    if len(new_pass) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    db = get_db()
    c = db.cursor()
    admin = c.execute("SELECT * FROM admins").fetchone()
    if not admin or not check_password_hash(admin[2], current):
        return jsonify({"error": "Current password is incorrect"}), 403
    c.execute("UPDATE admins SET password=? WHERE id=?",
              (generate_password_hash(new_pass), admin[0]))
    db.commit()
    return jsonify({"success": True})


# ---------------- ADMIN ONLY: VIEW ALL STUDENTS ----------------
@app.route("/admin/students")
def admin_students():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    db = get_db()
    c = db.cursor()
    rows = c.execute("""
        SELECT s.regno, s.name,
               COUNT(r.id) as exams_taken
        FROM students s
        LEFT JOIN results r ON s.id = r.student_id AND r.mode = 'exam'
        GROUP BY s.id
        ORDER BY s.name
    """).fetchall()
    return jsonify([
        {"regno": r[0], "name": r[1], "exams_taken": r[2]}
        for r in rows
    ])


# ---------------- ADMIN LOGOUT ----------------
@app.route("/admin/logout")
def admin_logout():
    session.clear()
    return jsonify({"success": True})


# ---------------- SERVE IMAGES ----------------
@app.route("/uploads/<filename>")
def image(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


if __name__ == "__main__":
    app.run(debug=True)
