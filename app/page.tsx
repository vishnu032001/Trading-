"use client";

import { useState } from "react";
import { Activity, Bell, ChevronDown, Command, Menu, Search, Settings, TrendingUp, Wallet } from "lucide-react";
import { ChartType, Timeframe } from "@/types/trading";
import { useTradingStore } from "@/store/useTradingStore";
import { TradingChart } from "@/components/chart/TradingChart";
import { WatchlistPanel } from "@/components/watchlist/WatchlistPanel";
import { IndicatorMenu } from "@/components/indicators/IndicatorMenu";
import { ChartCopilot } from "@/components/command/ChartCopilot";

const timeframes: Timeframe[] = ["1m", "5m", "1h", "1D", "1W"];

export default function HomePage() {
  const { activeSymbol, timeframe, chartType, account, setTimeframe, setChartType } = useTradingStore();
  const [logOpen, setLogOpen] = useState(true);

  return (
    <main className="min-h-screen bg-[#080b12] text-gray-100">
      <header className="flex h-14 items-center justify-between border-b border-[#202838] bg-[#0c111b] px-3">
        <div className="flex items-center gap-3">
          <button className="rounded p-2 md:hidden"><Menu size={18}/></button>
          <div className="flex items-center gap-2 font-semibold"><TrendingUp size={20} className="text-emerald-400"/>WebTradingView</div>
          <div className="hidden border-l border-[#263143] pl-3 sm:block"><b>{activeSymbol}</b><span className="ml-2 text-xs text-gray-500">NASDAQ</span></div>
        </div>
        <div className="hidden items-center gap-1 md:flex">
          {timeframes.map(tf => <button key={tf} onClick={() => setTimeframe(tf)} className={`rounded px-2.5 py-1.5 text-xs ${timeframe === tf ? "bg-[#243044] text-white" : "text-gray-400 hover:bg-[#17202d]"}`}>{tf}</button>)}
          <select value={chartType} onChange={e => setChartType(e.target.value as ChartType)} className="ml-2 rounded border border-[#263143] bg-[#101722] px-2 py-1.5 text-xs">
            <option value="candlestick">Candles</option><option value="line">Line</option><option value="area">Area</option>
          </select>
          <IndicatorMenu/><ChartCopilot/>
        </div>
        <div className="flex items-center gap-1"><button className="p-2 text-gray-400"><Search size={17}/></button><button className="p-2 text-gray-400"><Bell size={17}/></button><button className="p-2 text-gray-400"><Settings size={17}/></button></div>
      </header>

      <section className="grid min-h-[calc(100vh-56px)] grid-cols-1 md:grid-cols-[256px_minmax(0,1fr)_280px]">
        <aside className="hidden border-r border-[#202838] md:block"><WatchlistPanel/></aside>
        <div className="min-w-0">
          <div className="flex h-9 items-center justify-between border-b border-[#202838] bg-[#0b1018] px-3 text-xs">
            <div><b>{activeSymbol}</b><span className="ml-2 text-gray-500">{timeframe}</span><span className="ml-2 text-emerald-400">● Market</span></div>
            <div className="hidden items-center gap-1 text-gray-500 sm:flex"><Command size={13}/>Chart Copilot</div>
          </div>
          <div className="h-[60vh] min-h-[380px] md:h-[calc(100vh-185px)]"><TradingChart/></div>
          <div className="border-t border-[#202838] bg-[#0b1018]">
            <button onClick={() => setLogOpen(!logOpen)} className="flex w-full justify-between px-3 py-2 text-xs text-gray-400"><span className="flex gap-2"><Activity size={14}/>AI / Pine Logic Log</span><ChevronDown size={14}/></button>
            {logOpen && <div className="px-3 pb-3 text-xs text-gray-500"><span className="text-emerald-400">ready</span> · chart synchronized · mock market data active</div>}
          </div>
        </div>
        <aside className="hidden border-l border-[#202838] bg-[#0c111b] md:block">
          <div className="border-b border-[#202838] px-3 py-3 font-semibold">Order Ticket</div>
          <div className="p-3">
            <div className="mb-3 grid grid-cols-2 rounded-lg bg-[#151c28] p-1"><button className="rounded bg-emerald-500/20 py-2 text-sm font-semibold text-emerald-400">BUY</button><button className="py-2 text-sm font-semibold text-gray-500">SELL</button></div>
            <div className="mb-3 grid grid-cols-2 gap-1"><button className="rounded border border-[#4b5c77] bg-[#1b2636] py-1.5 text-xs">Market</button><button className="rounded border border-[#263143] py-1.5 text-xs text-gray-500">Limit</button></div>
            <div className="mb-2 text-xs text-gray-500">Symbol</div><div className="mb-3 rounded border border-[#263143] bg-[#101722] px-3 py-2 text-sm">{activeSymbol}</div>
            <div className="mb-2 text-xs text-gray-500">Quantity</div><input defaultValue="10" type="number" className="mb-3 w-full rounded border border-[#263143] bg-[#101722] px-3 py-2 text-sm"/>
            <div className="mb-3 rounded-lg bg-[#101722] p-3 text-xs text-gray-500">Cash available <span className="float-right text-gray-200">${account.cash.toLocaleString()}</span></div>
            <button className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-bold text-black"><Wallet size={16} className="mr-2 inline"/>Buy {activeSymbol}</button>
          </div>
        </aside>
      </section>
      <footer className="border-t border-[#202838] bg-[#0c111b]"><div className="grid grid-cols-3 px-3 py-2 text-xs"><div><span className="text-gray-500">Balance</span><div className="font-semibold">${account.balance.toLocaleString()}</div></div><div><span className="text-gray-500">Cash</span><div className="font-semibold">${account.cash.toLocaleString()}</div></div><div><span className="text-gray-500">Buying Power</span><div className="font-semibold">${account.buyingPower.toLocaleString()}</div></div></div></footer>
    </main>
  );
}