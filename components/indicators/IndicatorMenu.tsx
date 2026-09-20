"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus, SlidersHorizontal } from "lucide-react";
import type { IndicatorConfig, IndicatorType } from "@/types/trading";
import { useTradingStore } from "@/store/useTradingStore";

const presets: Array<{
  key: string; label: string; type: IndicatorType; period?: number;
  fastPeriod?: number; slowPeriod?: number; signalPeriod?: number;
  pane: "overlay" | "separate";
}> = [
  { key: "SMA-20", label: "SMA 20", type: "SMA", period: 20, pane: "overlay" },
  { key: "SMA-50", label: "SMA 50", type: "SMA", period: 50, pane: "overlay" },
  { key: "SMA-200", label: "SMA 200", type: "SMA", period: 200, pane: "overlay" },
  { key: "EMA-20", label: "EMA 20", type: "EMA", period: 20, pane: "overlay" },
  { key: "EMA-50", label: "EMA 50", type: "EMA", period: 50, pane: "overlay" },
  { key: "RSI-14", label: "RSI 14", type: "RSI", period: 14, pane: "separate" },
  { key: "MACD-12-26-9", label: "MACD 12/26/9", type: "MACD", fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, pane: "separate" },
];

function matches(indicator: IndicatorConfig, preset: (typeof presets)[number]) {
  return indicator.type === preset.type &&
    indicator.period === preset.period &&
    indicator.fastPeriod === preset.fastPeriod &&
    indicator.slowPeriod === preset.slowPeriod &&
    indicator.signalPeriod === preset.signalPeriod;
}

export default function IndicatorMenu() {
  const [open, setOpen] = useState(false);
  const indicators = useTradingStore((state) => state.indicators);
  const addIndicator = useTradingStore((state) => state.addIndicator);
  const removeIndicator = useTradingStore((state) => state.removeIndicator);
  const toggleIndicator = useTradingStore((state) => state.toggleIndicator);

  const active = useMemo(() => new Set(indicators.filter((item) => item.enabled).map((item) => item.id)), [indicators]);

  const togglePreset = (preset: (typeof presets)[number]) => {
    const existing = indicators.find((indicator) => matches(indicator, preset));
    if (existing) {
      toggleIndicator(existing.id);
      return;
    }
    addIndicator({
      type: preset.type, name: preset.label, period: preset.period,
      fastPeriod: preset.fastPeriod, slowPeriod: preset.slowPeriod,
      signalPeriod: preset.signalPeriod, enabled: true, pane: preset.pane,
    });
  };

  const clearAll = () => indicators.forEach((indicator) => removeIndicator(indicator.id));

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
        aria-expanded={open}>
        <SlidersHorizontal className="h-4 w-4" /> Indicators
        <ChevronDown className={"h-3.5 w-3.5 transition " + (open ? "rotate-180" : "")} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-lg border border-slate-700 bg-slate-950 p-2 shadow-2xl">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold text-slate-100">Technical indicators</span>
            <button type="button" onClick={clearAll} className="text-[11px] text-slate-500 hover:text-slate-200">Clear</button>
          </div>
          <div className="mt-1 space-y-1">
            {presets.map((preset) => {
              const existing = indicators.find((indicator) => matches(indicator, preset));
              const enabled = existing ? active.has(existing.id) : false;
              return (
                <button key={preset.key} type="button" onClick={() => togglePreset(preset)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-slate-300 hover:bg-slate-900">
                  <span className={"flex h-4 w-4 items-center justify-center rounded border " +
                    (enabled ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-slate-700 text-transparent")}>
                    {enabled ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  </span>
                  <span className="flex-1">{preset.label}</span>
                  <span className="text-[10px] uppercase text-slate-600">{preset.pane}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
