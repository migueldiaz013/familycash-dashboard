import { useState, useEffect, useCallback } from "react"
import { supabase } from "./supabase.js"

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "food",          label: "Comida",      icon: "🛒", color: "#4ade80" },
  { id: "transport",     label: "Transporte",  icon: "🚗", color: "#60a5fa" },
  { id: "health",        label: "Salud",       icon: "💊", color: "#f87171" },
  { id: "education",     label: "Educación",   icon: "📚", color: "#a78bfa" },
  { id: "entertainment", label: "Ocio",        icon: "🎬", color: "#fb923c" },
  { id: "home",          label: "Hogar",       icon: "🏠", color: "#34d399" },
  { id: "clothing",      label: "Ropa",        icon: "👕", color: "#f472b6" },
  { id: "services",      label: "Servicios",   icon: "💡", color: "#fbbf24" },
  { id: "other",         label: "Otros",       icon: "📦", color: "#94a3b8" },
]

const DEFAULT_BUDGETS = {
  food: 40000, transport: 15000, health: 10000, education: 20000,
  entertainment: 8000, home: 25000, clothing: 10000, services: 12000, other: 5000,
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
const fmt = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0)
const getCat = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[8]
const monthKey = (m, y) => `${y}-${String(m + 1).padStart(2, "0")}`

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:200 }}>
      <div style={{ width:36, height:36, border:"3px solid rgba(255,255,255,0.08)", borderTop:"3px solid #60a5fa", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
    </div>
  )
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:999, padding:"12px 20px", borderRadius:10, fontSize:13, color:"#f1f5f9", animation:"slideIn 0.2s ease", background: type==="error" ? "#7f1d1d" : "#14532d", boxShadow:"0 8px 32px #00000066" }}>
      {type === "error" ? "⚠️" : "✅"} {msg}
    </div>
  )
}

function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"18px 20px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-10, right:-10, fontSize:48, opacity:0.06 }}>{icon}</div>
      <div style={{ fontSize:11, color:"#64748b", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:800, color:accent, letterSpacing:"-1px", lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, color:"#475569", marginTop:6 }}>{sub}</div>
    </div>
  )
}

function BudgetRing({ cat, spent, budget }) {
  const pct = Math.min((spent / (budget || 1)) * 100, 100)
  const over = spent > budget
  const r = 22, circ = 2 * Math.PI * r, fill = (pct / 100) * circ
  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${over ? "#f8717133" : "rgba(255,255,255,0.06)"}`, borderRadius:12, padding:"14px 10px", textAlign:"center" }}>
      <div style={{ position:"relative", width:54, height:54, margin:"0 auto 8px" }}>
        <svg width="54" height="54" style={{ transform:"rotate(-90deg)" }}>
          <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
          <circle cx="27" cy="27" r={r} fill="none" stroke={over ? "#f87171" : cat.color} strokeWidth="4"
            strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
            style={{ transition:"stroke-dasharray 0.8s ease" }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{cat.icon}</div>
      </div>
      <div style={{ fontSize:11, fontWeight:600, color:"#e2e8f0" }}>{cat.label}</div>
      <div style={{ fontSize:11, color: over ? "#f87171" : "#64748b", marginTop:2 }}>{fmt(spent)}</div>
      <div style={{ fontSize:10, color:"#334155" }}>{Math.round(pct)}%</div>
    </div>
  )
}

function ExpenseRow({ exp, onDelete }) {
  const cat = getCat(exp.category)
  const dateStr = exp.expense_date ? new Date(exp.expense_date).toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit" }) : ""
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", marginBottom:6, transition:"background 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.06)"}
      onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.03)"}>
      <div style={{ width:34, height:34, borderRadius:8, background:cat.color+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{cat.icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, color:"#e2e8f0", fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{exp.description}</div>
        <div style={{ fontSize:11, color:"#475569", marginTop:2, display:"flex", gap:8 }}>
          <span>👤 {exp.user_name || "Usuario"}</span>
          <span>·</span>
          <span>{dateStr}</span>
          {exp.source === "whatsapp" && <span style={{ color:"#4ade80", fontSize:10 }}>📱 WA</span>}
        </div>
      </div>
      <div style={{ fontSize:14, fontWeight:700, color:cat.color, flexShrink:0 }}>{fmt(exp.amount)}</div>
      {onDelete && (
        <button onClick={() => onDelete(exp.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#334155", fontSize:13, padding:"2px 6px", borderRadius:4, transition:"color 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.color="#f87171"}
          onMouseLeave={e => e.currentTarget.style.color="#334155"}>✕</button>
      )}
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const now = new Date()
  const [view, setView] = useState("dashboard")
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [filterCat, setFilterCat] = useState("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [newExp, setNewExp] = useState({ description:"", amount:"", category:"food", user_name:"", expense_date: now.toISOString().slice(0,10) })
  const [saving, setSaving] = useState(false)
  const [compareMonth, setCompareMonth] = useState(now.getMonth() === 0 ? 11 : now.getMonth() - 1)
  const [compareYear, setCompareYear] = useState(now.getMonth() === 0 ? now.getFullYear()-1 : now.getFullYear())
  const [compareExpenses, setCompareExpenses] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)

  // ── Budgets state ──────────────────────────────────────────────────────────
  const [budgets, setBudgets] = useState(DEFAULT_BUDGETS)
  const [editBudgets, setEditBudgets] = useState(DEFAULT_BUDGETS)
  const [budgetsDirty, setBudgetsDirty] = useState(false)
  const [savingBudgets, setSavingBudgets] = useState(false)

  // ── Fetch expenses ─────────────────────────────────────────────────────────
  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    const firstDay = new Date(selectedYear, selectedMonth, 1).toISOString()
    const lastDay  = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString()
    const { data, error } = await supabase.from("expenses").select("*")
      .gte("expense_date", firstDay).lte("expense_date", lastDay)
      .order("expense_date", { ascending: false })
    if (error) showToast("Error al cargar gastos: " + error.message, "error")
    else setExpenses(data || [])
    setLoading(false)
  }, [selectedMonth, selectedYear])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  // Tiempo real
  useEffect(() => {
    const channel = supabase.channel("expenses-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, fetchExpenses)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchExpenses])

  // ── Fetch budgets from Supabase ────────────────────────────────────────────
  const fetchBudgets = useCallback(async () => {
    const key = monthKey(selectedMonth, selectedYear)
    const { data } = await supabase.from("budgets").select("*").eq("month", key)
    if (data && data.length > 0) {
      const b = {}
      data.forEach(r => { b[r.category] = Number(r.amount) })
      // Fill missing categories with defaults
      CATEGORIES.forEach(c => { if (!b[c.id]) b[c.id] = DEFAULT_BUDGETS[c.id] })
      setBudgets(b)
      setEditBudgets(b)
    } else {
      // No budgets for this month — try copying from previous month
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1
      const prevYear  = selectedMonth === 0 ? selectedYear - 1 : selectedYear
      const prevKey   = monthKey(prevMonth, prevYear)
      const { data: prevData } = await supabase.from("budgets").select("*").eq("month", prevKey)
      if (prevData && prevData.length > 0) {
        const b = {}
        prevData.forEach(r => { b[r.category] = Number(r.amount) })
        CATEGORIES.forEach(c => { if (!b[c.id]) b[c.id] = DEFAULT_BUDGETS[c.id] })
        setBudgets(b)
        setEditBudgets(b)
      } else {
        setBudgets(DEFAULT_BUDGETS)
        setEditBudgets(DEFAULT_BUDGETS)
      }
    }
    setBudgetsDirty(false)
  }, [selectedMonth, selectedYear])

  useEffect(() => { fetchBudgets() }, [fetchBudgets])

  // ── Save budgets to Supabase ───────────────────────────────────────────────
  async function saveBudgets() {
    setSavingBudgets(true)
    const key = monthKey(selectedMonth, selectedYear)
    const rows = CATEGORIES.map(c => ({
      category: c.id,
      amount:   editBudgets[c.id] || DEFAULT_BUDGETS[c.id],
      month:    key,
    }))
    const { error } = await supabase.from("budgets").upsert(rows, { onConflict: "category,month" })
    setSavingBudgets(false)
    if (error) { showToast("Error al guardar presupuesto: " + error.message, "error"); return }
    setBudgets(editBudgets)
    setBudgetsDirty(false)
    showToast(`Presupuesto de ${MONTHS[selectedMonth]} guardado ✓`)
  }

  // ── Compare month data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== "compare") return
    const firstDay = new Date(compareYear, compareMonth, 1).toISOString()
    const lastDay  = new Date(compareYear, compareMonth+1, 0, 23, 59, 59).toISOString()
    supabase.from("expenses").select("*").gte("expense_date", firstDay).lte("expense_date", lastDay)
      .then(({ data }) => setCompareExpenses(data || []))
  }, [view, compareMonth, compareYear])

  // ── Derived data ───────────────────────────────────────────────────────────
  const filtered     = expenses.filter(e => filterCat === "all" || e.category === filterCat)
  const totalSpent   = expenses.reduce((s,e) => s + Number(e.amount), 0)
  const totalBudget  = Object.values(budgets).reduce((s,v) => s+v, 0)
  const compareTotal = compareExpenses.reduce((s,e) => s + Number(e.amount), 0)
  const spentByCat   = Object.fromEntries(CATEGORIES.map(c => [c.id, expenses.filter(e=>e.category===c.id).reduce((s,e)=>s+Number(e.amount),0)]))
  const compareByCat = Object.fromEntries(CATEGORIES.map(c => [c.id, compareExpenses.filter(e=>e.category===c.id).reduce((s,e)=>s+Number(e.amount),0)]))

  function showToast(msg, type="success") { setToast({ msg, type }) }

  // ── Add expense ────────────────────────────────────────────────────────────
  async function handleAdd() {
    if (!newExp.description || !newExp.amount) return
    setSaving(true)
    const { error } = await supabase.from("expenses").insert([{
      description:  newExp.description,
      amount:       Number(newExp.amount),
      category:     newExp.category,
      user_name:    newExp.user_name || "Manual",
      phone_number: "manual",
      expense_date: new Date(newExp.expense_date).toISOString(),
      source:       "manual",
    }])
    setSaving(false)
    if (error) { showToast("Error: " + error.message, "error"); return }
    showToast(`"${newExp.description}" agregado`)
    setShowAddModal(false)
    setNewExp({ description:"", amount:"", category:"food", user_name:"", expense_date: now.toISOString().slice(0,10) })
  }

  // ── Delete expense ─────────────────────────────────────────────────────────
  async function handleDelete(id) {
    const { error } = await supabase.from("expenses").delete().eq("id", id)
    if (error) { showToast("Error al eliminar", "error"); return }
    showToast("Gasto eliminado")
  }

  const S = styles
  const navItems = [
    { id:"dashboard", icon:"◈", label:"Dashboard" },
    { id:"expenses",  icon:"≡", label:"Gastos" },
    { id:"budget",    icon:"◎", label:"Presupuesto" },
    { id:"compare",   icon:"⇄", label:"Comparar meses" },
  ]

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:none; } }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:#1e293b; border-radius:4px; }
        option { background:#0f1923; }
        input[type=date]::-webkit-calendar-picker-indicator { filter:invert(0.5); }
        @media (max-width: 640px) {
          .sidebar { display: none !important; }
          .mobile-header { display: flex !important; }
          .main-content { padding: 72px 16px 64px !important; }
        }
      `}</style>

      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}

      {/* MOBILE HEADER */}
      <div className="mobile-header" style={{ display:"none", position:"fixed", top:0, left:0, right:0, zIndex:100, background:"#0b1520", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"12px 16px", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,#60a5fa,#a78bfa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>💰</div>
          <span style={{ fontSize:14, fontWeight:800, color:"#f1f5f9" }}>FamilyCash</span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background:"none", border:"none", color:"#94a3b8", fontSize:20, cursor:"pointer" }}>☰</button>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:99, background:"rgba(0,0,0,0.8)" }} onClick={() => setMenuOpen(false)}>
          <div style={{ position:"absolute", top:56, left:0, right:0, background:"#0b1520", padding:16, borderBottom:"1px solid rgba(255,255,255,0.06)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", gap:6, marginBottom:12 }}>
              <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{ ...S.select, flex:1, fontSize:12 }}>
                {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ ...S.select, width:80, fontSize:12 }}>
                {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {navItems.map(item => (
              <button key={item.id} onClick={() => { setView(item.id); setMenuOpen(false) }} style={{ ...S.navBtn, ...(view===item.id ? S.navBtnActive : {}), width:"100%", marginBottom:4 }}>
                <span>{item.icon}</span> {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="sidebar" style={S.sidebar}>
        <div style={S.logo}>
          <div style={{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,#60a5fa,#a78bfa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>💰</div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:"#f1f5f9", letterSpacing:"-0.5px" }}>FamilyCash</div>
            <div style={{ fontSize:10, color:"#334155" }}>Finanzas del hogar</div>
          </div>
        </div>

        <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"10px 12px" }}>
          <div style={{ fontSize:10, color:"#475569", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Período</div>
          <div style={{ display:"flex", gap:6 }}>
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{ ...S.select, flex:1, fontSize:12, padding:"5px 8px" }}>
              {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ ...S.select, width:70, fontSize:12, padding:"5px 8px" }}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <nav>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)} style={{ ...S.navBtn, ...(view===item.id ? S.navBtnActive : {}) }}>
              <span style={{ fontSize:15 }}>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop:"auto", paddingTop:16, borderTop:"1px solid rgba(255,255,255,0.05)", textAlign:"center" }}>
          <div style={{ fontSize:10, color:"#1e3a5f" }}>● Conectado a Supabase</div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={S.main}>
        <div className="main-content" style={{ padding:"32px 32px 64px", maxWidth:860, animation:"fadeIn 0.25s ease" }}>

          {/* ── DASHBOARD ── */}
          {view === "dashboard" && (<>
            <div style={S.pageHeader}>
              <div>
                <h1 style={S.h1}>{MONTHS[selectedMonth]} {selectedYear}</h1>
                <p style={{ color:"#475569", fontSize:13 }}>Resumen familiar del mes</p>
              </div>
              <button onClick={() => setShowAddModal(true)} style={S.btn}>+ Nuevo gasto</button>
            </div>
            {loading ? <Spinner/> : (<>
              <div style={S.kpiGrid}>
                <StatCard label="Gastado"     value={fmt(totalSpent)} sub={`de ${fmt(totalBudget)} presupuestado`} accent="#60a5fa" icon="💸"/>
                <StatCard label="Disponible"  value={fmt(Math.max(0,totalBudget-totalSpent))} sub={`${Math.max(0,Math.round((1-totalSpent/totalBudget)*100))}% restante`} accent="#4ade80" icon="✅"/>
                <StatCard label="Movimientos" value={expenses.length} sub="registrados este mes" accent="#a78bfa" icon="📋"/>
                <StatCard label="Mayor gasto" value={expenses.length ? fmt(Math.max(...expenses.map(e=>Number(e.amount)))) : "—"} sub="en el período" accent="#fb923c" icon="📈"/>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:"#334155", textTransform:"uppercase", letterSpacing:1, margin:"28px 0 14px" }}>Por categoría</div>
              <div style={S.catGrid}>
                {CATEGORIES.map(cat => <BudgetRing key={cat.id} cat={cat} spent={spentByCat[cat.id]} budget={budgets[cat.id]}/>)}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", margin:"28px 0 14px" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#334155", textTransform:"uppercase", letterSpacing:1 }}>Últimos movimientos</div>
                <button onClick={() => setView("expenses")} style={{ background:"none", border:"none", cursor:"pointer", color:"#60a5fa", fontSize:12 }}>Ver todos →</button>
              </div>
              {expenses.slice(0,6).map(e => <ExpenseRow key={e.id} exp={e} onDelete={handleDelete}/>)}
              {expenses.length === 0 && (
                <div style={{ textAlign:"center", color:"#334155", padding:"48px 0", fontSize:14 }}>
                  No hay gastos en {MONTHS[selectedMonth]}.<br/>
                  <span style={{ color:"#475569", fontSize:12 }}>Cargá uno manualmente o por WhatsApp.</span>
                </div>
              )}
            </>)}
          </>)}

          {/* ── GASTOS ── */}
          {view === "expenses" && (<>
            <div style={S.pageHeader}>
              <h1 style={S.h1}>Gastos — {MONTHS_SHORT[selectedMonth]} {selectedYear}</h1>
              <button onClick={() => setShowAddModal(true)} style={S.btn}>+ Agregar</button>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:20 }}>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={S.select}>
                <option value="all">📦 Todas las categorías</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            {loading ? <Spinner/> : (<>
              <div style={{ fontSize:12, color:"#475569", marginBottom:12 }}>
                {filtered.length} gastos · Total: <strong style={{ color:"#60a5fa" }}>{fmt(filtered.reduce((s,e)=>s+Number(e.amount),0))}</strong>
              </div>
              {filtered.length === 0
                ? <div style={{ color:"#334155", textAlign:"center", padding:"48px 0" }}>Sin gastos para este filtro</div>
                : filtered.map(e => <ExpenseRow key={e.id} exp={e} onDelete={handleDelete}/>)
              }
            </>)}
          </>)}

          {/* ── PRESUPUESTO ── */}
          {view === "budget" && (<>
            <div style={S.pageHeader}>
              <div>
                <h1 style={S.h1}>Presupuesto</h1>
                <p style={{ color:"#475569", fontSize:13 }}>
                  {MONTHS[selectedMonth]} {selectedYear}
                  {budgetsDirty && <span style={{ color:"#fb923c", marginLeft:8, fontSize:11 }}>● Sin guardar</span>}
                </p>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {budgetsDirty && (
                  <button onClick={() => { setEditBudgets(budgets); setBudgetsDirty(false) }} style={{ ...S.btn, background:"rgba(255,255,255,0.05)", color:"#64748b" }}>
                    Cancelar
                  </button>
                )}
                <button onClick={saveBudgets} disabled={savingBudgets || !budgetsDirty} style={{ ...S.btn, opacity: budgetsDirty ? 1 : 0.4 }}>
                  {savingBudgets ? "Guardando..." : "💾 Guardar presupuesto"}
                </button>
              </div>
            </div>

            {/* Info banner */}
            <div style={{ background:"rgba(96,165,250,0.06)", border:"1px solid rgba(96,165,250,0.15)", borderRadius:10, padding:"10px 16px", marginBottom:20, fontSize:12, color:"#93c5fd", display:"flex", gap:10, alignItems:"center" }}>
              <span>💡</span>
              <span>Si no hay presupuesto guardado para este mes, se copia automáticamente el del mes anterior.</span>
            </div>

            {/* Summary bar */}
            <div style={{ ...S.kpiCard, marginBottom:24, display:"flex", gap:32, alignItems:"center", flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:11, color:"#64748b" }}>Presupuesto total</div>
                <div style={{ fontSize:26, fontWeight:800, color:"#f1f5f9" }}>{fmt(Object.values(editBudgets).reduce((s,v)=>s+v,0))}</div>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#64748b" }}>Ejecutado</div>
                <div style={{ fontSize:26, fontWeight:800, color:"#60a5fa" }}>{fmt(totalSpent)}</div>
              </div>
              <div style={{ flex:1, minWidth:160 }}>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:6 }}>Avance general</div>
                <div style={{ height:8, borderRadius:99, background:"rgba(255,255,255,0.06)" }}>
                  <div style={{ height:"100%", borderRadius:99, width:`${Math.min(100,(totalSpent/Object.values(editBudgets).reduce((s,v)=>s+v,1))*100)}%`, background:"linear-gradient(90deg,#60a5fa,#a78bfa)", transition:"width 0.6s" }}/>
                </div>
              </div>
            </div>

            <div style={S.budgetGrid}>
              {CATEGORIES.map(cat => {
                const spent  = spentByCat[cat.id] || 0
                const budget = editBudgets[cat.id] || DEFAULT_BUDGETS[cat.id]
                const pct    = Math.min((spent/budget)*100, 100)
                const over   = spent > budget
                return (
                  <div key={cat.id} style={{ ...S.kpiCard, borderColor: over ? "#f8717133" : "rgba(255,255,255,0.06)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                      <span style={{ fontSize:22 }}>{cat.icon}</span>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{cat.label}</div>
                        <div style={{ fontSize:11, color: over ? "#f87171" : "#64748b" }}>
                          {fmt(spent)} gastado{over ? " ⚠️" : ""}
                        </div>
                      </div>
                    </div>
                    <div style={{ height:5, borderRadius:99, background:"rgba(255,255,255,0.06)", marginBottom:10 }}>
                      <div style={{ height:"100%", borderRadius:99, width:`${pct}%`, background: over?"#f87171":cat.color, transition:"width 0.6s" }}/>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:12, color:"#475569", flexShrink:0 }}>Límite $</span>
                      <input
                        type="number"
                        value={editBudgets[cat.id] || ""}
                        onChange={e => {
                          setEditBudgets(b => ({ ...b, [cat.id]: Number(e.target.value) }))
                          setBudgetsDirty(true)
                        }}
                        style={{ ...S.input, flex:1, padding:"6px 10px", fontSize:13 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>)}

          {/* ── COMPARAR ── */}
          {view === "compare" && (<>
            <div style={S.pageHeader}>
              <div>
                <h1 style={S.h1}>Comparar meses</h1>
                <p style={{ color:"#475569", fontSize:13 }}>Analizá la evolución de tus gastos</p>
              </div>
            </div>
            <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap", alignItems:"center" }}>
              <div style={{ background:"rgba(96,165,250,0.08)", border:"1px solid #60a5fa33", borderRadius:10, padding:"10px 14px", display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:11, color:"#60a5fa", fontWeight:700 }}>MES A</span>
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{ ...S.select, fontSize:12, padding:"4px 8px" }}>
                  {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ ...S.select, fontSize:12, padding:"4px 8px", width:70 }}>
                  {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <span style={{ color:"#334155", fontSize:20 }}>⇄</span>
              <div style={{ background:"rgba(167,139,250,0.08)", border:"1px solid #a78bfa33", borderRadius:10, padding:"10px 14px", display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:11, color:"#a78bfa", fontWeight:700 }}>MES B</span>
                <select value={compareMonth} onChange={e => setCompareMonth(Number(e.target.value))} style={{ ...S.select, fontSize:12, padding:"4px 8px" }}>
                  {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={compareYear} onChange={e => setCompareYear(Number(e.target.value))} style={{ ...S.select, fontSize:12, padding:"4px 8px", width:70 }}>
                  {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
              <div style={{ ...S.kpiCard, borderColor:"#60a5fa33" }}>
                <div style={{ fontSize:11, color:"#60a5fa", marginBottom:4 }}>{MONTHS[selectedMonth]} {selectedYear}</div>
                <div style={{ fontSize:28, fontWeight:800, color:"#f1f5f9" }}>{fmt(totalSpent)}</div>
                <div style={{ fontSize:11, color:"#475569" }}>{expenses.length} gastos</div>
              </div>
              <div style={{ ...S.kpiCard, borderColor:"#a78bfa33" }}>
                <div style={{ fontSize:11, color:"#a78bfa", marginBottom:4 }}>{MONTHS[compareMonth]} {compareYear}</div>
                <div style={{ fontSize:28, fontWeight:800, color:"#f1f5f9" }}>{fmt(compareTotal)}</div>
                <div style={{ fontSize:11, color:"#475569" }}>{compareExpenses.length} gastos</div>
              </div>
            </div>
            {totalSpent > 0 && compareTotal > 0 && (
              <div style={{ ...S.kpiCard, marginBottom:24, textAlign:"center" }}>
                <div style={{ fontSize:12, color:"#64748b", marginBottom:4 }}>Diferencia</div>
                <div style={{ fontSize:22, fontWeight:800, color: totalSpent>compareTotal?"#f87171":"#4ade80" }}>
                  {totalSpent>compareTotal?"▲":"▼"} {fmt(Math.abs(totalSpent-compareTotal))}
                </div>
                <div style={{ fontSize:11, color:"#475569" }}>
                  {totalSpent>compareTotal
                    ? `Gastaste ${Math.round(((totalSpent-compareTotal)/compareTotal)*100)}% más en ${MONTHS[selectedMonth]}`
                    : `Gastaste ${Math.round(((compareTotal-totalSpent)/compareTotal)*100)}% menos en ${MONTHS[selectedMonth]}`}
                </div>
              </div>
            )}
            <div style={{ fontSize:12, fontWeight:700, color:"#334155", textTransform:"uppercase", letterSpacing:1, marginBottom:14 }}>Por categoría</div>
            {CATEGORIES.map(cat => {
              const a = spentByCat[cat.id]||0, b = compareByCat[cat.id]||0
              if (a===0 && b===0) return null
              const max = Math.max(a,b,1)
              return (
                <div key={cat.id} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#94a3b8", marginBottom:5 }}>
                    <span>{cat.icon} {cat.label}</span>
                    <span style={{ display:"flex", gap:16 }}>
                      <span style={{ color:"#60a5fa" }}>{fmt(a)}</span>
                      <span style={{ color:"#a78bfa" }}>{fmt(b)}</span>
                    </span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                    <div style={{ height:5, borderRadius:99, background:"rgba(255,255,255,0.04)" }}>
                      <div style={{ height:"100%", borderRadius:99, width:`${(a/max)*100}%`, background:"#60a5fa", transition:"width 0.6s" }}/>
                    </div>
                    <div style={{ height:5, borderRadius:99, background:"rgba(255,255,255,0.04)" }}>
                      <div style={{ height:"100%", borderRadius:99, width:`${(b/max)*100}%`, background:"#a78bfa", transition:"width 0.6s" }}/>
                    </div>
                  </div>
                </div>
              )
            })}
          </>)}

        </div>
      </main>

      {/* MODAL */}
      {showAddModal && (
        <div style={S.overlay} onClick={() => setShowAddModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>Nuevo gasto</div>
            {[
              { label:"Descripción", field:"description", type:"text",   placeholder:"ej: Supermercado" },
              { label:"Monto ($)",   field:"amount",      type:"number", placeholder:"0" },
              { label:"Quién pagó", field:"user_name",   type:"text",   placeholder:"ej: Mamá" },
              { label:"Fecha",       field:"expense_date",type:"date" },
            ].map(f => (
              <div key={f.field} style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:4 }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={newExp[f.field]}
                  onChange={e => setNewExp(p => ({ ...p, [f.field]: e.target.value }))}
                  style={S.input}/>
              </div>
            ))}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:4 }}>Categoría</label>
              <select value={newExp.category} onChange={e => setNewExp(p => ({ ...p, category: e.target.value }))} style={S.select}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowAddModal(false)} style={{ flex:1, padding:10, borderRadius:8, border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"#64748b", cursor:"pointer", fontFamily:"Sora,sans-serif" }}>Cancelar</button>
              <button onClick={handleAdd} disabled={saving} style={{ flex:1, ...S.btn, justifyContent:"center" }}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  root:        { display:"flex", minHeight:"100vh", background:"#080f1a", fontFamily:"'Sora',sans-serif", color:"#e2e8f0" },
  sidebar:     { width:220, flexShrink:0, background:"#0b1520", borderRight:"1px solid rgba(255,255,255,0.05)", display:"flex", flexDirection:"column", padding:"24px 14px", gap:16, position:"sticky", top:0, height:"100vh", overflowY:"auto" },
  logo:        { display:"flex", alignItems:"center", gap:10, paddingBottom:16, borderBottom:"1px solid rgba(255,255,255,0.06)" },
  navBtn:      { display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 12px", borderRadius:8, border:"none", background:"transparent", color:"#475569", cursor:"pointer", fontSize:13, fontFamily:"'Sora',sans-serif", textAlign:"left", transition:"all 0.15s", marginBottom:2 },
  navBtnActive:{ background:"rgba(96,165,250,0.1)", color:"#93c5fd" },
  main:        { flex:1, overflowY:"auto", maxHeight:"100vh" },
  pageHeader:  { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 },
  h1:          { fontSize:26, fontWeight:800, color:"#f1f5f9", letterSpacing:"-0.5px" },
  btn:         { padding:"10px 18px", borderRadius:8, border:"none", background:"rgba(96,165,250,0.15)", color:"#60a5fa", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"'Sora',sans-serif", display:"flex", alignItems:"center", gap:6 },
  kpiGrid:     { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:12 },
  kpiCard:     { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"16px 18px" },
  catGrid:     { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(88px,1fr))", gap:10 },
  budgetGrid:  { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 },
  input:       { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, fontFamily:"'Sora',sans-serif", outline:"none" },
  select:      { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, fontFamily:"'Sora',sans-serif", outline:"none", cursor:"pointer" },
  overlay:     { position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 },
  modal:       { background:"#0d1a2a", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, padding:28, width:"100%", maxWidth:400, boxShadow:"0 24px 64px #000000aa" },
}
