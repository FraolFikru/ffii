import "./style.css";
import {
  cashFlow,
  categoryColor,
  i18n,
  paymentMethods,
  stats,
  transactions,
  user,
  type Lang,
  type MonthPoint,
  type PaymentMethod,
  type Status,
  type Transaction,
} from "./data";
import { icon } from "./icons";

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

type Range = "Daily" | "Weekly" | "Monthly";

interface State {
  page: number;
  pageSize: number;
  query: string;
  statusFilter: Status | "All";
  selected: Set<string>;
  range: Range;
  theme: "dark" | "light";
  lang: Lang;
  activeNav: string;
  payment: PaymentMethod;
  showHelp: boolean;
  showSettings: boolean;
}

const state: State = {
  page: 1,
  pageSize: 10,
  query: "",
  statusFilter: "All",
  selected: new Set(),
  range: "Monthly",
  theme: "dark",
  lang: "en",
  activeNav: "Dashboard",
  payment: "telebirr",
  showHelp: false,
  showSettings: false,
};

const t = (key: string): string => i18n[state.lang][key] ?? i18n.en[key] ?? key;

const navItems = [
  { label: "Dashboard", key: "dashboard", icon: "home" },
  { label: "Analytics", key: "analytics", icon: "bars" },
  { label: "Transactions", key: "transactions", icon: "receipt" },
  { label: "Budgets", key: "budgets", icon: "wallet" },
  { label: "Investments", key: "investments", icon: "trend-up" },
  { label: "Goals", key: "goals", icon: "target" },
  { label: "Reports", key: "reports", icon: "file" },
];

function renderShell(): void {
  const app = $("#app");
  app.innerHTML = `
  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <span class="brand-mark">${icon("logo")}</span>
        <span>Fintrack</span>
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
            (n) => `<a href="#" data-nav="${n.label}" class="${n.label === state.activeNav ? "active" : ""}">${icon(n.icon)}<span data-i18n="${n.key}">${t(n.key)}</span></a>`,
          )
          .join("")}
      </nav>

      <div class="sidebar-bottom">
        <p class="nav-heading">Support</p>
        <nav class="nav">
          <a href="#" id="settingsBtn">${icon("settings")}<span data-i18n="settings">${t("settings")}</span></a>
          <a href="#" id="helpBtn">${icon("info")}<span data-i18n="help">${t("help")}</span></a>
        </nav>
        <div id="supportPanel"></div>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <button class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu">${icon("menu")}</button>
        <h1 data-i18n="dashboard">${t("dashboard")}</h1>
        <div class="topbar-right">
          <label class="search">
            ${icon("search")}
            <input type="text" placeholder="${t("search")}" id="globalSearch" />
            <kbd>⌘ K</kbd>
          </label>
          <button class="icon-btn notif" aria-label="Notifications">${icon("bell")}<span class="dot"></span></button>
          <div class="lang-toggle" id="langToggle" role="group" aria-label="Language">
            <button data-lang="en" class="${state.lang === "en" ? "active" : ""}">EN</button>
            <button data-lang="am" class="${state.lang === "am" ? "active" : ""}">አማ</button>
            <button data-lang="om" class="${state.lang === "om" ? "active" : ""}">Orm</button>
          </div>
          <div class="theme-toggle" id="themeToggle" role="group" aria-label="Theme">
            <button data-theme-btn="dark" class="${state.theme === "dark" ? "active" : ""}" aria-label="Dark mode">${icon("moon")}</button>
            <button data-theme-btn="light" class="${state.theme === "light" ? "active" : ""}" aria-label="Light mode">${icon("sun")}</button>
          </div>
        </div>
      </header>

      <div class="alert" id="alert">
        <span>${icon("warning")} <strong>Alert:</strong> Food cost is running above target this week.</span>
        <a href="#">See details ${icon("arrow-right")}</a>
      </div>

      <section class="grid">
        <div class="stats">
          ${stats
            .map(
              (s) => `
            <article class="panel stat">
              <div class="stat-head">
                <span class="stat-icon">${icon(s.icon)}</span>
                <span data-i18n="${s.labelKey}">${t(s.labelKey)}</span>
                <button class="more" aria-label="More">${icon("dots-v")}</button>
              </div>
              <div class="stat-value" data-count="${s.value}" data-pct="${(s as any).isPercent ? "1" : "0"}">0</div>
              <div class="stat-foot">
                <span data-i18n="${s.noteKey}">${t(s.noteKey)}</span>
                <span class="badge ${s.change >= 0 ? "up" : "down"}">${s.change >= 0 ? "+" : ""}${s.change}%</span>
              </div>
            </article>`,
            )
            .join("")}
        </div>

        <article class="panel chart-panel">
          <div class="panel-head">
            <h2 data-i18n="cashFlow">${t("cashFlow")}</h2>
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

      <article class="panel table-panel">
        <div class="panel-head">
          <h2 data-i18n="transactionHistory">${t("transactionHistory")}</h2>
          <div class="table-tools">
            <label class="search small">
              ${icon("search")}
              <input type="text" placeholder="${t("search")}" id="tableSearch" />
            </label>
            <div class="filter-wrap">
              <button class="btn" id="filterBtn">${icon("filter")} <span data-i18n="filter">${t("filter")}</span></button>
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
                <th>ID</th>
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
            <button class="icon-btn" id="prev">${icon("chevron-left")}</button>
            <span id="pageLabel"></span>
            <button class="icon-btn" id="next">${icon("chevron-right")}</button>
          </div>
        </div>
      </article>
    </main>
    <div class="scrim" id="scrim"></div>
  </div>`;
}

function renderSupportPanel(): void {
  const panel = document.querySelector("#supportPanel");
  if (!panel) return;
  if (state.showHelp) {
    panel.innerHTML = `<div class="help-panel"><h3>${t("helpTitle")}</h3><p>${t("helpBody")}</p></div>`;
  } else if (state.showSettings) {
    panel.innerHTML = `<div class="settings-panel"><h3>${t("settingsTitle")}</h3><p>${t("settingsBody")}</p></div>`;
  } else {
    panel.innerHTML = "";
  }
}

function renderPayment(): void {
  const pm = paymentMethods[state.payment];
  const panel = document.querySelector("#paymentPanel");
  if (!panel) return;

  const themes: Record<PaymentMethod, string> = {
    telebirr: "linear-gradient(145deg, #0f3d2e 0%, #1a5c45 40%, #0d2f24 100%)",
    cash: "linear-gradient(145deg, #2a2c2e 0%, #3a3d40 50%, #1f2123 100%)",
    cbe: "linear-gradient(145deg, #0c2d4a 0%, #164e7a 40%, #0a2238 100%)",
  };

  panel.innerHTML = `
    <div class="panel-head"><h2 data-i18n="paymentMethods">${t("paymentMethods")}</h2></div>
    <div class="payment-switch">
      ${(["telebirr", "cash", "cbe"] as PaymentMethod[])
        .map((key) => `<button data-payment="${key}" class="${key === state.payment ? "active" : ""}">${paymentMethods[key].name}</button>`)
        .join("")}
    </div>
    <div class="payment-visual" style="background:${themes[state.payment]}">
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
    <div class="panel-head spend-head"><h3 data-i18n="spendingThisMonth">${t("spendingThisMonth")}</h3></div>
    <div class="spend-value">
      <strong>${usd(pm.spent)}</strong>
      <small>of ${usd(pm.limit)} limit</small>
    </div>
    <div class="meter" id="meter"></div>
    <div class="limit"><span data-i18n="monthlyLimit">${t("monthlyLimit")}</span>: <strong>${usd(pm.limit)}</strong></div>
  `;

  const meter = panel.querySelector("#meter");
  if (meter) {
    const bars = 28;
    const filled = Math.round((pm.spent / pm.limit) * bars);
    meter.innerHTML = Array.from({ length: bars }, (_, i) => `<span class="${i < filled ? "on" : ""}" style="--d:${i * 18}ms"></span>`).join("");
  }
}

function animateCounters(): void {
  document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    const isPct = el.dataset.pct === "1";
    const start = performance.now();
    const dur = 800;
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

function seriesFor(range: Range): MonthPoint[] {
  if (range === "Monthly") return cashFlow;
  if (range === "Weekly") {
    const labels = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];
    return labels.map((month, i) => ({
      month,
      revenue: 1100 + Math.round(Math.sin(i * 0.9) * 300 + i * 60),
      expenses: 950 + Math.round(Math.cos(i * 0.7) * 250 + i * 30),
    }));
  }
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return labels.map((month, i) => ({
    month,
    revenue: 180 + Math.round(Math.sin(i) * 60 + 40),
    expenses: 140 + Math.round(Math.cos(i * 1.3) * 70 + 50),
  }));
}

const niceMax = (v: number): number => {
  const step = Math.pow(10, Math.floor(Math.log10(v || 1)));
  return Math.ceil(v / (step / 2)) * (step / 2);
};

function renderChart(): void {
  const svg = document.querySelector("#chart") as SVGSVGElement | null;
  const wrap = document.querySelector("#chartWrap") as HTMLElement | null;
  const tooltip = document.querySelector("#tooltip") as HTMLElement | null;
  if (!svg || !wrap || !tooltip) return;

  const data = seriesFor(state.range);
  const W = wrap.clientWidth;
  const H = wrap.clientHeight;
  const pad = { top: 14, right: 12, bottom: 28, left: 46 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.flatMap((d) => [d.revenue, d.expenses])) * 1.12);
  const ticks = 5;
  const x = (i: number) => pad.left + (iw * i) / Math.max(data.length - 1, 1);
  const y = (v: number) => pad.top + ih - (v / max) * ih;

  const stepPath = (key: "revenue" | "expenses") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");

  const revenuePath = stepPath("revenue");
  const expensesPath = stepPath("expenses");
  const areaPath = `${revenuePath} L${x(data.length - 1)},${pad.top + ih} L${x(0)},${pad.top + ih} Z`;
  const fmtTick = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v}`);

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = `
    <defs>
      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#22c55e" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#22c55e" stop-opacity="0"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    ${Array.from({ length: ticks + 1 }, (_, i) => {
      const v = (max / ticks) * i;
      const yy = y(v);
      return `<line x1="${pad.left}" y1="${yy}" x2="${W - pad.right}" y2="${yy}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 4" opacity="0.5"/>
        <text x="${pad.left - 8}" y="${yy + 3}" class="axis" text-anchor="end">${fmtTick(v)}</text>`;
    }).join("")}
    ${data.map((d, i) => (W < 500 && i % 2 ? "" : `<text x="${x(i)}" y="${H - 8}" class="axis" text-anchor="middle">${d.month}</text>`)).join("")}
    <path d="${areaPath}" fill="url(#areaGrad)"/>
    <path d="${expensesPath}" class="line-exp" fill="none"/>
    <path d="${revenuePath}" class="line-inc" fill="none" filter="url(#glow)"/>
    <line id="cursor" class="cursor" y1="${pad.top}" y2="${pad.top + ih}" visibility="hidden"/>
    <circle id="dotInc" r="5" class="dot-inc" visibility="hidden"/>
    <circle id="dotExp" r="4" class="dot-exp" visibility="hidden"/>
    <rect x="${pad.left}" y="${pad.top}" width="${iw}" height="${ih}" fill="transparent" id="hit"/>
  `;

  const cursor = svg.querySelector("#cursor") as SVGLineElement;
  const dotInc = svg.querySelector("#dotInc") as SVGCircleElement;
  const dotExp = svg.querySelector("#dotExp") as SVGCircleElement;
  const hit = svg.querySelector("#hit") as SVGRectElement;

  const show = (i: number) => {
    const d = data[i];
    const cx = x(i);
    cursor.setAttribute("x1", String(cx));
    cursor.setAttribute("x2", String(cx));
    dotInc.setAttribute("cx", String(cx));
    dotInc.setAttribute("cy", String(y(d.revenue)));
    dotExp.setAttribute("cx", String(cx));
    dotExp.setAttribute("cy", String(y(d.expenses)));
    [cursor, dotInc, dotExp].forEach((el) => el.setAttribute("visibility", "visible"));
    tooltip.innerHTML = `
      <div class="tt-title">${d.month.toUpperCase()}</div>
      <div class="tt-row"><i class="sw inc"></i>Revenue <b>${usd(d.revenue)}</b></div>
      <div class="tt-row"><i class="sw exp"></i>Expenses <b>${usd(d.expenses)}</b></div>`;
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth;
    tooltip.style.left = `${Math.max(0, cx + 14 + tw > W ? cx - tw - 14 : cx + 14)}px`;
    tooltip.style.top = `${Math.max(6, y(Math.max(d.revenue, d.expenses)) - 36)}px`;
  };

  const hide = () => {
    [cursor, dotInc, dotExp].forEach((el) => el.setAttribute("visibility", "hidden"));
    tooltip.hidden = true;
  };

  hit.addEventListener("pointermove", (e) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - pad.left) / iw) * (data.length - 1));
    show(Math.max(0, Math.min(data.length - 1, i)));
  });
  hit.addEventListener("pointerleave", hide);
  if (state.range === "Monthly") show(9);
}

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
          return `<tr class="${state.selected.has(t.id) ? "selected" : ""}">
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

function applyTheme(theme: State["theme"]): void {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll<HTMLButtonElement>("[data-theme-btn]").forEach((b) => b.classList.toggle("active", b.dataset.themeBtn === theme));
  try { localStorage.setItem("ffii-theme", theme); } catch {}
}

function applyLang(lang: Lang): void {
  state.lang = lang;
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = (el as HTMLElement).dataset.i18n!;
    el.textContent = t(key);
  });
  renderSupportPanel();
  try { localStorage.setItem("ffii-lang", lang); } catch {}
}

function bindEvents(): void {
  $("#themeToggle").addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-theme-btn]");
    if (btn) applyTheme(btn.dataset.themeBtn as State["theme"]);
  });

  $("#langToggle").addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-lang]");
    if (btn) applyLang(btn.dataset.lang as Lang);
  });

  $("#rangeSeg").addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-range]");
    if (!btn) return;
    state.range = btn.dataset.range as Range;
    document.querySelectorAll("#rangeSeg button").forEach((b) => b.classList.toggle("active", b === btn));
    renderChart();
  });

  $("#paymentPanel").addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-payment]");
    if (!btn) return;
    state.payment = btn.dataset.payment as PaymentMethod;
    renderPayment();
  });

  $("#nav").addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("[data-nav]");
    if (!a) return;
    e.preventDefault();
    state.activeNav = a.dataset.nav ?? "Dashboard";
    document.querySelectorAll("#nav a").forEach((n) => n.classList.toggle("active", n === a));
    document.body.classList.remove("nav-open");
  });

  $("#settingsBtn").addEventListener("click", (e) => {
    e.preventDefault();
    state.showSettings = !state.showSettings;
    state.showHelp = false;
    renderSupportPanel();
  });
  $("#helpBtn").addEventListener("click", (e) => {
    e.preventDefault();
    state.showHelp = !state.showHelp;
    state.showSettings = false;
    renderSupportPanel();
  });

  const onSearch = (value: string) => {
    state.query = value;
    state.page = 1;
    renderTable();
  };
  $<HTMLInputElement>("#tableSearch").addEventListener("input", (e) => onSearch((e.target as HTMLInputElement).value));
  $<HTMLInputElement>("#globalSearch").addEventListener("input", (e) => {
    const v = (e.target as HTMLInputElement).value;
    $<HTMLInputElement>("#tableSearch").value = v;
    onSearch(v);
  });

  const menu = $("#filterMenu");
  $("#filterBtn").addEventListener("click", (e) => {
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
  document.addEventListener("click", () => (menu.hidden = true));

  $("#prev").addEventListener("click", () => { state.page--; renderTable(); });
  $("#next").addEventListener("click", () => { state.page++; renderTable(); });

  $("#tbody").addEventListener("change", (e) => {
    const cb = e.target as HTMLInputElement;
    const id = cb.dataset.id;
    if (!id) return;
    if (cb.checked) state.selected.add(id);
    else state.selected.delete(id);
    renderTable();
  });

  $("#selectAll").addEventListener("change", (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    const start = (state.page - 1) * state.pageSize;
    filtered().slice(start, start + state.pageSize).forEach((t) => (checked ? state.selected.add(t.id) : state.selected.delete(t.id)));
    renderTable();
  });

  $("#menuBtn").addEventListener("click", () => document.body.classList.add("nav-open"));
  $("#scrim").addEventListener("click", () => document.body.classList.remove("nav-open"));

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(renderChart, 120);
  });
}

function init(): void {
  renderShell();
  try {
    const th = localStorage.getItem("ffii-theme");
    if (th === "light" || th === "dark") applyTheme(th);
    const lg = localStorage.getItem("ffii-lang") as Lang | null;
    if (lg === "en" || lg === "am" || lg === "om") applyLang(lg);
  } catch {}
  renderPayment();
  renderChart();
  renderTable();
  bindEvents();
  animateCounters();
}

init();
