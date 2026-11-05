import "./style.css";
import {
  budgets,
  cashFlow,
  categoryColor,
  goals,
  paymentMethods,
  peakHours,
  stats,
  topDishes,
  transactions,
  user,
  type MonthPoint,
  type PaymentMethod,
  type Status,
  type Transaction,
} from "./data";
import { icon } from "./icons";

/* ---------- helpers ---------- */

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T => {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`Element not found: ${sel}`);
  return el;
};

const usd = (n: number, digits = 0): string =>
  n.toLocaleString("en-US", { style: "currency", currency: "ETB", minimumFractionDigits: digits, maximumFractionDigits: digits });

const fmtDate = (d: Date): string =>
  d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/* ---------- state ---------- */

type Range = "Daily" | "Weekly" | "Monthly";
type Page = "Dashboard" | "Analytics" | "Transactions" | "Budgets" | "Investments" | "Goals" | "Reports";

interface State {
  page: number;
  pageSize: number;
  query: string;
  statusFilter: Status | "All";
  selected: Set<string>;
  range: Range;
  theme: "dark" | "light";
  activeNav: Page;
  payment: PaymentMethod;
}

const state: State = {
  page: 1,
  pageSize: 10,
  query: "",
  statusFilter: "All",
  selected: new Set(),
  range: "Monthly",
  theme: "dark",
  activeNav: "Dashboard",
  payment: "telebirr",
};

/* ---------- layout ---------- */

const navItems: { label: Page; icon: string }[] = [
  { label: "Dashboard", icon: "home" },
  { label: "Analytics", icon: "bars" },
  { label: "Transactions", icon: "receipt" },
  { label: "Budgets", icon: "wallet" },
  { label: "Investments", icon: "trend-up" },
  { label: "Goals", icon: "target" },
  { label: "Reports", icon: "file" },
];

function renderShell(): void {
  const app = $("#app");
  app.innerHTML = `
  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <span class="brand-mark">${icon("logo")}</span>
        <span>Bistro OS</span>
      </div>

      <button class="profile">
        <span class="avatar">${user.name.split(" ").map((p) => p[0]).join("")}</span>
        <span class="profile-text">
          <strong>${user.name}</strong>
          <small>${user.restaurant}</small>
        </span>
        ${icon("chevrons")}
      </button>

      <p class="nav-heading">Main menu</p>
      <nav class="nav" id="nav">
        ${navItems
          .map(
            (n) => `<a href="#" data-nav="${n.label}" class="${n.label === state.activeNav ? "active" : ""}">${icon(n.icon)}<span>${n.label}</span></a>`,
          )
          .join("")}
      </nav>

      <div class="sidebar-bottom">
        <p class="nav-heading">Support</p>
        <nav class="nav">
          <a href="#">${icon("settings")}<span>Settings</span></a>
          <a href="#">${icon("info")}<span>Help &amp; Support</span></a>
        </nav>
        <div class="upgrade">
          <strong>Upgrade to Pro</strong>
          <p>AI insights, multi-branch & advanced reports.</p>
          <button>Upgrade Pro ${icon("arrow-right")}</button>
        </div>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <button class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu">${icon("menu")}</button>
        <h1 id="pageTitle">${state.activeNav}</h1>
        <div class="topbar-right">
          <label class="search">
            ${icon("search")}
            <input type="text" placeholder="Search" id="globalSearch" />
            <kbd>⌘ K</kbd>
          </label>
          <button class="icon-btn notif" aria-label="Notifications">${icon("bell")}<span class="dot"></span></button>
          <div class="theme-toggle" id="themeToggle" role="group" aria-label="Theme">
            <button data-theme-btn="dark" class="active" aria-label="Dark mode">${icon("moon")}</button>
            <button data-theme-btn="light" aria-label="Light mode">${icon("sun")}</button>
          </div>
        </div>
      </header>

      <div id="pageContent"></div>
    </main>
    <div class="scrim" id="scrim"></div>
  </div>`;
}

/* ---------- Dashboard page ---------- */

function renderDashboard(): string {
  return `
    <div class="alert" id="alert">
      <span>${icon("warning")} <strong>Alert:</strong> Food cost is running 1.2% above target this week.</span>
      <a href="#" data-goto="Budgets">Review budgets ${icon("arrow-right")}</a>
    </div>

    <section class="grid">
      <div class="stats">
        ${stats
          .map(
            (s) => `
          <article class="panel stat">
            <div class="stat-head">
              <span class="stat-icon">${icon(s.icon)}</span>
              <span>${s.label}</span>
              <button class="more" aria-label="More">${icon("dots-v")}</button>
            </div>
            <div class="stat-value" data-count="${s.value}">${s.label.includes("%") ? "0%" : "ETB 0"}</div>
            <div class="stat-foot">
              <span>${s.note}</span>
              <span class="badge ${s.change >= 0 ? "up" : "down"}">${s.change >= 0 ? "+" : ""}${s.change}%</span>
            </div>
          </article>`,
          )
          .join("")}
      </div>

      <article class="panel chart-panel">
        <div class="panel-head">
          <h2>Revenue vs Expenses</h2>
          <div class="segmented" id="rangeSeg">
            ${(["Daily", "Weekly", "Monthly"] as Range[])
              .map((r) => `<button data-range="${r}" class="${r === state.range ? "active" : ""}">${r}</button>`)
              .join("")}
          </div>
        </div>
        <div class="chart-wrap" id="chartWrap">
          <svg id="chart" role="img" aria-label="Cash flow chart"></svg>
          <div class="tooltip" id="tooltip" hidden></div>
        </div>
      </article>

      <article class="panel cards-panel" id="paymentPanel"></article>
    </section>

    <article class="panel table-panel" style="margin-top:16px">
      <div class="panel-head">
        <h2>Recent Transactions</h2>
        <button class="btn" data-goto="Transactions">View all ${icon("arrow-right")}</button>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Description</th>
              <th>Category</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.slice(0, 6).map((t) => `
              <tr>
                <td class="mono">${t.id}</td>
                <td>${escapeHtml(t.description)}</td>
                <td><span class="cat"><i style="background:${categoryColor[t.category]}"></i>${t.category}</span></td>
                <td>${fmtDate(t.date)}</td>
                <td class="mono">${usd(Math.abs(t.amount))}</td>
                <td><span class="status ${t.status.toLowerCase()}">${t.status}</span></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

/* ---------- Analytics page ---------- */

function renderAnalytics(): string {
  return `
    <div class="page-grid">
      <article class="panel">
        <div class="panel-head"><h2>Top Selling Dishes</h2></div>
        ${topDishes.map((d) => `
          <div class="dish-row">
            <div style="flex:1">
              <strong>${d.name}</strong>
              <div style="font-size:12px;color:var(--muted)">${d.sold} sold · ${usd(d.revenue)}</div>
              <div class="progress-bar"><i style="width:${d.pct * 3}%;background:#22c55e"></i></div>
            </div>
            <span class="badge up">${d.pct}%</span>
          </div>`).join("")}
      </article>

      <article class="panel">
        <div class="panel-head"><h2>Peak Hours (Orders)</h2></div>
        <div class="peak-bars">
          ${peakHours.map((p) => {
            const max = Math.max(...peakHours.map((x) => x.orders));
            const h = Math.round((p.orders / max) * 100);
            return `<div><div class="bar" style="height:${h}%"></div><small>${p.hour}</small></div>`;
          }).join("")}
        </div>
        <p style="margin-top:16px;color:var(--muted);font-size:13px">Dinner service (19–20) is your strongest window. Consider staffing accordingly.</p>
      </article>

      <article class="panel">
        <div class="panel-head"><h2>Quick Insights</h2></div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="report-card">
            <h3>Average Order Value</h3>
            <strong style="font-size:22px">ETB 420</strong>
            <p>+8% vs last month</p>
          </div>
          <div class="report-card">
            <h3>Table Turnover</h3>
            <strong style="font-size:22px">2.4×</strong>
            <p>Per table during dinner</p>
          </div>
          <div class="report-card">
            <h3>Waste Rate</h3>
            <strong style="font-size:22px;color:#f87171">4.1%</strong>
            <p>Target: under 3%</p>
          </div>
        </div>
      </article>
    </div>
  `;
}

/* ---------- Transactions page ---------- */

function renderTransactionsPage(): string {
  return `
    <article class="panel table-panel">
      <div class="panel-head">
        <h2>All Transactions</h2>
        <div class="table-tools">
          <label class="search small">
            ${icon("search")}
            <input type="text" placeholder="Search" id="tableSearch" />
          </label>
          <div class="filter-wrap">
            <button class="btn" id="filterBtn">${icon("filter")} Filter</button>
            <div class="menu" id="filterMenu" hidden>
              ${(["All", "Success", "Pending", "Failed"] as const)
                .map((s) => `<button data-status="${s}" class="${s === state.statusFilter ? "active" : ""}">${s}</button>`)
                .join("")}
            </div>
          </div>
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" id="selectAll" aria-label="Select all" /></th>
              <th>Transaction ID</th>
              <th>Description</th>
              <th>Category</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
      <div class="table-foot">
        <span id="showing"></span>
        <div class="pager">
          <button class="icon-btn" id="prev" aria-label="Previous page">${icon("chevron-left")}</button>
          <span id="pageLabel"></span>
          <button class="icon-btn" id="next" aria-label="Next page">${icon("chevron-right")}</button>
        </div>
      </div>
    </article>
  `;
}

/* ---------- Budgets page ---------- */

function renderBudgets(): string {
  return `
    <div class="page-grid">
      ${budgets.map((b) => {
        const pct = Math.min(100, Math.round((b.spent / b.allocated) * 100));
        const over = b.spent > b.allocated;
        return `
          <article class="panel">
            <div class="panel-head">
              <h2>${b.name}</h2>
              <span class="badge ${over ? "down" : "up"}">${pct}%</span>
            </div>
            <div style="font-size:22px;font-weight:600;margin-bottom:4px">${usd(b.spent)}</div>
            <div style="color:var(--muted);font-size:13px">of ${usd(b.allocated)} allocated</div>
            <div class="progress-bar"><i style="width:${pct}%;background:${over ? "#ef4444" : b.color}"></i></div>
          </article>`;
      }).join("")}
    </div>
  `;
}

/* ---------- Investments page (equipment / expansion) ---------- */

function renderInvestments(): string {
  return `
    <div class="page-grid">
      <article class="panel">
        <div class="panel-head"><h2>Equipment</h2></div>
        <div class="report-card">
          <h3>New Industrial Oven</h3>
          <p>Planned Q1 2027 · Est. ETB 185,000</p>
          <div class="progress-bar"><i style="width:35%;background:#3b82f6"></i></div>
          <small style="color:var(--muted)">35% funded from reserves</small>
        </div>
        <div class="report-card" style="margin-top:12px">
          <h3>POS Terminal Upgrade</h3>
          <p>3 new terminals · ETB 42,000</p>
          <div class="progress-bar"><i style="width:80%;background:#22c55e"></i></div>
          <small style="color:var(--muted)">Almost ready</small>
        </div>
      </article>
      <article class="panel">
        <div class="panel-head"><h2>Expansion</h2></div>
        <div class="report-card">
          <h3>Second Branch – CMC</h3>
          <p>Feasibility study complete. Target open date: mid-2027.</p>
          <strong style="font-size:18px;margin-top:8px;display:block">ETB 1.2M projected</strong>
        </div>
        <div class="report-card" style="margin-top:12px">
          <h3>Delivery Fleet</h3>
          <p>2 motorcycles + branded boxes</p>
          <div class="progress-bar"><i style="width:60%;background:#a855f7"></i></div>
        </div>
      </article>
    </div>
  `;
}

/* ---------- Goals page ---------- */

function renderGoals(): string {
  return `
    <div class="page-grid" style="grid-template-columns:1fr">
      ${goals.map((g) => {
        const pct = Math.min(100, Math.round((g.current / g.target) * 100));
        return `
          <div class="goal-card">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <strong>${g.title}</strong>
              <span style="color:var(--muted);font-size:12px">Due ${g.deadline}</span>
            </div>
            <div style="font-size:24px;font-weight:600;margin:8px 0">
              ${g.unit === "%" || g.unit === "★" ? g.current : usd(g.current)}
              <span style="font-size:14px;color:var(--muted);font-weight:400"> / ${g.unit === "%" || g.unit === "★" ? g.target + g.unit : usd(g.target)}</span>
            </div>
            <div class="progress-bar"><i style="width:${pct}%;background:${pct >= 90 ? "#22c55e" : "#3b82f6"}"></i></div>
          </div>`;
      }).join("")}
    </div>
  `;
}

/* ---------- Reports page ---------- */

function renderReports(): string {
  return `
    <div class="page-grid">
      <div class="report-card">
        <h3>Daily Sales Report</h3>
        <p>Revenue, orders, average ticket, payment mix for any day.</p>
        <button class="btn" style="margin-top:10px;width:fit-content">Generate ${icon("arrow-right")}</button>
      </div>
      <div class="report-card">
        <h3>Weekly P&amp;L</h3>
        <p>Profit &amp; loss with food cost, labor and overhead breakdown.</p>
        <button class="btn" style="margin-top:10px;width:fit-content">Generate ${icon("arrow-right")}</button>
      </div>
      <div class="report-card">
        <h3>Monthly Tax Summary</h3>
        <p>VAT, withholding and income tax ready for accountant.</p>
        <button class="btn" style="margin-top:10px;width:fit-content">Generate ${icon("arrow-right")}</button>
      </div>
      <div class="report-card">
        <h3>Inventory Valuation</h3>
        <p>Current stock value and variance vs last count.</p>
        <button class="btn" style="margin-top:10px;width:fit-content">Generate ${icon("arrow-right")}</button>
      </div>
      <div class="report-card">
        <h3>Staff Hours &amp; Cost</h3>
        <p>Hours worked, overtime and labor cost % of sales.</p>
        <button class="btn" style="margin-top:10px;width:fit-content">Generate ${icon("arrow-right")}</button>
      </div>
      <div class="report-card">
        <h3>Menu Performance</h3>
        <p>Contribution margin and popularity of every dish.</p>
        <button class="btn" style="margin-top:10px;width:fit-content">Generate ${icon("arrow-right")}</button>
      </div>
    </div>
  `;
}

/* ---------- page router ---------- */

function renderPage(): void {
  const content = $("#pageContent");
  const title = $("#pageTitle");
  title.textContent = state.activeNav;

  switch (state.activeNav) {
    case "Dashboard":
      content.innerHTML = renderDashboard();
      renderPayment();
      renderChart();
      animateCounters();
      break;
    case "Analytics":
      content.innerHTML = renderAnalytics();
      break;
    case "Transactions":
      content.innerHTML = renderTransactionsPage();
      renderTable();
      bindTableEvents();
      break;
    case "Budgets":
      content.innerHTML = renderBudgets();
      break;
    case "Investments":
      content.innerHTML = renderInvestments();
      break;
    case "Goals":
      content.innerHTML = renderGoals();
      break;
    case "Reports":
      content.innerHTML = renderReports();
      break;
  }

  // re-bind page-specific listeners that live inside content
  content.querySelectorAll("[data-goto]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const page = (el as HTMLElement).dataset.goto as Page;
      if (page) {
        state.activeNav = page;
        document.querySelectorAll("#nav a").forEach((n) => n.classList.toggle("active", (n as HTMLElement).dataset.nav === page));
        renderPage();
      }
    });
  });

  const rangeSeg = content.querySelector("#rangeSeg");
  if (rangeSeg) {
    rangeSeg.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-range]");
      if (!btn) return;
      state.range = btn.dataset.range as Range;
      rangeSeg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
      renderChart();
    });
  }

  const paymentPanel = content.querySelector("#paymentPanel");
  if (paymentPanel) {
    paymentPanel.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-payment]");
      if (!btn) return;
      state.payment = btn.dataset.payment as PaymentMethod;
      renderPayment();
    });
  }
}

/* ---------- payment ---------- */

function renderPayment(): void {
  const pm = paymentMethods[state.payment];
  const panel = document.querySelector("#paymentPanel");
  if (!panel) return;

  const themes: Record<PaymentMethod, { gradient: string }> = {
    telebirr: { gradient: "linear-gradient(145deg, #0f3d2e 0%, #1a5c45 40%, #0d2f24 100%)" },
    cash: { gradient: "linear-gradient(145deg, #2a2c2e 0%, #3a3d40 50%, #1f2123 100%)" },
    cbe: { gradient: "linear-gradient(145deg, #0c2d4a 0%, #164e7a 40%, #0a2238 100%)" },
  };

  panel.innerHTML = `
    <div class="panel-head"><h2>Payment Methods</h2></div>
    <div class="payment-switch">
      ${(["telebirr", "cash", "cbe"] as PaymentMethod[])
        .map((key) => `<button data-payment="${key}" class="${key === state.payment ? "active" : ""}">${paymentMethods[key].name}</button>`)
        .join("")}
    </div>
    <div class="payment-visual" style="background:${themes[state.payment].gradient}">
      <div class="pv-top">
        <span class="pv-brand">${pm.name}</span>
        <span class="pv-chip">${icon("chip")}</span>
      </div>
      <div class="pv-number">${pm.account}</div>
      <div class="pv-bottom">
        <div>
          <small>Available Balance</small>
          <strong>${usd(pm.balance)}</strong>
        </div>
        <div class="pv-change ${pm.change >= 0 ? "up" : "down"}">${pm.change >= 0 ? "+" : ""}${pm.change}%</div>
      </div>
    </div>
    <div class="panel-head spend-head"><h3>Spending this month</h3></div>
    <div class="spend-value">
      <strong>${usd(pm.spent)}</strong>
      <small>of ${usd(pm.limit)} limit</small>
    </div>
    <div class="meter" id="meter"></div>
    <div class="limit">Monthly Limit: <strong>${usd(pm.limit)}</strong></div>
  `;

  const meter = panel.querySelector("#meter");
  if (meter) {
    const bars = 30;
    const filled = Math.round((pm.spent / pm.limit) * bars);
    meter.innerHTML = Array.from({ length: bars }, (_, i) => `<span class="${i < filled ? "on" : ""}" style="--d:${i * 20}ms"></span>`).join("");
  }
}

/* ---------- counters ---------- */

function animateCounters(): void {
  document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    const isPct = el.textContent?.includes("%");
    const start = performance.now();
    const dur = 900;
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = target * eased;
      el.textContent = isPct ? val.toFixed(1) + "%" : usd(val);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/* ---------- chart ---------- */

function seriesFor(range: Range): MonthPoint[] {
  if (range === "Monthly") return cashFlow;
  if (range === "Weekly") {
    const labels = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];
    return labels.map((month, i) => ({
      month,
      revenue: 18000 + Math.round(Math.sin(i * 0.9) * 4000 + i * 800),
      expenses: 14000 + Math.round(Math.cos(i * 0.7) * 3000 + i * 500),
    }));
  }
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return labels.map((month, i) => ({
    month,
    revenue: 2200 + Math.round(Math.sin(i) * 600 + 400),
    expenses: 1600 + Math.round(Math.cos(i * 1.3) * 500 + 300),
  }));
}

const niceMax = (v: number): number => {
  const step = Math.pow(10, Math.floor(Math.log10(v || 1)));
  return Math.ceil(v / (step / 2)) * (step / 2);
};

function renderChart(): void {
  const svgEl = document.querySelector("#chart");
  const wrap = document.querySelector("#chartWrap");
  const tooltip = document.querySelector("#tooltip");
  if (!svgEl || !wrap || !tooltip) return;

  const svg = svgEl as SVGSVGElement;
  const data = seriesFor(state.range);
  const W = (wrap as HTMLElement).clientWidth;
  const H = (wrap as HTMLElement).clientHeight;
  const pad = { top: 18, right: 16, bottom: 32, left: 52 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;

  const max = niceMax(Math.max(...data.flatMap((d) => [d.revenue, d.expenses])) * 1.15);
  const ticks = 5;
  const x = (i: number): number => pad.left + (iw * i) / Math.max(data.length - 1, 1);
  const y = (v: number): number => pad.top + ih - (v / max) * ih;

  const stepPath = (key: "revenue" | "expenses"): string =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");

  const revenuePath = stepPath("revenue");
  const expensesPath = stepPath("expenses");
  const areaPath = `${revenuePath} L${x(data.length - 1)},${pad.top + ih} L${x(0)},${pad.top + ih} Z`;
  const fmtTick = (v: number): string => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`);

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = `
    <defs>
      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#22c55e" stop-opacity="0.45"/>
        <stop offset="55%" stop-color="#22c55e" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#22c55e" stop-opacity="0"/>
      </linearGradient>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    ${Array.from({ length: ticks + 1 }, (_, i) => {
      const v = (max / ticks) * i;
      const yy = y(v);
      return `<line x1="${pad.left}" y1="${yy}" x2="${W - pad.right}" y2="${yy}" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
        <text x="${pad.left - 10}" y="${yy + 4}" class="axis" text-anchor="end">${fmtTick(v)}</text>`;
    }).join("")}
    ${data.map((d, i) => (W < 520 && i % 2 ? "" : `<text x="${x(i)}" y="${H - 10}" class="axis" text-anchor="middle">${d.month}</text>`)).join("")}
    <path d="${areaPath}" fill="url(#areaGrad)"/>
    <path d="${expensesPath}" class="line-exp" fill="none" filter="url(#glowRed)"/>
    <path d="${revenuePath}" class="line-inc" fill="none" filter="url(#glow)"/>
    <line id="cursor" class="cursor" y1="${pad.top}" y2="${pad.top + ih}" visibility="hidden"/>
    <circle id="dotInc" r="5.5" class="dot-inc" visibility="hidden"/>
    <circle id="dotExp" r="4.5" class="dot-exp" visibility="hidden"/>
    <rect x="${pad.left}" y="${pad.top}" width="${iw}" height="${ih}" fill="transparent" id="hit"/>
  `;

  const cursor = svg.querySelector("#cursor") as SVGLineElement;
  const dotInc = svg.querySelector("#dotInc") as SVGCircleElement;
  const dotExp = svg.querySelector("#dotExp") as SVGCircleElement;
  const hit = svg.querySelector("#hit") as SVGRectElement;
  const tip = tooltip as HTMLElement;

  const show = (i: number): void => {
    const d = data[i];
    const cx = x(i);
    cursor.setAttribute("x1", String(cx));
    cursor.setAttribute("x2", String(cx));
    dotInc.setAttribute("cx", String(cx));
    dotInc.setAttribute("cy", String(y(d.revenue)));
    dotExp.setAttribute("cx", String(cx));
    dotExp.setAttribute("cy", String(y(d.expenses)));
    [cursor, dotInc, dotExp].forEach((el) => el.setAttribute("visibility", "visible"));

    tip.innerHTML = `
      <div class="tt-title">${d.month.toUpperCase()}</div>
      <div class="tt-row"><i class="sw inc"></i>Revenue <b>${usd(d.revenue)}</b></div>
      <div class="tt-row"><i class="sw exp"></i>Expenses <b>${usd(d.expenses)}</b></div>
      <div class="tt-row" style="margin-top:8px;padding-top:6px;border-top:1px solid var(--border)">
        <span style="color:var(--muted);font-size:11px">Net</span>
        <b style="color:${d.revenue - d.expenses >= 0 ? "#22c55e" : "#ef4444"}">${usd(d.revenue - d.expenses)}</b>
      </div>`;
    tip.hidden = false;
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.max(0, cx + 16 + tw > W ? cx - tw - 16 : cx + 16)}px`;
    tip.style.top = `${Math.max(8, y(Math.max(d.revenue, d.expenses)) - 40)}px`;
  };

  const hide = (): void => {
    [cursor, dotInc, dotExp].forEach((el) => el.setAttribute("visibility", "hidden"));
    tip.hidden = true;
  };

  hit.addEventListener("pointermove", (e: PointerEvent) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - pad.left) / iw) * (data.length - 1));
    show(Math.max(0, Math.min(data.length - 1, i)));
  });
  hit.addEventListener("pointerleave", hide);

  if (state.range === "Monthly") show(9);
  else if (state.range === "Weekly") show(3);
  else show(2);
}

/* ---------- table ---------- */

function filtered(): Transaction[] {
  const q = state.query.trim().toLowerCase();
  return transactions.filter(
    (t) =>
      (state.statusFilter === "All" || t.status === state.statusFilter) &&
      (!q || [t.id, t.description, t.category, t.status].some((s) => s.toLowerCase().includes(q))),
  );
}

function renderTable(): void {
  const tbody = document.querySelector("#tbody");
  if (!tbody) return;

  const rows = filtered();
  const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * state.pageSize;
  const pageRows = rows.slice(start, start + state.pageSize);

  tbody.innerHTML = pageRows.length
    ? pageRows
        .map((t) => {
          const bg = categoryColor[t.category];
          return `
      <tr class="${state.selected.has(t.id) ? "selected" : ""}">
        <td><input type="checkbox" data-id="${t.id}" ${state.selected.has(t.id) ? "checked" : ""}/></td>
        <td class="mono">${t.id}</td>
        <td><span class="merchant"><span class="m-icon" style="background:${bg};color:#fff">${escapeHtml(t.description[0])}</span>${escapeHtml(t.description)}</span></td>
        <td><span class="cat"><i style="background:${bg}"></i>${t.category}</span></td>
        <td>${fmtDate(t.date)}</td>
        <td class="mono">${usd(Math.abs(t.amount))}</td>
        <td><span class="status ${t.status.toLowerCase()}">${t.status}</span></td>
        <td><button class="icon-btn row-more">${icon("dots-h")}</button></td>
      </tr>`;
        })
        .join("")
    : `<tr><td colspan="8" class="empty">No transactions match.</td></tr>`;

  const showing = document.querySelector("#showing");
  const pageLabel = document.querySelector("#pageLabel");
  if (showing) showing.textContent = `Showing ${pageRows.length} of ${rows.length}`;
  if (pageLabel) pageLabel.textContent = `Page ${state.page} of ${pages}`;

  const prev = document.querySelector("#prev") as HTMLButtonElement | null;
  const next = document.querySelector("#next") as HTMLButtonElement | null;
  if (prev) prev.disabled = state.page <= 1;
  if (next) next.disabled = state.page >= pages;
}

function bindTableEvents(): void {
  const tableSearch = document.querySelector("#tableSearch") as HTMLInputElement | null;
  if (tableSearch) {
    tableSearch.addEventListener("input", (e) => {
      state.query = (e.target as HTMLInputElement).value;
      state.page = 1;
      renderTable();
    });
  }

  const filterBtn = document.querySelector("#filterBtn");
  const menu = document.querySelector("#filterMenu") as HTMLElement | null;
  if (filterBtn && menu) {
    filterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    menu.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-status]");
      if (!btn) return;
      state.statusFilter = btn.dataset.status as State["statusFilter"];
      state.page = 1;
      menu.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
      menu.hidden = true;
      renderTable();
    });
  }

  document.querySelector("#prev")?.addEventListener("click", () => {
    state.page--;
    renderTable();
  });
  document.querySelector("#next")?.addEventListener("click", () => {
    state.page++;
    renderTable();
  });

  document.querySelector("#tbody")?.addEventListener("change", (e) => {
    const cb = e.target as HTMLInputElement;
    const id = cb.dataset.id;
    if (!id) return;
    if (cb.checked) state.selected.add(id);
    else state.selected.delete(id);
    renderTable();
  });
}

/* ---------- theme ---------- */

function applyTheme(theme: State["theme"]): void {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll<HTMLButtonElement>("[data-theme-btn]").forEach((b) => b.classList.toggle("active", b.dataset.themeBtn === theme));
  try {
    localStorage.setItem("bistro-theme", theme);
  } catch {
    /* ignore */
  }
}

/* ---------- global events ---------- */

function bindEvents(): void {
  $("#themeToggle").addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-theme-btn]");
    if (btn) applyTheme(btn.dataset.themeBtn as State["theme"]);
  });

  $("#nav").addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("[data-nav]");
    if (!a) return;
    e.preventDefault();
    state.activeNav = a.dataset.nav as Page;
    document.querySelectorAll("#nav a").forEach((n) => n.classList.toggle("active", n === a));
    document.body.classList.remove("nav-open");
    renderPage();
  });

  $("#menuBtn").addEventListener("click", () => document.body.classList.add("nav-open"));
  $("#scrim").addEventListener("click", () => document.body.classList.remove("nav-open"));

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      ($("#globalSearch") as HTMLInputElement).focus();
    }
    if (e.key === "Escape") document.body.classList.remove("nav-open");
  });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (state.activeNav === "Dashboard") renderChart();
    }, 120);
  });
}

/* ---------- boot ---------- */

function init(): void {
  renderShell();
  let saved: string | null = null;
  try {
    saved = localStorage.getItem("bistro-theme");
  } catch {
    /* ignore */
  }
  applyTheme(saved === "light" ? "light" : "dark");
  bindEvents();
  renderPage();
}

init();
