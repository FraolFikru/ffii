import "./style.css";
import {
  cashFlow,
  categoryColor,
  paymentMethods,
  stats,
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

const usd = (n: number, digits = 2): string =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });

const fmtDate = (d: Date): string =>
  d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/* ---------- state ---------- */

type Range = "Daily" | "Weekly" | "Monthly";

interface State {
  page: number;
  pageSize: number;
  query: string;
  statusFilter: Status | "All";
  selected: Set<string>;
  range: Range;
  theme: "dark" | "light";
  activeNav: string;
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

const navItems = [
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
        <span>Fintrack</span>
      </div>

      <button class="profile">
        <span class="avatar">${user.name.split(" ").map((p) => p[0]).join("")}</span>
        <span class="profile-text">
          <strong>${user.name}</strong>
          <small>${user.email}</small>
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
          <p>Upgrade for AI insights and advanced financial analytics.</p>
          <button>Upgrade Pro ${icon("arrow-right")}</button>
        </div>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <button class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu">${icon("menu")}</button>
        <h1>Dashboard</h1>
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

      <div class="alert" id="alert">
        <span>${icon("warning")} <strong>Spending Alert:</strong> Dining expenses are 15% higher than your monthly average.</span>
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
                <span>${s.label}</span>
                <button class="more" aria-label="More">${icon("dots-v")}</button>
              </div>
              <div class="stat-value" data-count="${s.value}">$0.00</div>
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
            <h2>Cash Flow Overview</h2>
            <div class="segmented" id="rangeSeg">
              ${(["Daily", "Weekly", "Monthly"] as Range[])
                .map((r) => `<button data-range="${r}" class="${r === state.range ? "active" : ""}">${r}</button>`)
                .join("")}
            </div>
          </div>
          <div class="chart-wrap" id="chartWrap">
            <svg id="chart" role="img" aria-label="Cash flow line chart"></svg>
            <div class="tooltip" id="tooltip" hidden></div>
          </div>
        </article>

        <article class="panel cards-panel" id="paymentPanel">
          <!-- rendered by renderPayment() -->
        </article>
      </section>

      <article class="panel table-panel">
        <div class="panel-head">
          <h2>Transaction History</h2>
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
    </main>
    <div class="scrim" id="scrim"></div>
  </div>`;
}

/* ---------- payment methods panel ---------- */

function renderPayment(): void {
  const pm = paymentMethods[state.payment];
  const panel = $("#paymentPanel");

  const themes: Record<PaymentMethod, { gradient: string }> = {
    telebirr: {
      gradient: "linear-gradient(145deg, #0f3d2e 0%, #1a5c45 40%, #0d2f24 100%)",
    },
    cash: {
      gradient: "linear-gradient(145deg, #2a2c2e 0%, #3a3d40 50%, #1f2123 100%)",
    },
    cbe: {
      gradient: "linear-gradient(145deg, #0c2d4a 0%, #164e7a 40%, #0a2238 100%)",
    },
  };

  const theme = themes[state.payment];

  panel.innerHTML = `
    <div class="panel-head">
      <h2>Payment Methods</h2>
    </div>

    <div class="payment-switch" id="paymentSwitch">
      ${(["telebirr", "cash", "cbe"] as PaymentMethod[])
        .map(
          (key) => `
        <button data-payment="${key}" class="${key === state.payment ? "active" : ""}">
          ${paymentMethods[key].name}
        </button>`,
        )
        .join("")}
    </div>

    <div class="payment-visual" style="background: ${theme.gradient}">
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
        <div class="pv-change ${pm.change >= 0 ? "up" : "down"}">
          ${pm.change >= 0 ? "+" : ""}${pm.change}%
        </div>
      </div>
    </div>

    <div class="panel-head spend-head">
      <h3>Spending this month</h3>
    </div>
    <div class="spend-value">
      <strong>${usd(pm.spent)}</strong>
      <small>of ${usd(pm.limit)} limit</small>
    </div>
    <div class="meter" id="meter" aria-label="Spending vs limit"></div>
    <div class="limit">Monthly Limit: <strong>${usd(pm.limit)}</strong></div>
  `;

  renderMeter();
}

/* ---------- stat counters ---------- */

function animateCounters(): void {
  document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    const start = performance.now();
    const dur = 900;
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = usd(target * eased);
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
      revenue: 1100 + Math.round(Math.sin(i * 0.9) * 300 + i * 60),
      expenses: 950 + Math.round(Math.cos(i * 0.7) * 250 + i * 30),
    }));
  }
  // Daily
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
  const svg = $<SVGSVGElement>("#chart");
  const wrap = $("#chartWrap");
  const tooltip = $("#tooltip");
  const data = seriesFor(state.range);

  const W = wrap.clientWidth;
  const H = wrap.clientHeight;
  const pad = { top: 18, right: 16, bottom: 32, left: 48 };
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
  const fmtTick = (v: number): string => (v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v}`);

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
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

      <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    ${Array.from({ length: ticks + 1 }, (_, i) => {
      const v = (max / ticks) * i;
      const yy = y(v);
      return `
        <line x1="${pad.left}" y1="${yy}" x2="${W - pad.right}" y2="${yy}" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
        <text x="${pad.left - 10}" y="${yy + 4}" class="axis" text-anchor="end">${fmtTick(v)}</text>
      `;
    }).join("")}

    ${data
      .map((d, i) => {
        if (W < 520 && i % 2) return "";
        return `<text x="${x(i)}" y="${H - 10}" class="axis" text-anchor="middle">${d.month}</text>`;
      })
      .join("")}

    <path d="${areaPath}" fill="url(#areaGrad)"/>
    <path d="${expensesPath}" class="line-exp" fill="none" filter="url(#glowRed)"/>
    <path d="${revenuePath}" class="line-inc" fill="none" filter="url(#glow)"/>

    <line id="cursor" class="cursor" y1="${pad.top}" y2="${pad.top + ih}" visibility="hidden"/>
    <circle id="dotInc" r="5.5" class="dot-inc" visibility="hidden"/>
    <circle id="dotExp" r="4.5" class="dot-exp" visibility="hidden"/>
    <rect x="${pad.left}" y="${pad.top}" width="${iw}" height="${ih}" fill="transparent" id="hit"/>
  `;

  const cursor = $<SVGLineElement>("#cursor", svg);
  const dotInc = $<SVGCircleElement>("#dotInc", svg);
  const dotExp = $<SVGCircleElement>("#dotExp", svg);
  const hit = $<SVGRectElement>("#hit", svg);

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

    const label = state.range === "Monthly" ? `${fullMonth(d.month)} 2026` : d.month;
    tooltip.innerHTML = `
      <div class="tt-title">${label.toUpperCase()}</div>
      <div class="tt-row"><i class="sw inc"></i>Revenue <b>${usd(d.revenue, 0)}</b></div>
      <div class="tt-row"><i class="sw exp"></i>Expenses <b>${usd(d.expenses, 0)}</b></div>
      <div class="tt-row" style="margin-top:8px;padding-top:6px;border-top:1px solid var(--border)">
        <span style="color:var(--muted);font-size:11px">Net</span>
        <b style="color:${d.revenue - d.expenses >= 0 ? "#22c55e" : "#ef4444"}">${usd(d.revenue - d.expenses, 0)}</b>
      </div>`;
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth;
    const left = Math.max(0, cx + 16 + tw > W ? cx - tw - 16 : cx + 16);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(8, y(Math.max(d.revenue, d.expenses)) - 40)}px`;
  };

  const hide = (): void => {
    [cursor, dotInc, dotExp].forEach((el) => el.setAttribute("visibility", "hidden"));
    tooltip.hidden = true;
  };

  hit.addEventListener("pointermove", (e: PointerEvent) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - pad.left) / iw) * (data.length - 1));
    show(Math.max(0, Math.min(data.length - 1, i)));
  });
  hit.addEventListener("pointerleave", hide);

  if (state.range === "Monthly") show(5);
  else if (state.range === "Weekly") show(3);
  else show(2);
}

const fullMonth = (m: string): string =>
  ({ Jan: "January", Feb: "February", Mar: "March", Apr: "April", May: "May", Jun: "June", Jul: "July", Aug: "August", Sep: "September", Oct: "October", Nov: "November", Dec: "December" })[m] ?? m;

/* ---------- spending meter ---------- */

function renderMeter(): void {
  const meter = $("#meter");
  const pm = paymentMethods[state.payment];
  const bars = 30;
  const filled = Math.round((pm.spent / pm.limit) * bars);
  meter.innerHTML = Array.from({ length: bars }, (_, i) => `<span class="${i < filled ? "on" : ""}" style="--d:${i * 20}ms"></span>`).join("");
}

/* ---------- table ---------- */

const merchantIcon: Record<string, string> = {
  "Starbucks Coffee": "#00704a",
  "Netflix Subscription": "#e50914",
  "Hotel Booking": "#ff5a5f",
  "Amazon Purchase": "#f5f5f5",
};

function filtered(): Transaction[] {
  const q = state.query.trim().toLowerCase();
  return transactions.filter(
    (t) =>
      (state.statusFilter === "All" || t.status === state.statusFilter) &&
      (!q || [t.id, t.description, t.category, t.status].some((s) => s.toLowerCase().includes(q))),
  );
}

function renderTable(): void {
  const rows = filtered();
  const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * state.pageSize;
  const pageRows = rows.slice(start, start + state.pageSize);

  $("#tbody").innerHTML = pageRows.length
    ? pageRows
        .map((t) => {
          const bg = merchantIcon[t.description] ?? categoryColor[t.category];
          const fg = t.description === "Amazon Purchase" ? "#111" : "#fff";
          return `
      <tr class="${state.selected.has(t.id) ? "selected" : ""}">
        <td><input type="checkbox" data-id="${t.id}" ${state.selected.has(t.id) ? "checked" : ""} aria-label="Select ${t.id}"/></td>
        <td class="mono">${t.id}</td>
        <td><span class="merchant"><span class="m-icon" style="background:${bg};color:${fg}">${escapeHtml(t.description[0])}</span>${escapeHtml(t.description)}</span></td>
        <td><span class="cat"><i style="background:${categoryColor[t.category]}"></i>${t.category}</span></td>
        <td>${fmtDate(t.date)}</td>
        <td class="mono">-${usd(Math.abs(t.amount))}</td>
        <td><span class="status ${t.status.toLowerCase()}">${t.status}</span></td>
        <td><button class="icon-btn row-more" aria-label="Row actions">${icon("dots-h")}</button></td>
      </tr>`;
        })
        .join("")
    : `<tr><td colspan="8" class="empty">No transactions match your search.</td></tr>`;

  $("#showing").textContent = `Showing ${pageRows.length} of ${rows.length} data`;
  $("#pageLabel").textContent = `Page ${state.page} of ${pages}`;
  $<HTMLButtonElement>("#prev").disabled = state.page <= 1;
  $<HTMLButtonElement>("#next").disabled = state.page >= pages;

  const all = $<HTMLInputElement>("#selectAll");
  const selectedOnPage = pageRows.filter((t) => state.selected.has(t.id)).length;
  all.checked = pageRows.length > 0 && selectedOnPage === pageRows.length;
  all.indeterminate = selectedOnPage > 0 && selectedOnPage < pageRows.length;
}

/* ---------- theme ---------- */

function applyTheme(theme: State["theme"]): void {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll<HTMLButtonElement>("[data-theme-btn]").forEach((b) => b.classList.toggle("active", b.dataset.themeBtn === theme));
  try {
    localStorage.setItem("fintrack-theme", theme);
  } catch {
    /* storage unavailable */
  }
}

/* ---------- events ---------- */

function bindEvents(): void {
  $("#themeToggle").addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-theme-btn]");
    if (btn) applyTheme(btn.dataset.themeBtn as State["theme"]);
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

  const onSearch = (value: string): void => {
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

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      $<HTMLInputElement>("#globalSearch").focus();
    }
    if (e.key === "Escape") {
      $("#filterMenu").hidden = true;
      document.body.classList.remove("nav-open");
    }
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
    $("#filterBtn").classList.toggle("on", state.statusFilter !== "All");
    menu.hidden = true;
    renderTable();
  });
  document.addEventListener("click", () => (menu.hidden = true));

  $("#prev").addEventListener("click", () => {
    state.page--;
    renderTable();
  });
  $("#next").addEventListener("click", () => {
    state.page++;
    renderTable();
  });

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
    filtered()
      .slice(start, start + state.pageSize)
      .forEach((t) => (checked ? state.selected.add(t.id) : state.selected.delete(t.id)));
    renderTable();
  });

  $("#alert a").addEventListener("click", (e) => {
    e.preventDefault();
    $<HTMLInputElement>("#tableSearch").value = "Food";
    onSearch("Food");
    $(".table-panel").scrollIntoView({ behavior: "smooth" });
  });

  $("#menuBtn").addEventListener("click", () => document.body.classList.add("nav-open"));
  $("#scrim").addEventListener("click", () => document.body.classList.remove("nav-open"));

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(renderChart, 120);
  });
}

/* ---------- boot ---------- */

function init(): void {
  renderShell();
  let saved: string | null = null;
  try {
    saved = localStorage.getItem("fintrack-theme");
  } catch {
    /* storage unavailable */
  }
  applyTheme(saved === "light" ? "light" : "dark");
  renderPayment();
  renderChart();
  renderTable();
  bindEvents();
  animateCounters();
}

init();
