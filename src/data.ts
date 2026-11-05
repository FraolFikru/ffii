export type Status = "Success" | "Pending" | "Failed";
export type Category = "Food" | "Subscription" | "Travel" | "Shopping" | "Utilities" | "Transport";
export type PaymentMethod = "telebirr" | "cash" | "cbe";

export interface Transaction {
  id: string;
  description: string;
  category: Category;
  date: Date;
  amount: number;
  status: Status;
}

export interface MonthPoint {
  month: string;
  revenue: number;
  expenses: number;
}

export const user = {
  name: "Lily Rose",
  email: "rose@gmail.com",
};

export const stats = [
  { label: "Total Balance", value: 82450, note: "Positive growth", change: 12.4, icon: "wallet" },
  { label: "Total Revenue", value: 9820, note: "Monthly increase", change: 8.6, icon: "trend-up" },
  { label: "Total Expenses", value: 4630, note: "Lower spending", change: -5.1, icon: "trend-down" },
] as const;

export const cashFlow: MonthPoint[] = [
  { month: "Jan", revenue: 3700, expenses: 2650 },
  { month: "Feb", revenue: 3950, expenses: 2950 },
  { month: "Mar", revenue: 3250, expenses: 3300 },
  { month: "Apr", revenue: 3500, expenses: 3400 },
  { month: "May", revenue: 4000, expenses: 4500 },
  { month: "Jun", revenue: 5620, expenses: 5780 },
  { month: "Jul", revenue: 6200, expenses: 5900 },
  { month: "Aug", revenue: 6650, expenses: 5100 },
  { month: "Sep", revenue: 6650, expenses: 4600 },
  { month: "Oct", revenue: 6650, expenses: 4400 },
  { month: "Nov", revenue: 5450, expenses: 4100 },
  { month: "Dec", revenue: 5400, expenses: 3500 },
];

export const paymentMethods = {
  telebirr: {
    id: "telebirr" as PaymentMethod,
    name: "Telebirr",
    balance: 12450.75,
    change: 5.2,
    account: "0912 345 678",
    spent: 1840.5,
    limit: 5000,
  },
  cash: {
    id: "cash" as PaymentMethod,
    name: "Cash",
    balance: 3200,
    change: -2.1,
    account: "On hand",
    spent: 980,
    limit: 4000,
  },
  cbe: {
    id: "cbe" as PaymentMethod,
    name: "CBE",
    balance: 45800.2,
    change: 9.4,
    account: "1000 1234 5678",
    spent: 3120,
    limit: 15000,
  },
};

const merchants: { description: string; category: Category; amount: number }[] = [
  { description: "Starbucks Coffee", category: "Food", amount: 8.75 },
  { description: "Netflix Subscription", category: "Subscription", amount: 15.99 },
  { description: "Hotel Booking", category: "Travel", amount: 285.1 },
  { description: "Amazon Purchase", category: "Shopping", amount: 79.99 },
  { description: "Electricity Bill", category: "Utilities", amount: 64.2 },
  { description: "Uber Ride", category: "Transport", amount: 18.4 },
  { description: "Spotify Premium", category: "Subscription", amount: 10.99 },
  { description: "Whole Foods Market", category: "Food", amount: 92.35 },
  { description: "Airline Ticket", category: "Travel", amount: 420.0 },
  { description: "Apple Store", category: "Shopping", amount: 129.0 },
];

const statuses: Status[] = ["Success", "Success", "Pending", "Failed", "Success", "Success", "Success", "Pending"];

export const transactions: Transaction[] = Array.from({ length: 50 }, (_, i) => {
  const m = merchants[i % merchants.length];
  const date = new Date(2026, 6, 1 + Math.floor(i * 0.6));
  return {
    id: `TXN-2026-${String(i + 1).padStart(3, "0")}`,
    description: m.description,
    category: m.category,
    date,
    amount: -m.amount,
    status: i < 4 ? (["Success", "Success", "Pending", "Failed"] as Status[])[i] : statuses[i % statuses.length],
  };
});

export const categoryColor: Record<Category, string> = {
  Food: "#a855f7",
  Subscription: "#f59e0b",
  Travel: "#22c55e",
  Shopping: "#3b82f6",
  Utilities: "#ef4444",
  Transport: "#14b8a6",
}; 
