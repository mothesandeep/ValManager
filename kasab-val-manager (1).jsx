import { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutDashboard, Users, PackagePlus, Cog, Truck, RotateCcw,
  IndianRupee, Receipt, BarChart3, Plus, Trash2, Pencil, X, Check,
  Phone, MapPin, AlertCircle, Loader2
} from "lucide-react";

/* ---------------------------------------------------------------
   Design tokens
   Paper #FAF7F0 · Ink #241F19 · Brass #A6752B · Steel #5B6472
   Positive #3F6B52 · Due #A6432F · Card #FFFFFF · Border #E3D9C4
   Headline: Space Grotesk · Body/data: Inter, tabular-nums
----------------------------------------------------------------*/

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');`;

const COLORS = {
  paper: "#FAF7F0",
  ink: "#241F19",
  inkSoft: "#6B6357",
  brass: "#A6752B",
  brassDark: "#8A5F1F",
  steel: "#5B6472",
  positive: "#3F6B52",
  positiveBg: "#EAF1EC",
  due: "#A6432F",
  dueBg: "#F7EAE6",
  card: "#FFFFFF",
  border: "#E3D9C4",
  borderSoft: "#EFE8D8",
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtMoney = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const fmtKg = (n) => `${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`;
const isThisMonth = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const COLOR_TYPES = ["Gold", "Silver", "Pelmet", "Water", "Antique"];
const CORD_TYPES = [4, 8, 10, 12, 14, 18];
const EXPENSE_CATEGORIES = [
  "Shop Rent", "Electricity Bill", "Transport", "Ola Charging", "Bike Fuel",
  "Bike Repair", "Machine Oil", "Motor/Belt Repair", "Marker", "Marker Refill", "Other",
];
const BUNGARI_WEIGHT_KG = 0.07;

/* ---------------------------------------------------------------
   Storage
----------------------------------------------------------------*/
const KEYS = ["parties", "receipts", "production", "dispatches", "rolaReturns", "payments", "expenses"];

async function loadAll() {
  const out = {};
  for (const k of KEYS) {
    try {
      const r = await window.storage.get(k, false);
      out[k] = r ? JSON.parse(r.value) : [];
    } catch {
      out[k] = [];
    }
  }
  return out;
}
async function save(key, data) {
  try {
    await window.storage.set(key, JSON.stringify(data), false);
  } catch (e) {
    console.error("storage save failed", key, e);
  }
}

/* ---------------------------------------------------------------
   Small UI atoms
----------------------------------------------------------------*/
function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span style={{ color: COLORS.inkSoft }} className="text-xs font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "px-3 py-2 rounded-md border bg-white text-sm outline-none focus:ring-2 transition-shadow";
const inputStyle = { borderColor: COLORS.border, color: COLORS.ink };

function TextInput(props) {
  return <input {...props} className={inputCls} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
function Select({ children, ...props }) {
  return (
    <select {...props} className={inputCls} style={inputStyle}>
      {children}
    </select>
  );
}

function Button({ children, variant = "primary", className = "", ...props }) {
  const styles = {
    primary: { background: COLORS.brass, color: "#fff" },
    ghost: { background: "transparent", color: COLORS.ink, border: `1px solid ${COLORS.border}` },
    danger: { background: "transparent", color: COLORS.due, border: `1px solid ${COLORS.due}33` },
  };
  return (
    <button
      {...props}
      style={styles[variant]}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium active:scale-[0.98] transition-transform ${className}`}
    >
      {children}
    </button>
  );
}

function KpiCard({ label, value, sub, tone }) {
  const toneColor = tone === "due" ? COLORS.due : tone === "positive" ? COLORS.positive : COLORS.ink;
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-1 min-w-[150px]"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
    >
      <span className="text-xs font-medium" style={{ color: COLORS.inkSoft }}>{label}</span>
      <span className="text-2xl font-semibold tabular-nums" style={{ color: toneColor, fontFamily: "'Space Grotesk', sans-serif" }}>
        {value}
      </span>
      {sub && <span className="text-xs" style={{ color: COLORS.inkSoft }}>{sub}</span>}
    </div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
      <div>
        <h2 className="text-xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.ink }}>
          {title}
        </h2>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: COLORS.inkSoft }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div
      className="rounded-lg p-8 text-center text-sm"
      style={{ border: `1px dashed ${COLORS.border}`, color: COLORS.inkSoft }}
    >
      {text}
    </div>
  );
}

function ConfirmDelete({ onConfirm, onCancel }) {
  return (
    <span className="inline-flex items-center gap-1">
      <button onClick={onConfirm} className="p-1 rounded" style={{ color: COLORS.due }} title="Confirm delete">
        <Check size={15} />
      </button>
      <button onClick={onCancel} className="p-1 rounded" style={{ color: COLORS.inkSoft }} title="Cancel">
        <X size={15} />
      </button>
    </span>
  );
}

/* ---------------------------------------------------------------
   Table wrapper
----------------------------------------------------------------*/
function Table({ columns, rows, renderRow, emptyText }) {
  if (!rows.length) return <EmptyState text={emptyText} />;
  return (
    <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${COLORS.border}` }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: COLORS.borderSoft }}>
            {columns.map((c) => (
              <th
                key={c}
                className="text-left px-3 py-2 font-medium whitespace-nowrap"
                style={{ color: COLORS.inkSoft, fontSize: "0.75rem" }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map((row, i) => renderRow(row, i))}</tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------------
   PARTIES
----------------------------------------------------------------*/
function PartiesView({ parties, setParties, stats }) {
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const startAdd = () => setForm({ id: null, name: "", phone: "", address: "", notes: "" });
  const edit = (p) => setForm({ ...p });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    let next;
    if (form.id) {
      next = parties.map((p) => (p.id === form.id ? form : p));
    } else {
      next = [...parties, { ...form, id: uid() }];
    }
    setParties(next);
    setForm(null);
  };

  return (
    <div>
      <SectionHeader
        title="Parties"
        subtitle="Customers who send Kasab for job-work"
        action={
          !form && (
            <Button onClick={startAdd}>
              <Plus size={16} /> Add Party
            </Button>
          )
        }
      />

      {form && (
        <form
          onSubmit={submit}
          className="mb-5 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
        >
          <Field label="Party Name *">
            <TextInput required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Address">
            <TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="Notes">
            <TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit"><Check size={16} /> Save Party</Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </form>
      )}

      {parties.length === 0 ? (
        <EmptyState text="No parties yet. Add the first party to start tracking their work." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {parties.map((p) => {
            const s = stats[p.id] || {};
            return (
              <div key={p.id} className="rounded-lg p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{p.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => edit(p)} className="p-1 rounded" style={{ color: COLORS.inkSoft }}><Pencil size={14} /></button>
                    {deleting === p.id ? (
                      <ConfirmDelete
                        onConfirm={() => { setParties(parties.filter((x) => x.id !== p.id)); setDeleting(null); }}
                        onCancel={() => setDeleting(null)}
                      />
                    ) : (
                      <button onClick={() => setDeleting(p.id)} className="p-1 rounded" style={{ color: COLORS.due }}><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
                {p.phone && <p className="text-xs flex items-center gap-1 mt-1" style={{ color: COLORS.inkSoft }}><Phone size={11} />{p.phone}</p>}
                {p.address && <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: COLORS.inkSoft }}><MapPin size={11} />{p.address}</p>}
                <div className="flex gap-3 mt-3 pt-3 text-xs" style={{ borderTop: `1px solid ${COLORS.borderSoft}` }}>
                  <div>
                    <div style={{ color: COLORS.inkSoft }}>Rola pending</div>
                    <div className="font-semibold tabular-nums">{s.rolaPending ?? 0}</div>
                  </div>
                  <div>
                    <div style={{ color: COLORS.inkSoft }}>Balance due</div>
                    <div className="font-semibold tabular-nums" style={{ color: (s.balance || 0) > 0 ? COLORS.due : COLORS.positive }}>
                      {fmtMoney(s.balance || 0)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   RECEIVING
----------------------------------------------------------------*/
function ReceivingView({ receipts, setReceipts, parties }) {
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const partyName = (id) => parties.find((p) => p.id === id)?.name || "—";

  const blank = () => ({
    id: null, partyId: parties[0]?.id || "", date: todayStr(), color: "Gold",
    grossWeight: "", tareWeight: "", challanNo: "", rolaCount: "",
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.partyId || !form.grossWeight) return;
    const net = (Number(form.grossWeight) || 0) - (Number(form.tareWeight) || 0);
    const entry = { ...form, netWeight: net };
    setReceipts(form.id ? receipts.map((r) => (r.id === form.id ? entry : r)) : [...receipts, { ...entry, id: uid() }]);
    setForm(null);
  };

  const sorted = [...receipts].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div>
      <SectionHeader
        title="Raw Material Receiving"
        subtitle="Kasab received from parties — weight and challan tracking"
        action={!form && parties.length > 0 && <Button onClick={() => setForm(blank())}><Plus size={16} /> New Receipt</Button>}
      />
      {parties.length === 0 && <EmptyState text="Add a party first before recording receiving entries." />}

      {form && (
        <form onSubmit={submit} className="mb-5 p-4 rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <Field label="Party *">
            <Select required value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value })}>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Date"><TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Kasab Color">
            <Select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
              {COLOR_TYPES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Gross Weight (kg) *"><TextInput required type="number" step="0.01" value={form.grossWeight} onChange={(e) => setForm({ ...form, grossWeight: e.target.value })} /></Field>
          <Field label="Tare / Rola Weight (kg)"><TextInput type="number" step="0.01" value={form.tareWeight} onChange={(e) => setForm({ ...form, tareWeight: e.target.value })} /></Field>
          <Field label="Net Weight">
            <div className="px-3 py-2 rounded-md text-sm font-semibold tabular-nums" style={{ background: COLORS.borderSoft }}>
              {fmtKg((Number(form.grossWeight) || 0) - (Number(form.tareWeight) || 0))}
            </div>
          </Field>
          <Field label="Challan Number"><TextInput value={form.challanNo} onChange={(e) => setForm({ ...form, challanNo: e.target.value })} /></Field>
          <Field label="Rola Count"><TextInput type="number" value={form.rolaCount} onChange={(e) => setForm({ ...form, rolaCount: e.target.value })} /></Field>
          <div className="flex gap-2 items-end col-span-2 sm:col-span-1">
            <Button type="submit"><Check size={16} /> Save</Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </form>
      )}

      <Table
        columns={["Date", "Party", "Color", "Gross", "Tare", "Net Wt", "Challan #", "Rola", ""]}
        rows={sorted}
        emptyText="No receiving entries yet."
        renderRow={(r) => (
          <tr key={r.id} style={{ borderTop: `1px solid ${COLORS.borderSoft}` }}>
            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
            <td className="px-3 py-2 font-medium whitespace-nowrap">{partyName(r.partyId)}</td>
            <td className="px-3 py-2">{r.color}</td>
            <td className="px-3 py-2 tabular-nums">{fmtKg(r.grossWeight)}</td>
            <td className="px-3 py-2 tabular-nums">{fmtKg(r.tareWeight)}</td>
            <td className="px-3 py-2 tabular-nums font-semibold">{fmtKg(r.netWeight)}</td>
            <td className="px-3 py-2">{r.challanNo || "—"}</td>
            <td className="px-3 py-2 tabular-nums">{r.rolaCount || 0}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              <button onClick={() => setForm({ ...r })} className="p-1" style={{ color: COLORS.inkSoft }}><Pencil size={14} /></button>
              {deleting === r.id ? (
                <ConfirmDelete onConfirm={() => { setReceipts(receipts.filter((x) => x.id !== r.id)); setDeleting(null); }} onCancel={() => setDeleting(null)} />
              ) : (
                <button onClick={() => setDeleting(r.id)} className="p-1" style={{ color: COLORS.due }}><Trash2 size={14} /></button>
              )}
            </td>
          </tr>
        )}
      />
    </div>
  );
}

/* ---------------------------------------------------------------
   PRODUCTION
----------------------------------------------------------------*/
function ProductionView({ production, setProduction, receipts, parties }) {
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const partyName = (id) => parties.find((p) => p.id === id)?.name || "—";
  const receiptLabel = (r) => `${fmtDate(r.date)} · ${partyName(r.partyId)} · ${fmtKg(r.netWeight)}`;

  const blank = () => ({
    id: null, receiptId: receipts[0]?.id || "", cordCount: 8, twistType: "S",
    waste: "", status: "Pending",
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.receiptId) return;
    const entry = { ...form };
    setProduction(form.id ? production.map((p) => (p.id === form.id ? entry : p)) : [...production, { ...entry, id: uid() }]);
    setForm(null);
  };

  const statusColor = (s) => (s === "Done" ? COLORS.positive : s === "In Progress" ? COLORS.brass : COLORS.inkSoft);

  const sorted = [...production].sort((a, b) => (a.id < b.id ? 1 : -1));

  return (
    <div>
      <SectionHeader
        title="Production"
        subtitle="Doubling — cord count, twist type, waste, status"
        action={!form && receipts.length > 0 && <Button onClick={() => setForm(blank())}><Plus size={16} /> New Order</Button>}
      />
      {receipts.length === 0 && <EmptyState text="Record a raw material receipt first, then start production against it." />}

      {form && (
        <form onSubmit={submit} className="mb-5 p-4 rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <Field label="From Receipt *">
            <Select required value={form.receiptId} onChange={(e) => setForm({ ...form, receiptId: e.target.value })} className="sm:col-span-2">
              {receipts.map((r) => <option key={r.id} value={r.id}>{receiptLabel(r)}</option>)}
            </Select>
          </Field>
          <Field label="Cord Count">
            <Select value={form.cordCount} onChange={(e) => setForm({ ...form, cordCount: Number(e.target.value) })}>
              {CORD_TYPES.map((c) => <option key={c} value={c}>{c} Cord</option>)}
            </Select>
          </Field>
          <Field label="Twist Type">
            <Select value={form.twistType} onChange={(e) => setForm({ ...form, twistType: e.target.value })}>
              <option value="S">S Type (left)</option>
              <option value="Z">Z Type (right)</option>
            </Select>
          </Field>
          <Field label="Waste (kg)"><TextInput type="number" step="0.01" value={form.waste} onChange={(e) => setForm({ ...form, waste: e.target.value })} /></Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Pending</option><option>In Progress</option><option>Done</option>
            </Select>
          </Field>
          <div className="flex gap-2 items-end">
            <Button type="submit"><Check size={16} /> Save</Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </form>
      )}

      <Table
        columns={["Receipt", "Party", "Cord", "Twist", "Waste", "Status", ""]}
        rows={sorted}
        emptyText="No production orders yet."
        renderRow={(p) => {
          const rec = receipts.find((r) => r.id === p.receiptId);
          return (
            <tr key={p.id} style={{ borderTop: `1px solid ${COLORS.borderSoft}` }}>
              <td className="px-3 py-2 whitespace-nowrap">{rec ? fmtDate(rec.date) : "—"}</td>
              <td className="px-3 py-2 font-medium whitespace-nowrap">{rec ? partyName(rec.partyId) : "—"}</td>
              <td className="px-3 py-2">{p.cordCount} Cord</td>
              <td className="px-3 py-2">{p.twistType}</td>
              <td className="px-3 py-2 tabular-nums">{p.waste ? fmtKg(p.waste) : "—"}</td>
              <td className="px-3 py-2">
                <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ color: statusColor(p.status), background: statusColor(p.status) + "1A" }}>
                  {p.status}
                </span>
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <button onClick={() => setForm({ ...p })} className="p-1" style={{ color: COLORS.inkSoft }}><Pencil size={14} /></button>
                {deleting === p.id ? (
                  <ConfirmDelete onConfirm={() => { setProduction(production.filter((x) => x.id !== p.id)); setDeleting(null); }} onCancel={() => setDeleting(null)} />
                ) : (
                  <button onClick={() => setDeleting(p.id)} className="p-1" style={{ color: COLORS.due }}><Trash2 size={14} /></button>
                )}
              </td>
            </tr>
          );
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------
   DISPATCH
----------------------------------------------------------------*/
function DispatchView({ dispatches, setDispatches, parties }) {
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const partyName = (id) => parties.find((p) => p.id === id)?.name || "—";

  const blank = () => ({
    id: null, partyId: parties[0]?.id || "", date: todayStr(),
    bungariCount: "", boreGrossWeight: "", ratePerKg: "",
  });

  const netVal = (f) => {
    const bungariTare = (Number(f.bungariCount) || 0) * BUNGARI_WEIGHT_KG;
    return Math.max(0, (Number(f.boreGrossWeight) || 0) - bungariTare);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.partyId || !form.boreGrossWeight) return;
    const nv = netVal(form);
    const amount = form.ratePerKg ? Math.round(nv * Number(form.ratePerKg)) : (form.amount || "");
    const entry = { ...form, netValWeight: nv, amount: amount === "" ? "" : Number(amount) };
    setDispatches(form.id ? dispatches.map((d) => (d.id === form.id ? entry : d)) : [...dispatches, { ...entry, id: uid() }]);
    setForm(null);
  };

  const sorted = [...dispatches].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div>
      <SectionHeader
        title="Dispatch"
        subtitle="Finished Val delivered — bore weight, net weight, billing"
        action={!form && parties.length > 0 && <Button onClick={() => setForm(blank())}><Plus size={16} /> New Dispatch</Button>}
      />
      {parties.length === 0 && <EmptyState text="Add a party first before recording dispatch entries." />}

      {form && (
        <form onSubmit={submit} className="mb-5 p-4 rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <Field label="Party *">
            <Select required value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value })}>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Date"><TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Bungari Count"><TextInput type="number" value={form.bungariCount} onChange={(e) => setForm({ ...form, bungariCount: e.target.value })} /></Field>
          <Field label="Bore Gross Weight (kg) *"><TextInput required type="number" step="0.01" value={form.boreGrossWeight} onChange={(e) => setForm({ ...form, boreGrossWeight: e.target.value })} /></Field>
          <Field label="Net Val Weight">
            <div className="px-3 py-2 rounded-md text-sm font-semibold tabular-nums" style={{ background: COLORS.borderSoft }}>
              {fmtKg(netVal(form))}
            </div>
          </Field>
          <Field label="Rate ₹/kg (optional)"><TextInput type="number" step="0.01" value={form.ratePerKg} onChange={(e) => setForm({ ...form, ratePerKg: e.target.value })} /></Field>
          <div className="flex gap-2 items-end col-span-2 sm:col-span-1">
            <Button type="submit"><Check size={16} /> Save</Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </form>
      )}

      <Table
        columns={["Date", "Party", "Bungari", "Bore Gross", "Net Val", "Amount", ""]}
        rows={sorted}
        emptyText="No dispatch entries yet."
        renderRow={(d) => (
          <tr key={d.id} style={{ borderTop: `1px solid ${COLORS.borderSoft}` }}>
            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(d.date)}</td>
            <td className="px-3 py-2 font-medium whitespace-nowrap">{partyName(d.partyId)}</td>
            <td className="px-3 py-2 tabular-nums">{d.bungariCount || 0}</td>
            <td className="px-3 py-2 tabular-nums">{fmtKg(d.boreGrossWeight)}</td>
            <td className="px-3 py-2 tabular-nums font-semibold">{fmtKg(d.netValWeight)}</td>
            <td className="px-3 py-2 tabular-nums">{d.amount ? fmtMoney(d.amount) : "—"}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              <button onClick={() => setForm({ ...d })} className="p-1" style={{ color: COLORS.inkSoft }}><Pencil size={14} /></button>
              {deleting === d.id ? (
                <ConfirmDelete onConfirm={() => { setDispatches(dispatches.filter((x) => x.id !== d.id)); setDeleting(null); }} onCancel={() => setDeleting(null)} />
              ) : (
                <button onClick={() => setDeleting(d.id)} className="p-1" style={{ color: COLORS.due }}><Trash2 size={14} /></button>
              )}
            </td>
          </tr>
        )}
      />
    </div>
  );
}

/* ---------------------------------------------------------------
   ROLA TRACKING
----------------------------------------------------------------*/
function RolaView({ receipts, rolaReturns, setRolaReturns, parties }) {
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const partyName = (id) => parties.find((p) => p.id === id)?.name || "—";

  const blank = () => ({ id: null, partyId: parties[0]?.id || "", date: todayStr(), rolaCount: "" });

  const submit = (e) => {
    e.preventDefault();
    if (!form.partyId || !form.rolaCount) return;
    setRolaReturns(form.id ? rolaReturns.map((r) => (r.id === form.id ? form : r)) : [...rolaReturns, { ...form, id: uid() }]);
    setForm(null);
  };

  const balances = parties.map((p) => {
    const received = receipts.filter((r) => r.partyId === p.id).reduce((s, r) => s + (Number(r.rolaCount) || 0), 0);
    const returned = rolaReturns.filter((r) => r.partyId === p.id).reduce((s, r) => s + (Number(r.rolaCount) || 0), 0);
    return { party: p, received, returned, pending: received - returned };
  }).filter((b) => b.received > 0 || b.returned > 0);

  const sortedReturns = [...rolaReturns].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div>
      <SectionHeader
        title="Rola / TFO Bobbin Tracking"
        subtitle="Rola belongs to the party — track received vs returned"
        action={!form && parties.length > 0 && <Button onClick={() => setForm(blank())}><Plus size={16} /> Log Return</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {balances.length === 0 && <EmptyState text="No rola movement recorded yet." />}
        {balances.map((b) => (
          <div key={b.party.id} className="rounded-lg p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <h3 className="font-semibold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{b.party.name}</h3>
            <div className="flex justify-between text-sm mb-1"><span style={{ color: COLORS.inkSoft }}>Received</span><span className="tabular-nums font-medium">{b.received}</span></div>
            <div className="flex justify-between text-sm mb-1"><span style={{ color: COLORS.inkSoft }}>Returned</span><span className="tabular-nums font-medium">{b.returned}</span></div>
            <div className="flex justify-between text-sm pt-2 mt-1" style={{ borderTop: `1px solid ${COLORS.borderSoft}` }}>
              <span style={{ color: COLORS.inkSoft }}>Pending with us</span>
              <span className="tabular-nums font-semibold" style={{ color: b.pending > 0 ? COLORS.due : COLORS.positive }}>{b.pending}</span>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <form onSubmit={submit} className="mb-5 p-4 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <Field label="Party *">
            <Select required value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value })}>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Date"><TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Rola Count Returned *"><TextInput required type="number" value={form.rolaCount} onChange={(e) => setForm({ ...form, rolaCount: e.target.value })} /></Field>
          <div className="flex gap-2 items-end">
            <Button type="submit"><Check size={16} /> Save</Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </form>
      )}

      <Table
        columns={["Date", "Party", "Rola Returned", ""]}
        rows={sortedReturns}
        emptyText="No return entries logged yet."
        renderRow={(r) => (
          <tr key={r.id} style={{ borderTop: `1px solid ${COLORS.borderSoft}` }}>
            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
            <td className="px-3 py-2 font-medium whitespace-nowrap">{partyName(r.partyId)}</td>
            <td className="px-3 py-2 tabular-nums">{r.rolaCount}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              <button onClick={() => setForm({ ...r })} className="p-1" style={{ color: COLORS.inkSoft }}><Pencil size={14} /></button>
              {deleting === r.id ? (
                <ConfirmDelete onConfirm={() => { setRolaReturns(rolaReturns.filter((x) => x.id !== r.id)); setDeleting(null); }} onCancel={() => setDeleting(null)} />
              ) : (
                <button onClick={() => setDeleting(r.id)} className="p-1" style={{ color: COLORS.due }}><Trash2 size={14} /></button>
              )}
            </td>
          </tr>
        )}
      />
    </div>
  );
}

/* ---------------------------------------------------------------
   PAYMENTS
----------------------------------------------------------------*/
function PaymentsView({ payments, setPayments, parties, stats }) {
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const partyName = (id) => parties.find((p) => p.id === id)?.name || "—";

  const blank = () => ({ id: null, partyId: parties[0]?.id || "", date: todayStr(), amount: "", note: "" });

  const submit = (e) => {
    e.preventDefault();
    if (!form.partyId || !form.amount) return;
    const entry = { ...form, amount: Number(form.amount) };
    setPayments(form.id ? payments.map((p) => (p.id === form.id ? entry : p)) : [...payments, { ...entry, id: uid() }]);
    setForm(null);
  };

  const sorted = [...payments].sort((a, b) => (a.date < b.date ? 1 : -1));
  const balanceRows = parties.map((p) => ({ party: p, ...stats[p.id] })).filter((r) => (r.receivable || 0) > 0 || (r.received || 0) > 0);

  return (
    <div>
      <SectionHeader
        title="Payments"
        subtitle="Log money received against dispatched Val"
        action={!form && parties.length > 0 && <Button onClick={() => setForm(blank())}><Plus size={16} /> Log Payment</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {balanceRows.length === 0 && <EmptyState text="No receivables yet — record a dispatch with an amount first." />}
        {balanceRows.map((r) => (
          <div key={r.party.id} className="rounded-lg p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <h3 className="font-semibold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{r.party.name}</h3>
            <div className="flex justify-between text-sm mb-1"><span style={{ color: COLORS.inkSoft }}>Receivable</span><span className="tabular-nums font-medium">{fmtMoney(r.receivable)}</span></div>
            <div className="flex justify-between text-sm mb-1"><span style={{ color: COLORS.inkSoft }}>Received</span><span className="tabular-nums font-medium">{fmtMoney(r.received)}</span></div>
            <div className="flex justify-between text-sm pt-2 mt-1" style={{ borderTop: `1px solid ${COLORS.borderSoft}` }}>
              <span style={{ color: COLORS.inkSoft }}>Balance due</span>
              <span className="tabular-nums font-semibold" style={{ color: r.balance > 0 ? COLORS.due : COLORS.positive }}>{fmtMoney(r.balance)}</span>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <form onSubmit={submit} className="mb-5 p-4 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <Field label="Party *">
            <Select required value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value })}>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Date"><TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Amount Received (₹) *"><TextInput required type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Note"><TextInput value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          <div className="flex gap-2 items-end">
            <Button type="submit"><Check size={16} /> Save</Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </form>
      )}

      <Table
        columns={["Date", "Party", "Amount", "Note", ""]}
        rows={sorted}
        emptyText="No payments logged yet."
        renderRow={(p) => (
          <tr key={p.id} style={{ borderTop: `1px solid ${COLORS.borderSoft}` }}>
            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(p.date)}</td>
            <td className="px-3 py-2 font-medium whitespace-nowrap">{partyName(p.partyId)}</td>
            <td className="px-3 py-2 tabular-nums font-semibold" style={{ color: COLORS.positive }}>{fmtMoney(p.amount)}</td>
            <td className="px-3 py-2" style={{ color: COLORS.inkSoft }}>{p.note || "—"}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              <button onClick={() => setForm({ ...p })} className="p-1" style={{ color: COLORS.inkSoft }}><Pencil size={14} /></button>
              {deleting === p.id ? (
                <ConfirmDelete onConfirm={() => { setPayments(payments.filter((x) => x.id !== p.id)); setDeleting(null); }} onCancel={() => setDeleting(null)} />
              ) : (
                <button onClick={() => setDeleting(p.id)} className="p-1" style={{ color: COLORS.due }}><Trash2 size={14} /></button>
              )}
            </td>
          </tr>
        )}
      />
    </div>
  );
}

/* ---------------------------------------------------------------
   EXPENSES
----------------------------------------------------------------*/
function ExpensesView({ expenses, setExpenses }) {
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const blank = () => ({ id: null, date: todayStr(), category: EXPENSE_CATEGORIES[0], amount: "", note: "" });

  const submit = (e) => {
    e.preventDefault();
    if (!form.amount) return;
    const entry = { ...form, amount: Number(form.amount) };
    setExpenses(form.id ? expenses.map((x) => (x.id === form.id ? entry : x)) : [...expenses, { ...entry, id: uid() }]);
    setForm(null);
  };

  const sorted = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div>
      <SectionHeader
        title="Expenses"
        subtitle="Rent, transport, machine maintenance, consumables"
        action={!form && <Button onClick={() => setForm(blank())}><Plus size={16} /> Add Expense</Button>}
      />

      {form && (
        <form onSubmit={submit} className="mb-5 p-4 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <Field label="Date"><TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Amount (₹) *"><TextInput required type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Note"><TextInput value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          <div className="flex gap-2 items-end">
            <Button type="submit"><Check size={16} /> Save</Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </form>
      )}

      <Table
        columns={["Date", "Category", "Amount", "Note", ""]}
        rows={sorted}
        emptyText="No expenses recorded yet."
        renderRow={(x) => (
          <tr key={x.id} style={{ borderTop: `1px solid ${COLORS.borderSoft}` }}>
            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(x.date)}</td>
            <td className="px-3 py-2">{x.category}</td>
            <td className="px-3 py-2 tabular-nums font-semibold" style={{ color: COLORS.due }}>{fmtMoney(x.amount)}</td>
            <td className="px-3 py-2" style={{ color: COLORS.inkSoft }}>{x.note || "—"}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              <button onClick={() => setForm({ ...x })} className="p-1" style={{ color: COLORS.inkSoft }}><Pencil size={14} /></button>
              {deleting === x.id ? (
                <ConfirmDelete onConfirm={() => { setExpenses(expenses.filter((y) => y.id !== x.id)); setDeleting(null); }} onCancel={() => setDeleting(null)} />
              ) : (
                <button onClick={() => setDeleting(x.id)} className="p-1" style={{ color: COLORS.due }}><Trash2 size={14} /></button>
              )}
            </td>
          </tr>
        )}
      />
    </div>
  );
}

/* ---------------------------------------------------------------
   REPORTS
----------------------------------------------------------------*/
function ReportsView({ receipts, dispatches, expenses, payments, parties, stats }) {
  const monthReceived = receipts.filter((r) => isThisMonth(r.date)).reduce((s, r) => s + (Number(r.netWeight) || 0), 0);
  const monthDispatched = dispatches.filter((d) => isThisMonth(d.date)).reduce((s, d) => s + (Number(d.netValWeight) || 0), 0);
  const monthExpenses = expenses.filter((x) => isThisMonth(x.date)).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const monthReceivedPay = payments.filter((p) => isThisMonth(p.date)).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const monthRevenue = dispatches.filter((d) => isThisMonth(d.date)).reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const monthProfit = monthRevenue - monthExpenses;

  const partyRows = parties
    .map((p) => ({ party: p, ...stats[p.id] }))
    .filter((r) => (r.totalDispatchValue || 0) > 0)
    .sort((a, b) => (b.totalDispatchValue || 0) - (a.totalDispatchValue || 0));

  const duesSorted = parties
    .map((p) => ({ party: p, ...stats[p.id] }))
    .filter((r) => (r.balance || 0) > 0)
    .sort((a, b) => b.balance - a.balance);

  return (
    <div>
      <SectionHeader title="Reports" subtitle="This month at a glance, and party-wise standing" />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Kasab received" value={fmtKg(monthReceived)} sub="this month" />
        <KpiCard label="Val dispatched" value={fmtKg(monthDispatched)} sub="this month" />
        <KpiCard label="Revenue billed" value={fmtMoney(monthRevenue)} sub="this month" />
        <KpiCard label="Expenses" value={fmtMoney(monthExpenses)} sub="this month" tone="due" />
        <KpiCard label="Est. profit" value={fmtMoney(monthProfit)} sub="revenue − expenses" tone={monthProfit >= 0 ? "positive" : "due"} />
      </div>

      <h3 className="font-semibold mb-2 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Party-wise Profitability</h3>
      <Table
        columns={["Party", "Total Dispatched", "Total Value", "Received", "Balance Due"]}
        rows={partyRows}
        emptyText="No dispatch value recorded yet."
        renderRow={(r) => (
          <tr key={r.party.id} style={{ borderTop: `1px solid ${COLORS.borderSoft}` }}>
            <td className="px-3 py-2 font-medium whitespace-nowrap">{r.party.name}</td>
            <td className="px-3 py-2 tabular-nums">{fmtKg(r.totalDispatchWeight)}</td>
            <td className="px-3 py-2 tabular-nums font-semibold">{fmtMoney(r.totalDispatchValue)}</td>
            <td className="px-3 py-2 tabular-nums" style={{ color: COLORS.positive }}>{fmtMoney(r.received)}</td>
            <td className="px-3 py-2 tabular-nums font-semibold" style={{ color: r.balance > 0 ? COLORS.due : COLORS.positive }}>{fmtMoney(r.balance)}</td>
          </tr>
        )}
      />

      <h3 className="font-semibold mb-2 mt-6 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Highest Pending Payments</h3>
      <Table
        columns={["Party", "Balance Due"]}
        rows={duesSorted}
        emptyText="No pending dues — all clear."
        renderRow={(r) => (
          <tr key={r.party.id} style={{ borderTop: `1px solid ${COLORS.borderSoft}` }}>
            <td className="px-3 py-2 font-medium whitespace-nowrap">{r.party.name}</td>
            <td className="px-3 py-2 tabular-nums font-semibold" style={{ color: COLORS.due }}>{fmtMoney(r.balance)}</td>
          </tr>
        )}
      />
    </div>
  );
}

/* ---------------------------------------------------------------
   DASHBOARD
----------------------------------------------------------------*/
function DashboardView({ parties, receipts, dispatches, expenses, payments, production, stats, goTo }) {
  const totalDue = Object.values(stats).reduce((s, x) => s + (x.balance > 0 ? x.balance : 0), 0);
  const rolaPending = Object.values(stats).reduce((s, x) => s + (x.rolaPending > 0 ? x.rolaPending : 0), 0);
  const monthExpenses = expenses.filter((x) => isThisMonth(x.date)).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const inProgress = production.filter((p) => p.status !== "Done").length;
  const recentReceipts = [...receipts].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  const recentDispatches = [...dispatches].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  const partyName = (id) => parties.find((p) => p.id === id)?.name || "—";

  return (
    <div>
      <SectionHeader title="Dashboard" subtitle="Jari Kasab Val — job-work overview" />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Parties" value={parties.length} />
        <KpiCard label="Production active" value={inProgress} sub="pending / in progress" />
        <KpiCard label="Rola pending" value={rolaPending} sub="to be returned" />
        <KpiCard label="Balance due" value={fmtMoney(totalDue)} tone="due" />
        <KpiCard label="Expenses" value={fmtMoney(monthExpenses)} sub="this month" tone="due" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Recent Receiving</h3>
            <button onClick={() => goTo("receiving")} className="text-xs font-medium" style={{ color: COLORS.brass }}>View all</button>
          </div>
          <Table
            columns={["Date", "Party", "Net Wt"]}
            rows={recentReceipts}
            emptyText="No entries yet."
            renderRow={(r) => (
              <tr key={r.id} style={{ borderTop: `1px solid ${COLORS.borderSoft}` }}>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                <td className="px-3 py-2 font-medium">{partyName(r.partyId)}</td>
                <td className="px-3 py-2 tabular-nums">{fmtKg(r.netWeight)}</td>
              </tr>
            )}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Recent Dispatch</h3>
            <button onClick={() => goTo("dispatch")} className="text-xs font-medium" style={{ color: COLORS.brass }}>View all</button>
          </div>
          <Table
            columns={["Date", "Party", "Net Val", "Amount"]}
            rows={recentDispatches}
            emptyText="No entries yet."
            renderRow={(d) => (
              <tr key={d.id} style={{ borderTop: `1px solid ${COLORS.borderSoft}` }}>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(d.date)}</td>
                <td className="px-3 py-2 font-medium">{partyName(d.partyId)}</td>
                <td className="px-3 py-2 tabular-nums">{fmtKg(d.netValWeight)}</td>
                <td className="px-3 py-2 tabular-nums">{d.amount ? fmtMoney(d.amount) : "—"}</td>
              </tr>
            )}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   ROOT APP
----------------------------------------------------------------*/
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "parties", label: "Parties", icon: Users },
  { id: "receiving", label: "Receiving", icon: PackagePlus },
  { id: "production", label: "Production", icon: Cog },
  { id: "dispatch", label: "Dispatch", icon: Truck },
  { id: "rola", label: "Rola", icon: RotateCcw },
  { id: "payments", label: "Payments", icon: IndianRupee },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState({
    parties: [], receipts: [], production: [], dispatches: [], rolaReturns: [], payments: [], expenses: [],
  });
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    loadAll().then((d) => { setData(d); setLoaded(true); });
  }, []);

  const makeSetter = (key) => (value) => {
    setData((prev) => {
      const next = { ...prev, [key]: value };
      save(key, value).catch(() => setSaveError(true));
      return next;
    });
  };

  const setParties = makeSetter("parties");
  const setReceipts = makeSetter("receipts");
  const setProduction = makeSetter("production");
  const setDispatches = makeSetter("dispatches");
  const setRolaReturns = makeSetter("rolaReturns");
  const setPayments = makeSetter("payments");
  const setExpenses = makeSetter("expenses");

  // Per-party derived stats, computed once and reused across views
  const stats = useMemo(() => {
    const out = {};
    for (const p of data.parties) {
      const rolaReceived = data.receipts.filter((r) => r.partyId === p.id).reduce((s, r) => s + (Number(r.rolaCount) || 0), 0);
      const rolaReturned = data.rolaReturns.filter((r) => r.partyId === p.id).reduce((s, r) => s + (Number(r.rolaCount) || 0), 0);
      const partyDispatches = data.dispatches.filter((d) => d.partyId === p.id);
      const totalDispatchWeight = partyDispatches.reduce((s, d) => s + (Number(d.netValWeight) || 0), 0);
      const totalDispatchValue = partyDispatches.reduce((s, d) => s + (Number(d.amount) || 0), 0);
      const received = data.payments.filter((pay) => pay.partyId === p.id).reduce((s, pay) => s + (Number(pay.amount) || 0), 0);
      out[p.id] = {
        rolaPending: rolaReceived - rolaReturned,
        receivable: totalDispatchValue,
        received,
        balance: totalDispatchValue - received,
        totalDispatchWeight,
        totalDispatchValue,
      };
    }
    return out;
  }, [data]);

  if (!loaded) {
    return (
      <div className="min-h-[400px] flex items-center justify-center" style={{ background: COLORS.paper }}>
        <Loader2 className="animate-spin" style={{ color: COLORS.brass }} size={28} />
      </div>
    );
  }

  const viewProps = {
    parties: data.parties, setParties, stats,
    receipts: data.receipts, setReceipts,
    production: data.production, setProduction,
    dispatches: data.dispatches, setDispatches,
    rolaReturns: data.rolaReturns, setRolaReturns,
    payments: data.payments, setPayments,
    expenses: data.expenses, setExpenses,
  };

  return (
    <div style={{ background: COLORS.paper, minHeight: "100%", fontFamily: "'Inter', sans-serif", color: COLORS.ink }} className="w-full">
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        input:focus, select:focus { box-shadow: 0 0 0 2px ${COLORS.brass}33; border-color: ${COLORS.brass}; }
        ::selection { background: ${COLORS.brass}33; }
      `}</style>

      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3"
        style={{ background: COLORS.ink, borderBottom: `1px solid ${COLORS.brassDark}` }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.brass }} />
          <h1 className="text-base sm:text-lg font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Kasab Val Manager
          </h1>
        </div>
        <span className="text-xs hidden sm:block" style={{ color: "#C9C2B4" }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        </span>
      </header>

      {saveError && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs" style={{ background: COLORS.dueBg, color: COLORS.due }}>
          <AlertCircle size={14} /> Could not save last change — check your connection and try again.
        </div>
      )}

      <div className="flex" style={{ minHeight: "calc(100vh - 56px)" }}>
        {/* Sidebar (desktop) */}
        <nav
          className="hidden sm:flex flex-col gap-1 w-52 flex-shrink-0 p-3"
          style={{ borderRight: `1px solid ${COLORS.border}` }}
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-left transition-colors"
                style={{
                  background: active ? COLORS.brass : "transparent",
                  color: active ? "#fff" : COLORS.ink,
                }}
              >
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 pb-24 sm:pb-6 max-w-6xl">
          {tab === "dashboard" && <DashboardView {...data} stats={stats} goTo={setTab} />}
          {tab === "parties" && <PartiesView {...viewProps} />}
          {tab === "receiving" && <ReceivingView {...viewProps} />}
          {tab === "production" && <ProductionView {...viewProps} />}
          {tab === "dispatch" && <DispatchView {...viewProps} />}
          {tab === "rola" && <RolaView {...viewProps} />}
          {tab === "payments" && <PaymentsView {...viewProps} />}
          {tab === "expenses" && <ExpensesView {...viewProps} />}
          {tab === "reports" && <ReportsView {...data} stats={stats} />}
        </main>
      </div>

      {/* Bottom tab bar (mobile) */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 flex overflow-x-auto z-20"
        style={{ background: COLORS.ink, borderTop: `1px solid ${COLORS.brassDark}` }}
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex flex-col items-center justify-center gap-0.5 py-2 flex-shrink-0"
              style={{ color: active ? COLORS.brass : "#9C9384", minWidth: 64 }}
            >
              <Icon size={18} />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
