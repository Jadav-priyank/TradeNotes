// State Management
const state = {
  token: localStorage.getItem('notes_api_token') || null,
  user: JSON.parse(localStorage.getItem('notes_api_user') || 'null'),
  currentPage: 1,
  limit: 12,
  sortOrder: 'desc',
  selectedMonth: '',
  availableMonths: [],
  debounceTimeout: null
};

// DOM Elements
const authSection = document.getElementById('authSection');
const appDashboard = document.getElementById('appDashboard');
const userBadge = document.getElementById('userBadge');
const userAvatar = document.getElementById('userAvatar');
const userNameDisplay = document.getElementById('userNameDisplay');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const logoutBtn = document.getElementById('logoutBtn');
const authAlert = document.getElementById('authAlert');

const filterTitleSelect = document.getElementById('filterTitleSelect');
const searchTitleInput = document.getElementById('searchTitleInput');
const filterMonthSelect = document.getElementById('filterMonthSelect');
const monthTabsStrip = document.getElementById('monthTabsStrip');
const filterStartDate = document.getElementById('filterStartDate');
const filterEndDate = document.getElementById('filterEndDate');
const sortBySelect = document.getElementById('sortBySelect');
const sortOrderIcon = document.getElementById('sortOrderIcon');
const activeFilterTags = document.getElementById('activeFilterTags');

const notesSectionHeading = document.getElementById('notesSectionHeading');
const notesContainer = document.getElementById('notesContainer');
const notesLoading = document.getElementById('notesLoading');
const notesEmptyState = document.getElementById('notesEmptyState');
const emptyStateMessage = document.getElementById('emptyStateMessage');
const paginationBar = document.getElementById('paginationBar');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageInfo = document.getElementById('pageInfo');

const statTotalPnl = document.getElementById('statTotalPnl');
const statTotalNotes = document.getElementById('statTotalNotes');
const statFilteredNotes = document.getElementById('statFilteredNotes');
const statActiveDate = document.getElementById('statActiveDate');

const noteModal = document.getElementById('noteModal');
const modalTitle = document.getElementById('modalTitle');
const noteEditId = document.getElementById('noteEditId');
const noteTitleSelect = document.getElementById('noteTitleSelect');
const noteTitleInput = document.getElementById('noteTitleInput');
const noteImageUrlInput = document.getElementById('noteImageUrlInput');
const noteImageFileInput = document.getElementById('noteImageFileInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const noteImagePreview = document.getElementById('noteImagePreview');
const noteContentInput = document.getElementById('noteContentInput');
const notePnlInput = document.getElementById('notePnlInput');
const noteCustomDateInput = document.getElementById('noteCustomDateInput');
const toast = document.getElementById('toast');

const imageLightboxModal = document.getElementById('imageLightboxModal');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxTitle = document.getElementById('lightboxTitle');

// API Helper
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    const data = await response.json();

    if (response.status === 401) {
      const isAuthEndpoint = endpoint.includes('/api/auth/login') || endpoint.includes('/api/auth/register');
      if (!isAuthEndpoint && state.token) {
        handleLogout();
        showToast('Session expired. Please sign in again.', 'error');
      }
      throw new Error(data.message || 'Unauthorized');
    }

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  } catch (err) {
    throw err;
  }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  if (state.token && state.user) {
    showDashboard();
  } else {
    showAuth();
  }

  logoutBtn.addEventListener('click', () => {
    handleLogout();
    showToast('Logged out successfully', 'success');
  });
});

// UI View Switchers
function showAuth() {
  authSection.classList.remove('hidden');
  appDashboard.classList.add('hidden');
  userBadge.classList.add('hidden');
}

function showDashboard() {
  authSection.classList.add('hidden');
  appDashboard.classList.remove('hidden');
  userBadge.classList.remove('hidden');

  if (state.user) {
    userAvatar.textContent = (state.user.username || 'U').charAt(0).toUpperCase();
    userNameDisplay.textContent = state.user.username;
    userEmailDisplay.textContent = state.user.email;
  }

  fetchNotes();
  fetchSummary();
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');

  authAlert.classList.add('hidden');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    tabLoginBtn.classList.remove('active');
    tabRegisterBtn.classList.add('active');
  }
}

// Authentication Handlers
async function handleLogin(event) {
  event.preventDefault();
  const identifier = document.getElementById('loginIdentifier').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: identifier, password })
    });

    state.token = res.data.token;
    state.user = res.data.user;
    localStorage.setItem('notes_api_token', state.token);
    localStorage.setItem('notes_api_user', JSON.stringify(state.user));

    showToast(`Welcome back, ${state.user.username}!`, 'success');
    showDashboard();
  } catch (err) {
    showAuthAlert(err.message, 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const username = document.getElementById('regUsername').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;

  try {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });

    state.token = res.data.token;
    state.user = res.data.user;
    localStorage.setItem('notes_api_token', state.token);
    localStorage.setItem('notes_api_user', JSON.stringify(state.user));

    showToast('Account created successfully!', 'success');
    showDashboard();
  } catch (err) {
    showAuthAlert(err.message, 'error');
  }
}

function handleLogout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('notes_api_token');
  localStorage.removeItem('notes_api_user');
  showAuth();
}

function showAuthAlert(msg, type = 'error') {
  authAlert.textContent = msg;
  authAlert.className = `alert-box ${type}`;
  authAlert.classList.remove('hidden');
}

// Debounce helper for live search
function debounceFetchNotes() {
  clearTimeout(state.debounceTimeout);
  state.debounceTimeout = setTimeout(() => {
    state.currentPage = 1;
    fetchNotes();
  }, 300);
}

// Toggle Sort Order
function toggleSortOrder() {
  state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
  sortOrderIcon.textContent = state.sortOrder === 'asc' ? '↑' : '↓';
  fetchNotes();
}

// Handle Title / Asset Filter Select Change (BTC / XAU / Custom)
function handleFilterTitleSelectChange(val) {
  if (val === 'custom') {
    searchTitleInput.classList.remove('hidden');
    searchTitleInput.value = '';
    searchTitleInput.focus();
    state.currentPage = 1;
    fetchNotes();
  } else {
    searchTitleInput.classList.add('hidden');
    searchTitleInput.value = val;
    state.currentPage = 1;
    fetchNotes();
  }
}

// Month Timeline Helpers
function getMonthLabel(yearMonthStr) {
  if (!yearMonthStr) return 'All Months';
  const parts = yearMonthStr.split('-');
  if (parts.length !== 2) return yearMonthStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = new Date(y, m, 1);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

function getShortMonthLabel(yearMonthStr) {
  if (!yearMonthStr) return 'All';
  const parts = yearMonthStr.split('-');
  if (parts.length !== 2) return yearMonthStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = new Date(y, m, 1);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}

function getYearMonthFromDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getCurrentYearMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Month Controls & Event Handlers
function handleMonthSelectChange(val) {
  state.selectedMonth = val || '';
  if (filterMonthSelect) filterMonthSelect.value = state.selectedMonth;

  // Clear date range inputs when a specific month is chosen
  if (state.selectedMonth) {
    if (filterStartDate) filterStartDate.value = '';
    if (filterEndDate) filterEndDate.value = '';
  }

  updateMonthChipsUI();
  state.currentPage = 1;
  fetchNotes();
}

function handleDateRangeChange() {
  // If user picks manual from/to date, unselect month filter
  if (filterStartDate.value || filterEndDate.value) {
    state.selectedMonth = '';
    if (filterMonthSelect) filterMonthSelect.value = '';
    updateMonthChipsUI();
  }
  state.currentPage = 1;
  fetchNotes();
}

function navigateMonth(delta) {
  let baseYM = state.selectedMonth || getCurrentYearMonth();
  const [yStr, mStr] = baseYM.split('-');
  let y = parseInt(yStr, 10);
  let m = parseInt(mStr, 10) - 1;

  m += delta;
  if (m < 0) {
    m = 11;
    y -= 1;
  } else if (m > 11) {
    m = 0;
    y += 1;
  }

  const nextYM = `${y}-${String(m + 1).padStart(2, '0')}`;
  handleMonthSelectChange(nextYM);
}

function setCurrentMonthFilter() {
  handleMonthSelectChange(getCurrentYearMonth());
}

function updateMonthChipsUI() {
  if (!monthTabsStrip) return;
  const chips = monthTabsStrip.querySelectorAll('.month-chip');
  chips.forEach(chip => {
    const chipMonth = chip.getAttribute('data-month');
    if (chipMonth === state.selectedMonth) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

function populateMonthOptions(monthlyBreakdown = []) {
  state.availableMonths = monthlyBreakdown;

  // 1. Populate Dropdown
  if (filterMonthSelect) {
    const currentVal = state.selectedMonth;
    let html = '<option value="">All Months (Show All)</option>';

    monthlyBreakdown.forEach(item => {
      const label = getMonthLabel(item.month);
      const pnlInfo = formatPnL(item.totalPnL);
      html += `<option value="${item.month}">${label} (${item.count} notes • ${pnlInfo.text})</option>`;
    });

    filterMonthSelect.innerHTML = html;
    filterMonthSelect.value = currentVal;
  }

  // 2. Populate Month Chips Strip
  if (monthTabsStrip) {
    let chipsHtml = `
      <button type="button" class="month-chip ${!state.selectedMonth ? 'active' : ''}" data-month="" onclick="handleMonthSelectChange('')">
        <span>All Months</span>
      </button>
    `;

    monthlyBreakdown.forEach(item => {
      const shortLabel = getShortMonthLabel(item.month);
      const pnlInfo = formatPnL(item.totalPnL);
      const isActive = state.selectedMonth === item.month ? 'active' : '';

      chipsHtml += `
        <button type="button" class="month-chip ${isActive}" data-month="${item.month}" onclick="handleMonthSelectChange('${item.month}')">
          <span>📅 ${shortLabel}</span>
          <span class="month-chip-count">${item.count}</span>
          <span class="month-chip-pnl ${pnlInfo.cls === 'pnl-positive' ? 'positive' : (pnlInfo.cls === 'pnl-negative' ? 'negative' : '')}">${pnlInfo.text}</span>
        </button>
      `;
    });

    monthTabsStrip.innerHTML = chipsHtml;
  }
}

// Clear Filters
function clearFilters() {
  if (filterTitleSelect) filterTitleSelect.value = '';
  searchTitleInput.value = '';
  searchTitleInput.classList.add('hidden');
  state.selectedMonth = '';
  if (filterMonthSelect) filterMonthSelect.value = '';
  filterStartDate.value = '';
  filterEndDate.value = '';
  sortBySelect.value = 'createdAt';
  state.sortOrder = 'desc';
  sortOrderIcon.textContent = '↓';
  state.currentPage = 1;
  updateMonthChipsUI();
  fetchNotes();
}

// Fetch Notes from API
async function fetchNotes() {
  if (!state.token) return;

  notesLoading.classList.remove('hidden');
  notesContainer.innerHTML = '';
  notesEmptyState.classList.add('hidden');
  paginationBar.classList.add('hidden');

  const title = searchTitleInput.value.trim();
  const month = state.selectedMonth;
  const startDate = filterStartDate.value;
  const endDate = filterEndDate.value;
  const sortBy = sortBySelect.value;
  const order = state.sortOrder;

  // Build query params
  const params = new URLSearchParams({
    page: state.currentPage,
    limit: state.limit,
    sortBy,
    order
  });

  if (title) params.append('title', title);
  if (month) {
    params.append('month', month);
  } else {
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
  }

  // Update filter pills UI
  renderFilterPills(title, month, startDate, endDate);

  try {
    const res = await apiRequest(`/api/notes?${params.toString()}`);
    const { notes, pagination, totalPnL } = res.data;

    notesLoading.classList.add('hidden');

    statFilteredNotes.textContent = pagination.total;

    // Update Total PnL in Stats Bar
    const pnlVal = totalPnL !== undefined ? totalPnL : 0;
    const pnlInfo = formatPnL(pnlVal);
    if (statTotalPnl) {
      statTotalPnl.textContent = pnlInfo.text;
      statTotalPnl.className = `stat-number ${pnlInfo.cls}`;
    }

    if (!notes || notes.length === 0) {
      notesEmptyState.classList.remove('hidden');
      if (month) {
        emptyStateMessage.textContent = `No notes found for ${getMonthLabel(month)}. Click 'New Note' to add one!`;
      } else if (title || startDate || endDate) {
        emptyStateMessage.textContent = 'No notes match your active search or date filters.';
      } else {
        emptyStateMessage.textContent = "You don't have any notes yet. Click 'New Note' to create one!";
      }
      return;
    }

    renderNotes(notes);
    renderPagination(pagination);
  } catch (err) {
    notesLoading.classList.add('hidden');
    showToast(err.message || 'Failed to fetch notes', 'error');
  }
}

// PnL Formatter & Parser Helpers
function parsePnLValue(raw) {
  if (raw === undefined || raw === null || raw === '') return 0;
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  const str = String(raw).trim();
  if (!str) return 0;
  const isNegative = str.includes('-');
  const cleanStr = str.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleanStr);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}

function formatPnL(num) {
  const n = typeof num === 'number' ? num : parsePnLValue(num);
  const abs = Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n > 0) return { text: `+₹${abs}`, cls: 'pnl-positive', val: n };
  if (n < 0) return { text: `-₹${abs}`, cls: 'pnl-negative', val: n };
  return { text: `₹${abs}`, cls: 'pnl-neutral', val: 0 };
}

function handlePnlInputStyle(input) {
  if (!input) return;
  const raw = input.value.trim();
  input.classList.remove('positive', 'negative');
  if (raw === '') return;
  if (raw === '-' || raw.startsWith('-')) {
    input.classList.add('negative');
  } else if (raw === '+' || raw.startsWith('+') || parsePnLValue(raw) > 0) {
    input.classList.add('positive');
  }
}

function formatDisplayDate(dateVal) {
  if (!dateVal) return 'Recently';
  const parsed = new Date(dateVal);
  if (isNaN(parsed.getTime())) {
    const fallback = new Date(String(dateVal).replace(' ', 'T'));
    if (!isNaN(fallback.getTime())) {
      return fallback.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return 'Recently';
  }
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Build a single Note Card DOM Element
function createNoteCardElement(note) {
  const card = document.createElement('div');
  card.className = 'note-card';

  const formattedDate = formatDisplayDate(note.createdAt || note.created_at);
  const pnlInfo = formatPnL(note.pnl);
  const pnlBadgeHtml = `<div class="pnl-badge ${pnlInfo.cls}"><span style="opacity:0.75; font-size:11px; margin-right:2px;">PnL:</span> ${pnlInfo.text}</div>`;

  const hasImage = Boolean(note.imageUrl);
  const safeImgUrl = hasImage ? escapeHtml(note.imageUrl) : '';
  const safeTitle = escapeHtml(note.title);

  const previewBtnHtml = hasImage
    ? `<button class="btn-icon btn-preview-action" onclick="openImageLightbox('${safeImgUrl}', '${safeTitle}')" title="Preview Image / Chart">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
      </button>`
    : '';

  const imageHtml = hasImage
    ? `<div class="note-card-img-container" onclick="openImageLightbox('${safeImgUrl}', '${safeTitle}')" title="Click to preview image">
        <img src="${safeImgUrl}" alt="${safeTitle}" class="note-card-img" loading="lazy" onerror="this.parentElement.style.display='none'">
      </div>`
    : '';

  card.innerHTML = `
    <div>
      <div class="note-header">
        <h4 class="note-title">${safeTitle}</h4>
        <div class="note-actions">
          ${previewBtnHtml}
          <button class="btn-icon" onclick="openNoteModal('${note.id}')" title="Edit Note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn-icon" onclick="handleDeleteNote('${note.id}')" title="Delete Note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
      ${imageHtml}
      <div class="note-content">${escapeHtml(note.content)}</div>
    </div>
    <div class="note-footer">
      ${pnlBadgeHtml}
      <div class="note-date">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        ${formattedDate}
      </div>
    </div>
  `;

  return card;
}

// Render Notes - Grouped by Month
function renderNotes(notes) {
  notesContainer.innerHTML = '';

  if (state.selectedMonth) {
    // Single month view
    if (notesSectionHeading) {
      notesSectionHeading.textContent = `Notes for ${getMonthLabel(state.selectedMonth)}`;
    }

    const grid = document.createElement('div');
    grid.className = 'notes-grid';
    notes.forEach(note => grid.appendChild(createNoteCardElement(note)));
    notesContainer.appendChild(grid);
    return;
  }

  // All Months: Group notes by Month (YYYY-MM)
  if (notesSectionHeading) {
    notesSectionHeading.textContent = 'Your Notes (Month-Wise)';
  }

  const monthGroups = new Map();
  notes.forEach(note => {
    const ym = getYearMonthFromDate(note.createdAt || note.created_at) || 'Other';
    if (!monthGroups.has(ym)) {
      monthGroups.set(ym, []);
    }
    monthGroups.get(ym).push(note);
  });

  monthGroups.forEach((groupNotes, ym) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'month-group';

    // Calculate subtotal PnL for this month group
    const groupPnL = groupNotes.reduce((acc, curr) => acc + (parseFloat(curr.pnl) || 0), 0);
    const pnlInfo = formatPnL(groupPnL);
    const label = ym === 'Other' ? 'Other Dates' : getMonthLabel(ym);

    groupDiv.innerHTML = `
      <div class="month-group-header">
        <div class="month-group-title">
          <span>📅 ${label}</span>
          <span class="month-note-count">${groupNotes.length} ${groupNotes.length === 1 ? 'note' : 'notes'}</span>
        </div>
        <div class="month-group-pnl ${pnlInfo.cls}">
          <span class="month-pnl-label">Monthly PnL:</span>
          <span>${pnlInfo.text}</span>
        </div>
      </div>
    `;

    const grid = document.createElement('div');
    grid.className = 'notes-grid';
    groupNotes.forEach(note => grid.appendChild(createNoteCardElement(note)));
    groupDiv.appendChild(grid);

    notesContainer.appendChild(groupDiv);
  });
}

// Render Filter Badges & Scope
function renderFilterPills(title, month, startDate, endDate) {
  activeFilterTags.innerHTML = '';

  if (title) {
    const pill = document.createElement('span');
    pill.className = 'filter-pill';
    pill.innerHTML = `Title: "${escapeHtml(title)}"`;
    activeFilterTags.appendChild(pill);
  }

  if (month) {
    const pill = document.createElement('span');
    pill.className = 'filter-pill';
    pill.innerHTML = `Month: ${getMonthLabel(month)}`;
    activeFilterTags.appendChild(pill);
    statActiveDate.textContent = getMonthLabel(month);
  } else if (startDate || endDate) {
    const pill = document.createElement('span');
    pill.className = 'filter-pill';
    pill.innerHTML = `Date: ${startDate || 'Any'} → ${endDate || 'Any'}`;
    activeFilterTags.appendChild(pill);
    statActiveDate.textContent = `${startDate || 'Start'} to ${endDate || 'Now'}`;
  } else {
    statActiveDate.textContent = 'All Time';
  }
}

// Render Pagination
function renderPagination(pagination) {
  if (pagination.totalPages <= 1) {
    paginationBar.classList.add('hidden');
    return;
  }

  paginationBar.classList.remove('hidden');
  pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
  prevPageBtn.disabled = !pagination.hasPrevPage;
  nextPageBtn.disabled = !pagination.hasNextPage;
}

function changePage(delta) {
  state.currentPage += delta;
  fetchNotes();
}

// Fetch Stats & Summary (with Month-wise Breakdown)
async function fetchSummary() {
  try {
    const res = await apiRequest('/api/notes/summary');
    statTotalNotes.textContent = res.data.totalNotes;
    populateMonthOptions(res.data.monthlyBreakdown || []);
  } catch (err) {
    console.error('Failed to load summary:', err);
  }
}

// Handle Image Attachment Preview & Upload
function handleImagePreview(url) {
  if (url && url.trim()) {
    noteImagePreview.src = url.trim();
    imagePreviewContainer.classList.remove('hidden');
  } else {
    imagePreviewContainer.classList.add('hidden');
    noteImagePreview.src = '';
  }
}

function handleImageFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be under 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      noteImageUrlInput.value = dataUrl;
      handleImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }
}

function clearImageAttachment() {
  noteImageUrlInput.value = '';
  if (noteImageFileInput) noteImageFileInput.value = '';
  imagePreviewContainer.classList.add('hidden');
  noteImagePreview.src = '';
}

// Handle Note Title Select in Modal
function handleNoteTitleSelectChange(val) {
  if (val === 'custom') {
    noteTitleInput.classList.remove('hidden');
    noteTitleInput.value = '';
    noteTitleInput.focus();
  } else {
    noteTitleInput.classList.add('hidden');
    noteTitleInput.value = val;
  }
}

// Modal & Note CRUD
async function openNoteModal(id = null) {
  noteEditId.value = '';
  noteContentInput.value = '';
  if (notePnlInput) {
    notePnlInput.value = '';
    handlePnlInputStyle(notePnlInput);
  }
  if (noteCustomDateInput) {
    noteCustomDateInput.value = '';
  }
  clearImageAttachment();

  if (id) {
    modalTitle.textContent = 'Edit Note';
    try {
      const res = await apiRequest(`/api/notes/${id}`);
      const note = res.data;
      noteEditId.value = note.id;
      noteContentInput.value = note.content;

      if (notePnlInput) {
        notePnlInput.value = note.pnl !== undefined && note.pnl !== null ? note.pnl : '';
        handlePnlInputStyle(notePnlInput);
      }

      if (noteCustomDateInput && (note.createdAt || note.created_at)) {
        const d = new Date(note.createdAt || note.created_at);
        if (!isNaN(d.getTime())) {
          // Format as YYYY-MM-DDTHH:mm for datetime-local input
          const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          noteCustomDateInput.value = localISO;
        }
      }

      if (note.imageUrl) {
        noteImageUrlInput.value = note.imageUrl;
        handleImagePreview(note.imageUrl);
      }

      if (note.title === 'BTC' || note.title === 'XAU') {
        noteTitleSelect.value = note.title;
        noteTitleInput.value = note.title;
        noteTitleInput.classList.add('hidden');
      } else {
        noteTitleSelect.value = 'custom';
        noteTitleInput.value = note.title || '';
        noteTitleInput.classList.remove('hidden');
      }
    } catch (err) {
      showToast(err.message || 'Failed to load note details', 'error');
      return;
    }
  } else {
    modalTitle.textContent = 'Create New Note';
    noteTitleSelect.value = 'BTC';
    noteTitleInput.value = 'BTC';
    noteTitleInput.classList.add('hidden');

    // Default custom date to current local time
    if (noteCustomDateInput) {
      const now = new Date();
      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      noteCustomDateInput.value = localISO;
    }
  }

  noteModal.classList.remove('hidden');
  if (noteTitleSelect.value === 'custom') {
    noteTitleInput.focus();
  } else {
    noteContentInput.focus();
  }
}

function closeNoteModal() {
  noteModal.classList.add('hidden');
}

function handleModalBackdropClick(event) {
  if (event.target === noteModal) {
    closeNoteModal();
  }
}

async function handleSaveNote(event) {
  event.preventDefault();
  const id = noteEditId.value;
  const title = noteTitleInput.value.trim();
  const imageUrl = noteImageUrlInput ? noteImageUrlInput.value.trim() : '';
  const rawPnl = notePnlInput ? notePnlInput.value.trim() : '';
  const pnl = rawPnl !== '' ? parsePnLValue(rawPnl) : 0;
  const customDate = noteCustomDateInput && noteCustomDateInput.value ? noteCustomDateInput.value : undefined;
  const content = noteContentInput.value.trim();

  if (!title) {
    showToast('Please enter a note title', 'error');
    return;
  }

  const payload = { title, imageUrl, pnl, content };
  if (customDate) {
    payload.date = customDate;
  }

  try {
    if (id) {
      // Update
      await apiRequest(`/api/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Note updated successfully!', 'success');
    } else {
      // Create
      await apiRequest('/api/notes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Note created successfully!', 'success');
    }

    closeNoteModal();
    fetchNotes();
    fetchSummary();
  } catch (err) {
    showToast(err.message || 'Failed to save note', 'error');
  }
}

async function handleDeleteNote(id) {
  if (!confirm('Are you sure you want to delete this private note?')) {
    return;
  }

  try {
    await apiRequest(`/api/notes/${id}`, {
      method: 'DELETE'
    });

    showToast('Note deleted', 'success');
    fetchNotes();
    fetchSummary();
  } catch (err) {
    showToast(err.message || 'Failed to delete note', 'error');
  }
}

// Lightbox (Image Preview)
function openImageLightbox(url, title = 'Chart Preview') {
  if (!url) return;
  if (lightboxImg) lightboxImg.src = url;
  if (lightboxTitle) lightboxTitle.textContent = `${title || 'Note'} • Image Preview`;
  if (imageLightboxModal) imageLightboxModal.classList.remove('hidden');
}

function closeImageLightbox() {
  if (imageLightboxModal) imageLightboxModal.classList.add('hidden');
  if (lightboxImg) lightboxImg.src = '';
}

function handleLightboxBackdropClick(event) {
  if (event.target === imageLightboxModal) {
    closeImageLightbox();
  }
}

// Global keyboard listeners
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (imageLightboxModal && !imageLightboxModal.classList.contains('hidden')) {
      closeImageLightbox();
    } else if (noteModal && !noteModal.classList.contains('hidden')) {
      closeNoteModal();
    }
  }
});

// Toast Notification
function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

// Utility
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
