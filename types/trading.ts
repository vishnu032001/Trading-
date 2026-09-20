export type Timeframe = "1m" | "5m" | "1h" | "1D" | "1W";
export type ChartType = "candlestick" | "line" | "area";

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  bid?: number;
  ask?: number;
  timestamp: number;
}

export interface WatchlistItem {
  symbol: string;
  name?: string;
  exchange?: string;
  assetType?: "stock" | "crypto" | "etf" | "forex";
  quote?: Quote;
}

export type IndicatorType = "SMA" | "EMA" | "RSI" | "MACD";
export type IndicatorPane = "overlay" | "separate";

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  name?: string;
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  enabled: boolean;
  pane: IndicatorPane;
}

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface MACDPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface CalculatedIndicator {
  config: IndicatorConfig;
  values?: IndicatorPoint[];
  macdValues?: MACDPoint[];
}

export type DrawingType = "cursor" | "trendline" | "horizontal-ray";

export interface ChartPoint {
  time: number;
  price: number;
}

export interface Drawing {
  id: string;
  type: DrawingType;
  points: ChartPoint[];
  color?: string;
  lineWidth?: number;
}

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus =
  | "pending"
  | "open"
  | "filled"
  | "partially_filled"
  | "cancelled"
  | "rejected";

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
  status: OrderStatus;
  filledQuantity: number;
  averageFillPrice?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  averageEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  side: "long" | "short";
}

export interface Account {
  accountId?: string;
  equity: number;
  cash: number;
  buyingPower: number;
  portfolioValue: number;
  dayPnL: number;
  dayPnLPercent: number;
}

export interface Trade {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  realizedPnL?: number;
  timestamp: number;
}

export interface ChartState {
  activeSymbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  candles: OHLCV[];
  indicators: IndicatorConfig[];
  drawings: Drawing[];
  loading: boolean;
  error?: string;
}

export type CopilotIntent =
  | "add_indicator"
  | "remove_indicator"
  | "change_symbol"
  | "change_timeframe"
  | "show_support_resistance"
  | "show_chart"
  | "unknown";

export interface CopilotCommand {
  raw: string;
  intent: CopilotIntent;
  parameters: Record<string, string | number | boolean>;
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  command?: CopilotCommand;
}

/**
 * Provider-neutral interface. Alpaca, Yahoo Finance, and the mock fallback
 * normalize their responses into these application-level contracts.
 */
export interface MarketDataProvider {
  getHistoricalBars(
    symbol: string,
    timeframe: Timeframe,
    from?: number,
    to?: number
  ): Promise<OHLCV[]>;

  getQuote(symbol: string): Promise<Quote>;

  subscribeQuotes(
    symbols: string[],
    onQuote: (quote: Quote) => void
  ): () => void;
}

export interface HistoricalBarsRequest {
  symbol: string;
  timeframe: Timeframe;
  from?: number;
  to?: number;
}

export interface HistoricalBarsResponse {
  symbol: string;
  timeframe: Timeframe;
  candles: OHLCV[];
  source: "alpaca" | "yahoo" | "mock";
}

export interface QuoteResponse {
  quote: Quote;
  source: "alpaca" | "yahoo" | "mock";
}

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
