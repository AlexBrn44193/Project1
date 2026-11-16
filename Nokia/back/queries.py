from datetime import datetime
from db import get_connection
import os
import uuid
from openpyxl import Workbook

TICKET_COLUMNS = """ID, TICKET_NUMBER, STATUS, PRIORITY, COMPANY, PROJECT, TEAM, ASSIGNED_PERSON, SERVICE,
    DESCRIPTION, SUBMIT_DATETIME, RESOLVED_DATETIME, CLOSED_DATETIME, ESTIMATED_RESOLUTION_DATETIME"""


def search_tickets(filters):
    
    status = filters.get('status')
    priority = filters.get('priority')
    team = filters.get('team')
    company = filters.get('company')
    person = filters.get('person')
    date_start = filters.get('date_start')
    date_end = filters.get('date_end')
    search = filters.get('search')
    sla_breach = filters.get('sla_breach')

    query = f"SELECT {TICKET_COLUMNS} FROM ST_ALEX.INCIDENT_TICKETS WHERE 1=1"
    params = []

    if status:
        placeholders = ','.join(['?' for _ in status])
        query += f" AND STATUS IN ({placeholders})"
        params.extend(status)

    if priority:
        placeholders = ','.join(['?' for _ in priority])
        query += f" AND PRIORITY IN ({placeholders})"
        params.extend(priority)

    if team:
        placeholders = ','.join(['?' for _ in team])
        query += f" AND TEAM IN ({placeholders})"
        params.extend(team)

    if company:
        placeholders = ','.join(['?' for _ in company])
        query += f" AND COMPANY IN ({placeholders})"
        params.extend(company)

    if person:
        placeholders = ','.join(['?' for _ in person])
        query += f" AND ASSIGNED_PERSON IN ({placeholders})"
        params.extend(person)

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
    try:
        cursor = conn.cursor()
        cursor.execute(query, params)
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
    finally:
        conn.close()


def compute_stats(filters):
   
    status = filters.get('status')
    priority = filters.get('priority')
    team = filters.get('team')
    company = filters.get('company')

    query = f"SELECT {TICKET_COLUMNS} FROM ST_ALEX.INCIDENT_TICKETS WHERE 1=1"
    params = []

    if status:
        placeholders = ','.join(['?' for _ in status])
        query += f" AND STATUS IN ({placeholders})"
        params.extend(status)

    if priority:
        placeholders = ','.join(['?' for _ in priority])
        query += f" AND PRIORITY IN ({placeholders})"
        params.extend(priority)

    if team:
        placeholders = ','.join(['?' for _ in team])
        query += f" AND TEAM IN ({placeholders})"
        params.extend(team)

    if company:
        placeholders = ','.join(['?' for _ in company])
        query += f" AND COMPANY IN ({placeholders})"
        params.extend(company)

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query, params)
        columns = [col[0] for col in cursor.description]
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    finally:
        conn.close()

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

    return {
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
        "companyData": count_by('COMPANY'),
        "teamData": count_by('TEAM'),
    }


def get_filter_options():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT STATUS, PRIORITY, COMPANY, TEAM, ASSIGNED_PERSON FROM ST_ALEX.INCIDENT_TICKETS")
        rows = cursor.fetchall()
    finally:
        conn.close()

    def unique_sorted(idx):
        return sorted({r[idx] for r in rows if r[idx]})

    return {
        "status": unique_sorted(0),
        "priority": unique_sorted(1),
        "company": unique_sorted(2),
        "team": unique_sorted(3),
        "assignedPerson": unique_sorted(4),
    }





EXPORTS_DIR = os.path.join(os.path.dirname(__file__), "exports")
os.makedirs(EXPORTS_DIR, exist_ok=True)

EXPORT_COLUMNS = [
    "TICKET_NUMBER", "STATUS", "PRIORITY", "COMPANY", "PROJECT",
    "TEAM", "ASSIGNED_PERSON", "SERVICE", "DESCRIPTION",
]


def generate_excel_file(rows):
    wb = Workbook()
    ws = wb.active
    ws.title = "Tickets"
    ws.append(EXPORT_COLUMNS)
    for r in rows:
        ws.append([r.get(col, "") for col in EXPORT_COLUMNS])

    filename = f"export_{uuid.uuid4().hex[:8]}.xlsx"
    filepath = os.path.join(EXPORTS_DIR, filename)
    wb.save(filepath)
    return filename




def save_chat_log(question, answer, intent, result_count):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO ST_ALEX.CHAT_HISTORY (QUESTION, ANSWER, INTENT, RESULT_COUNT, CREATED_AT) VALUES (?, ?, ?, ?, GETDATE())",
            question, answer, intent, result_count,
        )
        conn.commit()
    finally:
        conn.close()


def get_chat_history():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT ID, QUESTION, ANSWER, INTENT, RESULT_COUNT, CREATED_AT FROM ST_ALEX.CHAT_HISTORY ORDER BY CREATED_AT DESC"
        )
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
    finally:
        conn.close()


def delete_chat_log(chat_id):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM ST_ALEX.CHAT_HISTORY WHERE ID = ?", (chat_id,))
        conn.commit()
    finally:
        conn.close()


def delete_all_chat_history():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM ST_ALEX.CHAT_HISTORY")
        conn.commit()
    finally:
        conn.close()