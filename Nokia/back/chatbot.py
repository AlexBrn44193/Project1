import os
import re
import json
from openai import AzureOpenAI

import queries

client = AzureOpenAI(
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    api_version="2025-04-01-preview",
    azure_endpoint="https://synopsisopenai.openai.azure.com/",
)

MODEL = "gpt-5-mini"

ALLOWED_STATUS = ["Open", "In Progress", "Pending", "Unsolved", "Resolved", "Closed"]
ALLOWED_PRIORITY = ["Low", "Medium", "High", "Critical"]
ALLOWED_INTENTS = ["list", "stats", "export"]
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")

SYSTEM_PROMPT = """You help answer questions about a ticketing system by choosing FILTERS.
You never write SQL. You only output a small JSON object describing which filters to apply.

Respond with ONLY a JSON object (no markdown, no explanation), with this exact shape:
{
  "intent": "list" or "stats" or "export",
  "status": [list of strings or empty list],
  "priority": [list of strings or empty list],
  "team": [list of strings or empty list],
  "company": [list of strings or empty list],
  "person": [list of strings or empty list],
  "date_start": "YYYY-MM-DD" or null,
  "date_end": "YYYY-MM-DD" or null,
  "search": "text" or null,
  "sla_breach": true or false
}

Use intent "stats" for questions about counts, averages, totals, or distributions.
Use intent "list" when the user wants to see specific tickets described in text.
Use intent "export" when the user asks to export, download, or get an Excel/file of tickets.
Allowed status values: Open, In Progress, Pending, Unsolved, Resolved, Closed.
Allowed priority values: Low, Medium, High, Critical.
If a filter does not apply, use an empty list (for lists) or null (for text/dates) or false (for sla_breach).
Never include any field other than the ones listed above.

IMPORTANT - conversation context: you will be given the recent conversation history before the current question.
Treat the filters as a RUNNING STATE across the whole conversation, not a single isolated question:
- Each follow-up ("and for team X", "what about Y", "export it", "yes") normally ADDS TO or REFINES the filters
  already established in the most recent question, rather than replacing them entirely.
- Example: if the previous turn was about open tickets, and the user now asks "how many for Orange?", the
  correct filters are status=Open AND company=Orange (both combined), not just company=Orange alone.
- When the current message clearly asks about something new and unrelated (a different topic entirely), then
  reset the filters that no longer apply.
- When intent is "export" and the current message does not mention any new filters, reuse the EXACT combined
  filters from the most recent list/stats answer in the conversation - do not drop any of them.
If genuinely unsure whether a filter should carry over, prefer keeping it rather than dropping it.
"""


def _clean_string_list(value, allowed=None):
    if not isinstance(value, list):
        return []
    cleaned = [str(v) for v in value if isinstance(v, str)]
    if allowed is not None:
        cleaned = [v for v in cleaned if v in allowed]
    return cleaned


def _clean_date(value):
    if isinstance(value, str) and DATE_PATTERN.match(value):
        return value
    return None


def validate_and_clean(parsed):
    if not isinstance(parsed, dict):
        raise ValueError("Response is not a JSON object")

    intent = parsed.get("intent")
    if intent not in ALLOWED_INTENTS:
        intent = "list"

    return {
        "intent": intent,
        "status": _clean_string_list(parsed.get("status"), ALLOWED_STATUS),
        "priority": _clean_string_list(parsed.get("priority"), ALLOWED_PRIORITY),
        "team": _clean_string_list(parsed.get("team")),
        "company": _clean_string_list(parsed.get("company")),
        "person": _clean_string_list(parsed.get("person")),
        "date_start": _clean_date(parsed.get("date_start")),
        "date_end": _clean_date(parsed.get("date_end")),
        "search": str(parsed.get("search")) if isinstance(parsed.get("search"), str) else None,
        "sla_breach": bool(parsed.get("sla_breach")) if isinstance(parsed.get("sla_breach"), bool) else False,
    }


def _phrase_export_confirmation(user_question, count, history):

    messages = []
    if history:
        for turn in history[-8:]:
            role = turn.get("role")
            text = turn.get("content")
            if role in ("user", "assistant") and text:
                messages.append({"role": role, "content": text})
    messages.append({
        "role": "user",
        "content": (
            f"The user just asked to export tickets. We found exactly {count} matching tickets and "
            "generated an Excel file for them. Write ONE short sentence confirming this count and that "
            "they can download it below. Do not invent any other details. Determine the language from "
            "the EARLIEST message in this conversation and answer consistently in that language, even if "
            "the current message is typed in a different language."
        ),
    })
    try:
        resp = client.responses.create(model=MODEL, input=messages)
        return resp.output_text.strip()
    except Exception:
        return f"Found {count} matching tickets. You can download the Excel file below." if count else "No tickets matched your filters, so no file was generated."


def _save_history(question, answer, intent, result_count):
    """Salvam conversatia in istoric - daca esueaza (ex: tabela nu exista inca), nu blocam raspunsul catre user."""
    try:
        queries.save_chat_log(question, answer, intent, result_count)
    except Exception as e:
        print(f"Nu am putut salva istoricul conversatiei: {e}")


def ask_chatbot(user_question, history=None):

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        for turn in history[-8:]: 
            role = turn.get("role")
            text = turn.get("content")
            if role in ("user", "assistant") and text:
                messages.append({"role": role, "content": text})
    messages.append({"role": "user", "content": user_question})

    plan_response = client.responses.create(
        model=MODEL,
        input=messages,
    )
    raw_text = plan_response.output_text.strip()
    raw_text = re.sub(r"^```(json)?", "", raw_text).strip()
    raw_text = re.sub(r"```$", "", raw_text).strip()

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        return {"error": "AI response was not valid JSON", "raw": raw_text}

    try:
        filters = validate_and_clean(parsed)
    except ValueError as e:
        return {"error": str(e), "raw": raw_text}

    if filters["intent"] == "export":
        rows = queries.search_tickets(filters)
        if not rows:
            answer = _phrase_export_confirmation(user_question, 0, history)
            _save_history(user_question, answer, "export", 0)
            return {
                "answer": answer,
                "intent": "export",
                "filters_used": filters,
                "result_count": 0,
            }
        filename = queries.generate_excel_file(rows)
        download_url = f"http://localhost:5000/exports/{filename}"
        answer = _phrase_export_confirmation(user_question, len(rows), history)
        _save_history(user_question, answer, "export", len(rows))
        return {
            "answer": answer,
            "intent": "export",
            "filters_used": filters,
            "result_count": len(rows),
            "download_url": download_url,
        }

    if filters["intent"] == "stats":
        data = queries.compute_stats(filters)
    else:
        data = queries.search_tickets(filters)
        if isinstance(data, list) and len(data) > 50:
            data = data[:50]

    summary_messages = []
    if history:
        for turn in history[-8:]:
            role = turn.get("role")
            text = turn.get("content")
            if role in ("user", "assistant") and text:
                summary_messages.append({"role": role, "content": text})
    summary_messages.append({
        "role": "user",
        "content": (
            f"Question: {user_question}\n"
            f"Data (JSON): {json.dumps(data, default=str)}\n\n"
            "Answer the question naturally in 1-4 sentences, based only on this data. "
            "IMPORTANT: determine the language from the EARLIEST message in this conversation (not "
            "necessarily the current one) and answer consistently in that same language throughout, "
            "even if the current message is typed in a different language or mixes languages."
        ),
    })

    summary_response = client.responses.create(
        model=MODEL,
        input=summary_messages,
    )
    answer = summary_response.output_text
    result_count = len(data) if isinstance(data, list) else data.get("total")
    _save_history(user_question, answer, filters["intent"], result_count)

    return {
        "answer": answer,
        "intent": filters["intent"],
        "filters_used": filters,
        "result_count": result_count,
    }