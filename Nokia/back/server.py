import os
from functools import wraps
from datetime import datetime

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from db import get_connection
from chatbot import ask_chatbot
import queries

app = Flask(__name__)
CORS(app)

EXPORTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "exports")
os.makedirs(EXPORTS_DIR, exist_ok=True)

SECRET_KEY = os.environ.get("APP_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "APP SECRET_KEY is missing from the environment variables. See .env.example."
    )

serializer = URLSafeTimedSerializer(SECRET_KEY)
TOKEN_MAX_AGE_SECONDS = 8 * 60 * 60  # token-ul expira dupa 8 ore, userul trebuie sa se logheze din nou

ROLE_RANK = {"Viewer": 1, "Agent": 2, "Team Lead": 3, "Admin": 4, "Super Admin": 5}


def generate_token(username, role):
    return serializer.dumps({"username": username, "role": role})


def verify_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer "):]
    try:
        return serializer.loads(token, max_age=TOKEN_MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired):
        return None


def require_role(min_role):
  
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user_data = verify_token()
            if not user_data:
                return jsonify({"error": "Authentication required"}), 401
            user_rank = ROLE_RANK.get(user_data.get("role"), 0)
            if user_rank < ROLE_RANK.get(min_role, 999):
                return jsonify({"error": "Insufficient permissions"}), 403
            request.current_user = user_data
            return f(*args, **kwargs)
        return wrapper
    return decorator


TICKET_COLUMNS = """ID, TICKET_NUMBER, STATUS, PRIORITY, COMPANY, PROJECT, TEAM, ASSIGNED_PERSON, SERVICE,
    DESCRIPTION, SUBMIT_DATETIME, RESOLVED_DATETIME, CLOSED_DATETIME, ESTIMATED_RESOLUTION_DATETIME"""


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    if not username or not password:
        return jsonify({"success": False, "error": "Invalid username or password"}), 401

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT FIRST_NAME, ROLE, PASSWORD FROM ST_ALEX.USERS WHERE LOWER(FIRST_NAME) = LOWER(?)",
            username
        )
        row = cursor.fetchone()
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()

    if not row:
        return jsonify({"success": False, "error": "Invalid username or password"}), 401

    first_name, role, stored_hash = row
    if not stored_hash or not check_password_hash(stored_hash, password):
        return jsonify({"success": False, "error": "Invalid username or password"}), 401

    token = generate_token(first_name, role)
    return jsonify({"success": True, "username": first_name, "role": role, "token": token})



@app.route('/tickete', methods=['GET'])
def get_tickete():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT {TICKET_COLUMNS} FROM ST_ALEX.INCIDENT_TICKETS")
        columns = [col[0] for col in cursor.description]
        tickete = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return jsonify(tickete)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()



@app.route('/tickete/search', methods=['POST'])
def search_tickete():
    conn = None
    try:
        data = request.get_json()
        status = data.get('status')
        priority = data.get('priority')
        team = data.get('team')
        company = data.get('company')
        person = data.get('person')
        date_start = data.get('date_start')
        date_end = data.get('date_end')
        search = data.get('search')
        sla_breach = data.get('sla_breach')

        query = f"SELECT {TICKET_COLUMNS} FROM ST_ALEX.INCIDENT_TICKETS WHERE 1=1"
        params = []

        if status:
            status_list = status if isinstance(status, list) else status.split(',')
            placeholders = ','.join(['?' for _ in status_list])
            query += f" AND STATUS IN ({placeholders})"
            params.extend(status_list)

        if priority:
            priority_list = priority if isinstance(priority, list) else priority.split(',')
            placeholders = ','.join(['?' for _ in priority_list])
            query += f" AND PRIORITY IN ({placeholders})"
            params.extend(priority_list)

        if team:
            team_list = team if isinstance(team, list) else team.split(',')
            placeholders = ','.join(['?' for _ in team_list])
            query += f" AND TEAM IN ({placeholders})"
            params.extend(team_list)

        if company:
            company_list = company if isinstance(company, list) else company.split(',')
            placeholders = ','.join(['?' for _ in company_list])
            query += f" AND COMPANY IN ({placeholders})"
            params.extend(company_list)

        if person:
            person_list = person if isinstance(person, list) else person.split(',')
            placeholders = ','.join(['?' for _ in person_list])
            query += f" AND ASSIGNED_PERSON IN ({placeholders})"
            params.extend(person_list)

        if date_start:
            query += " AND SUBMIT_DATETIME >= ?"
            params.append(date_start)

        if date_end:
            query += " AND SUBMIT_DATETIME <= ?"
            params.append(date_end + " 23:59:59")

        if search:
            query += " AND (TICKET_NUMBER LIKE ? OR DESCRIPTION LIKE ?)"
            search_param = f"%{search}%"
            params.append(search_param)
            params.append(search_param)

        if sla_breach:
            query += """ AND ESTIMATED_RESOLUTION_DATETIME IS NOT NULL
                AND (
                    (RESOLVED_DATETIME IS NOT NULL AND RESOLVED_DATETIME > ESTIMATED_RESOLUTION_DATETIME)
                    OR (RESOLVED_DATETIME IS NULL AND GETDATE() > ESTIMATED_RESOLUTION_DATETIME)
                )"""

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        columns = [col[0] for col in cursor.description]
        tickete = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return jsonify(tickete)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()



@app.route('/tickete/stats', methods=['POST'])
def tickete_stats():
    conn = None
    try:
        data = request.get_json() or {}
        status = data.get('status')
        priority = data.get('priority')
        team = data.get('team')
        company = data.get('company')

        query = f"SELECT {TICKET_COLUMNS} FROM ST_ALEX.INCIDENT_TICKETS WHERE 1=1"
        params = []

        if status:
            status_list = status if isinstance(status, list) else status.split(',')
            placeholders = ','.join(['?' for _ in status_list])
            query += f" AND STATUS IN ({placeholders})"
            params.extend(status_list)

        if priority:
            priority_list = priority if isinstance(priority, list) else priority.split(',')
            placeholders = ','.join(['?' for _ in priority_list])
            query += f" AND PRIORITY IN ({placeholders})"
            params.extend(priority_list)

        if team:
            team_list = team if isinstance(team, list) else team.split(',')
            placeholders = ','.join(['?' for _ in team_list])
            query += f" AND TEAM IN ({placeholders})"
            params.extend(team_list)

        if company:
            company_list = company if isinstance(company, list) else company.split(',')
            placeholders = ','.join(['?' for _ in company_list])
            query += f" AND COMPANY IN ({placeholders})"
            params.extend(company_list)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        columns = [col[0] for col in cursor.description]
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        def count_by(field):
            counts = {}
            for r in rows:
                val = r.get(field) or "N/A"
                counts[val] = counts.get(val, 0) + 1
            return sorted([{"name": k, "value": v} for k, v in counts.items()], key=lambda x: x['value'], reverse=True)

        def avg_hours_between(start_field, end_field):
            diffs = []
            for r in rows:
                start = r.get(start_field)
                end = r.get(end_field)
                if start and end:
                    diffs.append((end - start).total_seconds() / 3600)
            if not diffs:
                return None
            return sum(diffs) / len(diffs)

        now = datetime.now()
        sla_breach = 0
        for r in rows:
            est = r.get('ESTIMATED_RESOLUTION_DATETIME')
            if not est:
                continue
            resolved = r.get('RESOLVED_DATETIME')
            if resolved:
                if resolved > est:
                    sla_breach += 1
            else:
                if now > est:
                    sla_breach += 1

        tickets_per_month = {}
        for r in rows:
            submit = r.get('SUBMIT_DATETIME')
            if submit:
                key = f"{submit.year}-{submit.month:02d}"
                tickets_per_month[key] = tickets_per_month.get(key, 0) + 1
        tickets_per_month_list = [{"name": k, "value": v} for k, v in sorted(tickets_per_month.items())]

        company_data = count_by('COMPANY')[:7]
        project_data = count_by('PROJECT')[:7]

        return jsonify({
            "total": len(rows),
            "open": sum(1 for r in rows if r.get('STATUS') == 'Open'),
            "inProgress": sum(1 for r in rows if r.get('STATUS') == 'In Progress'),
            "pending": sum(1 for r in rows if r.get('STATUS') == 'Pending'),
            "critical": sum(1 for r in rows if r.get('PRIORITY') == 'Critical'),
            "avgResolutionHours": avg_hours_between('SUBMIT_DATETIME', 'RESOLVED_DATETIME'),
            "avgClosureHours": avg_hours_between('SUBMIT_DATETIME', 'CLOSED_DATETIME'),
            "slaBreach": sla_breach,
            "statusData": count_by('STATUS'),
            "priorityData": count_by('PRIORITY'),
            "companyData": company_data,
            "teamData": count_by('TEAM'),
            "serviceData": count_by('SERVICE'),
            "projectData": project_data,
            "ticketsPerMonth": tickets_per_month_list,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/tickete/filter-options', methods=['GET'])
def filter_options():
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT STATUS, PRIORITY, COMPANY, TEAM, ASSIGNED_PERSON FROM ST_ALEX.INCIDENT_TICKETS")
        rows = cursor.fetchall()

        def unique_sorted(idx):
            return sorted({r[idx] for r in rows if r[idx]})

        return jsonify({
            "status": unique_sorted(0),
            "priority": unique_sorted(1),
            "company": unique_sorted(2),
            "team": unique_sorted(3),
            "assignedPerson": unique_sorted(4),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/tickete/<int:id>', methods=['GET'])
def get_ticket(id):
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ST_ALEX.INCIDENT_TICKETS WHERE ID = ?", id)
        columns = [col[0] for col in cursor.description]
        row = cursor.fetchone()
        if row:
            return jsonify(dict(zip(columns, row)))
        return jsonify({"error": "Ticket negasit"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()



@app.route('/tickete', methods=['POST'])
@require_role("Agent")
def add_ticket():
    conn = None
    try:
        data = request.get_json()
        if not data or not data.get('TICKET_NUMBER') or not data.get('STATUS') or not data.get('PRIORITY'):
            return jsonify({"error": "TICKET_NUMBER, STATUS and PRIORITY are required"}), 400

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO ST_ALEX.INCIDENT_TICKETS 
            (TICKET_NUMBER, STATUS, PRIORITY, COMPANY, PROJECT, TEAM, ASSIGNED_PERSON, SERVICE, DESCRIPTION, SUBMIT_DATETIME)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
        """, (
            data['TICKET_NUMBER'],
            data['STATUS'],
            data['PRIORITY'],
            data.get('COMPANY', ''),
            data.get('PROJECT', ''),
            data.get('TEAM', ''),
            data.get('ASSIGNED_PERSON', ''),
            data.get('SERVICE', ''),
            data.get('DESCRIPTION', '')
        ))
        conn.commit()
        return jsonify({"mesaj": "Ticket adaugat cu succes!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()



@app.route('/tickete/import', methods=['POST'])
@require_role("Admin")
def import_tickete():
    conn = None
    try:
        data = request.get_json()
        tickete = data.get('tickete', [])
        conn = get_connection()
        cursor = conn.cursor()
        inserted = 0
        updated = 0
        for t in tickete:
            ticket_number = t.get('TICKET_NUMBER', '')
            cursor.execute("SELECT ID FROM ST_ALEX.INCIDENT_TICKETS WHERE TICKET_NUMBER = ?", ticket_number)
            existing = cursor.fetchone()

            if existing:
                cursor.execute("""
                    UPDATE ST_ALEX.INCIDENT_TICKETS SET
                        STATUS = ?, PRIORITY = ?, COMPANY = ?, PROJECT = ?, TEAM = ?,
                        ASSIGNED_PERSON = ?, SERVICE = ?, DESCRIPTION = ?,
                        SUBMIT_DATETIME = ISNULL(?, SUBMIT_DATETIME),
                        RESOLVED_DATETIME = ?,
                        CLOSED_DATETIME = ?,
                        ESTIMATED_RESOLUTION_DATETIME = ?,
                        LAST_MODIFIED_DATETIME = GETDATE()
                    WHERE ID = ?
                """, (
                    t.get('STATUS', 'Open'),
                    t.get('PRIORITY', 'Medium'),
                    t.get('COMPANY', ''),
                    t.get('PROJECT', ''),
                    t.get('TEAM', ''),
                    t.get('ASSIGNED_PERSON', ''),
                    t.get('SERVICE', ''),
                    t.get('DESCRIPTION', ''),
                    t.get('SUBMIT_DATETIME'),
                    t.get('RESOLVED_DATETIME'),
                    t.get('CLOSED_DATETIME'),
                    t.get('ESTIMATED_RESOLUTION_DATETIME'),
                    existing[0],
                ))
                updated += 1
            else:
                cursor.execute("""
                    INSERT INTO ST_ALEX.INCIDENT_TICKETS 
                    (TICKET_NUMBER, STATUS, PRIORITY, COMPANY, PROJECT, TEAM, ASSIGNED_PERSON, SERVICE, DESCRIPTION,
                     SUBMIT_DATETIME, RESOLVED_DATETIME, CLOSED_DATETIME, ESTIMATED_RESOLUTION_DATETIME)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ISNULL(?, GETDATE()), ?, ?, ?)
                """, (
                    ticket_number,
                    t.get('STATUS', 'Open'),
                    t.get('PRIORITY', 'Medium'),
                    t.get('COMPANY', ''),
                    t.get('PROJECT', ''),
                    t.get('TEAM', ''),
                    t.get('ASSIGNED_PERSON', ''),
                    t.get('SERVICE', ''),
                    t.get('DESCRIPTION', ''),
                    t.get('SUBMIT_DATETIME'),
                    t.get('RESOLVED_DATETIME'),
                    t.get('CLOSED_DATETIME'),
                    t.get('ESTIMATED_RESOLUTION_DATETIME'),
                ))
                inserted += 1
        conn.commit()
        return jsonify({"mesaj": f"{inserted} tickete adaugate, {updated} tickete actualizate!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()



@app.route('/tickete/<int:id>', methods=['PUT'])
@require_role("Agent")
def update_ticket(id):
    conn = None
    try:
        data = request.get_json()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE ST_ALEX.INCIDENT_TICKETS SET
                STATUS = ?,
                PRIORITY = ?,
                COMPANY = ?,
                PROJECT = ?,
                TEAM = ?,
                ASSIGNED_PERSON = ?,
                SERVICE = ?,
                DESCRIPTION = ?,
                LAST_MODIFIED_DATETIME = GETDATE()
            WHERE ID = ?
        """, (
            data['STATUS'],
            data['PRIORITY'],
            data.get('COMPANY', ''),
            data.get('PROJECT', ''),
            data.get('TEAM', ''),
            data.get('ASSIGNED_PERSON', ''),
            data.get('SERVICE', ''),
            data.get('DESCRIPTION', ''),
            id
        ))
        conn.commit()
        return jsonify({"mesaj": "Ticket modificat cu succes!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()



@app.route('/tickete/<int:id>', methods=['DELETE'])
@require_role("Team Lead")
def delete_ticket(id):
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM ST_ALEX.INCIDENT_TICKETS WHERE ID = ?", id)
        conn.commit()
        return jsonify({"mesaj": "Ticket sters cu succes!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/tickete/prioritate/<string:priority>', methods=['GET'])
def get_tickete_by_priority(priority):
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ST_ALEX.GetTicketeByPriority(?)", priority)
        columns = [col[0] for col in cursor.description]
        tickete = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return jsonify(tickete)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()



@app.route('/tickete/count/prioritate/<string:priority>', methods=['GET'])
def get_count_by_priority(priority):
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT ST_ALEX.GetNrTicketeByPriority(?)", priority)
        count = cursor.fetchone()[0]
        return jsonify({"priority": priority, "count": count})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()



@app.route('/chatbot', methods=['POST'])
def chatbot_route():
    data = request.get_json() or {}
    question = (data.get('message') or '').strip()
    history = data.get('history') or []
    if not question:
        return jsonify({"error": "Empty message"}), 400
    result = ask_chatbot(question, history=history)
    return jsonify(result)



@app.route('/exports/<path:filename>')
def download_export(filename):
    return send_from_directory(EXPORTS_DIR, filename, as_attachment=True)



@app.route('/chatbot/history', methods=['GET'])
@require_role("Admin")
def get_chat_history_route():
    try:
        history = queries.get_chat_history()
        return jsonify(history)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/chatbot/history/<int:chat_id>', methods=['DELETE'])
@require_role("Admin")
def delete_chat_log_route(chat_id):
    try:
        queries.delete_chat_log(chat_id)
        return jsonify({"mesaj": "Conversatie stearsa cu succes!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/chatbot/history', methods=['DELETE'])
@require_role("Admin")
def delete_all_chat_history_route():
    try:
        queries.delete_all_chat_history()
        return jsonify({"mesaj": "Istoric sters cu succes!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/users', methods=['GET'])
@require_role("Admin")
def get_users():
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT ID, FIRST_NAME, ROLE FROM ST_ALEX.USERS ORDER BY FIRST_NAME")
        columns = [col[0] for col in cursor.description]
        users = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return jsonify(users)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()



@app.route('/users', methods=['POST'])
@require_role("Admin")
def add_user():
    conn = None
    try:
        data = request.get_json() or {}
        first_name = (data.get('FIRST_NAME') or '').strip()
        password = data.get('PASSWORD') or ''
        role = data.get('ROLE') or 'Viewer'

        if not first_name or not password:
            return jsonify({"error": "Username and password are required"}), 400
        if role not in ROLE_RANK:
            return jsonify({"error": "Invalid role"}), 400

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT ID FROM ST_ALEX.USERS WHERE LOWER(FIRST_NAME) = LOWER(?)", first_name)
        if cursor.fetchone():
            return jsonify({"error": "A user with this username already exists"}), 400

        hashed_password = generate_password_hash(password)
        cursor.execute(
            "INSERT INTO ST_ALEX.USERS (FIRST_NAME, PASSWORD, ROLE) VALUES (?, ?, ?)",
            first_name, hashed_password, role
        )
        conn.commit()
        return jsonify({"mesaj": "User created successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/users/<int:id>', methods=['DELETE'])
@require_role("Admin")
def delete_user(id):
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM ST_ALEX.USERS WHERE ID = ?", id)
        conn.commit()
        return jsonify({"mesaj": "User deleted successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


if __name__ == '__main__':

    debug_mode = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)