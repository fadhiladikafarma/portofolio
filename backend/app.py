import os
import smtplib
import ssl
from email.message import EmailMessage
from functools import wraps
from pathlib import Path

from flask import (
    Flask, render_template, request, jsonify,
    redirect, url_for, session, flash
)

import db

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

API_ONLY = os.getenv('API_ONLY', '').lower() in ('1', 'true', 'yes')

# === DATABASE ===

def init_db():
    db.init_db()

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
    if API_ONLY:
        return render_template('landing.html')
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

    db.execute('INSERT INTO messages (name, email, message) VALUES (?, ?, ?)',
               (name, email, message))

    # Optional: kirim email notifikasi
    smtp_server = os.getenv('SMTP_SERVER', '')
    if smtp_server:
        try:
            msg = EmailMessage()
            msg.set_content(f"Dari: {name} ({email})\n\nPesan:\n{message}")
            msg['Subject'] = f'Pesan Portofolio dari {name}'
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
    rows = db.fetch_all('SELECT * FROM projects ORDER BY created_at DESC')
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
    projects = db.fetch_all('SELECT * FROM projects ORDER BY created_at DESC')
    messages = db.fetch_all('SELECT * FROM messages ORDER BY created_at DESC')
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

    db.execute('INSERT INTO projects (title, description, tags) VALUES (?, ?, ?)',
               (title, description, tags))
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

    db.execute('UPDATE projects SET title=?, description=?, tags=? WHERE id=?',
               (title, description, tags, project_id))
    flash('Proyek berhasil diupdate', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/projects/delete/<int:project_id>', methods=['POST'])
@login_required
def delete_project(project_id):
    db.execute('DELETE FROM projects WHERE id=?', (project_id,))
    flash('Proyek berhasil dihapus', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/messages/delete/<int:message_id>', methods=['POST'])
@login_required
def delete_message(message_id):
    db.execute('DELETE FROM messages WHERE id=?', (message_id,))
    flash('Pesan berhasil dihapus', 'success')
    return redirect(url_for('admin_dashboard'))

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)





#punya padil
