/* ==========================================================================
   SubHelper — Client-Side Application Logic (COMP3421)
   Storage Keys & Seed Data Initialization
   ========================================================================== */
const STORAGE_KEYS = {
  SUBS: "subhelper_subscriptions_v1",
  BUDGETS: "subhelper_budgets_v1",
  THEME: "subhelper_theme_v1"
};

// Helper: Generate relative date strings (YYYY-MM-DD) so demo dates stay fresh
function getFutureDateString(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
}

const SEED_BUDGETS = [
  { id: "b1", categoryName: "Entertainment", monthlyCap: 40.00, alertThreshold: 80 },
  { id: "b2", categoryName: "Productivity", monthlyCap: 35.00, alertThreshold: 80 },
  { id: "b3", categoryName: "Cloud & Storage", monthlyCap: 15.00, alertThreshold: 75 },
  { id: "b4", categoryName: "Fitness & Health", monthlyCap: 50.00, alertThreshold: 85 }
];

const SEED_SUBSCRIPTIONS = [
  {
    id: "s1",
    name: "Netflix Standard",
    category: "Entertainment",
    billingCycle: "monthly",
    cost: 15.49,
    nextRenewalDate: getFutureDateString(4),
    isActive: true,
    notes: "Shared screen plan"
  },
  {
    id: "s2",
    name: "Spotify Duo",
    category: "Entertainment",
    billingCycle: "monthly",
    cost: 14.99,
    nextRenewalDate: getFutureDateString(11),
    isActive: true,
    notes: "Music streaming"
  },
  {
    id: "s3",
    name: "ChatGPT Plus",
    category: "Productivity",
    billingCycle: "monthly",
    cost: 20.00,
    nextRenewalDate: getFutureDateString(18),
    isActive: true,
    notes: "AI research assistant"
  },
  {
    id: "s4",
    name: "iCloud+ 200GB",
    category: "Cloud & Storage",
    billingCycle: "monthly",
    cost: 2.99,
    nextRenewalDate: getFutureDateString(6),
    isActive: true,
    notes: "Device backup"
  },
  {
    id: "s5",
    name: "JetBrains All Products",
    category: "Productivity",
    billingCycle: "yearly",
    cost: 149.00,
    nextRenewalDate: getFutureDateString(45),
    isActive: false,
    notes: "Paused after semester"
  }
];

/* ==========================================================================
   Application State & LocalStorage Persistence
   ========================================================================== */
let subscriptions = [];
let budgets = [];

function loadFromStorage() {
  const rawSubs = localStorage.getItem(STORAGE_KEYS.SUBS);
  const rawBudgets = localStorage.getItem(STORAGE_KEYS.BUDGETS);

  if (!rawSubs || !rawBudgets) {
    subscriptions = [...SEED_SUBSCRIPTIONS];
    budgets = [...SEED_BUDGETS];
    saveToStorage();
  } else {
    subscriptions = JSON.parse(rawSubs);
    budgets = JSON.parse(rawBudgets);
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEYS.SUBS, JSON.stringify(subscriptions));
  localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
}

/* ==========================================================================
   Calculation Helpers (Monthly Equivalence & D-Day)
   ========================================================================== */
function getMonthlyEquivalent(sub) {
  if (!sub.isActive) return 0;
  return sub.billingCycle === "yearly" ? sub.cost / 12 : sub.cost;
}

function getDaysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diffTime = target - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/* ==========================================================================
   DOM Rendering Functions (Read Flows)
   ========================================================================== */
function renderAll() {
  populateCategorySelects();
  renderDashboard();
  renderDirectory();
  renderBudgetsView();
}

function populateCategorySelects() {
  const filterCat = document.getElementById("filter-category");
  const modalCat = document.getElementById("sub-category");
  const currentFilterVal = filterCat.value;

  const categories = budgets.map((b) => b.categoryName);

  filterCat.innerHTML = `<option value="ALL">All Categories</option>` +
    categories.map((c) => `<option value="${c}">${c}</option>`).join("");

  if (categories.includes(currentFilterVal)) {
    filterCat.value = currentFilterVal;
  }

  modalCat.innerHTML = categories
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");
}

function renderDashboard() {
  const activeSubs = subscriptions.filter((s) => s.isActive);
  const pausedCount = subscriptions.length - activeSubs.length;

  const totalMonthly = activeSubs.reduce((sum, s) => sum + getMonthlyEquivalent(s), 0);
  const totalAnnual = totalMonthly * 12;

  const dueSoonSubs = activeSubs
    .map((s) => ({ ...s, daysLeft: getDaysUntil(s.nextRenewalDate) }))
    .filter((s) => s.daysLeft >= 0 && s.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  document.getElementById("kpi-monthly").textContent = `$${totalMonthly.toFixed(2)}`;
  document.getElementById("kpi-annual").textContent = `$${totalAnnual.toFixed(2)}`;
  document.getElementById("kpi-active-count").textContent = activeSubs.length;
  document.getElementById("kpi-paused-count").textContent = `${pausedCount} paused`;
  document.getElementById("kpi-due-soon").textContent = dueSoonSubs.length;

  // Render Category Budget Progress Bars
  const barsContainer = document.getElementById("dashboard-budget-bars");
  barsContainer.innerHTML = budgets.map((b) => {
    const spent = activeSubs
      .filter((s) => s.category === b.categoryName)
      .reduce((sum, s) => sum + getMonthlyEquivalent(s), 0);

    const pct = Math.min(100, (spent / b.monthlyCap) * 100);
    let statusClass = "";
    if (spent > b.monthlyCap) statusClass = "danger";
    else if ((spent / b.monthlyCap) * 100 >= b.alertThreshold) statusClass = "warn";

    return `
      <div class="budget-item">
        <div class="budget-item-top">
          <strong>${b.categoryName}</strong>
          <span>$${spent.toFixed(2)} / $${b.monthlyCap.toFixed(2)} (${Math.round((spent / b.monthlyCap) * 100)}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${statusClass}" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }).join("");

  // Render Upcoming D-Day List
  const upcomingContainer = document.getElementById("dashboard-upcoming-list");
  const sortedActive = activeSubs
    .map((s) => ({ ...s, daysLeft: getDaysUntil(s.nextRenewalDate) }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  if (sortedActive.length === 0) {
    upcomingContainer.innerHTML = `<li class="upcoming-item">No active subscriptions found.</li>`;
    return;
  }

  upcomingContainer.innerHTML = sortedActive.map((s) => {
    const dLabel = s.daysLeft === 0 ? "D-Day" : s.daysLeft > 0 ? `D-${s.daysLeft}` : `Passed`;
    const urgentClass = s.daysLeft >= 0 && s.daysLeft <= 7 ? "urgent" : "";
    return `
      <li class="upcoming-item">
        <div>
          <strong>${s.name}</strong>
          <div class="sub-meta">${s.nextRenewalDate} · $${s.cost.toFixed(2)} (${s.billingCycle})</div>
        </div>
        <span class="dday-badge ${urgentClass}">${dLabel}</span>
      </li>
    `;
  }).join("");
}

function renderDirectory() {
  const search = document.getElementById("search-input").value.trim().toLowerCase();
  const catFilter = document.getElementById("filter-category").value;
  const statusFilter = document.getElementById("filter-status").value;
  const sortBy = document.getElementById("sort-select").value;

  let filtered = subscriptions.filter((s) => {
    const matchText = s.name.toLowerCase().includes(search) || (s.notes && s.notes.toLowerCase().includes(search));
    const matchCat = catFilter === "ALL" || s.category === catFilter;
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && s.isActive) ||
      (statusFilter === "PAUSED" && !s.isActive);
    return matchText && matchCat && matchStatus;
  });

  filtered.sort((a, b) => {
    if (sortBy === "date-asc") return new Date(a.nextRenewalDate) - new Date(b.nextRenewalDate);
    if (sortBy === "cost-desc") return getMonthlyEquivalent(b) - getMonthlyEquivalent(a);
    return a.name.localeCompare(b.name);
  });

  const grid = document.getElementById("subscription-grid");
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="panel">No matching subscriptions found.</div>`;
    return;
  }

  grid.innerHTML = filtered.map((s) => `
    <article class="sub-card ${s.isActive ? "" : "paused"}">
      <div>
        <div class="sub-card-top">
          <div>
            <span class="badge">${s.category}</span>
            <h3 class="sub-card-title">${s.name}</h3>
          </div>
          <span class="sub-price">$${s.cost.toFixed(2)}</span>
        </div>
        <p class="sub-meta">Cycle: <strong>${s.billingCycle}</strong> ($${getMonthlyEquivalent(s).toFixed(2)}/mo)</p>
        <p class="sub-meta">Next Renewal: <strong>${s.nextRenewalDate}</strong></p>
        ${s.notes ? `<p class="sub-meta">Note: ${s.notes}</p>` : ""}
      </div>

      <div class="sub-actions">
        <button type="button" class="btn btn-sm btn-outline" onclick="editSubscription('${s.id}')">
          <i class="fa-solid fa-pen"></i> Edit
        </button>
        <button type="button" class="btn btn-sm btn-outline" onclick="toggleSubscriptionStatus('${s.id}')">
          ${s.isActive ? "Pause" : "Resume"}
        </button>
        <button type="button" class="btn btn-sm btn-danger" onclick="deleteSubscription('${s.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </article>
  `).join("");
}

function renderBudgetsView() {
  const tbody = document.getElementById("budget-table-body");
  tbody.innerHTML = budgets.map((b) => {
    const spent = subscriptions
      .filter((s) => s.isActive && s.category === b.categoryName)
      .reduce((sum, s) => sum + getMonthlyEquivalent(s), 0);

    return `
      <tr>
        <td><strong>${b.categoryName}</strong></td>
        <td>$${spent.toFixed(2)}</td>
        <td>$${b.monthlyCap.toFixed(2)}</td>
        <td>${b.alertThreshold}%</td>
        <td>
          <button type="button" class="btn btn-sm btn-outline" onclick="editBudget('${b.id}')">Edit</button>
          <button type="button" class="btn btn-sm btn-danger" onclick="deleteBudget('${b.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

/* ==========================================================================
   CRUD #1: Subscription Operations & Validation
   ========================================================================== */
function openModal(editId = null) {
  const modal = document.getElementById("sub-modal");
  const form = document.getElementById("sub-form");
  const errorEl = document.getElementById("sub-form-error");
  errorEl.textContent = "";
  form.reset();

  if (editId) {
    const sub = subscriptions.find((s) => s.id === editId);
    if (!sub) return;
    document.getElementById("modal-title").textContent = "Edit Subscription";
    document.getElementById("sub-id").value = sub.id;
    document.getElementById("sub-name").value = sub.name;
    document.getElementById("sub-category").value = sub.category;
    document.getElementById("sub-cycle").value = sub.billingCycle;
    document.getElementById("sub-cost").value = sub.cost;
    document.getElementById("sub-date").value = sub.nextRenewalDate;
    document.getElementById("sub-notes").value = sub.notes || "";
    document.getElementById("sub-active").checked = sub.isActive;
  } else {
    document.getElementById("modal-title").textContent = "Add Subscription";
    document.getElementById("sub-id").value = "";
    document.getElementById("sub-date").value = getFutureDateString(7);
  }

  modal.classList.add("open");
}

function closeModal() {
  document.getElementById("sub-modal").classList.remove("open");
}

window.editSubscription = function (id) {
  openModal(id);
};

window.toggleSubscriptionStatus = function (id) {
  const sub = subscriptions.find((s) => s.id === id);
  if (sub) {
    sub.isActive = !sub.isActive;
    saveToStorage();
    renderAll();
  }
};

window.deleteSubscription = function (id) {
  subscriptions = subscriptions.filter((s) => s.id !== id);
  saveToStorage();
  renderAll();
};

/* ==========================================================================
   CRUD #2: Category Budget Operations & Validation
   ========================================================================== */
window.editBudget = function (id) {
  const b = budgets.find((item) => item.id === id);
  if (!b) return;
  document.getElementById("budget-form-title").textContent = "Edit Category Budget";
  document.getElementById("budget-id").value = b.id;
  document.getElementById("budget-category-name").value = b.categoryName;
  document.getElementById("budget-monthly-cap").value = b.monthlyCap;
  document.getElementById("budget-alert-threshold").value = b.alertThreshold;
};

window.deleteBudget = function (id) {
  if (budgets.length <= 1) {
    document.getElementById("budget-form-error").textContent = "At least one category budget must remain.";
    return;
  }
  budgets = budgets.filter((b) => b.id !== id);
  saveToStorage();
  renderAll();
};

/* ==========================================================================
   Event Listeners & Initialization
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  loadFromStorage();

  // Restore theme preference
  if (localStorage.getItem(STORAGE_KEYS.THEME) === "dark") {
    document.body.classList.add("dark");
  }

  renderAll();

  // Navigation Tabs Switching
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".view-section").forEach((v) => v.classList.remove("active"));

      tab.classList.add("active");
      const targetId = tab.getAttribute("data-target");
      document.getElementById(targetId).classList.add("active");
    });
  });

  // Theme Toggle
  document.getElementById("theme-toggle-btn").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem(STORAGE_KEYS.THEME, isDark ? "dark" : "light");
  });

  // Modal Open/Close
  document.getElementById("open-add-modal-btn").addEventListener("click", () => openModal());
  document.getElementById("close-modal-btn").addEventListener("click", closeModal);
  document.getElementById("cancel-modal-btn").addEventListener("click", closeModal);

  // Filter & Search Listeners
  ["search-input", "filter-category", "filter-status", "sort-select"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderDirectory);
  });

  // Subscription Form Submit (Create & Update with Validation)
  document.getElementById("sub-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("sub-id").value;
    const name = document.getElementById("sub-name").value.trim();
    const category = document.getElementById("sub-category").value;
    const billingCycle = document.getElementById("sub-cycle").value;
    const cost = parseFloat(document.getElementById("sub-cost").value);
    const nextRenewalDate = document.getElementById("sub-date").value;
    const notes = document.getElementById("sub-notes").value.trim();
    const isActive = document.getElementById("sub-active").checked;
    const errorEl = document.getElementById("sub-form-error");

    if (!name || !category || isNaN(cost) || cost <= 0 || !nextRenewalDate) {
      errorEl.textContent = "Please enter a valid service name, positive cost, and renewal date.";
      return;
    }

    if (id) {
      const idx = subscriptions.findIndex((s) => s.id === id);
      if (idx !== -1) {
        subscriptions[idx] = { id, name, category, billingCycle, cost, nextRenewalDate, isActive, notes };
      }
    } else {
      subscriptions.push({
        id: "sub_" + Date.now(),
        name,
        category,
        billingCycle,
        cost,
        nextRenewalDate,
        isActive,
        notes
      });
    }

    saveToStorage();
    renderAll();
    closeModal();
  });

  // Budget Form Submit (Create & Update with Validation)
  document.getElementById("budget-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("budget-id").value;
    const categoryName = document.getElementById("budget-category-name").value.trim();
    const monthlyCap = parseFloat(document.getElementById("budget-monthly-cap").value);
    const alertThreshold = parseInt(document.getElementById("budget-alert-threshold").value, 10);
    const errorEl = document.getElementById("budget-form-error");

    if (!categoryName || isNaN(monthlyCap) || monthlyCap <= 0 || isNaN(alertThreshold) || alertThreshold < 10 || alertThreshold > 100) {
      errorEl.textContent = "Please provide a category name, a cap > $0, and a threshold between 10% and 100%.";
      return;
    }

    errorEl.textContent = "";
    if (id) {
      const idx = budgets.findIndex((b) => b.id === id);
      if (idx !== -1) {
        budgets[idx] = { id, categoryName, monthlyCap, alertThreshold };
      }
    } else {
      budgets.push({
        id: "b_" + Date.now(),
        categoryName,
        monthlyCap,
        alertThreshold
      });
    }

    document.getElementById("budget-form").reset();
    document.getElementById("budget-id").value = "";
    document.getElementById("budget-form-title").textContent = "Set Category Budget";
    saveToStorage();
    renderAll();
  });

  document.getElementById("budget-reset-btn").addEventListener("click", () => {
    document.getElementById("budget-form").reset();
    document.getElementById("budget-id").value = "";
    document.getElementById("budget-form-title").textContent = "Set Category Budget";
    document.getElementById("budget-form-error").textContent = "";
  });

  // Reset Demo Seed Data
  document.getElementById("seed-reset-btn").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEYS.SUBS);
    localStorage.removeItem(STORAGE_KEYS.BUDGETS);
    loadFromStorage();
    renderAll();
  });
});