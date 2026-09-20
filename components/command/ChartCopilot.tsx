"use client";

import { useEffect, useRef, useState } from "react";
import { Command, Search, X, Sparkles } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";

function parseCommand(input: string) {
  const text = input.toLowerCase().trim();
  const indicators: Array<{ type: "SMA" | "EMA" | "RSI" | "MACD"; period?: number; fastPeriod?: number; slowPeriod?: number; signalPeriod?: number; pane: "overlay" | "separate" }> = [];
  const ema = text.match(/(\d+)\s*(?:ema|exponential\s+moving\s+average)/i);
  const sma = text.match(/(\d+)\s*(?:sma|simple\s+moving\s+average)/i);
  if (ema) indicators.push({ type: "EMA", period: Number(ema[1]), pane: "overlay" });
  if (sma) indicators.push({ type: "SMA", period: Number(sma[1]), pane: "overlay" });
  if (/\brsi\b/i.test(text)) indicators.push({ type: "RSI", period: 14, pane: "separate" });
  if (/\bmacd\b/i.test(text)) indicators.push({ type: "MACD", fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, pane: "separate" });
  return { indicators };
}

export function ChartCopilot() {
  const { addIndicator, addCopilotMessage } = useTradingStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setOpen(true); setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function runCommand() {
    const value = input.trim();
    if (!value) return;
    const parsed = parseCommand(value);
    parsed.indicators.forEach((indicator, index) => addIndicator({
      id: `copilot-${indicator.type}-${indicator.period ?? indicator.fastPeriod ?? index}-${Date.now()}`,
      ...indicator, enabled: true,
    }));
    addCopilotMessage({ role: "user", content: value });
    addCopilotMessage({ role: "assistant", content: parsed.indicators.length
      ? `Added ${parsed.indicators.map(x => x.type === "MACD" ? "MACD" : `${x.type} ${x.period}`).join(" + ")}.`
      : "Try: Add 50 EMA and RSI, Add 200 SMA, or Add MACD." });
    setInput(""); setOpen(false);
  }

  return <>
    <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }} className="flex items-center gap-2 rounded border border-[#263143] bg-[#101722] px-2.5 py-1.5 text-xs text-gray-300 hover:bg-[#17202d]"><Command size={13}/>Copilot<kbd className="hidden rounded bg-[#202838] px-1.5 py-0.5 text-[10px] text-gray-500 sm:inline">⌘K</kbd></button>
    {open && <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div className="w-full max-w-2xl rounded-xl border border-[#263143] bg-[#0c111b] p-3 shadow-2xl" onMouseDown={e => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between px-1"><div className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-emerald-400"/>Chart Copilot</div><button onClick={() => setOpen(false)}><X size={16}/></button></div>
        <div className="flex items-center gap-2 rounded-lg border border-[#34415a] bg-[#101722] px-3 py-2"><Search size={16} className="text-gray-500"/><input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") runCommand(); }} placeholder="Try: Add 50 EMA and RSI" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/><kbd className="rounded bg-[#202838] px-2 py-1 text-[10px] text-gray-500">Enter</kbd></div>
        <div className="mt-3 text-xs text-gray-500">Supports EMA/SMA periods, RSI, and MACD. Press Esc to close.</div>
      </div>
    </div>}
  </>;
}