export type Status = "Success" | "Pending" | "Failed";
export type Category = "Food Cost" | "Labor" | "Utilities" | "Rent" | "Marketing" | "Supplies";
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
  name: "Abebe Kebede",
  email: "owner@bistroaddis.com",
  restaurant: "Bistro Addis",
};

export const stats = [
  { label: "Today's Revenue", value: 18420, note: "vs yesterday", change: 12.4, icon: "wallet" },
  { label: "Total Orders", value: 142, note: "this week", change: 8.6, icon: "receipt" },
  { label: "Food Cost %", value: 31.2, note: "target ≤ 30%", change: -1.8, icon: "trend-down" },
] as const;

export const cashFlow: MonthPoint[] = [
  { month: "Jan", revenue: 87000, expenses: 62500 },
  { month: "Feb", revenue: 92500, expenses: 64800 },
  { month: "Mar", revenue: 88000, expenses: 67200 },
  { month: "Apr", revenue: 94500, expenses: 69100 },
  { month: "May", revenue: 101200, expenses: 71200 },
  { month: "Jun", revenue: 112500, expenses: 75800 },
  { month: "Jul", revenue: 118000, expenses: 78200 },
  { month: "Aug", revenue: 124500, expenses: 76500 },
  { month: "Sep", revenue: 119800, expenses: 74100 },
  { month: "Oct", revenue: 128400, expenses: 76900 },
  { month: "Nov", revenue: 115200, expenses: 72800 },
  { month: "Dec", revenue: 132000, expenses: 81200 },
];

export const paymentMethods = {
  telebirr: {
    id: "telebirr" as PaymentMethod,
    name: "Telebirr",
    balance: 28450.75,
    change: 5.2,
    account: "0912 345 678",
    spent: 12480,
    limit: 50000,
  },
  cash: {
    id: "cash" as PaymentMethod,
    name: "Cash",
    balance: 8200,
    change: -2.1,
    account: "Drawer",
    spent: 3150,
    limit: 15000,
  },
  cbe: {
    id: "cbe" as PaymentMethod,
    name: "CBE",
    balance: 186400.2,
    change: 9.4,
    account: "1000 1234 5678",
    spent: 42800,
    limit: 200000,
  },
};

const merchants: { description: string; category: Category; amount: number }[] = [
  { description: "Fresh Produce Supplier", category: "Food Cost", amount: 4250 },
  { description: "Staff Payroll - Week 44", category: "Labor", amount: 18700 },
  { description: "Electricity - Ethio Telecom", category: "Utilities", amount: 3200 },
  { description: "Monthly Rent - Bole", category: "Rent", amount: 25000 },
  { description: "Facebook Ads Campaign", category: "Marketing", amount: 1850 },
  { description: "Kitchen Supplies - Restock", category: "Supplies", amount: 980 },
  { description: "Meat & Poultry Vendor", category: "Food Cost", amount: 6750 },
  { description: "Part-time Waiters", category: "Labor", amount: 4200 },
  { description: "Water Bill", category: "Utilities", amount: 890 },
  { description: "Menu Printing", category: "Marketing", amount: 450 },
];

const statuses: Status[] = ["Success", "Success", "Pending", "Failed", "Success", "Success", "Success", "Pending"];

export const transactions: Transaction[] = Array.from({ length: 50 }, (_, i) => {
  const m = merchants[i % merchants.length];
  const date = new Date(2026, 9, 1 + Math.floor(i * 0.7));
  return {
    id: `ORD-2026-${String(i + 1).padStart(3, "0")}`,
    description: m.description,
    category: m.category,
    date,
    amount: -m.amount,
    status: i < 4 ? (["Success", "Success", "Pending", "Failed"] as Status[])[i] : statuses[i % statuses.length],
  };
});

export const categoryColor: Record<Category, string> = {
  "Food Cost": "#22c55e",
  Labor: "#3b82f6",
  Utilities: "#f59e0b",
  Rent: "#ef4444",
  Marketing: "#a855f7",
  Supplies: "#14b8a6",
};

// Analytics mock data
export const topDishes = [
  { name: "Kitfo Special", sold: 186, revenue: 37200, pct: 22 },
  { name: "Doro Wat", sold: 142, revenue: 28400, pct: 17 },
  { name: "Tibs Mix", sold: 128, revenue: 25600, pct: 15 },
  { name: "Shiro", sold: 97, revenue: 14550, pct: 9 },
  { name: "Firfir", sold: 84, revenue: 12600, pct: 7 },
];

export const peakHours = [
  { hour: "11–12", orders: 18 },
  { hour: "12–13", orders: 42 },
  { hour: "13–14", orders: 38 },
  { hour: "18–19", orders: 51 },
  { hour: "19–20", orders: 67 },
  { hour: "20–21", orders: 44 },
];

// Budgets
export const budgets = [
  { name: "Food Cost", allocated: 35000, spent: 31240, color: "#22c55e" },
  { name: "Labor", allocated: 42000, spent: 38900, color: "#3b82f6" },
  { name: "Utilities", allocated: 8000, spent: 6450, color: "#f59e0b" },
  { name: "Marketing", allocated: 5000, spent: 3200, color: "#a855f7" },
  { name: "Supplies", allocated: 4000, spent: 2850, color: "#14b8a6" },
];

// Goals
export const goals = [
  { title: "Monthly Revenue Target", current: 128400, target: 150000, unit: "ETB", deadline: "Nov 30" },
  { title: "Food Cost under 30%", current: 31.2, target: 30, unit: "%", deadline: "Dec 15" },
  { title: "Average Order Value", current: 420, target: 480, unit: "ETB", deadline: "Dec 31" },
  { title: "Customer Reviews (4.5+)", current: 4.3, target: 4.5, unit: "★", deadline: "Ongoing" },
];
