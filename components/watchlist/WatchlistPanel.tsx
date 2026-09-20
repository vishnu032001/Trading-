"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";

function formatPrice(value?: number) {
  return value == null ? "—" : value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function WatchlistPanel() {
  const [query, setQuery] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const watchlist = useTradingStore((state) => state.watchlist);
  const activeSymbol = useTradingStore((state) => state.activeSymbol);
  const setActiveSymbol = useTradingStore((state) => state.setActiveSymbol);
  const addWatchlistSymbol = useTradingStore((state) => state.addWatchlistSymbol);
  const removeWatchlistSymbol = useTradingStore((state) => state.removeWatchlistSymbol);

  const filtered = useMemo(() => {
    const normalized = query.trim().toUpperCase();
    if (!normalized) return watchlist;
    return watchlist.filter((item) =>
      item.symbol.includes(normalized) || item.name?.toUpperCase().includes(normalized)
    );
  }, [query, watchlist]);

  const addSymbol = () => {
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) return;
    addWatchlistSymbol(symbol);
    setActiveSymbol(symbol);
    setNewSymbol("");
  };

  return (
    <aside className="flex h-full min-h-0 w-64 flex-col border-r border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">Watchlist</h2>
          <span className="text-xs text-slate-500">{watchlist.length}</span>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-2">
          <Search className="h-4 w-4 text-slate-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="Search symbols"
            className="min-w-0 flex-1 bg-transparent py-2 text-xs text-slate-100 outline-none placeholder:text-slate-600" />
        </div>
        <form onSubmit={(event) => { event.preventDefault(); addSymbol(); }} className="mt-2 flex gap-2">
          <input value={newSymbol} onChange={(event) => setNewSymbol(event.target.value)}
            placeholder="Add ticker" aria-label="Add ticker"
            className="min-w-0 flex-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-2 text-xs uppercase text-slate-100 outline-none placeholder:normal-case placeholder:text-slate-600" />
          <button type="submit" title="Add symbol"
            className="rounded-md border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800">
            <Plus className="h-4 w-4" />
          </button>
        </form>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.map((item) => {
          const quote = item.quote;
          const positive = (quote?.changePercent ?? 0) >= 0;
          const selected = item.symbol === activeSymbol;
          return (
            <div key={item.symbol}
              className={"group flex w-full items-center border-b border-slate-900 px-3 py-3 text-left transition " + (selected ? "bg-slate-900" : "hover:bg-slate-900/70")}>
              <button type="button" onClick={() => setActiveSymbol(item.symbol)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-100">{item.symbol}</span>
                  <span className="text-xs text-slate-200">{formatPrice(quote?.price)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-slate-500">{item.name ?? item.exchange ?? "Stock"}</span>
                  <span className={positive ? "text-emerald-400" : "text-rose-400"}>
                    {positive ? "+" : ""}{(quote?.changePercent ?? 0).toFixed(2)}%
                  </span>
                </div>
              </button>
              <button type="button" onClick={() => removeWatchlistSymbol(item.symbol)}
                title={"Remove " + item.symbol}
                className="ml-2 rounded p-1 text-slate-600 opacity-0 transition hover:bg-slate-800 hover:text-slate-200 group-hover:opacity-100 focus:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {!filtered.length && <div className="p-4 text-center text-xs text-slate-500">No symbols found.</div>}
      </div>
    </aside>
  );
}
