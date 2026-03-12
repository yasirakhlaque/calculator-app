"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────
// THEMES
// ─────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: "#111111",
    numColor: "#FFFFFF",
    num3d: "rgba(255,255,255,0.09)",
    exprColor: "rgba(255,255,255,0.35)",
    btnColor: "#FFFFFF",
    opColor: "#FF9500",
    eqColor: "#FF9500",
    sep: "rgba(255,255,255,0.08)",
    labelColor: "rgba(255,255,255,0.22)",
  },
  amber: {
    bg: "#F5A623",
    numColor: "#1A1000",
    num3d: "rgba(0,0,0,0.22)",
    exprColor: "rgba(30,15,0,0.38)",
    btnColor: "#1A1000",
    opColor: "#1A1000",
    eqColor: "#1A1000",
    sep: "rgba(0,0,0,0.10)",
    labelColor: "rgba(30,15,0,0.28)",
  },
  midnight: {
    bg: "#07081A",
    numColor: "#C4B8FF",
    num3d: "rgba(140,120,255,0.16)",
    exprColor: "rgba(196,184,255,0.36)",
    btnColor: "#C4B8FF",
    opColor: "#9B8FFF",
    eqColor: "#9B8FFF",
    sep: "rgba(196,184,255,0.07)",
    labelColor: "rgba(196,184,255,0.20)",
  },
  chrome: {
    bg: "#090909",
    numColor: "chrome",
    num3d: "rgba(255,80,80,0.08)",
    exprColor: "rgba(255,255,255,0.30)",
    btnColor: "#FFFFFF",
    opColor: "#FF6B6B",
    eqColor: "#FF6B6B",
    sep: "rgba(255,255,255,0.06)",
    labelColor: "rgba(255,255,255,0.18)",
  },
} as const;

type ThemeKey = keyof typeof THEMES;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function safeCalc(expr: string): number | null {
  try {
    const clean = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
    // eslint-disable-next-line no-new-func
    const r = Function(`"use strict"; return (${clean})`)();
    return typeof r === "number" && isFinite(r) ? r : null;
  } catch { return null; }
}

function fmtNum(raw: string): string {
  if (["Error", "∞", "-∞"].includes(raw)) return raw;
  if (raw.includes("e")) return raw; // Don't format scientific notation output
  
  // Apply commas to the integer part only to prevent wiping out decimal strings like "0."
  const parts = raw.split(".");
  const intFmt = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.length > 1 ? `${intFmt}.${parts[1]}` : intFmt;
}

// ─────────────────────────────────────────────────────────────
// useSpring
// ─────────────────────────────────────────────────────────────
function useSpring(target: number, k = 300, b = 24): number {
  const [v, setV] = useState(target);
  const s = useRef({ pos: target, vel: 0, target });
  const raf = useRef<number | null>(null);
  
  useEffect(() => { s.current.target = target; }, [target]);
  
  useEffect(() => {
    const tick = () => {
      const dt = 1 / 60;
      const f = k * (s.current.target - s.current.pos) - b * s.current.vel;
      s.current.vel += f * dt;
      s.current.pos += s.current.vel * dt;
      if (Math.abs(s.current.target - s.current.pos) < 0.05 && Math.abs(s.current.vel) < 0.05) {
        s.current.pos = s.current.target;
        setV(s.current.target);
        return;
      }
      setV(s.current.pos);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [k, b]);
  return v;
}

// ─────────────────────────────────────────────────────────────
// AUTO-SCALING DISPLAY 
// ─────────────────────────────────────────────────────────────
function AutoScaleNumber({
  value,
  theme,
  popped,
  animKey,
}: {
  value: string;
  theme: typeof THEMES[ThemeKey];
  popped: boolean;
  animKey: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fontSize, setFontSize] = useState(120);

  const MAX_FONT = 120;
  const MIN_FONT = 24;

  const measure = useCallback((text: string, fs: number): number => {
    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.font = `800 ${fs}px 'Barlow Condensed', sans-serif`;
    return ctx.measureText(text).width;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const compute = () => {
      const w = container.clientWidth;
      if (w === 0) return;

      let lo = MIN_FONT, hi = MAX_FONT, best = MIN_FONT;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const textW = measure(value, mid);
        if (textW <= w) { best = mid; lo = mid + 1; }
        else { hi = mid - 1; }
      }
      setFontSize(best);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    return () => ro.disconnect();
  }, [value, measure]);

  const isChrome = theme.numColor === "chrome";
  const extrude = (c: string) =>
    Array.from({ length: 7 }, (_, i) => `${i + 1}px ${i + 1}px 0 ${c}`).join(", ");

  const baseStyle: React.CSSProperties = {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 800,
    fontSize: fontSize,
    lineHeight: 1,
    letterSpacing: "-0.03em",
    textAlign: "right",
    whiteSpace: "nowrap",
    display: "block",
    width: "100%",
    animation: popped && animKey > 0
      ? "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both"
      : "none",
  };

  return (
    <div ref={containerRef} style={{ width: "100%", lineHeight: 1 }}>
      {isChrome ? (
        <span
          key={animKey}
          style={{
            ...baseStyle,
            backgroundImage: "linear-gradient(160deg,#FF8A80 0%,#EA80FC 28%,#80D8FF 52%,#CCFF90 76%,#FFD180 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {value}
        </span>
      ) : (
        <span
          key={animKey}
          style={{
            ...baseStyle,
            color: theme.numColor,
            textShadow: extrude(theme.num3d),
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DISPLAY wrapper
// ─────────────────────────────────────────────────────────────
function Display({ value, theme, expr, popped }: {
  value: string;
  theme: typeof THEMES[ThemeKey];
  expr: string;
  popped: boolean;
}) {
  const [animKey, setAnimKey] = useState(0);
  const wasPopped = useRef(false);
  useEffect(() => {
    if (popped && !wasPopped.current) setAnimKey(k => k + 1);
    wasPopped.current = popped;
  }, [popped]);

  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      padding: "0 24px 14px",
      overflow: "hidden",
      width: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{
        fontFamily: "'Barlow', sans-serif",
        fontSize: 13, fontWeight: 400,
        color: theme.exprColor,
        textAlign: "right",
        minHeight: 20, marginBottom: 6,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        letterSpacing: "0.01em",
        width: "100%",
      }}>
        {expr}
      </div>
      <AutoScaleNumber value={value} theme={theme} popped={popped} animKey={animKey} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BUTTON
// ─────────────────────────────────────────────────────────────
function Btn({ label, onPress, color, type = "num" }: {
  label: React.ReactNode;
  onPress: () => void;
  color: string;
  type?: "num" | "fn" | "op" | "eq";
}) {
  const [down, setDown] = useState(false);
  const scale = useSpring(down ? 0.82 : 1, 440, 24);

  const fontSize =
    type === "num" ? "clamp(24px, 7vw, 34px)" :
    type === "eq"  ? "clamp(22px, 6.5vw, 30px)" :
    type === "op"  ? "clamp(20px, 6vw, 28px)" :
                     "clamp(16px, 5vw, 22px)";

  return (
    <div
      style={{
        width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${scale})`, cursor: "pointer",
        color, fontSize,
        fontFamily: "'Barlow Condensed', 'Barlow', sans-serif",
        fontWeight: type === "num" ? 300 : 400,
        letterSpacing: type === "num" ? "-0.02em" : "0",
        userSelect: "none", WebkitUserSelect: "none",
        willChange: "transform",
        opacity: down ? 0.75 : 1, transition: "opacity 0.05s",
      }}
      onPointerDown={(e) => { e.preventDefault(); setDown(true); onPress(); }}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      onPointerCancel={() => setDown(false)}
    >
      {label}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// THEME DOTS
// ─────────────────────────────────────────────────────────────
function ThemeDots({ cur, onChange }: { cur: ThemeKey; onChange: (t: ThemeKey) => void }) {
  const dots: { k: ThemeKey; bg: string }[] = [
    { k: "dark",     bg: "#555" },
    { k: "amber",    bg: "#F5A623" },
    { k: "midnight", bg: "#9B8FFF" },
    { k: "chrome",   bg: "linear-gradient(135deg,#FF8A80,#80D8FF,#CCFF90)" },
  ];
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {dots.map(d => (
        <div key={d.k} onClick={() => onChange(d.k)} style={{
          width: cur === d.k ? 22 : 14, height: cur === d.k ? 22 : 14,
          borderRadius: "50%", background: d.bg,
          border: cur === d.k ? "2.5px solid rgba(255,255,255,0.6)" : "2px solid rgba(255,255,255,0.15)",
          cursor: "pointer", transition: "all 0.28s cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow: cur === d.k ? "0 2px 10px rgba(0,0,0,0.35)" : "none",
          flexShrink: 0,
        }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP COMPONENT
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [themeKey, setThemeKey] = useState<ThemeKey>("dark");
  const [fading, setFading] = useState(false);
  const theme = THEMES[themeKey];

  // Core Calculator States
  const [raw, setRaw] = useState("0");
  const [expr, setExpr] = useState("");
  const [displayExpr, setDisplayExpr] = useState("");
  
  // UI & Flow Control States
  const [popped, setPopped] = useState(false);
  const [waitNext, setWaitNext] = useState(false); // Should the next digit start a new number?
  const [isResult, setIsResult] = useState(false); // Are we currently displaying a total?

  const swapTheme = (t: ThemeKey) => {
    if (t === themeKey) return;
    setFading(true);
    setTimeout(() => { setThemeKey(t); setFading(false); }, 150);
  };

  // ── Actions ───────────────────────────────────────────────
  const dig = useCallback((d: string) => {
    setPopped(false);
    
    if (isResult) {
      // Start completely fresh if typing numbers after equals sign
      setRaw(d);
      setExpr(d);
      setDisplayExpr("");
      setIsResult(false);
      setWaitNext(false);
    } else if (waitNext) {
      // Begin building the next operand after an operator
      setRaw(d);
      setExpr(prev => prev + d);
      setWaitNext(false);
    } else {
      // Append to the current operand
      if (raw.replace(/[,.\-]/g, "").length >= 12) return;
      setRaw(prev => (prev === "0" ? d : prev + d));
      setExpr(prev => {
        if (raw === "0") {
          return prev ? prev.slice(0, -1) + d : d;
        }
        return prev + d;
      });
    }
  }, [waitNext, isResult, raw]);

  const dot = useCallback(() => {
    setPopped(false);
    if (isResult) {
      setRaw("0.");
      setExpr("0.");
      setDisplayExpr("");
      setIsResult(false);
      setWaitNext(false);
    } else if (waitNext) {
      setRaw("0.");
      setExpr(prev => prev + "0.");
      setWaitNext(false);
    } else {
      if (raw.includes(".")) return;
      setRaw(p => p + ".");
      setExpr(p => (p ? p + "." : "0."));
    }
  }, [isResult, waitNext, raw]);

  const bksp = useCallback(() => {
    if (waitNext || isResult || raw === "Error") return;
    setRaw(p => {
      if (p === "0") return p;
      if (p.length <= 1 || (p.length === 2 && p.startsWith("-"))) return "0";
      return p.slice(0, -1);
    });
    setExpr(e => {
      if (raw === "0") return e;
      if (raw.length <= 1 || (raw.length === 2 && raw.startsWith("-"))) {
        return e.slice(0, -raw.length) + "0";
      }
      return e.slice(0, -1);
    });
  }, [waitNext, isResult, raw]);

  const clr = useCallback(() => {
    setRaw("0"); setExpr(""); setDisplayExpr(""); 
    setWaitNext(false); setPopped(false); setIsResult(false);
  }, []);

  const pct = useCallback(() => {
    if (raw === "Error") return;
    const n = parseFloat(raw) / 100;
    const s = String(parseFloat(n.toPrecision(12)));
    setRaw(s);
    if (isResult) {
      setExpr(s);
      setDisplayExpr("");
      setIsResult(false);
    } else {
      setExpr(prev => prev.slice(0, prev.length - raw.length) + s);
    }
  }, [raw, isResult]);

  const negate = useCallback(() => {
    if (raw === "0" || raw === "Error") return;
    const next = raw.startsWith("-") ? raw.slice(1) : "-" + raw;
    setRaw(next);
    if (isResult) {
      setExpr(next);
      setDisplayExpr("");
      setIsResult(false);
    } else {
      setExpr(prev => prev.slice(0, prev.length - raw.length) + next);
    }
  }, [raw, isResult]);

  const oper = useCallback((op: string) => {
    setPopped(false);
    if (raw === "Error") return;

    if (isResult) {
      // Lock result in as the first operand for a new expression
      setIsResult(false);
      setExpr(raw + op);
      setDisplayExpr(raw + op);
      setWaitNext(true);
    } else if (waitNext) {
      // Swapped mind - overwrite the trailing operator
      setExpr(prev => prev.replace(/[+\-−×÷]$/, "") + op);
      setDisplayExpr(prev => prev.replace(/[+\-−×÷]$/, "") + op);
    } else {
      // Push the operator
      setExpr(prev => {
        const current = prev || raw || "0";
        return current + op;
      });
      setDisplayExpr(prev => {
        const current = prev || raw || "0";
        return current + op;
      });
      setWaitNext(true);
    }
  }, [isResult, waitNext, raw]);

  const eq = useCallback(() => {
    if (isResult || !expr || raw === "Error") return;
    
    const evalExpr = expr.replace(/[+\-−×÷]$/, "");
    if (!evalExpr) return;

    const result = safeCalc(evalExpr);
    const resStr = result !== null ? String(parseFloat(result.toPrecision(12))) : "Error";
    
    setDisplayExpr(evalExpr + " =");
    setRaw(resStr);
    setExpr(resStr);
    setPopped(true);
    setIsResult(true);
    setWaitNext(true);
  }, [expr, isResult, raw]);

  // ── Keyboard ──────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ("0123456789".includes(e.key)) dig(e.key);
      else if (e.key === "." || e.key === ",") dot();
      else if (e.key === "+")  { e.preventDefault(); oper("+"); }
      else if (e.key === "-")  oper("−");
      else if (e.key === "*")  oper("×");
      else if (e.key === "/")  { e.preventDefault(); oper("÷"); }
      else if (e.key === "%")  pct();
      else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); eq(); }
      else if (e.key === "Backspace") bksp();
      else if (e.key === "Escape" || e.key.toLowerCase() === "c") clr();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [dig, dot, oper, pct, eq, bksp, clr]);

  const displayed = fmtNum(raw);

  const btnColor = (t: string) =>
    t === "op" ? theme.opColor : t === "eq" ? theme.eqColor : theme.btnColor;

  const rows: { l: React.ReactNode; a: () => void; t: string }[][] = [
    [
      { l: "C",       a: clr,          t: "fn" },
      { l: "%",       a: pct,          t: "fn" },
      { l: <BsIcon />,a: bksp,         t: "fn" },
      { l: "÷",       a: () => oper("÷"), t: "op" },
    ],
    [
      { l: "7", a: () => dig("7"), t: "num" },
      { l: "8", a: () => dig("8"), t: "num" },
      { l: "9", a: () => dig("9"), t: "num" },
      { l: "×", a: () => oper("×"), t: "op" },
    ],
    [
      { l: "4", a: () => dig("4"), t: "num" },
      { l: "5", a: () => dig("5"), t: "num" },
      { l: "6", a: () => dig("6"), t: "num" },
      { l: "−", a: () => oper("−"), t: "op" },
    ],
    [
      { l: "1", a: () => dig("1"), t: "num" },
      { l: "2", a: () => dig("2"), t: "num" },
      { l: "3", a: () => dig("3"), t: "num" },
      { l: "+", a: () => oper("+"), t: "op" },
    ],
    [
      { l: "0",   a: () => dig("0"), t: "num" },
      { l: ".",   a: dot,            t: "num" },
      { l: "+/−", a: negate,         t: "fn"  },
      { l: "=",   a: eq,             t: "eq"  },
    ],
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;800;900&family=Barlow:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body { height: 100%; margin: 0; background: #000; overflow: hidden; }
        @keyframes popIn {
          0%   { transform: scale(0.75) translateY(12px); opacity: 0.4; }
          55%  { transform: scale(1.05) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); }
        }
      `}</style>

      <div style={{
        height: "100dvh", maxWidth: 430, margin: "0 auto",
        background: theme.bg, display: "flex", flexDirection: "column",
        overflow: "hidden", opacity: fading ? 0 : 1,
        transition: "background 0.28s ease, opacity 0.15s ease",
        boxSizing: "border-box",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "48px 24px 0", flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 11,
            letterSpacing: "0.16em", textTransform: "uppercase", color: theme.labelColor,
          }}>
            Not Boring
          </span>
          <ThemeDots cur={themeKey} onChange={swapTheme} />
        </div>

        <Display value={displayed} theme={theme} expr={displayExpr} popped={popped} />

        <div style={{ height: 1, background: theme.sep, flexShrink: 0 }} />

        <div style={{ display: "grid", gridTemplateRows: "repeat(5, 1fr)", flex: 1, minHeight: 0 }}>
          {rows.map((row, ri) => (
            <div key={ri} style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
              borderTop: ri > 0 ? `1px solid ${theme.sep}` : "none",
            }}>
              {row.map((btn, ci) => (
                <div key={ci} style={{
                  borderLeft: ci > 0 ? `1px solid ${theme.sep}` : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Btn label={btn.l} onPress={btn.a} color={btnColor(btn.t)} type={btn.t as "num" | "fn" | "op" | "eq"} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ height: "max(env(safe-area-inset-bottom), 6px)", flexShrink: 0 }} />
      </div>
    </>
  );
}

function BsIcon() {
  return (
    <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
      <path d="M9 1.5H23.5C24.6 1.5 25.5 2.4 25.5 3.5V16.5C25.5 17.6 24.6 18.5 23.5 18.5H9L0.5 10L9 1.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14 6.5L19 13.5M19 6.5L14 13.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}