import "./style.css";
import {
  budgets,
  cashFlow,
  categoryColor,
  dailyPattern,
  goals,
  paymentMethods,
  peakHours,
  stats,
  topDishes,
  transactions,
  user,
  type PaymentMethod,
  type Status,
  type Transaction,
  type When,
} from "./data";
import { icon } from "./icons";
import { LANGS, dayLong, dayShort, monthShort, translate, type Lang } from "./i18n";

/* ---------- helpers ---------- */

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T => {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`Element not found: ${sel}`);
  return el;
};

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/* ---------- settings (persisted on this device) ---------- */

type Range = "Daily" | "Weekly" | "Monthly";
type ThemePref = "dark" | "light" | "system";
type CurrencyStyle = "code" | "birr";
type Page =
  | "Dashboard"
  | "Analytics"
  | "Transactions"
  | "Budgets"
  | "Investments"
  | "Goals"
  | "Reports"
  | "Settings"
  | "Help & Support";

interface Settings {
  lang: Lang;
  theme: ThemePref;
  glow: boolean;
  reduceMotion: boolean;
  currency: CurrencyStyle;
  defaultRange: Range;
  defaultPayment: PaymentMethod;
  showAlert: boolean;
  failedAlerts: boolean;
  budgetWarn: number;
}

const DEFAULTS: Settings = {
  lang: "en",
  theme: "dark",
  glow: true,
  reduceMotion: false,
  currency: "code",
  defaultRange: "Monthly",
  defaultPayment: "telebirr",
  showAlert: true,
  failedAlerts: true,
  budgetWarn: 90,
};

const STORE_KEY = "bistro-settings";
const RANGES: Range[] = ["Daily", "Weekly", "Monthly"];
const PAYMENTS: PaymentMethod[] = ["telebirr", "cash", "cbe"];

function loadSettings(): Settings {
  let s: Settings = { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) s = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
    else {
      const legacy = localStorage.getItem("bistro-theme"); // from the previous version
      if (legacy === "light" || legacy === "dark") s.theme = legacy;
    }
  } catch {
    /* storage unavailable — use defaults */
  }
  if (!LANGS.some((l) => l.code === s.lang)) s.lang = "en";
  if (!RANGES.includes(s.defaultRange)) s.defaultRange = "Monthly";
  if (!PAYMENTS.includes(s.defaultPayment)) s.defaultPayment = "telebirr";
  return s;
}

function saveSettings(): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

const settings = loadSettings();

/* ---------- view state ---------- */

interface State {
  page: number;
  pageSize: number;
  query: string;
  statusFilter: Status | "All";
  selected: Set<string>;
  range: Range;
  activeNav: Page;
  payment: PaymentMethod;
}

const state: State = {
  page: 1,
  pageSize: 10,
  query: "",
  statusFilter: "All",
  selected: new Set(),
  range: settings.defaultRange,
  activeNav: "Dashboard",
  payment: settings.defaultPayment,
};

/* ---------- localization & formatting ---------- */

const t = (s: string, vars?: Record<string, string | number>): string => translate(s, settings.lang, vars);

const money = (n: number, digits = 0): string => {
  const num = n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return settings.currency === "birr" ? `${num} ${t("Birr")}` : `ETB ${num}`;
};

const pad2 = (n: number): string => String(n).padStart(2, "0");
const fmtShort = (d: Date): string => `${monthShort(settings.lang)[d.getMonth()]} ${pad2(d.getDate())}`;
const fmtDate = (d: Date): string => `${fmtShort(d)}, ${d.getFullYear()}`;
const fmtWhen = (w: When): string => (w instanceof Date ? fmtShort(w) : t(w));
const signed = (n: number): string => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? "⌘" : "Ctrl";

/* ---------- appearance ---------- */

const lightQuery = window.matchMedia("(prefers-color-scheme: light)");
const resolvedTheme = (): "dark" | "light" =>
  settings.theme === "system" ? (lightQuery.matches ? "light" : "dark") : settings.theme;
const motionOff = (): boolean => settings.reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function applyAppearance(): void {
  const root = document.documentElement;
  const theme = resolvedTheme();
  root.dataset.theme = theme;
  root.lang = settings.lang;
  root.classList.toggle("no-glow", !settings.glow);
  root.classList.toggle("reduce-motion", settings.reduceMotion);
  document.querySelectorAll<HTMLElement>("[data-theme-btn]").forEach((b) => {
    const on = b.dataset.themeBtn === theme;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", String(on));
  });
  document.querySelectorAll<HTMLElement>("[data-lang]").forEach((b) => {
    const on = b.dataset.lang === settings.lang;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", String(on));
  });
}

lightQuery.addEventListener("change", () => {
  if (settings.theme === "system") applyAppearance();
});

/* ---------- layout ---------- */

const mainNav: { label: Page; icon: string }[] = [
  { label: "Dashboard", icon: "home" },
  { label: "Analytics", icon: "bars" },
  { label: "Transactions", icon: "receipt" },
  { label: "Budgets", icon: "wallet" },
  { label: "Investments", icon: "trend-up" },
  { label: "Goals", icon: "target" },
  { label: "Reports", icon: "file" },
];

const supportNav: { label: Page; icon: string }[] = [
  { label: "Settings", icon: "settings" },
  { label: "Help & Support", icon: "help" },
];

const navLink = (n: { label: Page; icon: string }): string =>
  `<a href="#" data-nav="${escapeHtml(n.label)}" class="${n.label === state.activeNav ? "active" : ""}">${icon(n.icon)}<span>${t(n.label)}</span></a>`;

function renderShell(): void {
  const hasFailed = transactions.some((x) => x.status === "Failed");
  $("#app").innerHTML = `
  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <span class="brand-mark">${icon("logo")}</span>
        <span>Bistro OS</span>
      </div>

      <button class="profile">
        <span class="avatar">${user.name.split(" ").map((p) => p[0]).join("")}</span>
        <span class="profile-text">
          <strong>${escapeHtml(user.name)}</strong>
          <small>${escapeHtml(user.restaurant)}</small>
        </span>
        ${icon("chevrons")}
      </button>

      <p class="nav-heading">${t("Main menu")}</p>
      <nav class="nav" aria-label="${t("Main menu")}">${mainNav.map(navLink).join("")}</nav>

      <div class="sidebar-bottom">
        <p class="nav-heading">${t("Support")}</p>
        <nav class="nav" aria-label="${t("Support")}">${supportNav.map(navLink).join("")}</nav>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <button class="icon-btn menu-btn" id="menuBtn" aria-label="${t("Open menu")}">${icon("menu")}</button>
        <h1 id="pageTitle"></h1>
        <div class="topbar-right">
          <label class="search">
            ${icon("search")}
            <input type="text" placeholder="${t("Search")}" id="globalSearch" aria-label="${t("Search transactions")}" />
            <kbd>${modKey} K</kbd>
          </label>
          <div class="seg-toggle lang-toggle" role="group" aria-label="${t("Language")}">
            ${LANGS.map((l) => `<button data-lang="${l.code}" lang="${l.code}" title="${l.name}">${l.short}</button>`).join("")}
          </div>
          <button class="icon-btn notif" aria-label="${t("Notifications")}">
            ${icon("bell")}${settings.failedAlerts && hasFailed ? `<span class="dot"></span>` : ""}
          </button>
          <div class="seg-toggle theme-toggle" role="group" aria-label="${t("Theme")}">
            <button data-theme-btn="dark" aria-label="${t("Dark")}" title="${t("Dark")}">${icon("moon")}</button>
            <button data-theme-btn="light" aria-label="${t("Light")}" title="${t("Light")}">${icon("sun")}</button>
          </div>
        </div>
      </header>

      <div id="pageContent"></div>
    </main>
    <div class="scrim" id="scrim"></div>
  </div>`;
}

/* ---------- Dashboard ---------- */

function renderDashboard(): string {
  const alert = settings.showAlert
    ? `<div class="alert" role="status">
        <span>${icon("warning")} <strong>${t("Alert:")}</strong> ${t("Food cost is running 1.2% above target this week.")}</span>
        <a href="#" data-goto="Budgets">${t("Review budgets")} ${icon("arrow-right")}</a>
      </div>`
    : "";

  return `
    ${alert}
    <section class="grid">
      <div class="stats">
        ${stats
          .map((s, i) => {
            const good = s.lowerIsBetter ? s.change <= 0 : s.change >= 0;
            return `
          <article class="panel stat${i === 0 ? " featured glow" : ""}">
            <div class="stat-head">
              <span class="stat-icon">${icon(s.icon)}</span>
              <span class="stat-label">${t(s.label)}</span>
              <button class="more" aria-label="${t("More")}">${icon("dots-v")}</button>
            </div>
            <div class="stat-value" data-count="${s.value}" data-unit="${s.unit}">${s.unit === "%" ? "0.0%" : money(0)}</div>
            <div class="stat-foot">
              <span>${t(s.note)}</span>
              <span class="badge ${good ? "up" : "down"}">${signed(s.change)}</span>
            </div>
          </article>`;
          })
          .join("")}
      </div>

      <article class="panel chart-panel">
        <div class="panel-head">
          <h2>${t("Revenue vs Expenses")}</h2>
          <div class="segmented" id="rangeSeg" role="group">
            ${RANGES.map((r) => `<button data-range="${r}" class="${r === state.range ? "active" : ""}">${t(r)}</button>`).join("")}
          </div>
        </div>
        <div class="chart-wrap" id="chartWrap">
          <svg id="chart" role="img" aria-label="${t("Cash flow chart")}"></svg>
          <div class="tooltip" id="tooltip" hidden></div>
        </div>
      </article>

      <article class="panel cards-panel" id="paymentPanel"></article>
    </section>

    <article class="panel table-panel">
      <div class="panel-head">
        <h2>${t("Recent Transactions")}</h2>
        <button class="btn" data-goto="Transactions">${t("View all")} ${icon("arrow-right")}</button>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>${t("ID")}</th>
              <th>${t("Description")}</th>
              <th>${t("Category")}</th>
              <th>${t("Date")}</th>
              <th>${t("Amount")}</th>
              <th>${t("Status")}</th>
            </tr>
          </thead>
          <tbody>
            ${transactions
              .slice(0, 6)
              .map(
                (x) => `
              <tr>
                <td class="mono">${x.id}</td>
                <td>${escapeHtml(t(x.description))}</td>
                <td><span class="cat"><i style="background:${categoryColor[x.category]}"></i>${t(x.category)}</span></td>
                <td>${fmtDate(x.date)}</td>
                <td class="mono">${money(Math.abs(x.amount))}</td>
                <td><span class="status ${x.status.toLowerCase()}">${t(x.status)}</span></td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

/* ---------- Analytics ---------- */

function renderAnalytics(): string {
  const max = Math.max(...peakHours.map((x) => x.orders));
  return `
    <div class="page-grid">
      <article class="panel">
        <div class="panel-head"><h2>${t("Top Selling Dishes")}</h2></div>
        ${topDishes
          .map(
            (d) => `
          <div class="dish-row">
            <div class="grow">
              <strong>${t(d.name)}</strong>
              <div class="dish-meta">${d.sold} ${t("sold")} · ${money(d.revenue)}</div>
              <div class="progress-bar"><i style="width:${d.pct * 3}%;background:var(--revenue)"></i></div>
            </div>
            <span class="badge up">${d.pct}%</span>
          </div>`,
          )
          .join("")}
      </article>

      <article class="panel">
        <div class="panel-head"><h2>${t("Peak Hours (Orders)")}</h2></div>
        <div class="peak-bars">
          ${peakHours
            .map((p) => {
              const h = Math.round((p.orders / max) * 100);
              return `<div title="${p.orders}"><div class="bar${p.orders === max ? " top" : ""}" style="height:${h}%"></div><small>${p.hour}</small></div>`;
            })
            .join("")}
        </div>
        <p class="note">${t("Dinner service (19–20) is your strongest window. Consider staffing accordingly.")}</p>
      </article>

      <article class="panel">
        <div class="panel-head"><h2>${t("Quick Insights")}</h2></div>
        <div class="insight-list">
          <div class="report-card">
            <h3>${t("Average Order Value")}</h3>
            <strong class="insight-value">${money(420)}</strong>
            <p>${t("+8% vs last month")}</p>
          </div>
          <div class="report-card">
            <h3>${t("Table Turnover")}</h3>
            <strong class="insight-value">2.4×</strong>
            <p>${t("Per table during dinner")}</p>
          </div>
          <div class="report-card">
            <h3>${t("Waste Rate")}</h3>
            <strong class="insight-value bad">4.1%</strong>
            <p>${t("Target: under 3%")}</p>
          </div>
        </div>
      </article>
    </div>
  `;
}

/* ---------- Transactions ---------- */

function renderTransactionsPage(): string {
  return `
    <article class="panel table-panel">
      <div class="panel-head">
        <h2>${t("All Transactions")}</h2>
        <div class="table-tools">
          <label class="search small">
            ${icon("search")}
            <input type="text" placeholder="${t("Search")}" id="tableSearch" value="${escapeHtml(state.query)}" aria-label="${t("Search transactions")}" />
          </label>
          <div class="filter-wrap">
            <button class="btn" id="filterBtn">${icon("filter")} ${t("Filter")}</button>
            <div class="menu" id="filterMenu" hidden>
              ${(["All", "Success", "Pending", "Failed"] as const)
                .map((s) => `<button data-status="${s}" class="${s === state.statusFilter ? "active" : ""}">${t(s)}</button>`)
                .join("")}
            </div>
          </div>
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" id="selectAll" aria-label="${t("Select all")}" /></th>
              <th>${t("Transaction ID")}</th>
              <th>${t("Description")}</th>
              <th>${t("Category")}</th>
              <th>${t("Date")}</th>
              <th>${t("Amount")}</th>
              <th>${t("Status")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
      <div class="table-foot">
        <span id="showing"></span>
        <div class="pager">
          <button class="icon-btn" id="prev" aria-label="${t("Previous page")}">${icon("chevron-left")}</button>
          <span id="pageLabel"></span>
          <button class="icon-btn" id="next" aria-label="${t("Next page")}">${icon("chevron-right")}</button>
        </div>
      </div>
    </article>
  `;
}

/* ---------- Budgets ---------- */

function renderBudgets(): string {
  return `
    <div class="page-grid">
      ${budgets
        .map((b) => {
          const raw = (b.spent / b.allocated) * 100;
          const level = raw > 100 ? "down" : raw >= settings.budgetWarn ? "warn" : "up";
          const bar = level === "down" ? "var(--expense)" : level === "warn" ? "var(--warn)" : categoryColor[b.name];
          return `
          <article class="panel">
            <div class="panel-head">
              <h2>${t(b.name)}</h2>
              <span class="badge ${level}">${Math.round(raw)}%</span>
            </div>
            <div class="budget-amount">${money(b.spent)}</div>
            <div class="budget-of">${t("of {x} allocated", { x: money(b.allocated) })}</div>
            <div class="progress-bar"><i style="width:${Math.min(100, Math.round(raw))}%;background:${bar}"></i></div>
          </article>`;
        })
        .join("")}
    </div>
  `;
}

/* ---------- Investments ---------- */

function renderInvestments(): string {
  return `
    <div class="page-grid">
      <article class="panel">
        <div class="panel-head"><h2>${t("Equipment")}</h2></div>
        <div class="report-card">
          <h3>${t("New Industrial Oven")}</h3>
          <p>${t("Planned Q1 2027 · Est. ETB 185,000")}</p>
          <div class="progress-bar"><i style="width:35%;background:var(--info)"></i></div>
          <small>${t("35% funded from reserves")}</small>
        </div>
        <div class="report-card">
          <h3>${t("POS Terminal Upgrade")}</h3>
          <p>${t("3 new terminals · ETB 42,000")}</p>
          <div class="progress-bar"><i style="width:80%;background:var(--revenue)"></i></div>
          <small>${t("Almost ready")}</small>
        </div>
      </article>
      <article class="panel">
        <div class="panel-head"><h2>${t("Expansion")}</h2></div>
        <div class="report-card">
          <h3>${t("Second Branch – CMC")}</h3>
          <p>${t("Feasibility study complete. Target open date: mid-2027.")}</p>
          <strong class="projection">${t("ETB 1.2M projected")}</strong>
        </div>
        <div class="report-card">
          <h3>${t("Delivery Fleet")}</h3>
          <p>${t("2 motorcycles + branded boxes")}</p>
          <div class="progress-bar"><i style="width:60%;background:var(--muted)"></i></div>
        </div>
      </article>
    </div>
  `;
}

/* ---------- Goals ---------- */

function renderGoals(): string {
  return `
    <div class="page-grid single">
      ${goals
        .map((g) => {
          const ratio = g.lowerIsBetter ? g.target / g.current : g.current / g.target;
          const pct = Math.min(100, Math.round(ratio * 100));
          const fmt = (v: number): string => (g.unit === "ETB" ? money(v) : `${v}${g.unit}`);
          const due = g.deadline ? t("Due {x}", { x: fmtShort(g.deadline) }) : t("Ongoing");
          return `
          <div class="goal-card">
            <div class="goal-top">
              <strong>${t(g.title)}</strong>
              <span class="goal-due">${due}</span>
            </div>
            <div class="goal-value">${fmt(g.current)}<small> / ${fmt(g.target)}</small></div>
            <div class="progress-bar"><i style="width:${pct}%;background:${pct >= 90 ? "var(--revenue)" : "var(--muted)"}"></i></div>
          </div>`;
        })
        .join("")}
    </div>
  `;
}

/* ---------- Reports ---------- */

const reports: [string, string][] = [
  ["Daily Sales Report", "Revenue, orders, average ticket, payment mix for any day."],
  ["Weekly P&L", "Profit & loss with food cost, labor and overhead breakdown."],
  ["Monthly Tax Summary", "VAT, withholding and income tax ready for accountant."],
  ["Inventory Valuation", "Current stock value and variance vs last count."],
  ["Staff Hours & Cost", "Hours worked, overtime and labor cost % of sales."],
  ["Menu Performance", "Contribution margin and popularity of every dish."],
];

function renderReports(): string {
  return `
    <div class="page-grid">
      ${reports
        .map(
          ([title, desc]) => `
        <div class="report-card">
          <h3>${escapeHtml(t(title))}</h3>
          <p>${escapeHtml(t(desc))}</p>
          <button class="btn">${t("Generate")} ${icon("arrow-right")}</button>
        </div>`,
        )
        .join("")}
    </div>
  `;
}

/* ---------- Settings ---------- */

function choice<K extends keyof Settings>(key: K, options: { value: Settings[K]; label: string; lang?: string }[]): string {
  return `<div class="segmented wrap" role="group">
    ${options
      .map((o) => {
        const on = settings[key] === o.value;
        return `<button data-setting-key="${key}" data-setting-value="${o.value}" class="${on ? "active" : ""}" aria-pressed="${on}"${o.lang ? ` lang="${o.lang}"` : ""}>${o.label}</button>`;
      })
      .join("")}
  </div>`;
}

const toggle = (key: keyof Settings, label: string): string =>
  `<label class="switch"><input type="checkbox" role="switch" data-setting-toggle="${key}" ${settings[key] ? "checked" : ""} aria-label="${label}" /><span></span></label>`;

const row = (title: string, desc: string, control: string): string =>
  `<div class="setting-row"><div class="setting-text"><strong>${title}</strong>${desc ? `<small>${desc}</small>` : ""}</div>${control}</div>`;

function renderSettings(): string {
  return `
    <p class="page-intro">${t("Personalize Bistro OS for how you run your restaurant.")}</p>
    <div class="settings-grid">
      <article class="panel">
        <div class="panel-head"><h2>${t("Appearance")}</h2></div>
        ${row(t("Theme"), "", choice("theme", [
          { value: "dark", label: t("Dark") },
          { value: "light", label: t("Light") },
          { value: "system", label: t("System") },
        ]))}
        ${row(t("Cursor glow"), t("A soft light that follows your cursor near cards and buttons."), toggle("glow", t("Cursor glow")))}
        ${row(t("Reduce motion"), t("Turn off number and chart animations."), toggle("reduceMotion", t("Reduce motion")))}
      </article>

      <article class="panel">
        <div class="panel-head"><h2>${t("Language & region")}</h2></div>
        ${row(t("Language"), t("Applies to menus, labels, dates and reports."), choice("lang", LANGS.map((l) => ({ value: l.code, label: l.name, lang: l.code }))))}
        ${row(t("Currency format"), "", choice("currency", [
          { value: "code", label: "ETB 1,000" },
          { value: "birr", label: `1,000 ${t("Birr")}` },
        ]))}
      </article>

      <article class="panel">
        <div class="panel-head"><h2>${t("Dashboard")}</h2></div>
        ${row(t("Default chart range"), "", choice("defaultRange", RANGES.map((r) => ({ value: r, label: t(r) }))))}
        ${row(t("Default payment method"), "", choice("defaultPayment", PAYMENTS.map((p) => ({ value: p, label: t(paymentMethods[p].name) }))))}
        ${row(t("Show alert banner"), t("Shows cost warnings at the top of the Dashboard."), toggle("showAlert", t("Show alert banner")))}
      </article>

      <article class="panel">
        <div class="panel-head"><h2>${t("Alerts")}</h2></div>
        ${row(t("Failed payment alerts"), t("Show a dot on the bell when a payment fails."), toggle("failedAlerts", t("Failed payment alerts")))}
        ${row(t("Budget warning level"), t("Flag a category when spending reaches this share of its budget."), choice("budgetWarn", [80, 90, 100].map((v) => ({ value: v, label: `${v}%` }))))}
      </article>
    </div>
    <div class="settings-foot">
      <small>${t("Settings are saved on this device.")}</small>
      <button class="btn" id="resetSettings">${icon("refresh")} ${t("Reset to defaults")}</button>
    </div>
  `;
}

/* ---------- Help & Support ---------- */

const helpSteps: { icon: string; title: string; body: string }[] = [
  {
    icon: "home",
    title: "Check your day at a glance",
    body: "Open the Dashboard each morning. The four cards show your Total Balance across Telebirr, Cash and CBE, this month's revenue and expenses, and your profit margin against the 35% target.",
  },
  {
    icon: "trend-up",
    title: "Read the revenue chart",
    body: "Switch between Daily, Weekly and Monthly. Hover over the chart to see revenue, expenses and net for any point. The green line is revenue, the red dashed line is expenses; the gap between them is your profit.",
  },
  {
    icon: "wallet",
    title: "Reconcile payments at closing",
    body: "In Payment Methods, pick Telebirr, Cash or CBE and compare the balance with the Telebirr app, the cash drawer count and your bank statement. Find any difference the same day.",
  },
  {
    icon: "receipt",
    title: "Follow up on transactions",
    body: "On Transactions, search by ID, supplier or category and filter by status. Check Pending and Failed payments daily so suppliers and staff are paid on time.",
  },
  {
    icon: "target",
    title: "Keep costs inside budget",
    body: "Budgets shows spending per category. A bar turns orange when it passes your warning level (set in Settings) and red when it goes over budget. Aim to keep food cost under 30% of sales.",
  },
  {
    icon: "file",
    title: "Plan with Goals and Reports",
    body: "Track monthly targets on Goals. Generate the Weekly P&L every Monday and the Monthly Tax Summary at month end for your accountant.",
  },
];

function renderHelp(): string {
  return `
    <div class="help-intro">
      <h2>${t("How to use Bistro OS")}</h2>
      <p>${t("Six habits that keep your numbers accurate and your restaurant profitable.")}</p>
    </div>
    <ol class="help-grid">
      ${helpSteps
        .map(
          (s, i) => `
        <li class="panel help-step">
          <div class="help-step-head">
            <span class="step-num">${i + 1}</span>
            <span class="stat-icon">${icon(s.icon)}</span>
          </div>
          <h3>${escapeHtml(t(s.title))}</h3>
          <p>${escapeHtml(t(s.body))}</p>
        </li>`,
        )
        .join("")}
    </ol>
    <article class="panel help-shortcuts">
      <div class="panel-head"><h2>${icon("keyboard")} ${t("Keyboard shortcuts")}</h2></div>
      <div class="shortcut"><span><kbd>${modKey}</kbd> + <kbd>K</kbd></span>${t("Search transactions")}</div>
      <div class="shortcut"><span><kbd>Esc</kbd></span>${t("Close menus")}</div>
      <div class="help-tip">
        <p>${t("Language, theme and dashboard defaults can be changed in Settings.")}</p>
        <button class="btn" data-goto="Settings">${t("Open Settings")} ${icon("arrow-right")}</button>
      </div>
    </article>
  `;
}

/* ---------- router ---------- */

function renderPage(): void {
  const content = $("#pageContent");
  $("#pageTitle").textContent = t(state.activeNav);

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
    case "Settings":
      content.innerHTML = renderSettings();
      break;
    case "Help & Support":
      content.innerHTML = renderHelp();
      break;
  }
  updateGlow();
}

function go(page: Page): void {
  state.activeNav = page;
  document.querySelectorAll<HTMLElement>("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === page));
  document.body.classList.remove("nav-open");
  renderPage();
  window.scrollTo({ top: 0 });
}

function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  settings[key] = value;
  saveSettings();
  if (key === "defaultRange") state.range = value as Range;
  if (key === "defaultPayment") state.payment = value as PaymentMethod;

  if (key === "lang" || key === "failedAlerts") {
    renderShell(); // nav, topbar and labels all change
    renderPage();
  } else if (key !== "theme" || state.activeNav === "Settings") {
    renderPage();
  }
  applyAppearance();
}

function resetSettings(): void {
  Object.assign(settings, DEFAULTS);
  saveSettings();
  state.range = settings.defaultRange;
  state.payment = settings.defaultPayment;
  renderShell();
  renderPage();
  applyAppearance();
}

/* ---------- payment methods ---------- */

const cardGradients: Record<PaymentMethod, string> = {
  telebirr: "linear-gradient(145deg, #0d3f2e 0%, #17684b 45%, #0a2e21 100%)",
  cash: "linear-gradient(145deg, #2c2a29 0%, #46413c 50%, #201e1c 100%)",
  cbe: "linear-gradient(145deg, #3d1a4c 0%, #642875 45%, #2b1035 100%)",
};

function renderPayment(): void {
  const panel = document.querySelector("#paymentPanel");
  if (!panel) return;
  const pm = paymentMethods[state.payment];
  const net = pm.moneyIn - pm.spent;
  const inPct = Math.round((pm.moneyIn / (pm.moneyIn + pm.spent)) * 100);

  panel.innerHTML = `
    <div class="panel-head"><h2>${t("Payment Methods")}</h2></div>
    <div class="payment-switch" role="group">
      ${PAYMENTS.map(
        (key) =>
          `<button data-payment="${key}" class="glow ${key === state.payment ? "active" : ""}" aria-pressed="${key === state.payment}">${t(paymentMethods[key].name)}</button>`,
      ).join("")}
    </div>
    <div class="pv-wrap glow" data-method="${state.payment}">
      <div class="payment-visual" style="background:${cardGradients[state.payment]}">
        <div class="pv-top">
          <span class="pv-brand">${t(pm.name)}</span>
          <span class="pv-chip">${icon("chip")}</span>
        </div>
        <div class="pv-number">${t(pm.account)}</div>
        <div class="pv-bottom">
          <div>
            <small>${t("Available Balance")}</small>
            <strong>${money(pm.balance)}</strong>
          </div>
          <div class="pv-change ${pm.change >= 0 ? "up" : "down"}">${signed(pm.change)}</div>
        </div>
      </div>
    </div>
    <div class="pm-side">
      <div class="flow">
        <div class="flow-head">
          <h3>${t("This month")}</h3>
          <span class="flow-net ${net >= 0 ? "up" : "down"}">${t("Net")} ${net >= 0 ? "+" : "-"}${money(Math.abs(net))}</span>
        </div>
        <div class="flow-nums">
          <div><small>${t("Money in")}</small><strong class="in">${money(pm.moneyIn)}</strong></div>
          <div><small>${t("Money out")}</small><strong class="out">${money(pm.spent)}</strong></div>
        </div>
        <div class="flow-bar" aria-hidden="true">
          <i class="in" style="width:${inPct}%"></i>
          <i class="out" style="width:${100 - inPct}%"></i>
        </div>
      </div>
      <div class="panel-head activity-head"><h3>${t("Latest activity (ETB)")}</h3></div>
      <ul class="activity">
        ${pm.activity
          .map(
            (a) => `
          <li>
            <span class="act-icon ${a.amount >= 0 ? "in" : "out"}">${icon(a.amount >= 0 ? "arrow-down-left" : "arrow-up-right")}</span>
            <span class="act-text"><strong>${escapeHtml(t(a.label))}</strong><small>${fmtWhen(a.when)}</small></span>
            <span class="act-amount ${a.amount >= 0 ? "in" : "out"}">${a.amount >= 0 ? "+" : "-"}${Math.abs(a.amount).toLocaleString("en-US")}</span>
          </li>`,
          )
          .join("")}
      </ul>
    </div>
  `;
  updateGlow();
}

/* ---------- counters ---------- */

function animateCounters(): void {
  document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    const fmt = (v: number): string => (el.dataset.unit === "%" ? `${v.toFixed(1)}%` : money(v));
    if (motionOff()) {
      el.textContent = fmt(target);
      return;
    }
    const start = performance.now();
    const dur = 900;
    const tick = (now: number): void => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/* ---------- chart ---------- */

interface ChartPoint {
  label: string; // main axis label
  sub?: string; // second axis line (date)
  title: string; // tooltip heading
  revenue: number;
  expenses: number;
  today?: boolean;
}

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function seriesFor(range: Range): ChartPoint[] {
  const L = settings.lang;

  if (range === "Monthly") {
    return cashFlow.map((p, i) => ({ label: monthShort(L)[i], title: monthShort(L)[i], revenue: p.revenue, expenses: p.expenses }));
  }

  const today = startOfDay(new Date());

  if (range === "Weekly") {
    // last 8 weeks, each starting on Monday, ending with the current week
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return Array.from({ length: 8 }, (_, i) => {
      const start = new Date(monday);
      start.setDate(monday.getDate() - (7 - i) * 7);
      return {
        label: `${t("W")}${i + 1}`,
        sub: fmtShort(start),
        title: t("Week of {x}", { x: fmtShort(start) }),
        revenue: 18000 + Math.round(Math.sin(i * 0.9) * 4000 + i * 800),
        expenses: 14000 + Math.round(Math.cos(i * 0.7) * 3000 + i * 500),
        today: i === 7,
      };
    });
  }

  // Daily: the last 7 calendar days ending today, so the weekday labels follow the real week
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dow = d.getDay();
    const bump = (d.getDate() % 3) * 120;
    return {
      label: dayShort(L)[dow],
      sub: pad2(d.getDate()),
      title: `${dayLong(L)[dow]} · ${fmtShort(d)}`,
      revenue: dailyPattern.revenue[dow] + bump,
      expenses: dailyPattern.expenses[dow] + Math.round(bump / 2),
      today: i === 6,
    };
  });
}

const niceMax = (v: number): number => {
  const step = Math.pow(10, Math.floor(Math.log10(v || 1)));
  return Math.ceil(v / (step / 2)) * (step / 2);
};

function renderChart(): void {
  const svgEl = document.querySelector("#chart");
  const wrap = document.querySelector<HTMLElement>("#chartWrap");
  const tip = document.querySelector<HTMLElement>("#tooltip");
  if (!svgEl || !wrap || !tip) return;

  const svg = svgEl as SVGSVGElement;
  const data = seriesFor(state.range);
  const hasSub = data.some((d) => d.sub);
  const W = wrap.clientWidth;
  const H = wrap.clientHeight;
  const pad = { top: 18, right: 16, bottom: hasSub ? 46 : 30, left: 52 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;

  const max = niceMax(Math.max(...data.flatMap((d) => [d.revenue, d.expenses])) * 1.15);
  const ticks = 5;
  const x = (i: number): number => pad.left + (iw * i) / Math.max(data.length - 1, 1);
  const y = (v: number): number => pad.top + ih - (v / max) * ih;
  const linePath = (key: "revenue" | "expenses"): string =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");

  const revenuePath = linePath("revenue");
  const expensesPath = linePath("expenses");
  const areaPath = `${revenuePath} L${x(data.length - 1)},${pad.top + ih} L${x(0)},${pad.top + ih} Z`;
  const fmtTick = (v: number): string => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}K` : `${v}`);
  const skipOdd = W < 520 && data.length > 8;

  const xLabels = data
    .map((d, i) => {
      if (skipOdd && i % 2) return "";
      const cls = `axis${d.today ? " today" : ""}`;
      const main = `<text x="${x(i)}" y="${H - (hasSub ? 26 : 10)}" class="${cls}" text-anchor="middle">${escapeHtml(d.label)}</text>`;
      const sub = d.sub ? `<text x="${x(i)}" y="${H - 9}" class="${cls} sub" text-anchor="middle">${escapeHtml(d.sub)}</text>` : "";
      return main + sub;
    })
    .join("");

  const lastX = x(data.length - 1);
  const todayBand =
    data[data.length - 1]?.today && data.length > 1
      ? `<rect class="today-band" x="${lastX - iw / (data.length - 1) / 2}" y="${pad.top}" width="${iw / (data.length - 1) / 2}" height="${ih}"/>`
      : "";

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = `
    <defs>
      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style="stop-color:var(--revenue)" stop-opacity="0.22"/>
        <stop offset="60%" style="stop-color:var(--revenue)" stop-opacity="0.06"/>
        <stop offset="100%" style="stop-color:var(--revenue)" stop-opacity="0"/>
      </linearGradient>
      <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.6" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    ${todayBand}
    ${Array.from({ length: ticks + 1 }, (_, i) => {
      const v = (max / ticks) * i;
      const yy = y(v);
      return `<line x1="${pad.left}" y1="${yy}" x2="${W - pad.right}" y2="${yy}" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
        <text x="${pad.left - 10}" y="${yy + 4}" class="axis" text-anchor="end">${fmtTick(v)}</text>`;
    }).join("")}
    ${xLabels}
    <path d="${areaPath}" fill="url(#areaGrad)"/>
    <path d="${expensesPath}" class="line-exp" fill="none"/>
    <path d="${revenuePath}" class="line-inc" pathLength="1" fill="none" filter="url(#lineGlow)"/>
    <line id="cursor" class="cursor" y1="${pad.top}" y2="${pad.top + ih}" visibility="hidden"/>
    <circle id="dotInc" r="5" class="dot-inc" visibility="hidden"/>
    <circle id="dotExp" r="4" class="dot-exp" visibility="hidden"/>
    <rect x="${pad.left}" y="${pad.top}" width="${iw}" height="${ih}" fill="transparent" id="hit"/>
  `;

  const cursor = svg.querySelector("#cursor") as SVGLineElement;
  const dotInc = svg.querySelector("#dotInc") as SVGCircleElement;
  const dotExp = svg.querySelector("#dotExp") as SVGCircleElement;
  const hit = svg.querySelector("#hit") as SVGRectElement;

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

    const net = d.revenue - d.expenses;
    tip.innerHTML = `
      <div class="tt-title">${escapeHtml(d.title)}${d.today && state.range === "Daily" ? ` · ${t("Today")}` : ""}</div>
      <div class="tt-row"><i class="sw inc"></i>${t("Revenue")} <b>${money(d.revenue)}</b></div>
      <div class="tt-row"><i class="sw exp"></i>${t("Expenses")} <b>${money(d.expenses)}</b></div>
      <div class="tt-row tt-net">
        <span>${t("Net")}</span>
        <b style="color:${net >= 0 ? "var(--revenue)" : "var(--expense)"}">${money(net)}</b>
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

  // open on the most relevant point: October for monthly, the current week / today otherwise
  show(state.range === "Monthly" ? 9 : data.length - 1);
}

/* ---------- transactions table ---------- */

function filtered(): Transaction[] {
  const q = state.query.trim().toLowerCase();
  return transactions.filter(
    (x) =>
      (state.statusFilter === "All" || x.status === state.statusFilter) &&
      (!q ||
        [x.id, x.description, x.category, x.status, t(x.description), t(x.category), t(x.status)].some((s) =>
          s.toLowerCase().includes(q),
        )),
  );
}

function currentPageRows(): Transaction[] {
  const start = (state.page - 1) * state.pageSize;
  return filtered().slice(start, start + state.pageSize);
}

function renderTable(): void {
  const tbody = document.querySelector("#tbody");
  if (!tbody) return;

  const rows = filtered();
  const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  state.page = Math.min(Math.max(1, state.page), pages);
  const pageRows = currentPageRows();

  tbody.innerHTML = pageRows.length
    ? pageRows
        .map((x) => {
          const bg = categoryColor[x.category];
          const desc = t(x.description);
          const sel = state.selected.has(x.id);
          return `
      <tr class="${sel ? "selected" : ""}">
        <td><input type="checkbox" data-id="${x.id}" ${sel ? "checked" : ""} aria-label="${x.id}"/></td>
        <td class="mono">${x.id}</td>
        <td><span class="merchant"><span class="m-icon" style="background:${bg}">${escapeHtml([...desc][0] ?? "")}</span>${escapeHtml(desc)}</span></td>
        <td><span class="cat"><i style="background:${bg}"></i>${t(x.category)}</span></td>
        <td>${fmtDate(x.date)}</td>
        <td class="mono">${money(Math.abs(x.amount))}</td>
        <td><span class="status ${x.status.toLowerCase()}">${t(x.status)}</span></td>
        <td><button class="icon-btn row-more" aria-label="${t("More")}">${icon("dots-h")}</button></td>
      </tr>`;
        })
        .join("")
    : `<tr><td colspan="8" class="empty">${t("No transactions match.")}</td></tr>`;

  const showing = document.querySelector("#showing");
  const pageLabel = document.querySelector("#pageLabel");
  if (showing) showing.textContent = t("Showing {x} of {y}", { x: pageRows.length, y: rows.length });
  if (pageLabel) pageLabel.textContent = t("Page {x} of {y}", { x: state.page, y: pages });

  const selectAll = document.querySelector<HTMLInputElement>("#selectAll");
  if (selectAll) selectAll.checked = pageRows.length > 0 && pageRows.every((x) => state.selected.has(x.id));

  const prev = document.querySelector<HTMLButtonElement>("#prev");
  const next = document.querySelector<HTMLButtonElement>("#next");
  if (prev) prev.disabled = state.page <= 1;
  if (next) next.disabled = state.page >= pages;
}

/* ---------- cursor glow (subtle) ---------- */

// Elements with the "glow" class pick up a faint light as the cursor nears them.
// CSS reads --gx / --gy (cursor position relative to the element) and --gi (0 to 1).
const pointer = { x: -9999, y: -9999 };
const GLOW_RANGE = 110;

function updateGlow(): void {
  if (!settings.glow) return;
  document.querySelectorAll<HTMLElement>(".glow").forEach((el) => {
    const r = el.getBoundingClientRect();
    const dx = Math.max(r.left - pointer.x, 0, pointer.x - r.right);
    const dy = Math.max(r.top - pointer.y, 0, pointer.y - r.bottom);
    const pad = el.tagName === "BUTTON" ? 14 : 22;
    const gx = Math.min(Math.max(pointer.x - r.left, -pad), r.width + pad);
    const gy = Math.min(Math.max(pointer.y - r.top, -pad), r.height + pad);
    el.style.setProperty("--gx", `${gx}px`);
    el.style.setProperty("--gy", `${gy}px`);
    el.style.setProperty("--gi", String(Math.max(0, 1 - Math.hypot(dx, dy) / GLOW_RANGE)));
  });
}

function initGlow(): void {
  let frame = 0;
  document.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      updateGlow();
    });
  });
  document.documentElement.addEventListener("mouseleave", () => {
    pointer.x = -9999;
    pointer.y = -9999;
    updateGlow();
  });
}

/* ---------- events (delegated once, so re-renders never need re-binding) ---------- */

function onClick(e: MouseEvent): void {
  const el = e.target as HTMLElement;
  const hit = (sel: string): HTMLElement | null => el.closest<HTMLElement>(sel);

  const menu = document.querySelector<HTMLElement>("#filterMenu");
  if (menu && !menu.hidden && !hit(".filter-wrap")) menu.hidden = true;

  const nav = hit("[data-nav],[data-goto]");
  if (nav) {
    e.preventDefault();
    go((nav.dataset.nav || nav.dataset.goto) as Page);
    return;
  }

  const themeBtn = hit("[data-theme-btn]");
  if (themeBtn) return setSetting("theme", themeBtn.dataset.themeBtn as ThemePref);

  const langBtn = hit("[data-lang]");
  if (langBtn) {
    if (langBtn.dataset.lang !== settings.lang) setSetting("lang", langBtn.dataset.lang as Lang);
    return;
  }

  const settingBtn = hit("[data-setting-key]");
  if (settingBtn) {
    const key = settingBtn.dataset.settingKey as keyof Settings;
    const raw = settingBtn.dataset.settingValue ?? "";
    return setSetting(key, (key === "budgetWarn" ? Number(raw) : raw) as never);
  }

  const rangeBtn = hit("[data-range]");
  if (rangeBtn) {
    state.range = rangeBtn.dataset.range as Range;
    document.querySelectorAll("#rangeSeg button").forEach((b) => b.classList.toggle("active", b === rangeBtn));
    return renderChart();
  }

  const payBtn = hit("[data-payment]");
  if (payBtn) {
    state.payment = payBtn.dataset.payment as PaymentMethod;
    return renderPayment();
  }

  const statusBtn = hit("[data-status]");
  if (statusBtn && menu) {
    state.statusFilter = statusBtn.dataset.status as State["statusFilter"];
    state.page = 1;
    menu.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === statusBtn));
    menu.hidden = true;
    return renderTable();
  }

  if (hit("#filterBtn") && menu) {
    menu.hidden = !menu.hidden;
    return;
  }
  if (hit("#prev")) {
    state.page--;
    return renderTable();
  }
  if (hit("#next")) {
    state.page++;
    return renderTable();
  }
  if (hit("#resetSettings")) return resetSettings();
  if (hit("#menuBtn")) return void document.body.classList.add("nav-open");
  if (hit("#scrim")) return void document.body.classList.remove("nav-open");
}

function onChange(e: Event): void {
  const el = e.target as HTMLInputElement;
  if (el.dataset.id) {
    if (el.checked) state.selected.add(el.dataset.id);
    else state.selected.delete(el.dataset.id);
    renderTable();
  } else if (el.id === "selectAll") {
    currentPageRows().forEach((x) => (el.checked ? state.selected.add(x.id) : state.selected.delete(x.id)));
    renderTable();
  } else if (el.dataset.settingToggle) {
    setSetting(el.dataset.settingToggle as keyof Settings, el.checked as never);
  }
}

function onInput(e: Event): void {
  const el = e.target as HTMLInputElement;
  if (el.id !== "tableSearch") return;
  state.query = el.value;
  state.page = 1;
  renderTable();
}

function onKeydown(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    const global = document.querySelector<HTMLInputElement>("#globalSearch");
    if (global && global.offsetParent !== null) global.focus();
    else {
      go("Transactions");
      document.querySelector<HTMLInputElement>("#tableSearch")?.focus();
    }
    return;
  }
  if (e.key === "Escape") {
    document.body.classList.remove("nav-open");
    const menu = document.querySelector<HTMLElement>("#filterMenu");
    if (menu) menu.hidden = true;
    return;
  }
  const el = e.target as HTMLInputElement;
  if (e.key === "Enter" && el.id === "globalSearch") {
    state.query = el.value;
    state.page = 1;
    el.value = "";
    go("Transactions");
    const input = document.querySelector<HTMLInputElement>("#tableSearch");
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }
}

/* ---------- boot ---------- */

function init(): void {
  renderShell();
  applyAppearance();

  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);
  document.addEventListener("input", onInput);
  document.addEventListener("keydown", onKeydown);

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (state.activeNav === "Dashboard") renderChart();
    }, 120);
  });

  initGlow();
  renderPage();
}

init();
