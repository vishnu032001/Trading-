"use client";

import { useEffect, useRef, useState } from "react";
import { Command, Search, X, Sparkles } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";
import type { Timeframe } from "@/types/trading";

function parseCommand(input: string) {
  const text = input.toLowerCase().trim();
  const indicators: Array<{ type: "SMA" | "EMA" | "RSI" | "MACD"; period?: number; fastPeriod?: number; slowPeriod?: number; signalPeriod?: number; pane: "overlay" | "separate" }> = [];
  const ema = text.match(/(\d+)\s*(?:ema|exponential\s+moving\s+average)/i);
  const sma = text.match(/(\d+)\s*(?:sma|simple\s+moving\s+average)/i);
  if (ema) indicators.push({ type: "EMA", period: Number(ema[1]), pane: "overlay" });
  if (sma) indicators.push({ type: "SMA", period: Number(sma[1]), pane: "overlay" });
  if (/\brsi\b/i.test(text)) indicators.push({ type: "RSI", period: 14, pane: "separate" });
  if (/\bmacd\b/i.test(text)) indicators.push({ type: "MACD", fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, pane: "separate" });
  const symbol = text.match(/(?:for|to|symbol)\s+([a-z]{1,6})\b/i)?.[1]?.toUpperCase();
  const timeframe = (text.match(/\b(1m|5m|1h|1d|1w)\b/i)?.[1]?.replace("d", "D").replace("w", "W") ?? undefined) as Timeframe | undefined;
  return { indicators, symbol, timeframe, supportResistance: /support.*resistance|resistance.*support/i.test(text) };
}

export function ChartCopilot() {
  const { activeSymbol, candles, addIndicator, addDrawing, addCopilotMessage, setActiveSymbol, setTimeframe } = useTradingStore();
  const [open, setOpen] = useState(false), [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function runCommand() {
    const value = input.trim(); if (!value) return;
    const parsed = parseCommand(value);
    if (parsed.symbol && parsed.symbol !== activeSymbol) await setActiveSymbol(parsed.symbol);
    if (parsed.timeframe) await setTimeframe(parsed.timeframe);
    parsed.indicators.forEach((indicator, index) => addIndicator({ id: `copilot-${indicator.type}-${indicator.period ?? indicator.fastPeriod ?? index}-${Date.now()}`, ...indicator, enabled: true }));
    if (parsed.supportResistance && candles.length) {
      const recent = candles.slice(-60);
      const support = Math.min(...recent.map(c => c.low)), resistance = Math.max(...recent.map(c => c.high));
      addDrawing({ type: "horizontal-ray", points: [{ time: recent[0].time, price: support }], color: "#22c55e", lineWidth: 2 });
      addDrawing({ type: "horizontal-ray", points: [{ time: recent[0].time, price: resistance }], color: "#ef4444", lineWidth: 2 });
    }
    addCopilotMessage({ role: "user", content: value });
    const actions = [
      parsed.symbol ? `symbol → ${parsed.symbol}` : "",
      parsed.timeframe ? `timeframe → ${parsed.timeframe}` : "",
      parsed.indicators.length ? `indicators → ${parsed.indicators.map(x => x.type === "MACD" ? "MACD" : `${x.type} ${x.period}`).join(", ")}` : "",
      parsed.supportResistance ? "support/resistance → recent 60-bar levels" : "",
    ].filter(Boolean);
    addCopilotMessage({ role: "assistant", content: actions.length ? `Applied: ${actions.join(" · ")}.` : "Try: Add 50 EMA and RSI, Show support/resistance levels for AAPL, or switch to 1D." });
    setInput(""); setOpen(false);
  }

  return <>
    <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }} className="flex items-center gap-2 rounded border border-[#263143] bg-[#101722] px-2.5 py-1.5 text-xs text-gray-300 hover:bg-[#17202d]"><Command size={13}/>Copilot<kbd className="hidden rounded bg-[#202838] px-1.5 py-0.5 text-[10px] text-gray-500 sm:inline">⌘K</kbd></button>
    {open && <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div className="w-full max-w-2xl rounded-xl border border-[#263143] bg-[#0c111b] p-3 shadow-2xl" onMouseDown={e => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between px-1"><div className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-emerald-400"/>Chart Copilot</div><button onClick={() => setOpen(false)}><X size={16}/></button></div>
        <div className="flex items-center gap-2 rounded-lg border border-[#34415a] bg-[#101722] px-3 py-2"><Search size={16} className="text-gray-500"/><input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") runCommand(); }} placeholder="Try: Show support/resistance levels for AAPL" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/><kbd className="rounded bg-[#202838] px-2 py-1 text-[10px] text-gray-500">Enter</kbd></div>
        <div className="mt-3 text-xs text-gray-500">Commands: indicators, symbols, timeframes, and recent support/resistance levels.</div>
      </div>
    </div>}
  </>;
}