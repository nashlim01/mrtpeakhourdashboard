// ─── REACT HOOKS ─────────────────────────────────────────────────────────
const { useState, useEffect, useRef } = React;

// ─── THEME MANAGEMENT ────────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mrt-theme');
      if (saved) return saved;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mrt-theme', theme);
    
    // Update meta theme-color for mobile browsers
    const meta = document.getElementById('theme-color-meta');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#06080e' : '#f8fafc');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  
  return { theme, toggleTheme };
}

// ─── FULL ROUTE DATA (PM Peak) ───────────────────────────────────────────
const INITIAL_DATA = [
  { name: "Kwasa Damansara", board: 75, alight: 0, load: 300 },
  { name: "Kwasa Sentral", board: 75, alight: 13, load: 363 },
  { name: "Kota Damansara–Thomson Hospital", board: 100, alight: 25, load: 438 },
  { name: "Mutiara Damansara", board: 150, alight: 50, load: 538 },
  { name: "Bandar Utama", board: 200, alight: 75, load: 663 },
  { name: "TTDI", board: 225, alight: 75, load: 813 },
  { name: "Phileo Damansara", board: 175, alight: 50, load: 938 },
  { name: "Pavilion Damansara Heights–Pusat Bandar", board: 225, alight: 75, load: 1088 },
  { name: "Semantan", board: 250, alight: 75, load: 1263 },
  { name: "Muzium Negara", board: 875, alight: 125, load: 2013, isKey: true, keyIdx: 0 },
  { name: "Pasar Seni", board: 750, alight: 300, load: 2463, isKey: true, keyIdx: 1 },
  { name: "Merdeka", board: 200, alight: 125, load: 2538, isKey: true, keyIdx: 2 },
  { name: "Pavilion KL–Bukit Bintang", board: 900, alight: 100, load: 3338, isKey: true, keyIdx: 3 },
  { name: "Tun Razak Exchange (TRX)", board: 375, alight: 300, load: 3413, isKey: true, keyIdx: 4 },
  { name: "Cochrane", board: 125, alight: 100, load: 3438 },
  { name: "Maluri–AEON", board: 200, alight: 150, load: 3488 },
  { name: "Taman Pertama", board: 75, alight: 200, load: 3363 },
  { name: "Taman Midah", board: 50, alight: 225, load: 3188 },
  { name: "Taman Mutiara", board: 50, alight: 225, load: 3013 },
  { name: "Taman Connaught", board: 75, alight: 300, load: 2788 },
  { name: "Taman Suntex", board: 50, alight: 200, load: 2638 },
  { name: "Sri Raya", board: 50, alight: 200, load: 2488 },
  { name: "Bandar Tun Hussein Onn", board: 50, alight: 250, load: 2288 },
  { name: "Batu 11 Cheras", board: 38, alight: 300, load: 2025 },
  { name: "Bukit Dukung", board: 25, alight: 250, load: 1800 },
  { name: "Sungai Jernih", board: 25, alight: 300, load: 1525 },
  { name: "Stadium Kajang", board: 13, alight: 375, load: 1163 },
  { name: "Kajang", board: 0, alight: 1163, load: 0 },
];

const KEY_STATIONS = ["Muzium Negara", "Pasar Seni", "Merdeka", "Pavilion KL–Bukit Bintang", "Tun Razak Exchange (TRX)"];
const KEY_LINES = ["KTM LRT ERL Line", "Kelana Jaya LRT", "Ampang Sri Petaling LRT", "KL Monorail", "Putrajaya Line"];
const KEY_SHORT = ["MN", "PS", "MK", "PB", "TRX"];

// ─── CONSTANTS (Single-Track End-to-End Optimized) ───────────────────────
const TRAIN_CAP = 1200;
const COMFORTABLE = 960;
const TRAVEL_S = 120;
const DWELL_S = 40;
const TRAINS_TOTAL = 4;
const TRAINS_PER_DIR = 2;
const LAYOVER_SEC = 180;
const MIN_HW_BUFFER = 2;

// ─── COLOR SCHEME (via CSS variables now, but keeping for JS logic) ──────
const C = {
  accent: "var(--accent)",
  red: "var(--red)",
  green: "var(--green)",
  amber: "var(--amber)",
  purple: "var(--purple)",
  teal: "var(--teal)",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────
function recalcLoad(rows) {
  let running = 0;
  return rows.map(r => {
    running = running + r.board - r.alight;
    if (running < 0) running = 0;
    return { ...r, load: running };
  });
}

function headwayMin(stops, trains, { roundTrip = false, layoverSec = 0 } = {}) {
  const legs = stops - 1;
  const oneWaySec = legs * TRAVEL_S + stops * DWELL_S + layoverSec;
  const cycleSec = roundTrip ? oneWaySec * 2 : oneWaySec;
  return cycleSec / 60 / trains;
}

function capPerHour(hw) {
  return Math.floor((60 / hw) * TRAIN_CAP);
}

// ─── STRATEGY ENGINE ─────────────────────────────────────────────────────
function runStrategies(rows) {
  const keyRows = rows.filter(r => r.isKey);
  if (keyRows.length < 5) return null;

  const demand = keyRows.map(r => r.board);
  const loads = keyRows.map(r => r.load);

  function stMet(hw, cap, idx) {
    const d = demand[idx];
    const l = loads[idx];
    const overflow = Math.max(0, d - cap);
    const congestion = +(l / TRAIN_CAP).toFixed(3);
    return {
      name: KEY_STATIONS[idx], short: KEY_SHORT[idx], line: KEY_LINES[idx],
      demand: d, load: l, capPerHour: cap,
      overflow, congestion,
      wait: +(hw / 2).toFixed(2),
      served: Math.min(d, cap),
    };
  }

  const strategies = [];

  // BASELINE
  const baseHW = headwayMin(5, TRAINS_PER_DIR, { roundTrip: false });
  const baseCap = capPerHour(baseHW);
  strategies.push({
    id: "baseline", name: "Existing Service", short: "Existing", icon: "🔵", color: "var(--text-muted)",
    desc: "Current scheduled service with no backup intervention.",
    trains: TRAINS_PER_DIR,
    stations: KEY_STATIONS.map((_, i) => stMet(baseHW, baseCap, i)),
    hw: +baseHW.toFixed(2), complexity: 1, transferSafe: 5,
  });

  // SKIP-STOP
  const oddHW = headwayMin(3, 1, { roundTrip: false });
  const evenHW = headwayMin(2, 1, { roundTrip: false });
  const oddCap = capPerHour(oddHW);
  const evenCap = capPerHour(evenHW);
  const skipSt = [0,1,2,3,4].map(i => {
    const isOdd = [0,2,4].includes(i);
    return stMet(isOdd ? oddHW : evenHW, isOdd ? oddCap : evenCap, i);
  });
  strategies.push({
    id: "skip", name: "Skip-Stop (Odd/Even)", short: "Skip-Stop", icon: "⏭", color: "var(--teal)",
    desc: "1 train serves MN, MK, TRX; 1 train serves PS, PB per direction.",
    trains: TRAINS_TOTAL, stations: skipSt, hw: +((oddHW + evenHW) / 2).toFixed(2),
    complexity: 3, transferSafe: 1,
  });

  // EXPRESS OVERLAY
  const expHW = Math.max(headwayMin(2, 1, { roundTrip: false }) * 0.7, baseHW - MIN_HW_BUFFER);
  const locHW = headwayMin(5, 3, { roundTrip: false });
  const expCap = capPerHour(expHW);
  const locCap = capPerHour(locHW);
  const expSt = [0,1,2,3,4].map(i => {
    const terminal = i === 0 || i === 4;
    return stMet(locHW, terminal ? locCap + expCap : locCap, i);
  });
  strategies.push({
    id: "express", name: "Express Overlay", short: "Express", icon: "🚄", color: "var(--amber)",
    desc: "1 express (MN↔TRX non-stop) boosts terminal capacity; 3 local all-stop trains.",
    trains: TRAINS_TOTAL, stations: expSt, hw: +locHW.toFixed(2),
    complexity: 2, transferSafe: 4,
  });

  // DYNAMIC HEADWAY
  const totalD = demand.reduce((a, b) => a + b, 0);
  const dynSt = [0,1,2,3,4].map(i => {
    const share = (demand[i] / totalD) * TRAINS_PER_DIR;
    const hw = headwayMin(5, Math.max(0.5, share), { roundTrip: false });
    return stMet(hw, capPerHour(hw), i);
  });
  strategies.push({
    id: "dynamic", name: "Dynamic Headway", short: "Dynamic", icon: "📡", color: "var(--purple)",
    desc: "Train dispatch frequency proportional to real-time boarding load.",
    trains: TRAINS_TOTAL, stations: dynSt,
    hw: +(dynSt.reduce((a, s) => a + s.wait, 0) / 5 * 2).toFixed(2),
    complexity: 4, transferSafe: 5,
  });

  // ZONAL TURN-BACK
  const fullHW = headwayMin(5, 2, { roundTrip: false, layoverSec: LAYOVER_SEC });
  const zoneHW = headwayMin(3, 2, { roundTrip: false, layoverSec: LAYOVER_SEC });
  const fullCap = capPerHour(fullHW);
  const zoneCap = capPerHour(zoneHW);
  const zoneSt = [0,1,2,3,4].map(i => {
    const inZone = i >= 1 && i <= 3;
    return stMet(
      inZone ? Math.min(fullHW, zoneHW) : fullHW,
      inZone ? fullCap + zoneCap : fullCap, i
    );
  });
  strategies.push({
    id: "zonal", name: "Zonal Turn-Back", short: "Zonal", icon: "↩", color: "var(--green)",
    desc: "2 full-route + 2 zone trains (PS↔PB) double frequency in CBD core.",
    trains: TRAINS_TOTAL, stations: zoneSt, hw: +((fullHW + zoneHW) / 2).toFixed(2),
    complexity: 3, transferSafe: 4,
  });

  // GATE METERING
  const meterHW = headwayMin(5, TRAINS_PER_DIR, { roundTrip: false });
  const meterCap = capPerHour(meterHW);
  const meterSt = [0,1,2,3,4].map(i => {
    const d = demand[i];
    const overflow = Math.max(0, d - meterCap);
    const gateHold = overflow > 0 ? +(overflow / d * meterHW).toFixed(2) : 0;
    const s = stMet(meterHW, meterCap, i);
    return { ...s, overflow: 0, wait: +(s.wait + gateHold).toFixed(2), gateHold, rawOverflow: overflow };
  });
  strategies.push({
    id: "meter", name: "Gate Metering", short: "Metered", icon: "🚦", color: "var(--amber)",
    desc: "All trains all-stop. Entry gates throttle platform inflow.",
    trains: TRAINS_TOTAL, stations: meterSt, hw: +meterHW.toFixed(2),
    complexity: 2, transferSafe: 5,
  });

  // Aggregate metrics
  strategies.forEach(s => {
    s.avgWait = +(s.stations.reduce((a, r) => a + r.wait, 0) / 5).toFixed(2);
    s.avgCong = +(s.stations.reduce((a, r) => a + r.congestion, 0) / 5).toFixed(3);
    s.maxLoad = Math.max(...s.stations.map(r => r.load));
    s.totalOverflow = s.stations.reduce((a, r) => a + (r.overflow || 0), 0);
    s.throughput = s.stations.reduce((a, r) => a + r.served, 0);
  });

  return strategies;
}

// ─── LOAD BAR COMPONENT ──────────────────────────────────────────────────
function LoadBar({ load, cap = TRAIN_CAP, comfortable = COMFORTABLE, width = "100%" }) {
  const pct = Math.min(100, (load / cap) * 100);
  const comfPct = (comfortable / cap) * 100;
  const col = load > cap ? "var(--red)" : load > comfortable ? "var(--amber)" : "var(--green)";
  
  return (
    <div className="load-bar" style={{ width }}>
      <div className="load-bar-fill" style={{ width: `${pct}%`, background: col }} />
      <div className="load-bar-comfort" style={{ left: `${comfPct}%` }} />
    </div>
  );
}

// ─── EDITABLE CELL COMPONENT ─────────────────────────────────────────────
function EditCell({ value, onChange, color }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  const ref = useRef();
  
  useEffect(() => { setV(value); }, [value]);

  if (editing) {
    return (
      <input
        ref={ref}
        type="number"
        value={v}
        min={0}
        className="edit-cell-input"
        style={{ color: color || "var(--text)" }}
        onChange={e => setV(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const n = parseInt(v);
          if (!isNaN(n) && n >= 0) onChange(n);
          else setV(value);
        }}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === "Tab") ref.current?.blur();
          if (e.key === "Escape") { setV(value); setEditing(false); }
        }}
        autoFocus
        aria-label="Edit value"
      />
    );
  }
  
  return (
    <span
      className="edit-cell"
      style={{ color: color || "var(--text)" }}
      onClick={() => setEditing(true)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditing(true); } }}
      aria-label={`Edit value: ${value}`}
    >
      {v}
    </span>
  );
}

// ─── MAIN APP COMPONENT ──────────────────────────────────────────────────
function App() {
  const { theme, toggleTheme } = useTheme();
  
  const [rows, setRows] = useState(() => recalcLoad(INITIAL_DATA));
  const [tab, setTab] = useState("data");
  const [active, setActive] = useState("zonal");
  const [disrupted, setDisrupted] = useState(true);

  const effectiveRows = disrupted
    ? rows.map(r => r.isKey ? { ...r, board: Math.round(r.board * 2.8), load: Math.round(r.load * 1.4) } : r)
    : rows;

  const strategies = runStrategies(effectiveRows);
  const activeSt = strategies?.find(s => s.id === active);
  const baseline = strategies?.[0];

  function updateCell(idx, field, val) {
    const next = rows.map((r, i) => i === idx ? { ...r, [field]: val } : r);
    setRows(recalcLoad(next));
  }
  
  function resetData() {
    setRows(recalcLoad(INITIAL_DATA));
  }

  const maxLoad = Math.max(...rows.map(r => r.load));
  const TABS = [
    { id: "data", label: "📋 Route Data" },
    { id: "compare", label: "📊 Strategy Compare" },
    { id: "detail", label: "🔬 Detail" },
    { id: "verdict", label: "⚖ Verdict" },
  ];

  return (
    <>
      {/* Theme Toggle Button */}
      <button 
        className="theme-toggle" 
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text)", padding: "1.125rem 0.875rem", transition: "var(--transition)" }}>
        <div className="container">
          
          {/* Header */}
          <div style={{ marginBottom: "1.125rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.625rem" }}>
            <div>
              <div style={{ fontSize: "0.5625rem", color: "var(--text-muted)", letterSpacing: "0.1875em", textTransform: "uppercase", marginBottom: "0.1875rem" }}>
                MRT Kajang Line · PM Peak Hour
              </div>
              <h1 style={{ color: "var(--text)" }}>
                CBD Disruption <span style={{ color: "var(--accent)" }}>Strategy</span> Simulator
              </h1>
              <p style={{ marginTop: "0.25rem" }}>
                Kwasa Damansara → Kajang · 28 stations · 5 CBD interchange stations · 4 backup trains (2/dir)
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
              <button className="sbtn" style={{ "--sc": "var(--red)", ...(disrupted ? { color: "var(--red)", borderColor: "var(--red)", background: "color-mix(in srgb, var(--red) 12%, transparent)" } : {}) }} onClick={() => setDisrupted(true)}>
                ⚠ Disruption (2.8×)
              </button>
              <button className="sbtn" style={{ "--sc": "var(--green)", ...(!disrupted ? { color: "var(--green)", borderColor: "var(--green)", background: "color-mix(in srgb, var(--green) 12%, transparent)" } : {}) }} onClick={() => setDisrupted(false)}>
                ✓ Normal Ops
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          {strategies && (
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(8.125rem,1fr))", gap: "0.5rem", marginBottom: "1rem" }}>
              {[
                { l: "Peak Load", v: `${Math.max(...effectiveRows.map(r => r.load))} pax`, c: "var(--amber)" },
                { l: "CBD Board/hr", v: `${effectiveRows.filter(r => r.isKey).reduce((a, r) => a + r.board, 0)}`, c: "var(--accent)" },
                { l: "Train Capacity", v: `${TRAIN_CAP} pax`, c: "var(--text-muted)" },
                { l: "Comfortable Cap", v: `${COMFORTABLE} pax`, c: "var(--green)" },
                { l: "Best Avg Wait", v: `${Math.min(...strategies.slice(1).map(s => s.avgWait))}m`, c: "var(--purple)" },
              ].map((s, i) => (
                <div key={i} className="stat-card">
                  <div className="stat-card-label">{s.l}</div>
                  <div className="stat-card-value" style={{ color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tab Navigation */}
          <nav className="tab-bar" role="tablist" aria-label="Main navigation">
            {TABS.map(t => (
              <button 
                key={t.id} 
                className={`tb ${tab === t.id ? "on" : ""}`} 
                onClick={() => setTab(t.id)}
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`tab-${t.id}`}
                id={`tab-btn-${t.id}`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* TAB: ROUTE DATA */}
          {tab === "data" && (
            <div id="tab-data" role="tabpanel" aria-labelledby="tab-btn-data">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.6875rem", color: "var(--text)", fontWeight: 500 }}>Editable PM Peak Data</span>
                  <span style={{ marginLeft: "0.625rem", fontSize: "0.625rem", color: "var(--text-muted)" }}>Click any Board/Alight value to edit · Load recalculates automatically</span>
                </div>
                <button className="sbtn" onClick={resetData} style={{ color: "var(--amber)", borderColor: "color-mix(in srgb, var(--amber) 55%, transparent)" }}>↺ Reset to defaults</button>
              </div>

              <div className="panel" style={{ overflow: "hidden" }}>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        {["#", "Station", "Board /hr", "Alight /hr", "Train Load", "Utilisation", " "].map((h, i) => (
                          <th key={i} style={{ textAlign: i >= 2 ? "center" : "left", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => {
                        const isKey = r.isKey;
                        const loadCol = r.load > TRAIN_CAP ? "var(--red)" : r.load > COMFORTABLE ? "var(--amber)" : "var(--green)";
                        return (
                          <tr key={i} className="hrow" style={{ borderBottom: `1px solid ${isKey ? "var(--border2)" : "var(--border)"}`, background: isKey ? "var(--panel2)" : "transparent" }}>
                            <td style={{ color: "var(--text-muted)", fontSize: "0.625rem", width: "1.75rem" }}>{i + 1}</td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4375rem" }}>
                                {isKey && <div style={{ width: "0.1875rem", height: "1.125rem", borderRadius: "0.125rem", background: ["var(--teal)", "#f472b6", "var(--purple)", "var(--amber)", "var(--green)"][r.keyIdx], flexShrink: 0 }} />}
                                <span style={{ color: isKey ? "var(--text)" : "var(--text-muted)", fontWeight: isKey ? 500 : 400, fontSize: isKey ? "0.75rem" : "0.6875rem" }}>{r.name}</span>
                                {isKey && <span className="badge badge-interchange">Interchange</span>}
                              </div>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <EditCell value={r.board} color="var(--green)" onChange={v => updateCell(i, "board", v)} />
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <EditCell value={r.alight} color="var(--red)" onChange={v => updateCell(i, "alight", v)} />
                            </td>
                            <td style={{ minWidth: "10rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <LoadBar load={r.load} width="6.25rem" />
                                <span style={{ fontFamily: "inherit", fontSize: "0.6875rem", color: loadCol, minWidth: "2.5rem" }}>{r.load}</span>
                              </div>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span style={{ fontSize: "0.625rem", color: loadCol }}>{TRAIN_CAP > 0 ? Math.round(r.load / TRAIN_CAP * 100) : 0}%</span>
                            </td>
                            <td style={{ textAlign: "right", paddingRight: "0.875rem" }}>
                              {r.load > TRAIN_CAP && <span className="badge badge-overcap">OVERCAP</span>}
                              {r.load > COMFORTABLE && r.load <= TRAIN_CAP && <span className="badge badge-heavy">HEAVY</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Load Profile Chart */}
              <div className="panel" style={{ marginTop: "0.875rem" }}>
                <div style={{ fontSize: "0.625rem", color: "var(--text-muted)", letterSpacing: "0.0625em", marginBottom: "0.625rem" }}>TRAIN LOAD PROFILE · FULL ROUTE</div>
                <div className="load-chart">
                  {rows.map((r, i) => {
                    const h = maxLoad > 0 ? (r.load / maxLoad) * 76 : 0;
                    const col = r.load > TRAIN_CAP ? "var(--red)" : r.load > COMFORTABLE ? "var(--amber)" : r.isKey ? "var(--accent)" : "var(--text-dim)";
                    return (
                      <div key={i} className="load-bar-chart" title={`${r.name}: ${r.load} pax`}
                        style={{ height: `${h}px`, background: col, opacity: r.isKey ? 1 : 0.7 }} />
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.375rem", fontSize: "0.5625rem", color: "var(--text-muted)" }}>
                  <span>Kwasa Damansara</span>
                  <span style={{ color: "var(--accent)" }}>← CBD Core →</span>
                  <span>Kajang</span>
                </div>
                <div style={{ display: "flex", gap: "0.875rem", marginTop: "0.625rem", fontSize: "0.5625rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                  {[["var(--accent)", "Interchange"], ["var(--amber)", "Heavy (>960)"], ["var(--red)", "Overcap (>1200)"], ["var(--text-dim)", "Regular"]].map(([c, l]) => (
                    <span key={l} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "0.0625rem", background: c, display: "inline-block" }} />{l}
                    </span>
                  ))}
                  <span style={{ marginLeft: "auto", color: "var(--amber)" }}>Cap: {COMFORTABLE}/{TRAIN_CAP}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: COMPARE */}
          {tab === "compare" && strategies && (
            <div id="tab-compare" role="tabpanel" aria-labelledby="tab-btn-compare">
              <div className="strategy-selector">
                {strategies.map(s => (
                  <button key={s.id} className={`sbtn ${active === s.id ? "on" : ""}`} style={{ "--sc": s.color }} onClick={() => setActive(s.id)}>
                    {s.icon} {s.short}
                  </button>
                ))}
              </div>

              <div className="panel" style={{ marginBottom: "0.875rem", overflow: "hidden" }}>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        {["Strategy", "Headway", "Avg Wait", "Avg Congestion", "Peak Load", "Overflow /hr", "Throughput", "Transfer ★"].map(h => (
                          <th key={h} style={{ textAlign: h === "Strategy" ? "left" : "center" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {strategies.map(s => {
                        const isBase = s.id === "baseline";
                        const isActive = s.id === active;
                        const waitVsBase = baseline ? +(s.avgWait - baseline.avgWait).toFixed(2) : 0;
                        return (
                          <tr key={s.id} className="hrow" onClick={() => setActive(s.id)}
                            style={{ cursor: "pointer", background: isActive ? `color-mix(in srgb, ${s.color} 8%, transparent)` : "transparent", borderLeft: isActive ? `3px solid ${s.color}` : "3px solid transparent" }}>
                            <td>
                              <div style={{ fontWeight: isActive ? 700 : 400, color: s.color, fontSize: "0.75rem" }}>{s.icon} {s.name}</div>
                              <div style={{ fontSize: "0.5625rem", color: "var(--text-muted)", marginTop: "0.0625rem" }}>{s.trains} train(s)/dir</div>
                            </td>
                            <td style={{ textAlign: "center", fontFamily: "monospace" }}>{s.hw}m</td>
                            <td style={{ textAlign: "center" }}>
                              <span style={{ fontFamily: "monospace", fontWeight: 700, color: s.avgWait < 2 ? "var(--green)" : s.avgWait < 3.5 ? "var(--amber)" : "var(--red)" }}>{s.avgWait}m</span>
                              {!isBase && <div style={{ fontSize: "0.5625rem", color: waitVsBase <= 0 ? "var(--green)" : "var(--red)" }}>{waitVsBase <= 0 ? "▼ " : "▲ "}{Math.abs(waitVsBase)}m</div>}
                            </td>
                            <td style={{ textAlign: "center", fontFamily: "monospace", color: s.avgCong > 1 ? "var(--red)" : s.avgCong > 0.8 ? "var(--amber)" : "var(--green)" }}>{s.avgCong}×</td>
                            <td style={{ textAlign: "center", fontFamily: "monospace", color: s.maxLoad > TRAIN_CAP ? "var(--red)" : s.maxLoad > COMFORTABLE ? "var(--amber)" : "var(--green)" }}>{s.maxLoad}</td>
                            <td style={{ textAlign: "center", fontFamily: "monospace", color: s.totalOverflow > 0 ? "var(--red)" : "var(--green)" }}>{s.totalOverflow}</td>
                            <td style={{ textAlign: "center", fontFamily: "monospace" }}>{s.throughput}</td>
                            <td style={{ textAlign: "center" }}>
                              <span style={{ color: s.transferSafe >= 4 ? "var(--green)" : s.transferSafe >= 2 ? "var(--amber)" : "var(--red)" }}>
                                {"★ ".repeat(s.transferSafe)}<span style={{ color: "var(--text-dim)" }}>{"★ ".repeat(5 - s.transferSafe)}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Heatmap */}
              <div className="panel">
                <div style={{ fontSize: "0.625rem", color: "var(--text-muted)", letterSpacing: "0.0625em", marginBottom: "0.75rem" }}>CONGESTION HEATMAP · 5 INTERCHANGE STATIONS × ALL STRATEGIES</div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>Station</th>
                        <th>Board/hr</th>
                        <th>Train Load</th>
                        {strategies.map(s => (
                          <th key={s.id} style={{ color: s.color }}>{s.icon}<br />{s.short}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {KEY_STATIONS.map((name, i) => {
                        const keyRow = effectiveRows.find(r => r.name === name || (r.isKey && r.keyIdx === i));
                        return (
                          <tr key={i}>
                            <td>
                              <div style={{ fontWeight: 500, fontSize: "0.75rem" }}>{KEY_SHORT[i]}</div>
                              <div style={{ fontSize: "0.5625rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{KEY_LINES[i]}</div>
                            </td>
                            <td style={{ textAlign: "center", fontFamily: "monospace", color: "var(--green)" }}>{keyRow?.board || 0}</td>
                            <td style={{ textAlign: "center", fontFamily: "monospace", color: keyRow?.load > TRAIN_CAP ? "var(--red)" : keyRow?.load > COMFORTABLE ? "var(--amber)" : "var(--green)" }}>{keyRow?.load || 0}</td>
                            {strategies.map(s => {
                              const st = s.stations[i];
                              const congestionClass = st.congestion > 1.2 ? "critical" : st.congestion > 1 ? "warning" : st.congestion > 0.8 ? "elevated" : "normal";
                              return (
                                <td key={s.id} className={`heatmap-cell ${congestionClass}`}>
                                  <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.75rem" }}>{st.congestion}×</div>
                                  <div style={{ fontSize: "0.5625rem", color: "var(--text-muted)" }}>{st.wait}m</div>
                                  {st.overflow > 0 && <div style={{ fontSize: "0.5625rem", color: "var(--red)" }}>+{st.overflow}</div>}
                                  {st.gateHold > 0 && <div style={{ fontSize: "0.5625rem", color: "var(--amber)" }}>hold {st.gateHold}m</div>}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DETAIL (Complete) */}
          {tab === "detail" && strategies && (
            <div id="tab-detail" role="tabpanel" aria-labelledby="tab-btn-detail">
              <div className="strategy-selector">
                {strategies.filter(s => s.id !== "baseline").map(s => (
                  <button key={s.id} className={`sbtn ${active === s.id ? "on" : ""}`} style={{ "--sc": s.color }} onClick={() => setActive(s.id)}>
                    {s.icon} {s.name}
                  </button>
                ))}
              </div>

              {activeSt && (
                <>
                  <div className="panel" style={{ borderColor: `color-mix(in srgb, ${activeSt.color} 25%, var(--border))`, marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.625rem", marginBottom: "0.625rem" }}>
                      <div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: activeSt.color, marginBottom: "0.25rem" }}>{activeSt.icon} {activeSt.name}</div>
                        <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", lineHeight: 1.8, maxWidth: "32.5rem" }}>{activeSt.desc}</div>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {[
                          { l: "Headway", v: `${activeSt.hw}m`, c: "var(--accent)" },
                          { l: "Avg Wait", v: `${activeSt.avgWait}m`, c: activeSt.avgWait < 2 ? "var(--green)" : "var(--amber)" },
                          { l: "Overflow", v: `${activeSt.totalOverflow} pax/hr`, c: activeSt.totalOverflow > 0 ? "var(--red)" : "var(--green)" },
                          { l: "Complexity", v: ["", "Low", "Low-Med", "Medium", "High", "Very High"][activeSt.complexity], c: "var(--amber)" },
                        ].map((m, i) => (
                          <div key={i} className="stat-card" style={{ minWidth: "5.625rem" }}>
                            <div className="stat-card-label">{m.l}</div>
                            <div className="stat-card-value" style={{ color: m.c, fontSize: "0.875rem" }}>{m.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {activeSt.stations.map((s, i) => {
                      const bLine = baseline?.stations[i];
                      const dWait = bLine ? +(s.wait - bLine.wait).toFixed(2) : 0;
                      const keyRow = effectiveRows.find(r => r.isKey && r.keyIdx === i);
                      return (
                        <div key={i} className="panel" style={{ borderColor: s.congestion > 1 ? "color-mix(in srgb, var(--red) 25%, var(--border))" : s.congestion > 0.85 ? "color-mix(in srgb, var(--amber) 20%, var(--border))" : "var(--border)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.625rem", flexWrap: "wrap", gap: "0.375rem" }}>
                            <div>
                              <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: activeSt.color }}>{s.name}</span>
                              <span style={{ marginLeft: "0.5rem", fontSize: "0.5625rem", color: "var(--text-muted)" }}>{s.line}</span>
                            </div>
                            <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
                              <span style={{ fontSize: "0.625rem", fontFamily: "monospace", color: s.congestion > 1 ? "var(--red)" : s.congestion > 0.85 ? "var(--amber)" : "var(--green)" }}>
                                {s.congestion}× cong.
                              </span>
                              <span style={{ fontSize: "0.625rem", color: "var(--text-muted)" }}>|</span>
                              <span style={{ fontSize: "0.625rem", color: dWait <= 0 ? "var(--green)" : "var(--red)" }}>
                                {dWait <= 0 ? "▼ " : "▲ "}{Math.abs(dWait)}m vs baseline
                              </span>
                            </div>
                          </div>

                          {s.gateHold > 0 && (
                            <div className="verdict-risk" style={{ marginBottom: "0.625rem", background: "color-mix(in srgb, var(--amber) 8%, transparent)", borderColor: "color-mix(in srgb, var(--amber) 20%, transparent)", color: "color-mix(in srgb, var(--amber) 70%, var(--text))" }}>
                              🚦 Gate hold: +{s.gateHold}m · {s.rawOverflow} pax metered to concourse. Platform load stays ≤ comfortable.
                            </div>
                          )}
                          {s.overflow > 0 && (
                            <div className="verdict-risk" style={{ marginBottom: "0.625rem", background: "color-mix(in srgb, var(--red) 8%, transparent)", borderColor: "color-mix(in srgb, var(--red) 20%, transparent)", color: "color-mix(in srgb, var(--red) 70%, var(--text))" }}>
                              ⚠ {s.overflow} pax/hr cannot board · platform overflow risk
                            </div>
                          )}

                          <div className="grid-5-col" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "0.625rem", fontSize: "0.6875rem" }}>
                            {[
                              { l: "Board/hr", v: keyRow?.board || s.demand, c: "var(--green)" },
                              { l: "Train Load", v: s.load, c: s.load > TRAIN_CAP ? "var(--red)" : s.load > COMFORTABLE ? "var(--amber)" : "var(--green)" },
                              { l: "Capacity/hr", v: s.capPerHour, c: "var(--accent)" },
                              { l: "Wait", v: `${s.wait}m`, c: s.wait < 2 ? "var(--green)" : s.wait < 3 ? "var(--amber)" : "var(--red)" },
                              { l: "Overflow", v: s.overflow, c: s.overflow > 0 ? "var(--red)" : "var(--green)" },
                            ].map((m, j) => (
                              <div key={j} className="panel" style={{ padding: "0.5rem 0.625rem", borderRadius: "0.375rem" }}>
                                <div style={{ fontSize: "0.5625rem", color: "var(--text-muted)", marginBottom: "0.1875rem" }}>{m.l}</div>
                                <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.8125rem", color: m.c }}>{m.v}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: VERDICT (Complete) */}
          {tab === "verdict" && strategies && (
            <div id="tab-verdict" role="tabpanel" aria-labelledby="tab-btn-verdict">
              <div className="panel" style={{ background: "var(--panel2)", borderColor: "color-mix(in srgb, var(--accent) 20%, var(--border))", marginBottom: "1rem", fontSize: "0.6875rem", color: "var(--text-muted)", lineHeight: 1.9 }}>
                Analysis uses <strong style={{ color: "var(--text)" }}>approximate PM peak boarding volumes</strong> from the dataset.
                Disruption mode applies a 2.8× multiplier to CBD interchange boarding.
                Train capacity: <strong style={{ color: "var(--amber)" }}>{TRAIN_CAP} pax</strong> (Kajang Line 6-car set) · Comfortable: <strong style={{ color: "var(--green)" }}>{COMFORTABLE} pax</strong>.
                <br/>Single-track end-to-end assumption: 2 trains/direction, layover penalties included.
              </div>

              {[
                { id: "zonal", rank: 1, col: "var(--green)",
                  why: `With Pavilion KL boarding 900 pax/hr and TRX at 375 pax/hr (2.8× disruption = 2520 and 1050 respectively), the PS–MK–PB core is where trains are most overloaded. Zonal turn-back doubles frequency exactly there. Full-route trains still call at all 5 interchange stations — no passenger is stranded. Mathematically, the zone trains reduce effective headway at PS, MK, PB from ${strategies.find(s => s.id === "zonal")?.hw}m to ~${strategies.find(s => s.id === "zonal")?.stations[1]?.wait.toFixed(1)}m wait — matching the load gradient in the data.`,
                  risk: "MN and TRX only get full-route frequency. TRX at 1050 pax/hr (disruption) may still overflow if zone trains are delayed.",
                  verdict: "RECOMMENDED" },
                { id: "meter", rank: 2, col: "var(--amber)",
                  why: `Gate metering with all trains all-stop eliminates platform overflow at every station. The data shows MN at 875 board/hr (normal) — in disruption that's 2450/hr against a ${strategies.find(s => s.id === "meter")?.stations[0]?.capPerHour}/hr all-stop capacity. Gate hold at MN would be ${strategies.find(s => s.id === "meter")?.stations[0]?.gateHold || 0}m per passenger — uncomfortable but safe. Critically, every interchange connection is preserved, important since all 5 stations are connecting lines.`,
                  risk: "Concourse queues can cause secondary bottlenecks at fare gates. Requires active staff management.",
                  verdict: "STRONG ALTERNATIVE" },
                { id: "express", rank: 3, col: "var(--accent)",
                  why: `Express overlay helps MN and TRX (terminal boost) but the real crisis in the data is at PB (900 board/hr) and PS (750 board/hr) — both mid-corridor. Express trains skip these entirely, so the three local trains must carry the full PS and PB load. This limits the strategy's effectiveness for this specific load profile.`,
                  risk: "Not well matched to this data — peak demand is mid-corridor, not terminal.",
                  verdict: "PARTIAL FIT" },
                { id: "dynamic", rank: 4, col: "var(--purple)",
                  why: `Theoretically optimal: PB gets the most train frequency because it has the highest board/hr. But implementing real-time dynamic dispatch requires AFC load data feeds, SCADA integration, and trained controllers — during an active disruption, this is operationally high-risk.`,
                  risk: "Requires infrastructure not typically ready during emergency disruptions.",
                  verdict: "IDEAL BUT COMPLEX" },
                { id: "skip", rank: 5, col: "var(--red)",
                  why: `Skip-stop scores worst for this route specifically because all 5 stations are interchanges. A passenger at MN needing PS for LRT Kelana Jaya, or at MK needing PS, is completely stranded — Even trains don't stop at MN or MK. With 875 and 200 pax/hr boarding at those stations respectively (normal), the stranded transfer volume is significant.`,
                  risk: "Fundamentally incompatible with all-interchange CBD corridor. Transfer stranding is systemic, not edge-case.",
                  verdict: "NOT RECOMMENDED" },
              ].map((r) => {
                const s = strategies.find(st => st.id === r.id);
                return (
                  <div key={r.id} className="verdict-card" style={{ borderColor: `color-mix(in srgb, ${r.col} 20%, var(--border))` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                      <div className="verdict-rank" style={{ background: `color-mix(in srgb, ${r.col} 12%, transparent)`, border: `1.5px solid ${r.col}`, color: r.col }}>#{r.rank}</div>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: s?.color }}>{s?.icon} {s?.name}</div>
                      <span className="verdict-badge" style={{ background: `color-mix(in srgb, ${r.col} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${r.col} 25%, transparent)`, color: r.col }}>{r.verdict}</span>
                    </div>
                    <div className="verdict-why" style={{ fontSize: "0.6875rem", color: "var(--text-muted)", lineHeight: 1.9, marginBottom: "0.5rem" }}>{r.why}</div>
                    <div className="verdict-risk">⚠ {r.risk}</div>
                  </div>
                );
              })}

              <div className="panel" style={{ marginTop: "0.25rem" }}>
                <div style={{ fontSize: "0.625rem", color: "var(--text-muted)", letterSpacing: "0.0625em", marginBottom: "0.625rem" }}>DECISION MATRIX · AGAINST YOUR REQUIREMENTS</div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        {["Strategy", "No platform congestion", "Min avg wait", "All interchanges safe", "4-train feasible", "Data-aligned"].map((h, i) => (
                          <th key={i} style={{ textAlign: i === 0 ? "left" : "center" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { n: "Skip-Stop", cols: ["⚠ Partial", "✓", "✗ Strands pax", "✓", "✗ Mismatch"], cs: ["amber", "green", "red", "green", "red"] },
                        { n: "Express", cols: ["⚠ Mid-stn", "✓", "✓", "✓", "⚠ Mid-heavy"], cs: ["amber", "green", "green", "green", "amber"] },
                        { n: "Dynamic HW", cols: ["✓", "✓ Best", "✓", "⚠ Complex", "✓"], cs: ["green", "green", "green", "amber", "green"] },
                        { n: "Zonal", cols: ["✓", "✓", "✓", "✓", "✓ Best fit"], cs: ["green", "green", "green", "green", "green"] },
                        { n: "Gate Metering", cols: ["✓ Best", "⚠ +hold", "✓", "✓", "✓"], cs: ["green", "amber", "green", "green", "green"] },
                      ].map((r, i) => {
                        const cc = { green: "var(--green)", amber: "var(--amber)", red: "var(--red)" };
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 500, fontSize: "0.75rem" }}>{r.n}</td>
                            {r.cols.map((c, j) => (
                              <td key={j} style={{ textAlign: "center", fontWeight: 600, fontSize: "0.6875rem", color: cc[r.cs[j]] }}>{c}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: "0.875rem", fontSize: "0.5625rem", color: "var(--text-dim)", textAlign: "center" }}>
            PM Peak · Putrajaya Line · 4 backup trains (2/dir) · {TRAIN_CAP} pax/train capacity · {disrupted ? "Disruption 2.8×" : "Normal ops"}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── MOUNT APP ───────────────────────────────────────────────────────────
ReactDOM.render(<App />, document.getElementById("root"));