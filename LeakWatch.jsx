import ReactDOM from "react-dom/client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, ReferenceLine, LabelList,
} from "recharts";
import {
  Radar, AlertTriangle, Image as ImageIcon, Activity, Send, Play, Pause,
  Zap, ShieldAlert, Radio, MapPin, Upload, CheckCircle2, RotateCcw,
} from "lucide-react";

// ---------- palette ----------
const C = {
  bg: "#080b18",
  panel: "#111834",
  panelAlt: "#0d1329",
  border: "#232c52",
  cyan: "#22d3ee",
  purple: "#a78bfa",
  pink: "#f472b6",
  amber: "#fbbf24",
  green: "#4ade80",
  red: "#fb7185",
  text: "#e7ebfa",
  muted: "#8892b8",
};

// ---------- detection dictionary (weighted keyword scorer) ----------
const KEYWORDS = {
  "paper leak": 35, "पेपर लीक": 35, "leaked": 25, "leak": 22, "लीक": 25,
  "paper out": 32, "पेपर आउट": 32, "answer key": 20, "आंसर की": 20,
  "solved paper": 26, "सॉल्व्ड": 18, "booklet leaked": 30, "booklet code": 10,
  "telegram group": 16, "टेलीग्राम": 16, "join group": 12, "ग्रुप जॉइन": 12,
  "dm me": 10, "dm for": 12, "before exam": 14, "मिल गया": 14,
  "forward karo": 10, "screenshot": 8, "pdf available": 16, "100% match": 15,
  "confirmed leak": 30, "question paper leak": 34, "सेट बी": 6, "set b leaked": 20,
};

const BENIGN_POOL = [
  "All the best for NEET tomorrow guys!",
  "Traffic near Rajendra Nagar exam centre is heavy today",
  "Does anyone know the reporting time for NEET 2026?",
  "Please carry your admit card and a valid ID proof",
  "Good luck bhai, revise biology notes one last time",
  "Exam centre address changed, check NTA website",
  "Feeling nervous about the exam tomorrow, any tips?",
  "Can someone share the syllabus for the physics section?",
  "Reached the centre early, security check is strict this year",
  "Praying for everyone appearing tomorrow, stay calm",
];

const LEAK_POOL = [
  "NEET paper leaked!! check telegram group link in bio",
  "पेपर आउट हो गया भाई, आंसर की भी मिल गई",
  "Solved paper pdf available, DM me fast before exam starts",
  "Join telegram group — NEET question paper leak confirmed",
  "बायो का पेपर लीक हो गया है, ग्रुप जॉइन करो जल्दी",
  "Screenshot of leaked answer key attached, forward karo sabko",
  "Booklet code B leaked, 100% match with today's paper",
  "Paper out before exam, DM for the group link bhai",
  "सेट बी लीक हो गया, टेलीग्राम पे मिल जाएगा",
  "Confirmed leak — physics + chem paper both out on telegram",
];

const EXAM_CENTERS = [
  "Patna, Bihar", "Ranchi, Jharkhand", "Lucknow, UP", "Chennai, TN",
  "Hyderabad, TS", "Jaipur, RJ", "Bhopal, MP", "Guwahati, AS",
];

function scoreText(raw) {
  const lower = raw.toLowerCase();
  let score = 0;
  const hits = [];
  for (const [kw, w] of Object.entries(KEYWORDS)) {
    if (lower.includes(kw.toLowerCase())) {
      score += w;
      hits.push(kw);
    }
  }
  return { score: Math.min(100, score), hits };
}

function mean(arr) { return arr.reduce((a, b) => a + b, 0) / (arr.length || 1); }
function std(arr) {
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((v) => (v - m) ** 2))) || 1;
}

// ---------- perceptual hash helpers ----------
function hashFromCanvasSource(src) {
  const c = document.createElement("canvas");
  c.width = 8; c.height = 8;
  const ctx = c.getContext("2d");
  ctx.drawImage(src, 0, 0, 8, 8);
  const data = ctx.getImageData(0, 0, 8, 8).data;
  const gray = [];
  for (let i = 0; i < 64; i++) {
    gray.push((data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3);
  }
  const avg = mean(gray);
  return gray.map((v) => (v > avg ? 1 : 0));
}
function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

function ScoreBarChart({ fusedScore, nlpRolling, velocityScore, imageScore }) {
  const data = [
    { name: "Fused Risk", value: Math.round(fusedScore), color: fusedScore >= 68 ? C.red : fusedScore >= 40 ? C.amber : C.green },
    { name: "NLP", value: Math.round(nlpRolling), color: C.cyan },
    { name: "Velocity", value: Math.round(velocityScore), color: C.purple },
    { name: "Image", value: Math.round(imageScore), color: C.pink },
  ];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
        <XAxis dataKey="name" stroke={C.muted} fontSize={11} />
        <YAxis domain={[0, 100]} stroke={C.muted} fontSize={10} />
        <Tooltip contentStyle={{ background: C.panelAlt, border: `1px solid ${C.border}`, fontSize: 11 }} />
        <ReferenceLine y={68} stroke={C.red} strokeDasharray="4 4" label={{ value: "alert 68", fill: C.red, fontSize: 10, position: "right" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          <LabelList dataKey="value" position="top" fill={C.text} fontSize={12} fontWeight="bold" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Panel({ children, style, className }) {
  return (
    <div
      className={`rounded-xl border p-4 ${className || ""}`}
      style={{ background: C.panel, borderColor: C.border, ...style }}
    >
      {children}
    </div>
  );
}

export default function LeakWatch() {
  const [messages, setMessages] = useState([]);
  const [running, setRunning] = useState(true);
  const [nlpRolling, setNlpRolling] = useState(0);
  const [series, setSeries] = useState(Array.from({ length: 16 }, () => 0));
  const [customInput, setCustomInput] = useState("");
  const [customResult, setCustomResult] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [clusters, setClusters] = useState(
    Object.fromEntries(EXAM_CENTERS.map((c) => [c, 2 + Math.floor(Math.random() * 4)]))
  );
  const [imgA, setImgA] = useState(null); // {hash, thumb, label}
  const [imgB, setImgB] = useState(null);
  const [clock, setClock] = useState(new Date());
  const alertActiveRef = useRef(false);
  const feedRef = useRef(null);

  const velocityScore = (() => {
    const recent = mean(series.slice(-3));
    const baseline = series.slice(0, -3);
    const z = (recent - mean(baseline)) / std(baseline);
    return Math.max(0, Math.min(100, 50 + z * 22));
  })();

  const imageScore = imgA && imgB ? Math.max(0, 100 - (hamming(imgA.hash, imgB.hash) / 64) * 100 * 1.6) : 0;

  const fusedScore = Math.round(0.4 * nlpRolling + 0.3 * velocityScore + 0.3 * imageScore);

  const pushMessage = useCallback((text, forcedLeak) => {
    const { score, hits } = scoreText(text);
    const flagged = score >= 30;
    const entry = { id: Date.now() + Math.random(), text, score, hits, flagged, t: new Date() };
    setMessages((m) => [...m.slice(-24), entry]);
    setNlpRolling((prev) => Math.max(score, prev * 0.85));
    setSeries((s) => {
      const copy = [...s];
      copy[copy.length - 1] += 1;
      return copy;
    });
    if (flagged || forcedLeak) {
      setClusters((c) => {
        const center = EXAM_CENTERS[Math.floor(Math.random() * EXAM_CENTERS.length)];
        return { ...c, [center]: c[center] + 1 };
      });
    }
  }, []);

  // message stream
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const pool = Math.random() < 0.35 ? LEAK_POOL : BENIGN_POOL;
      pushMessage(pool[Math.floor(Math.random() * pool.length)]);
    }, 2400);
    return () => clearInterval(id);
  }, [running, pushMessage]);

  // bucket shift for velocity chart
  useEffect(() => {
    const id = setInterval(() => {
      setSeries((s) => [...s.slice(1), 0]);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // clock + nlp decay
  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date());
      setNlpRolling((p) => Math.max(0, p * 0.97));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // scroll feed to bottom
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // alert trigger
  useEffect(() => {
    if (fusedScore >= 68 && !alertActiveRef.current) {
      alertActiveRef.current = true;
      const center = Object.entries(clusters).sort((a, b) => b[1] - a[1])[0][0];
      setAlerts((a) => [
        { id: Date.now(), score: fusedScore, center, t: new Date() },
        ...a.slice(0, 9),
      ]);
    }
    if (fusedScore < 45) alertActiveRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fusedScore]);

  const simulateSpike = () => {
    let i = 0;
    const id = setInterval(() => {
      pushMessage(LEAK_POOL[Math.floor(Math.random() * LEAK_POOL.length)], true);
      i++;
      if (i >= 7) clearInterval(id);
    }, 220);
  };

  const resetDemo = () => {
    setMessages([]); setNlpRolling(0);
    setSeries(Array.from({ length: 16 }, () => 0));
    setAlerts([]); alertActiveRef.current = false;
    setClusters(Object.fromEntries(EXAM_CENTERS.map((c) => [c, 2 + Math.floor(Math.random() * 4)])));
    setImgA(null); setImgB(null);
  };

  const analyzeCustom = () => {
    if (!customInput.trim()) return;
    const res = scoreText(customInput);
    setCustomResult(res);
    pushMessage(customInput);
  };

  const loadDemoPair = () => {
    const c1 = document.createElement("canvas"); c1.width = 300; c1.height = 200;
    const ctx1 = c1.getContext("2d");
    ctx1.fillStyle = "#f5f5f0"; ctx1.fillRect(0, 0, 300, 200);
    ctx1.fillStyle = "#111"; ctx1.font = "bold 16px monospace";
    ctx1.fillText("NEET-UG 2026 — SET B", 20, 30);
    for (let i = 0; i < 10; i++) {
      ctx1.fillText(`Q${i + 1}. Option ${String.fromCharCode(65 + (i % 4))}`, 20, 55 + i * 14);
    }

    const c2 = document.createElement("canvas"); c2.width = 300; c2.height = 200;
    const ctx2 = c2.getContext("2d");
    ctx2.drawImage(c1, -4, 3);
    ctx2.fillStyle = "rgba(0,0,0,0.05)";
    for (let i = 0; i < 300; i++) {
      ctx2.fillRect(Math.random() * 300, Math.random() * 200, 1, 1);
    }

    setImgA({ hash: hashFromCanvasSource(c1), thumb: c1.toDataURL(), label: "Official Paper (NTA release)" });
    setImgB({ hash: hashFromCanvasSource(c2), thumb: c2.toDataURL(), label: "Suspected Leak Photo (phone capture)" });
  };

  const handleUpload = (slot, file) => {
    if (!file) return;
    const img = new window.Image();
    img.onload = () => {
      const hash = hashFromCanvasSource(img);
      const setter = slot === "A" ? setImgA : setImgB;
      setter({ hash, thumb: img.src, label: file.name });
    };
    img.src = URL.createObjectURL(file);
  };

  const chartData = series.map((v, i) => ({ i, v }));
  const clusterData = Object.entries(clusters).map(([name, value]) => ({ name: name.split(",")[0], value }));

  return (
    <div className="min-h-screen font-sans" style={{ background: C.bg, color: C.text }}>
      {/* header */}
      <div className="relative overflow-hidden border-b" style={{ borderColor: C.border }}>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(600px 200px at 15% 0%, rgba(34,211,238,0.25), transparent), radial-gradient(600px 200px at 85% 100%, rgba(167,139,250,0.2), transparent)",
          }}
        />
        <div className="relative px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#22d3ee,#a78bfa)" }}>
              <Radar size={20} color="#0a0e1f" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">LeakWatch</h1>
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: "rgba(74,222,128,0.15)", color: C.green }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.green }} /> LIVE
                </span>
              </div>
              <p className="text-xs" style={{ color: C.muted }}>Real-time leak-signal interception console · NEET-UG</p>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs" style={{ color: C.muted }}>
            <span>{clock.toLocaleTimeString()}</span>
            <button onClick={() => setRunning((r) => !r)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border" style={{ borderColor: C.border, background: C.panelAlt }}>
              {running ? <Pause size={13} /> : <Play size={13} />} {running ? "Pause feed" : "Resume feed"}
            </button>
            <button onClick={resetDemo} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border" style={{ borderColor: C.border, background: C.panelAlt }}>
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* alert banner */}
      {fusedScore >= 68 && (
        <div className="px-5 py-2.5 flex items-center gap-2 font-mono text-sm" style={{ background: "rgba(251,113,133,0.15)", color: C.red, borderBottom: `1px solid ${C.red}` }}>
          <ShieldAlert size={16} className="animate-pulse" />
          LEAK ALERT — risk score {fusedScore}/100 · notification dispatched to NTA / exam authority
        </div>
      )}

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* live feed */}
        <Panel className="lg:col-span-2 flex flex-col" style={{ minHeight: 380 }}>
          <div className="flex items-center gap-2 mb-2">
            <Radio size={15} color={C.cyan} />
            <h2 className="font-semibold text-sm">Live Signal Feed</h2>
            <span className="text-[10px] ml-auto font-mono" style={{ color: C.muted }}>Telegram · X/Twitter · Tip Forms (simulated)</span>
          </div>
          <div ref={feedRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1" style={{ maxHeight: 260 }}>
            {messages.length === 0 && <p className="text-xs" style={{ color: C.muted }}>Waiting for signal…</p>}
            {messages.map((m) => (
              <div key={m.id} className="flex items-start gap-2 text-xs font-mono px-2 py-1.5 rounded-lg" style={{ background: m.flagged ? "rgba(251,113,133,0.1)" : C.panelAlt, border: `1px solid ${m.flagged ? "rgba(251,113,133,0.4)" : C.border}` }}>
                <span style={{ color: C.muted, minWidth: 58 }}>{m.t.toLocaleTimeString().slice(0, 8)}</span>
                <span className="flex-1" style={{ color: m.flagged ? C.red : C.text }}>{m.text}</span>
                <span className="font-bold" style={{ color: m.flagged ? C.red : C.muted, minWidth: 28, textAlign: "right" }}>{m.score}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyzeCustom()}
              placeholder="Type a message to test the classifier, e.g. 'paper out check telegram'"
              className="flex-1 text-xs font-mono rounded-lg px-3 py-2 outline-none"
              style={{ background: C.panelAlt, border: `1px solid ${C.border}`, color: C.text }}
            />
            <button onClick={analyzeCustom} className="px-3 py-2 rounded-lg flex items-center gap-1 text-xs font-semibold" style={{ background: C.cyan, color: "#04121a" }}>
              <Send size={13} /> Analyze
            </button>
          </div>
          {customResult && (
            <p className="text-[11px] mt-1.5 font-mono" style={{ color: C.muted }}>
              NLP score: <b style={{ color: customResult.score >= 30 ? C.red : C.green }}>{customResult.score}</b>
              {customResult.hits.length > 0 && <> · matched: {customResult.hits.join(", ")}</>}
            </p>
          )}
        </Panel>

        {/* fusion engine */}
        <Panel style={{ minHeight: 380 }}>
          <div className="flex items-center gap-2 mb-0.5">
            <Zap size={15} color={C.amber} />
            <h2 className="font-semibold text-sm">LeakWatch Fusion Scoring Engine</h2>
          </div>
          <p className="text-[10px] font-mono mb-3" style={{ color: C.muted }}>LFSE v1.0 — multi-signal risk fusion core</p>
          <ScoreBarChart fusedScore={fusedScore} nlpRolling={nlpRolling} velocityScore={velocityScore} imageScore={imageScore} />
          <p className="text-[10px] text-center mt-1 font-mono" style={{ color: C.muted }}>
            Fused Risk turns <span style={{ color: C.red }}>red</span> and crosses the dashed line once NLP, Velocity, and Image evidence agree.
          </p>
          <div className="mt-4 rounded-lg p-2.5" style={{ background: C.panelAlt, border: `1px solid ${C.border}` }}>
            <p className="text-[10px] font-mono font-semibold mb-1" style={{ color: C.text }}>Fused Risk = 0.4·NLP + 0.3·Velocity + 0.3·Image</p>
            <p className="text-[10px] leading-relaxed" style={{ color: C.muted }}>
              No single signal is trusted alone: text chatter is noisy, velocity spikes can be benign, and image proof often arrives late. LFSE only fires an alert once independent signals agree — crossing 68 auto-dispatches a scored notification to the exam authority.
            </p>
          </div>
          <button onClick={simulateSpike} className="w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold" style={{ background: "linear-gradient(90deg,#f472b6,#fb7185)", color: "#1a0410" }}>
            <AlertTriangle size={13} /> Simulate leak spike
          </button>
        </Panel>

        {/* velocity chart */}
        <Panel>
          <div className="flex items-center gap-2 mb-2">
            <Activity size={15} color={C.purple} />
            <h2 className="font-semibold text-sm">Message Velocity</h2>
            <span className="text-[10px] ml-auto font-mono" style={{ color: C.muted }}>z-score anomaly detection</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="i" hide />
              <YAxis stroke={C.muted} fontSize={10} width={20} />
              <Tooltip contentStyle={{ background: C.panelAlt, border: `1px solid ${C.border}`, fontSize: 11 }} />
              <ReferenceLine y={mean(series)} stroke={C.muted} strokeDasharray="3 3" />
              <Line type="monotone" dataKey="v" stroke={C.purple} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        {/* cluster / geo */}
        <Panel>
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={15} color={C.amber} />
            <h2 className="font-semibold text-sm">Exam-Center Chatter Clusters</h2>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={clusterData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" stroke={C.muted} fontSize={9} interval={0} angle={-25} textAnchor="end" height={40} />
              <YAxis stroke={C.muted} fontSize={10} width={20} />
              <Tooltip contentStyle={{ background: C.panelAlt, border: `1px solid ${C.border}`, fontSize: 11 }} />
              <Bar dataKey="value" fill={C.amber} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* image lab */}
        <Panel className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={15} color={C.pink} />
            <h2 className="font-semibold text-sm">Image Match Lab — perceptual hashing (aHash)</h2>
            <button onClick={loadDemoPair} className="ml-auto text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: C.panelAlt, border: `1px solid ${C.border}`, color: C.text }}>
              Load demo pair
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[["A", imgA, "Official Paper"], ["B", imgB, "Suspected Leak Photo"]].map(([slot, img, label]) => (
              <div key={slot} className="rounded-lg border p-2.5" style={{ borderColor: C.border, background: C.panelAlt }}>
                <p className="text-[11px] mb-2" style={{ color: C.muted }}>{label}</p>
                {img ? (
                  <img src={img.thumb} alt={label} className="w-full h-24 object-cover rounded-md mb-2" />
                ) : (
                  <div className="w-full h-24 rounded-md flex items-center justify-center mb-2" style={{ background: C.bg }}>
                    <Upload size={16} color={C.muted} />
                  </div>
                )}
                <label className="text-[10px] cursor-pointer underline" style={{ color: C.cyan }}>
                  upload image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(slot, e.target.files[0])} />
                </label>
              </div>
            ))}
          </div>
          {imgA && imgB && (
            <div className="mt-3 flex items-center gap-3 text-xs font-mono">
              <CheckCircle2 size={14} color={imageScore > 70 ? C.red : C.green} />
              <span>Hamming distance: <b>{hamming(imgA.hash, imgB.hash)}</b>/64 · Similarity: <b style={{ color: imageScore > 70 ? C.red : C.green }}>{Math.round(imageScore)}%</b></span>
              {imageScore > 70 && <span style={{ color: C.red }}>— high-confidence match against official booklet</span>}
            </div>
          )}
        </Panel>

        {/* alerts log */}
        <Panel>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={15} color={C.red} />
            <h2 className="font-semibold text-sm">Alerts Dispatched</h2>
          </div>
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 190 }}>
            {alerts.length === 0 && <p className="text-xs" style={{ color: C.muted }}>No alerts yet — try "Simulate leak spike".</p>}
            {alerts.map((a) => (
              <div key={a.id} className="text-xs rounded-lg p-2 font-mono" style={{ background: "rgba(251,113,133,0.08)", border: `1px solid rgba(251,113,133,0.3)` }}>
                <div className="flex justify-between">
                  <span style={{ color: C.red }}>risk {a.score}</span>
                  <span style={{ color: C.muted }}>{a.t.toLocaleTimeString()}</span>
                </div>
                <div style={{ color: C.text }}>{a.center} · notified NTA</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="px-5 pb-6 text-center text-[10px] font-mono" style={{ color: C.muted }}>
        Detect → Verify → Score → Alert · prototype for demo purposes — message stream and image pair are simulated; scoring logic runs live in your browser.
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LeakWatch />
  </React.StrictMode>
);
