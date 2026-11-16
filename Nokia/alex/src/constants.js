// Valori si mappari partajate intre componente (culori, optiuni, ordini de sortare, roluri).
// Astea sunt constante JS, nu CSS - fiecare componenta isi are propriul CSS separat,
// dar are sens ca aceste valori (culori de status, ordine de sortare) sa fie definite o singura data.

export const statusColor = {
  "Open": "#3b82f6",
  "In Progress": "#f59e0b",
  "Resolved": "#10b981",
  "Closed": "#6b7280",
  "Pending": "#8b5cf6",
  "Unsolved": "#f43f5e",
};

export const priorityColor = {
  "Critical": "#ef4444",
  "High": "#f97316",
  "Medium": "#eab308",
  "Low": "#22c55e",
};

export const statusOptions = ["Open", "In Progress", "Pending", "Unsolved", "Resolved", "Closed"];
export const priorityOptions = ["Low", "Medium", "High", "Critical"];

// Ordine logica pentru Priority la sortare: cel mai mic (valoare 1) = Critical, cel mai mare = Low
export const priorityOrder = { "Critical": 1, "High": 2, "Medium": 3, "Low": 4 };

// Ordine logica pentru Status la sortare, de la cel mai important la cel mai neimportant
export const statusOrder = { "In Progress": 1, "Open": 2, "Pending": 3, "Unsolved": 4, "Resolved": 5, "Closed": 6 };

// Ierarhia gradelor de administrare - folosita pentru a decide ce poate face fiecare utilizator
export const roleRank = { "Viewer": 1, "Agent": 2, "Team Lead": 3, "Admin": 4, "Super Admin": 5 };

// Optiunile de rol disponibile la crearea unui cont nou (UsersPage)
export const roleOptions = ["Viewer", "Agent", "Team Lead", "Admin", "Super Admin"];