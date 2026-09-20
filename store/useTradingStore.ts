"use client";

import { create } from "zustand";
import type {
  Account,
  ChartType,
  CopilotMessage,
  Drawing,
  IndicatorConfig,
  OHLCV,
  Order,
  Position,
  Quote,
  Timeframe,
  Trade,
  WatchlistItem,
} from "@/types/trading";

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function seedCandles(symbol: string, count = 250): OHLCV[] {
  const now = Math.floor(Date.now() / 1000);
  const step = 60 * 5;
  let price = symbol === "AAPL" ? 220 : symbol === "NVDA" ? 145 : 100;

  return Array.from({ length: count }, (_, i) => {
    const time = now - (count - i) * step;
    const drift = (Math.random() - 0.48) * price * 0.012;
    const open = price;
    const close = Math.max(1, price + drift);
    const high = Math.max(open, close) * (1 + Math.random() * 0.006);
    const low = Math.min(open, close) * (1 - Math.random() * 0.006);
    const volume = Math.floor(100_000 + Math.random() * 2_000_000);
    price = close;
    return { time, open, high, low, close, volume };
  });
}

function quoteFromCandles(symbol: string, candles: OHLCV[]): Quote {
  const last = candles[candles.length - 1];
  const previous = candles[Math.max(0, candles.length - 2)];
  const change = last.close - previous.close;
  return {
    symbol,
    price: last.close,
    change,
    changePercent: previous.close ? (change / previous.close) * 100 : 0,
    timestamp: Date.now(),
  };
}

interface TradingStore {
  activeSymbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  candles: OHLCV[];
  watchlist: WatchlistItem[];
  indicators: IndicatorConfig[];
  drawings: Drawing[];
  orders: Order[];
  positions: Position[];
  trades: Trade[];
  account: Account;
  copilotMessages: CopilotMessage[];
  loading: boolean;
  error?: string;

  setActiveSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  setChartType: (type: ChartType) => void;
  setCandles: (candles: OHLCV[]) => void;
  setLoading: (loading: boolean) => void;
  addWatchlistSymbol: (symbol: string) => void;
  removeWatchlistSymbol: (symbol: string) => void;
  updateQuote: (quote: Quote) => void;
  addIndicator: (indicator: Omit<IndicatorConfig, "id">) => void;
  removeIndicator: (id: string) => void;
  toggleIndicator: (id: string) => void;
  addDrawing: (drawing: Omit<Drawing, "id">) => void;
  removeDrawing: (id: string) => void;
  submitOrder: (order: Omit<Order, "id" | "createdAt" | "updatedAt">) => void;
  addCopilotMessage: (message: Omit<CopilotMessage, "id" | "timestamp">) => void;
  resetWorkspace: () => void;
}

const initialCandles = seedCandles("AAPL");
const initialQuote = quoteFromCandles("AAPL", initialCandles);

export const useTradingStore = create<TradingStore>((set) => ({
  activeSymbol: "AAPL",
  timeframe: "5m",
  chartType: "candlestick",
  candles: initialCandles,

  watchlist: DEFAULT_SYMBOLS.map((symbol) => ({
    symbol,
    assetType: "stock",
    quote: symbol === "AAPL" ? initialQuote : undefined,
  })),

  indicators: [
    {
      id: "sma-20",
      type: "SMA",
      name: "SMA 20",
      period: 20,
      enabled: true,
      pane: "overlay",
    },
  ],

  drawings: [],
  orders: [],
  positions: [],
  trades: [],

  account: {
    equity: 100_000,
    cash: 100_000,
    buyingPower: 100_000,
    portfolioValue: 100_000,
    dayPnL: 0,
    dayPnLPercent: 0,
  },

  copilotMessages: [],
  loading: false,

  setActiveSymbol: (symbol) =>
    set({
      activeSymbol: symbol.toUpperCase(),
      candles: seedCandles(symbol.toUpperCase()),
    }),

  setTimeframe: (timeframe) => set({ timeframe }),

  setChartType: (chartType) => set({ chartType }),

  setCandles: (candles) => set({ candles }),

  setLoading: (loading) => set({ loading }),

  addWatchlistSymbol: (symbol) =>
    set((state) => {
      const normalized = symbol.trim().toUpperCase();
      if (!normalized || state.watchlist.some((x) => x.symbol === normalized)) {
        return state;
      }

      return {
        watchlist: [
          ...state.watchlist,
          {
            symbol: normalized,
            assetType: "stock",
            quote: quoteFromCandles(normalized, seedCandles(normalized)),
          },
        ],
      };
    }),

  removeWatchlistSymbol: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.filter((item) => item.symbol !== symbol),
    })),

  updateQuote: (quote) =>
    set((state) => ({
      watchlist: state.watchlist.map((item) =>
        item.symbol === quote.symbol ? { ...item, quote } : item
      ),
    })),

  addIndicator: (indicator) =>
    set((state) => ({
      indicators: [
        ...state.indicators,
        {
          ...indicator,
          id: makeId("indicator"),
        },
      ],
    })),

  removeIndicator: (id) =>
    set((state) => ({
      indicators: state.indicators.filter((indicator) => indicator.id !== id),
    })),

  toggleIndicator: (id) =>
    set((state) => ({
      indicators: state.indicators.map((indicator) =>
        indicator.id === id
          ? { ...indicator, enabled: !indicator.enabled }
          : indicator
      ),
    })),

  addDrawing: (drawing) =>
    set((state) => ({
      drawings: [...state.drawings, { ...drawing, id: makeId("drawing") }],
    })),

  removeDrawing: (id) =>
    set((state) => ({
      drawings: state.drawings.filter((drawing) => drawing.id !== id),
    })),

  submitOrder: (order) =>
    set((state) => {
      const now = Date.now();
      const nextOrder: Order = {
        ...order,
        id: makeId("order"),
        createdAt: now,
        updatedAt: now,
      };

      const lastPrice = state.candles[state.candles.length - 1]?.close ?? 0;
      const fillPrice = order.type === "market" ? lastPrice : order.limitPrice ?? lastPrice;
      const shouldFill = order.type === "market";
      if (!shouldFill) {
        return { orders: [{ ...nextOrder, status: "open" }, ...state.orders] };
      }

      const signedQty = order.side === "buy" ? order.quantity : -order.quantity;
      const existing = state.positions.find(p => p.symbol === order.symbol);
      const nextQty = (existing?.quantity ?? 0) + signedQty;
      const trade: Trade = {
        id: makeId("trade"),
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        price: fillPrice,
        timestamp: now,
      };
      const nextOrderFilled: Order = {
        ...nextOrder,
        status: "filled",
        filledQuantity: order.quantity,
        averageFillPrice: fillPrice,
        updatedAt: now,
      };
      const cashDelta = order.side === "buy" ? -order.quantity * fillPrice : order.quantity * fillPrice;
      const nextPositions = state.positions.filter(p => p.symbol !== order.symbol);
      if (nextQty > 0) {
        const oldQty = existing?.quantity ?? 0;
        const avg = oldQty > 0
          ? ((existing?.averageEntryPrice ?? fillPrice) * oldQty + fillPrice * order.quantity) / nextQty
          : fillPrice;
        nextPositions.push({
          symbol: order.symbol,
          quantity: nextQty,
          averageEntryPrice: avg,
          currentPrice: fillPrice,
          marketValue: nextQty * fillPrice,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          side: "long",
        });
      }

      const cash = state.account.cash + cashDelta;
      return {
        orders: [nextOrderFilled, ...state.orders],
        trades: [trade, ...state.trades],
        positions: nextPositions,
        account: {
          ...state.account,
          cash,
          buyingPower: cash,
          portfolioValue: cash + nextPositions.reduce((sum, p) => sum + p.marketValue, 0),
          equity: cash + nextPositions.reduce((sum, p) => sum + p.marketValue, 0),
        },
      };
    }),

  addCopilotMessage: (message) =>
    set((state) => ({
      copilotMessages: [
        ...state.copilotMessages,
        {
          ...message,
          id: makeId("copilot"),
          timestamp: Date.now(),
        },
      ],
    })),

  resetWorkspace: () =>
    set({
      activeSymbol: "AAPL",
      timeframe: "5m",
      chartType: "candlestick",
      candles: seedCandles("AAPL"),
      indicators: [],
      drawings: [],
      orders: [],
      positions: [],
      trades: [],
      error: undefined,
    }),
}));
