import React, { useState, useMemo, useEffect } from "react";


const seed = [
  { id: 1, date: "2026-03-01", amount: 5000, category: "Salary", type: "income" },
  { id: 2, date: "2026-03-05", amount: 1000, category: "Food", type: "expense" },
  { id: 3, date: "2026-03-10", amount: 2000, category: "Freelance", type: "income" },
  { id: 4, date: "2026-03-15", amount: 800, category: "Transport", type: "expense" },
  { id: 5, date: "2026-03-20", amount: 1500, category: "Shopping", type: "expense" },
];

const categories = ["Salary", "Freelance", "Food", "Transport", "Shopping", "Bills", "Other"];


const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

function groupByCategory(list) {
  const map = {};
  list.forEach((t) => {
    map[t.category] = (map[t.category] || 0) + Number(t.amount);
  });
  return map;
}

function groupByMonth(list) {
  const map = {};
  list.forEach((t) => {
    const m = t.date.slice(0, 7); // YYYY-MM
    map[m] = (map[m] || 0) + (t.type === "income" ? t.amount : -t.amount);
  });
  return map;
}

function BarChart({ data }) {
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, v]) => Math.abs(v)));
  return (
    <svg viewBox="0 0 400 200" className="chart">
      {entries.map(([k, v], i) => {
        const h = (Math.abs(v) / max) * 150;
        const x = 20 + i * 60;
        const y = 170 - h;
        return (
          <g key={k}>
            <rect x={x} y={y} width="30" height={h} />
            <text x={x} y={190} fontSize="10">{k}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ data }) {
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  const min = Math.min(0, ...entries.map(([, v]) => v));
  const range = max - min || 1;

  const points = entries.map(([, v], i) => {
    const x = 20 + i * (360 / Math.max(1, entries.length - 1));
    const y = 170 - ((v - min) / range) * 150;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 400 200" className="chart">
      <polyline fill="none" strokeWidth="2" points={points} />
      {entries.map(([k], i) => {
        const x = 20 + i * (360 / Math.max(1, entries.length - 1));
        return <text key={k} x={x} y={190} fontSize="10">{k}</text>;
      })}
    </svg>
  );
}


export default function App() {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem("tx");
    return saved ? JSON.parse(saved) : seed;
  });
  const [role, setRole] = useState("viewer");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const [form, setForm] = useState({ date: "", amount: "", category: "Food", type: "expense" });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    localStorage.setItem("tx", JSON.stringify(transactions));
  }, [transactions]);

  const income = useMemo(() => transactions.filter(t => t.type === "income").reduce((a, b) => a + Number(b.amount), 0), [transactions]);
  const expense = useMemo(() => transactions.filter(t => t.type === "expense").reduce((a, b) => a + Number(b.amount), 0), [transactions]);
  const balance = income - expense;

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (query) list = list.filter(t => t.category.toLowerCase().includes(query.toLowerCase()));
    if (typeFilter !== "all") list = list.filter(t => t.type === typeFilter);
    list.sort((a, b) => {
      let v = 0;
      if (sortKey === "amount") v = a.amount - b.amount;
      if (sortKey === "date") v = a.date.localeCompare(b.date);
      if (sortKey === "category") v = a.category.localeCompare(b.category);
      return sortDir === "asc" ? v : -v;
    });
    return list;
  }, [transactions, query, typeFilter, sortKey, sortDir]);

  const byCategory = useMemo(() => groupByCategory(transactions.filter(t => t.type === "expense")), [transactions]);
  const byMonth = useMemo(() => groupByMonth(transactions), [transactions]);

  const highestCategory = useMemo(() => {
    const entries = Object.entries(byCategory);
    if (!entries.length) return "-";
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [byCategory]);

  const resetForm = () => setForm({ date: "", amount: "", category: "Food", type: "expense" });

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.date || !form.amount) return;
    if (editingId) {
      setTransactions((prev) => prev.map(t => t.id === editingId ? { ...t, ...form, amount: Number(form.amount) } : t));
      setEditingId(null);
    } else {
      setTransactions((prev) => [{ id: Date.now(), ...form, amount: Number(form.amount) }, ...prev]);
    }
    resetForm();
  };

  const onEdit = (t) => {
    setEditingId(t.id);
    setForm({ date: t.date, amount: t.amount, category: t.category, type: t.type });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = (id) => setTransactions((prev) => prev.filter(t => t.id !== id));

  return (
    <div className="app">
      <header className="header">
        <h1>Finance Dashboard</h1>
        <div className="role">
          <label>Role:</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </header>

      {/* Summary */}
      <section className="cards">
        <div className="card">
          <p>Balance</p>
          <h2>{fmt(balance)}</h2>
        </div>
        <div className="card">
          <p>Income</p>
          <h2>{fmt(income)}</h2>
        </div>
        <div className="card">
          <p>Expense</p>
          <h2>{fmt(expense)}</h2>
        </div>
      </section>

      {/* Charts */}
      <section className="grid">
        <div className="panel">
          <h3>Spending by Category</h3>
          {Object.keys(byCategory).length ? <BarChart data={byCategory} /> : <p className="empty">No data</p>}
        </div>
        <div className="panel">
          <h3>Monthly Trend</h3>
          {Object.keys(byMonth).length ? <LineChart data={byMonth} /> : <p className="empty">No data</p>}
        </div>
      </section>

      {/* Form (Admin) */}
      {role === "admin" && (
        <section className="panel">
          <h3>{editingId ? "Edit Transaction" : "Add Transaction"}</h3>
          <form className="form" onSubmit={onSubmit}>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <button type="submit">{editingId ? "Update" : "Add"}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); resetForm(); }}>Cancel</button>}
          </form>
        </section>
      )}

      {/* Filters */}
      <section className="panel filters">
        <input placeholder="Search category" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
          <option value="date">Sort by Date</option>
          <option value="amount">Sort by Amount</option>
          <option value="category">Sort by Category</option>
        </select>
        <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </section>

      {/* Table */}
      <section className="panel">
        <h3>Transactions</h3>
        {filtered.length === 0 ? (
          <p className="empty">No transactions found</p>
        ) : (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Type</th>
                  {role === "admin" && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{fmt(t.amount)}</td>
                    <td>{t.category}</td>
                    <td>
                      <span className={`badge ${t.type}`}>{t.type}</span>
                    </td>
                    {role === "admin" && (
                      <td className="actions">
                        <button onClick={() => onEdit(t)}>Edit</button>
                        <button onClick={() => onDelete(t.id)}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Insights */}
      <section className="panel insights">
        <h3>Insights</h3>
        <div className="ins-grid">
          <div className="ins">
            <p>Highest Spending Category</p>
            <h4>{highestCategory}</h4>
          </div>
          <div className="ins">
            <p>Total Transactions</p>
            <h4>{transactions.length}</h4>
          </div>
          <div className="ins">
            <p>Net This Month</p>
            <h4>{fmt(Object.values(byMonth).slice(-1)[0] || 0)}</h4>
          </div>
        </div>
      </section>

      {/* Styles */}
      <style>{`
        *{box-sizing:border-box}
        body{margin:0}
        .app{max-width:1100px;margin:0 auto;padding:16px;font-family:Arial, Helvetica, sans-serif}
        .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
        .role{display:flex;gap:8px;align-items:center}
        .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .card{background:#fff;border:1px solid #eee;border-radius:12px;padding:14px;box-shadow:0 4px 10px rgba(0,0,0,0.05)}
        .card p{margin:0;color:#666}
        .card h2{margin:6px 0 0}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
        .panel{background:#fff;border:1px solid #eee;border-radius:12px;padding:14px;margin-top:12px;box-shadow:0 4px 10px rgba(0,0,0,0.05)}
        .chart{width:100%;height:220px}
        .empty{color:#888}
        .form{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
        .form input,.form select,.filters input,.filters select{padding:8px;border:1px solid #ddd;border-radius:8px}
        .form button{padding:8px;border-radius:8px;border:none;cursor:pointer}
        .filters{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px}
        .tableWrap{overflow:auto}
        .table{width:100%;border-collapse:collapse}
        .table th,.table td{padding:10px;border-bottom:1px solid #eee;text-align:left}
        .badge{padding:4px 8px;border-radius:999px;font-size:12px}
        .badge.income{background:#e8f8ee}
        .badge.expense{background:#fdeaea}
        .actions button{margin-right:6px}
        .insights .ins-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .ins{background:#fafafa;border:1px dashed #eee;border-radius:10px;padding:10px}
        @media (max-width: 768px){
          .cards{grid-template-columns:1fr}
          .grid{grid-template-columns:1fr}
          .form{grid-template-columns:1fr 1fr}
          .filters{grid-template-columns:1fr 1fr}
          .insights .ins-grid{grid-template-columns:1fr}
        }
      `}</style>
    </div>
  );
}
