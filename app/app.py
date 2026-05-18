from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import psycopg2

app = Flask(__name__)
CORS(app)


def get_db_connection():
    """Connexion a la base PostgreSQL via DATABASE_URL injectee par Render."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return None
    return psycopg2.connect(db_url, sslmode="require")


@app.route("/")
def home():
    return "Flask + Docker + GHCR + Terraform + Render"


@app.route("/health")
def health():
    return {"status": "Tout est ok ou pas"}


@app.route("/info")
def info():
    return {
        "app": "Flask Render",
        "student": "Fumikage-DarkShadow",
        "version": "v1"
    }


@app.route("/env")
def env():
    return {"env": os.getenv("ENV")}


@app.route("/api/db-status")
def db_status():
    """Verifie la connexion a Postgres."""
    if not os.getenv("DATABASE_URL"):
        return jsonify({"connected": False, "reason": "DATABASE_URL non defini"}), 200
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        cur.close()
        conn.close()
        return jsonify({"connected": True, "version": version})
    except Exception as e:
        return jsonify({"connected": False, "reason": str(e)}), 500


@app.route("/api/init", methods=["POST"])
def init_db():
    """Cree la table messages si elle n'existe pas."""
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({"ok": False, "reason": "DATABASE_URL non defini"}), 500
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                contenu TEXT NOT NULL,
                cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "reason": str(e)}), 500


@app.route("/api/messages", methods=["GET"])
def list_messages():
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify([]), 200
        cur = conn.cursor()
        cur.execute("SELECT id, contenu, cree_le FROM messages ORDER BY id DESC;")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify([
            {"id": r[0], "contenu": r[1], "cree_le": r[2].isoformat()}
            for r in rows
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/messages", methods=["POST"])
def add_message():
    try:
        data = request.get_json() or {}
        contenu = (data.get("contenu") or "").strip()
        if not contenu:
            return jsonify({"error": "contenu requis"}), 400
        conn = get_db_connection()
        if conn is None:
            return jsonify({"error": "DATABASE_URL non defini"}), 500
        cur = conn.cursor()
        cur.execute("INSERT INTO messages (contenu) VALUES (%s) RETURNING id;", (contenu,))
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"id": new_id, "contenu": contenu}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
