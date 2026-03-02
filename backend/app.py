from flask import Flask, request, render_template
from flask_cors import CORS
import sqlite3, random, time
import os
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

DB = "users.db"
otp_store = {}

def init_db():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("""
      CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        email TEXT,
        phone TEXT
      )
    """)
    conn.commit()
    conn.close()

init_db()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/register", methods=["POST"])
def register():
    d = request.json
    pwd = generate_password_hash(d["password"])

    conn = sqlite3.connect(DB)
    c = conn.cursor()
    try:
        c.execute(
            "INSERT INTO users (username,password,email,phone) VALUES (?,?,?,?)",
            (d["username"], pwd, d["email"], d["phone"])
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return "", 409
    finally:
        conn.close()

    return "", 201

@app.route("/login", methods=["POST"])
def login():
    d = request.json
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("SELECT password FROM users WHERE username=?", (d["username"],))
    u = c.fetchone()
    conn.close()

    if u and check_password_hash(u[0], d["password"]):
        return "", 200
    return "", 401

@app.route("/forgot-password", methods=["POST"])
def forgot():
    email = request.json["email"]
    otp = str(random.randint(100000, 999999))
    otp_store[email] = (otp, time.time())
    print("OTP:", otp)
    return ""

@app.route("/reset-password", methods=["POST"])
def reset():
    d = request.json
    otp, ts = otp_store.get(d["email"], (None, None))

    if not otp or otp != d["otp"] or time.time() - ts > 600:
        return "", 400

    pwd = generate_password_hash(d["newPass"])
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("UPDATE users SET password=? WHERE email=?", (pwd, d["email"]))
    conn.commit()
    conn.close()

    del otp_store[d["email"]]
    return ""

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

