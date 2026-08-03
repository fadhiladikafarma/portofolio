import sqlite3
import os
import smtplib
import ssl
from email.message import EmailMessage
from functools import wraps
from pathlib import Path
from datetime import datetime

from flask import (
    Flask, render_template, request, jsonify,
    redirect, url_for, session, flash
)

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET', 'ganti-dengan-secret-key-anda')

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        return ('', 204)

FRONTEND_DIR = Path(__file__).parent / 'templates'
app.config['TEMPLATES_AUTO_RELOAD'] = True

DB_PATH = Path(__file__).parent / 'database' / 'portfolio.db'

# === DATABASE ===

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            tags TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ''')
    conn.commit()
    conn.close()

init_db()

# === ADMIN AUTH ===

ADMIN_USERNAME = os.getenv('ADMIN_USER', 'admin')
ADMIN_PASSWORD = os.getenv('ADMIN_PASS', 'admin123')

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return wrapper

# === FRONTEND ===

@app.route('/')
def index():
    return render_template('index.html')

# === API: CONTACT ===

@app.route('/api/contact', methods=['POST'])
def contact():
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    message = data.get('message', '').strip()

    if not all([name, email, message]):
        return jsonify({'success': False, 'error': 'Semua field harus diisi'}), 400

    conn = get_db()
    conn.execute('INSERT INTO messages (name, email, message) VALUES (?, ?, ?)',
                 (name, email, message))
    conn.commit()
    conn.close()

    # Optional: kirim email notifikasi
    smtp_server = os.getenv('SMTP_SERVER', '')
    if smtp_server:
        try:
            msg = EmailMessage()
            msg.set_content(f"Dari: {name} ({email})\n\nPesan:\n{message}")
            msg['Subject'] = f'Pesan Portfolio dari {name}'
            msg['From'] = os.getenv('SMTP_USER', '')
            msg['To'] = os.getenv('MAIL_TO', email)

            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(smtp_server, int(os.getenv('SMTP_PORT', 465)), context=context) as server:
                server.login(os.getenv('SMTP_USER', ''), os.getenv('SMTP_PASS', ''))
                server.send_message(msg)
        except Exception:
            pass

    return jsonify({'success': True, 'message': 'Pesan berhasil dikirim!'})

# === API: PROJECTS ===

@app.route('/api/projects', methods=['GET'])
def get_projects():
    conn = get_db()
    rows = conn.execute('SELECT * FROM projects ORDER BY created_at DESC').fetchall()
    conn.close()
    projects = [{
        'id': r['id'],
        'title': r['title'],
        'description': r['description'],
        'tags': r['tags'].split(','),
        'created_at': r['created_at']
    } for r in rows]
    return jsonify(projects)

# === ADMIN ROUTES ===

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['logged_in'] = True
            return redirect(url_for('admin_dashboard'))
        flash('Username atau password salah', 'error')
    return render_template('admin/login.html')

@app.route('/admin/logout')
def admin_logout():
    session.clear()
    return redirect(url_for('admin_login'))

@app.route('/admin')
@login_required
def admin_dashboard():
    conn = get_db()
    projects = conn.execute('SELECT * FROM projects ORDER BY created_at DESC').fetchall()
    messages = conn.execute('SELECT * FROM messages ORDER BY created_at DESC').fetchall()
    conn.close()
    return render_template('admin/dashboard.html', projects=projects, messages=messages)

@app.route('/admin/projects/add', methods=['POST'])
@login_required
def add_project():
    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    tags = request.form.get('tags', '').strip()

    if not all([title, description]):
        flash('Judul dan deskripsi harus diisi', 'error')
        return redirect(url_for('admin_dashboard'))

    conn = get_db()
    conn.execute('INSERT INTO projects (title, description, tags) VALUES (?, ?, ?)',
                 (title, description, tags))
    conn.commit()
    conn.close()
    flash('Proyek berhasil ditambahkan', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/projects/edit/<int:project_id>', methods=['POST'])
@login_required
def edit_project(project_id):
    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    tags = request.form.get('tags', '').strip()

    if not all([title, description]):
        flash('Judul dan deskripsi harus diisi', 'error')
        return redirect(url_for('admin_dashboard'))

    conn = get_db()
    conn.execute('UPDATE projects SET title=?, description=?, tags=? WHERE id=?',
                 (title, description, tags, project_id))
    conn.commit()
    conn.close()
    flash('Proyek berhasil diupdate', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/projects/delete/<int:project_id>', methods=['POST'])
@login_required
def delete_project(project_id):
    conn = get_db()
    conn.execute('DELETE FROM projects WHERE id=?', (project_id,))
    conn.commit()
    conn.close()
    flash('Proyek berhasil dihapus', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/messages/delete/<int:message_id>', methods=['POST'])
@login_required
def delete_message(message_id):
    conn = get_db()
    conn.execute('DELETE FROM messages WHERE id=?', (message_id,))
    conn.commit()
    conn.close()
    flash('Pesan berhasil dihapus', 'success')
    return redirect(url_for('admin_dashboard'))

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
