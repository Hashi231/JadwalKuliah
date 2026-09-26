import json
import os
import sqlite3
import uuid
from datetime import datetime

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'planner.db')

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute(
        '''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            university TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        '''
    )
    conn.execute(
        '''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        '''
    )
    conn.commit()
    conn.close()


def normalize(value):
    if value is None:
        return ''
    return str(value).strip().replace('  ', ' ')


def auth_user():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None

    token = auth_header.replace('Bearer ', '', 1).strip()
    if not token:
        return None

    conn = get_db()
    row = conn.execute(
        '''
        SELECT u.id, u.username, u.full_name, u.university
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.id = ?
        ''',
        (token,),
    ).fetchone()
    conn.close()

    if row is None:
        return None

    return {
        'id': row['id'],
        'username': row['username'],
        'fullName': row['full_name'],
        'university': row['university'],
    }


@app.route('/api/register', methods=['POST'])
def register_user():
    payload = request.get_json(silent=True) or {}
    username = normalize(payload.get('username'))
    full_name = normalize(payload.get('fullName'))
    university = normalize(payload.get('university'))
    password = normalize(payload.get('password'))

    if not username or not full_name or not university or not password:
        return jsonify({'message': 'Semua field harus diisi.'}), 400

    conn = get_db()
    existing = conn.execute('SELECT id FROM users WHERE username = ?', (username.lower(),)).fetchone()
    if existing is not None:
        conn.close()
        return jsonify({'message': 'Username sudah dipakai, pilih yang lain.'}), 409

    hashed = generate_password_hash(password)
    cursor = conn.execute(
        'INSERT INTO users (username, full_name, university, password_hash) VALUES (?, ?, ?, ?)',
        (username.lower(), full_name, university, hashed),
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()

    return jsonify({
        'message': 'Registrasi berhasil.',
        'user': {
            'id': user_id,
            'username': username,
            'fullName': full_name,
            'university': university,
        },
    }), 201


@app.route('/api/login', methods=['POST'])
def login_user():
    payload = request.get_json(silent=True) or {}
    username = normalize(payload.get('username'))
    password = normalize(payload.get('password'))

    if not username or not password:
        return jsonify({'message': 'Username dan password harus diisi.'}), 400

    conn = get_db()
    user = conn.execute(
        'SELECT * FROM users WHERE username = ?',
        (username.lower(),),
    ).fetchone()

    if user is None or not check_password_hash(user['password_hash'], password):
        conn.close()
        return jsonify({'message': 'Username atau password salah.'}), 401

    token = uuid.uuid4().hex
    conn.execute(
        'INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)',
        (token, user['id'], datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()

    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'fullName': user['full_name'],
            'university': user['university'],
        },
    })


@app.route('/api/me', methods=['GET'])
def get_me():
    user = auth_user()
    if user is None:
        return jsonify({'message': 'Token tidak valid atau sudah habis.'}), 401

    return jsonify({'user': user})


@app.route('/api/logout', methods=['POST'])
def logout_user():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'message': 'Logout berhasil.'})

    token = auth_header.replace('Bearer ', '', 1).strip()
    if token:
        conn = get_db()
        conn.execute('DELETE FROM sessions WHERE id = ?', (token,))
        conn.commit()
        conn.close()

    return jsonify({'message': 'Logout berhasil.'})


@app.route('/')
def serve_index():
    return send_from_directory(BASE_DIR, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(BASE_DIR, path)):
        return send_from_directory(BASE_DIR, path)
    return send_from_directory(BASE_DIR, 'index.html')


init_db()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
