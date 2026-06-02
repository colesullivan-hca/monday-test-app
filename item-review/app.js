const CONFIG = {
  // Board 1: 6 paired { peopleColId, statusColId } entries
  board1: {
    id: 18412077420,
    pairs: [
      { peopleColId: 'multiple_person_mm3te832',   statusColId: 'color_mm2x5q1s' },
      { peopleColId: 'multiple_person_mm3te832',   statusColId: 'color_mm2xnfbh' },
      { peopleColId: 'multiple_person_mm3te832',   statusColId: 'color_mm2x8nh2' },
      { peopleColId: 'multiple_person_mm3te832',   statusColId: 'color_mm2xerea' },
      { peopleColId: 'multiple_person_mm3xtzcj',   statusColId: 'color_mm3seyds' }, // conditional pair A
      { peopleColId: 'multiple_person_mm3x20zt',   statusColId: 'color_mm3s84rd' }, // conditional pair B
    ],
  },

  // Board 2: single reviewer column, multiple status columns
  board2: {
    id: 18412077425,
    reviewerColumnId: 'multiple_person_mm3tmrp3',
    statusColumnIds: ['color_mm3tzwcd', 'color_mm3txq9z', 'color_mm3t1vzy'],
  },

  awaitingLabel:  'Awaiting Review',
  approvedLabel:  'Approved',
  deniedLabel:    'Denied',

  board1FilesColumnId: 'file_mm2vqvz3',
  board2FilesColumnId: '',
};

const BOARD1_FORM_COLS = [
  'color_mm2vy7r8',
  'date_mm2yy6cp',
  'text_mm2vn25f',
  'text_mm2vh585',
  'text_mm2vc3h',
  'text_mm2vk860',
  'text_mm2vj6tf',
  'date_mm2vze0a',
  'date_mm2vnvrc',
  'numeric_mm2vt4x6', 'numeric_mm2vx6wy',
  'numeric_mm2v1d3j', 'numeric_mm2vqaak',
  'numeric_mm2vsqsd', 'numeric_mm2vr1m5',
  'numeric_mm2v651g', 'numeric_mm2vcjps',
  'numeric_mm2v3q9x', 'numeric_mm2vjmz',
  'numeric_mm2vs9mf', 'numeric_mm2vm1be',
  'numeric_mm2vsfjf', 'numeric_mm2vnekg',
  'numeric_mm2vg56f', 'numeric_mm2vrj5n',
  'numeric_mm2vt4ft', 'numeric_mm2vwf01',
  'numeric_mm2v4vtt', 'numeric_mm2v1ef6',
  'numeric_mm2vncda', 'numeric_mm2vd6bx',
  'long_text_mm2vd845',
];

// Board display config: color dots and names per board ID
const BOARD_META = {
    [CONFIG.board1.id]: { name: 'HCA Out Of State Travel Form', color: '#0073ea' },
    [CONFIG.board2.id]: { name: 'Reimbursement', color: '#00c875' },
};

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let monday = null;
let currentUser = null;
let currentUserTeamIds = [];
let allItems = [];
let activeItem = null;
let currentFilter = 'pending';

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    monday = window.mondaySdk();
    monday.setToken(''); // SDK handles token via context in custom objects

    try {
        const ctx = await monday.get('context');
        currentUser = ctx.data?.user;
        if (currentUser) {
            document.getElementById('user-label').textContent =
                `Showing items assigned to ${currentUser.name}`;
        }
    } catch (e) {
        console.warn('Could not get context user, will fall back to /me query:', e);
    }

    await loadQueue();
});

// ─────────────────────────────────────────────
// DATA FETCHING
// ─────────────────────────────────────────────
async function loadQueue() {
    showState('loading');
    setRefreshSpinning(true);

    try {
        // If context didn't give us the user, fetch via API
        if (!currentUser) {
            currentUser = await fetchCurrentUser();
            if (currentUser) {
                document.getElementById('user-label').textContent =
                    `Showing items assigned to ${currentUser.name}`;
            }
        }

        if (!currentUser) throw new Error('Could not identify current user.');

        const teams = await fetchCurrentUserTeams();
        currentUserTeamIds = teams.map(t => String(t.id));

        const items = await fetchReviewItems();
        allItems = items;
        renderQueue();
    } catch (err) {
        console.error(err);
        document.getElementById('error-msg').textContent = err.message || 'An error occurred.';
        showState('error');
    } finally {
        setRefreshSpinning(false);
    }
}

async function fetchCurrentUserTeams() {
  const res = await monday.api(`query { me { teams { id } } }`);
  return res?.data?.me?.teams || [];
}

async function fetchCurrentUser() {
    const query = `query { me { id name email } }`;
    const res = await monday.api(query);
    return res?.data?.me || null;
}

async function fetchReviewItems() {
  // Collect all unique column IDs to fetch
  const b1PeopleCols  = CONFIG.board1.pairs.map(p => p.peopleColId);
  const b1StatusCols  = CONFIG.board1.pairs.map(p => p.statusColId);
  const b2ColIds      = [CONFIG.board2.reviewerColumnId, ...CONFIG.board2.statusColumnIds];
  const allB1Cols = [...new Set([...b1PeopleCols, ...b1StatusCols, ...BOARD1_FORM_COLS])];
  const allB2Cols     = [...new Set(b2ColIds)];

  const query = `
    query ($b1Id: ID!, $b2Id: ID!, $b1Cols: [String!]!, $b2Cols: [String!]!) {
      board1: boards(ids: [$b1Id]) {
        id name
        items_page(limit: 100) {
          items {
            id name updated_at
            column_values(ids: $b1Cols) { id text value }
          }
        }
      }
      board2: boards(ids: [$b2Id]) {
        id name
        items_page(limit: 100) {
          items {
            id name updated_at
            column_values(ids: $b2Cols) { id text value }
          }
        }
      }
    }
  `;

  const res = await monday.api(query, {
    variables: {
      b1Id:   String(CONFIG.board1.id),
      b2Id:   String(CONFIG.board2.id),
      b1Cols: allB1Cols,
      b2Cols: allB2Cols,
    }
  });

  const items = [];

  // ── Board 1: check each pair ──
  for (const item of res?.data?.board1?.[0]?.items_page?.items || []) {
    const colMap = Object.fromEntries(item.column_values.map(c => [c.id, c]));

    for (const pair of CONFIG.board1.pairs) {
      const peopleCol = colMap[pair.peopleColId];
      const statusCol = colMap[pair.statusColId];

      // Must be assigned in the people col AND status must be Awaiting Review
      if (
        statusCol?.text?.trim() === CONFIG.awaitingLabel &&
        reviewerColIncludesUser(peopleCol, currentUser.id)
      ) {
        items.push({
          id:              item.id,
          name:            item.name,
          boardId:         CONFIG.board1.id,
          boardName:       res.data.board1[0].name,
          updatedAt:       item.updated_at,
          reviewStatus:    'pending',
          columnValues:    item.column_values,
          // Store which status col to update on this item
          activeStatusColId: pair.statusColId,
        });
        break; // only add the item once even if multiple pairs match
      }
    }
  }

  // ── Board 2: any status col showing Awaiting Review ──
  for (const item of res?.data?.board2?.[0]?.items_page?.items || []) {
    const colMap = Object.fromEntries(item.column_values.map(c => [c.id, c]));

    const reviewerCol = colMap[CONFIG.board2.reviewerColumnId];
    if (!reviewerColIncludesUser(reviewerCol, currentUser.id)) continue;

    const activeStatusCol = CONFIG.board2.statusColumnIds
      .map(id => colMap[id])
      .find(c => c?.text?.trim() === CONFIG.awaitingLabel);

    if (activeStatusCol) {
      items.push({
        id:              item.id,
        name:            item.name,
        boardId:         CONFIG.board2.id,
        boardName:       res.data.board2[0].name,
        updatedAt:       item.updated_at,
        reviewStatus:    'pending',
        columnValues:    item.column_values,
        activeStatusColId: activeStatusCol.id,
      });
    }
  }

  return items;
}

function reviewerColIncludesUser(colValue, userId) {
  if (!colValue?.value) return false;
  try {
    const parsed = JSON.parse(colValue.value);
    const personsAndTeams = parsed?.personsAndTeams || [];
    return personsAndTeams.some(p => {
      if (p.kind === 'person') return String(p.id) === String(userId);
      if (p.kind === 'team')   return currentUserTeamIds.includes(String(p.id));
      return false;
    });
  } catch {
    return false;
  }
}
function deriveReviewStatus(statusText) {
    const lower = statusText.toLowerCase();
    if (lower === CONFIG.statusApprovedLabel.toLowerCase()) return 'approved';
    if (lower === CONFIG.statusDeniedLabel.toLowerCase()) return 'denied';
    return 'pending';
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────
function renderQueue() {
    const counts = { pending: 0, approved: 0, denied: 0 };
    for (const item of allItems) counts[item.reviewStatus]++;

    document.getElementById('total-badge').textContent = allItems.length;
    document.getElementById('tab-count-pending').textContent = counts.pending;
    document.getElementById('tab-count-approved').textContent = counts.approved;
    document.getElementById('tab-count-denied').textContent = counts.denied;

    const filtered = currentFilter === 'all'
        ? allItems
        : allItems.filter(i => i.reviewStatus === currentFilter);

    const list = document.getElementById('queue-list');
    list.innerHTML = '';

    if (filtered.length === 0) {
        showState(currentFilter === 'pending' ? 'empty' : 'none');
        list.innerHTML = currentFilter !== 'pending'
            ? `<div class="state visible"><div class="state-icon">🔍</div><h3>No ${currentFilter} items</h3><p>Nothing here yet.</p></div>`
            : '';
        if (currentFilter === 'pending') showState('empty');
        return;
    }

    showState('none');
    for (const item of filtered) {
        list.appendChild(buildQueueCard(item));
    }
}

function buildQueueCard(item) {
    const meta = BOARD_META[item.boardId] || { name: item.boardName, color: '#c5c7d4' };
    const el = document.createElement('div');
    el.className = 'queue-item';
    el.dataset.itemId = item.id;

    const statusMap = {
        pending: { label: 'Pending Review', cls: 'status-pending' },
        approved: { label: 'Approved', cls: 'status-approved' },
        denied: { label: 'Denied', cls: 'status-denied' },
    };
    const { label, cls } = statusMap[item.reviewStatus] || statusMap.pending;

    el.innerHTML = `
        <div class="queue-item-board-dot" style="background:${meta.color}"></div>
        <div class="queue-item-info">
          <div class="queue-item-name">${escHtml(item.name)}</div>
          <div class="queue-item-meta">
            <span class="queue-item-board">${escHtml(meta.name)}</span>
            <span class="queue-item-date">· Updated ${formatDate(item.updatedAt)}</span>
          </div>
        </div>
        <span class="queue-item-status ${cls}">${label}</span>
        <span class="queue-item-arrow">›</span>
      `;

    el.addEventListener('click', () => openModal(item));
    return el;
}

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
function openModal(item) {
  activeItem = item;
  window.activeItem = item;
 
  const meta = BOARD_META[item.boardId] || { name: item.boardName };
  document.getElementById('modal-board-label').textContent = meta.name;
  document.getElementById('modal-item-title').textContent  = item.name;
  document.getElementById('modal-comment').value = '';
 
  // Reset to form tab on each open
  activeModalTab = 'form';
 
  // Render tab bar + panels
  renderModalTabs(item);
 
  document.getElementById('modal-overlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('visible');
    document.body.style.overflow = '';
    activeItem = null;
    window.activeItem = null;
}

function handleOverlayClick(e) {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
}

// ─────────────────────────────────────────────
// REVIEW SUBMISSION
// ─────────────────────────────────────────────
async function submitReview(decision) {
  if (!activeItem) return;

  const item    = activeItem;
  const comment = document.getElementById('modal-comment').value.trim();
  const label   = decision === 'approved' ? CONFIG.approvedLabel : CONFIG.deniedLabel;

  setBtnsLoading(true);

  try {
    // Look up the index for the label on this board's specific status column
    const indexQuery = `
      query ($boardId: ID!, $columnId: String!) {
        boards(ids: [$boardId]) {
          columns(ids: [$columnId]) { settings_str }
        }
      }
    `;
    const idxRes = await monday.api(indexQuery, {
      variables: {
        boardId:  String(item.boardId),
        columnId: item.activeStatusColId,  // use the stored active col
      }
    });

    const settings   = JSON.parse(idxRes?.data?.boards?.[0]?.columns?.[0]?.settings_str || '{}');
    const labelIndex = findStatusIndex(settings, label);
    if (labelIndex === null) throw new Error(`Label "${label}" not found. Check CONFIG.`);

    await monday.api(`
      mutation ($itemId: ID!, $boardId: ID!, $colId: String!, $value: JSON!) {
        change_column_value(item_id: $itemId, board_id: $boardId, column_id: $colId, value: $value) { id }
      }
    `, {
      variables: {
        itemId:  String(item.id),
        boardId: String(item.boardId),
        colId:   item.activeStatusColId,
        value:   JSON.stringify({ index: labelIndex }),
      }
    });

    if (comment) {
      await monday.api(`
        mutation ($itemId: ID!, $body: String!) {
          create_update(item_id: $itemId, body: $body) { id }
        }
      `, { variables: { itemId: String(item.id), body: comment } });
    }

    item.reviewStatus = decision;
    closeModal();
    renderQueue();
    showToast(decision === 'approved' ? 'Item approved ✓' : 'Item denied', decision === 'approved' ? 'success' : 'error');
  } catch (err) {
    console.error(err);
    showToast('Failed to update: ' + err.message, 'error');
  } finally {
    setBtnsLoading(false);
  }
}

function findStatusIndex(settings, labelText) {
    // monday status settings_str has labels as { "0": "Working on it", "1": "Done", ... }
    const labels = settings.labels || {};
    for (const [idx, text] of Object.entries(labels)) {
        if (text.toLowerCase() === labelText.toLowerCase()) return parseInt(idx, 10);
    }
    return null;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.filter === filter);
    });
    renderQueue();
}

function showState(name) {
    ['loading', 'error', 'empty'].forEach(s => {
        document.getElementById(`state-${s}`).classList.toggle('visible', s === name);
    });
}

function setRefreshSpinning(on) {
    document.getElementById('refresh-btn').classList.toggle('spinning', on);
}

function setBtnsLoading(on) {
    document.getElementById('btn-approve').disabled = on;
    document.getElementById('btn-deny').disabled = on;
}

let toastTimer = null;
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `show toast-${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = ''; }, 3000);
}

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const MODAL_TABS = {
    // Board 1: form view, documents, updates
    [CONFIG.board1.id]: [
        { id: 'form', label: 'Form', icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>' },
        { id: 'docs', label: 'Documents', icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>' },
        { id: 'updates', label: 'Updates', icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"/></svg>' },
    ],
    // Board 2: form view, documents, updates
    // Extend or simplify tabs here as needed for board 2
    [CONFIG.board2.id]: [
        { id: 'form', label: 'Form', icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>' },
        { id: 'docs', label: 'Documents', icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>' },
        { id: 'updates', label: 'Updates', icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"/></svg>' },
    ],
};

let activeModalTab = 'form';

// ── Tab rendering ─────────────────────────────────────────────

function renderModalTabs(item) {
    const tabs = MODAL_TABS[item.boardId] || MODAL_TABS[CONFIG.board1.id];
    const tabBar = document.getElementById('modal-tabs');
    const body = document.getElementById('modal-body');

    // Build tab buttons
    tabBar.innerHTML = tabs.map(t => `
    <button
      class="modal-tab ${t.id === activeModalTab ? 'active' : ''}"
      data-tab="${t.id}"
      onclick="switchModalTab('${t.id}')"
    >
      ${t.icon} ${t.label}
    </button>
  `).join('');

    // Build panels (all rendered, CSS hides inactive ones)
    body.innerHTML = tabs.map(t => `
    <div class="modal-panel ${t.id === activeModalTab ? 'active' : ''}" id="panel-${t.id}"></div>
  `).join('');

    // Render the initially active tab immediately, lazy-load others on click
    renderTabPanel(activeModalTab, item);
}

function switchModalTab(tabId) {
    if (tabId === activeModalTab) return;
    activeModalTab = tabId;

    document.querySelectorAll('.modal-tab').forEach(b =>
        b.classList.toggle('active', b.dataset.tab === tabId)
    );
    document.querySelectorAll('.modal-panel').forEach(p =>
        p.classList.toggle('active', p.id === `panel-${tabId}`)
    );

    // Lazy-render panel content on first visit
    const panel = document.getElementById(`panel-${tabId}`);
    if (panel && !panel.dataset.rendered) {
        renderTabPanel(tabId, activeItem);
    }
}

function renderTabPanel(tabId, item) {
    const panel = document.getElementById(`panel-${tabId}`);
    if (!panel) return;
    panel.dataset.rendered = '1';

    if (tabId === 'form') {
        renderFormPanel(panel, item);
    } else if (tabId === 'docs') {
        renderDocsPanel(panel, item);
    } else if (tabId === 'updates') {
        renderUpdatesPanel(panel, item);
    }
}

// ── Form panel ───────────────────────────────────────────────

function renderFormPanel(panel, item) {
    const isBoard1 = String(item.boardId) === String(CONFIG.board1.id);

    if (isBoard1) {
        renderBoard1Form(panel, item);
    } else {
        renderBoard2Form(panel, item);
    }
}

function renderBoard1Form(panel, item) {
    // Build a column value lookup map for convenience
    const col = (id) => {
        const c = item.columnValues?.find(c => c.id === id);
        return c?.text || '';
    };

    // Mirror your index.html table structure, populated from column values
    panel.innerHTML = `
    <div class="form-panel-wrap">
      <div class="form-container">
        <h1>HCA OUT of STATE TRAVEL REQUEST FORM</h1>
        <table>
          <tr>
            <td class="label">DIVISION:</td>
            <td>${escHtml(col('color_mm2vy7r8'))}</td>
            <td class="label">DATE:</td>
            <td>${escHtml(col('date_mm2yy6cp'))}</td>
          </tr>
        </table>
 
        <table>
          <tr><td colspan="4" class="section-title">Section 1. TRAVELER INFORMATION</td></tr>
          <tr>
            <td class="label">TRAVELER:</td>
            <td>${escHtml(col('text_mm2vn25f'))}</td>
            <td class="label">SHARE ID:</td>
            <td>${escHtml(col('text_mm2vh585'))}</td>
          </tr>
          <tr>
            <td class="label">POSITION/TITLE:</td>
            <td colspan="3">${escHtml(col('text_mm2vc3h'))}</td>
          </tr>
        </table>
 
        <table>
          <tr><td colspan="4" class="section-title">Section 2. TRIP INFORMATION</td></tr>
          <tr>
            <td class="label">DESTINATION:</td>
            <td>${escHtml(col('text_mm2vk860'))}</td>
            <td class="label">NAME OF CONFERENCE:</td>
            <td>${escHtml(col('text_mm2vj6tf'))}</td>
          </tr>
          <tr>
            <td class="label">DEPARTURE DATE:</td>
            <td>${escHtml(col('date_mm2vze0a'))}</td>
            <td class="label">RETURN DATE:</td>
            <td>${escHtml(col('date_mm2vnvrc'))}</td>
          </tr>
        </table>
 
        <table>
          <tr><td colspan="4" class="section-title">Section 3. COST INFORMATION</td></tr>
          <tr><th>ITEM</th><th>AMOUNT</th><th>ACCT CODE</th><th>REIMBURSEMENT PO AMOUNTS</th></tr>
          ${costRow('1. AIRLINE or OTHER FARES', col('numeric_mm2vt4x6'), '549700', col('numeric_mm2vx6wy'))}
          ${costRow('2. MILEAGE', col('numeric_mm2v1d3j'), '549700', col('numeric_mm2vqaak'))}
          ${costRow('3. MISC. TRANSPORTATION', col('numeric_mm2vsqsd'), '549700', col('numeric_mm2vr1m5'))}
          ${costRow('4. OTHER MILEAGE / FEES', col('numeric_mm2v651g'), '549700', col('numeric_mm2vcjps'))}
          ${costRow('\u00a0\u00a0\u00a0\u00a0AIRPORT PARKING', col('numeric_mm2v3q9x'), '549700', col('numeric_mm2vjmz'))}
          ${costRow('\u00a0\u00a0\u00a0\u00a0CAR RENTAL', col('numeric_mm2vs9mf'), '549700', col('numeric_mm2vm1be'))}
          <tr>
            <td>5. TOTAL LINES 1 through 4</td>
            <td class="right">${formatCurrency(sumCols(item, ['numeric_mm2vt4x6', 'numeric_mm2v1d3j', 'numeric_mm2vsqsd', 'numeric_mm2v651g', 'numeric_mm2v3q9x', 'numeric_mm2vs9mf']))}</td>
            <td></td>
            <td class="right">${formatCurrency(sumCols(item, ['numeric_mm2vx6wy', 'numeric_mm2vqaak', 'numeric_mm2vr1m5', 'numeric_mm2vcjps', 'numeric_mm2vjmz', 'numeric_mm2vm1be']))}</td>
          </tr>
          ${costRow('6. PER DIEM FINAL DAY', col('numeric_mm2vsfjf'), '549600', col('numeric_mm2vnekg'))}
          ${costRow('7. MEALS', col('numeric_mm2vg56f'), '549600', col('numeric_mm2vrj5n'))}
          ${costRow('8. LODGING', col('numeric_mm2vt4ft'), '549600', col('numeric_mm2vwf01'))}
          <tr>
            <td>9. TOTAL LINES 6 through 8</td>
            <td class="right">${formatCurrency(sumCols(item, ['numeric_mm2vsfjf', 'numeric_mm2vg56f', 'numeric_mm2vt4ft']))}</td>
            <td></td>
            <td class="right">${formatCurrency(sumCols(item, ['numeric_mm2vnekg', 'numeric_mm2vrj5n', 'numeric_mm2vwf01']))}</td>
          </tr>
          ${costRow('10. CONFERENCE FEES or DUES', col('numeric_mm2v4vtt'), '546800', col('numeric_mm2v1ef6'))}
          ${costRow('11. OTHER EXPENSES', col('numeric_mm2vncda'), '547900', col('numeric_mm2vd6bx'))}
          <tr>
            <td><strong>TOTAL</strong></td>
            <td class="right"><strong>${formatCurrency(sumCols(item, [
        'numeric_mm2vt4x6', 'numeric_mm2v1d3j', 'numeric_mm2vsqsd', 'numeric_mm2v651g',
        'numeric_mm2v3q9x', 'numeric_mm2vs9mf', 'numeric_mm2vsfjf', 'numeric_mm2vg56f',
        'numeric_mm2vt4ft', 'numeric_mm2v4vtt', 'numeric_mm2vncda'
    ]))}</strong></td>
            <td></td>
            <td class="right"><strong>${formatCurrency(sumCols(item, [
        'numeric_mm2vx6wy', 'numeric_mm2vqaak', 'numeric_mm2vr1m5', 'numeric_mm2vcjps',
        'numeric_mm2vjmz', 'numeric_mm2vm1be', 'numeric_mm2vnekg', 'numeric_mm2vrj5n',
        'numeric_mm2vwf01', 'numeric_mm2v1ef6', 'numeric_mm2vd6bx'
    ]))}</strong></td>
          </tr>
        </table>
 
        <table>
          <tr><td class="section-title">Section 4. JUSTIFICATION</td></tr>
          <tr><td style="white-space:pre-wrap;font-size:13px;padding:10px 8px;">${escHtml(col('long_text_mm2vd845'))}</td></tr>
        </table>
      </div>
    </div>
  `;
}

function costRow(label, amount, acct, po) {
    return `
    <tr>
      <td>${label}</td>
      <td class="right">${amount ? formatCurrency(parseFloat(amount)) : ''}</td>
      <td class="center">${acct}</td>
      <td class="right">${po ? formatCurrency(parseFloat(po)) : ''}</td>
    </tr>
  `;
}

function sumCols(item, colIds) {
    return colIds.reduce((sum, id) => {
        const c = item.columnValues?.find(c => c.id === id);
        return sum + (parseFloat(c?.text) || 0);
    }, 0);
}

function formatCurrency(n) {
    if (!n && n !== 0) return '';
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ── Board 2 form stub ─────────────────────────────────────────
// Replace this with your actual board 2 column IDs and layout

function renderBoard2Form(panel, item) {
    const col = (id) => item.columnValues?.find(c => c.id === id)?.text || '';

    panel.innerHTML = `
    <div class="form-panel-wrap">
      <div class="form-container">
        <h1>Board 2 Form</h1>
        <table>
          <tr><td colspan="2" class="section-title">Section 1. INFORMATION</td></tr>
          <!-- Add your board 2 rows here using col('your_column_id') -->
          <tr>
            <td class="label">FIELD 1:</td>
            <td>${escHtml(col('your_col_id_here'))}</td>
          </tr>
        </table>
        <p style="padding:12px;font-size:13px;color:#676879;">
          ↑ Replace with your board 2 column IDs and table structure.
        </p>
      </div>
    </div>
  `;
}

// ── Documents panel ───────────────────────────────────────────

async function renderDocsPanel(panel, item) {
    panel.innerHTML = `<div class="tab-loading"><div class="spinner-ring"></div> Loading files…</div>`;

    const filesColId = String(item.boardId) === String(CONFIG.board1.id)
        ? CONFIG.board1FilesColumnId
        : CONFIG.board2FilesColumnId;

    try {
        const res = await monday.api(`
      query ($itemId: ID!, $colId: String!) {
        items(ids: [$itemId]) {
          assets(column_ids: [$colId]) {
            id
            name
            file_size
            file_extension
            public_url
            created_at
          }
        }
      }
    `, { variables: { itemId: String(item.id), colId: filesColId } });

        const assets = res?.data?.items?.[0]?.assets || [];

        if (!assets.length) {
            panel.innerHTML = `
        <div class="docs-panel">
          <div class="docs-empty">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
            <p>No documents attached to this item.</p>
          </div>
        </div>
      `;
            return;
        }

        panel.innerHTML = `
      <div class="docs-panel">
        <div class="docs-grid">
          ${assets.map(a => docCard(a, item, filesColId)).join('')}
        </div>
      </div>
    `;
    } catch (err) {
        panel.innerHTML = `<div class="docs-panel"><div class="docs-empty"><p>Failed to load files: ${escHtml(err.message)}</p></div></div>`;
    }
}

function openMondayFileViewer(assetId, itemId, columnId) {
  monday.execute('openFilesDialog', {
    boardId:  String(activeItem.boardId),
    itemId:   String(itemId),
    columnId: columnId,
    assetId:  String(assetId),
  });
}

function getPreviewUrl(url, ext) {
  const isImage = ['png','jpg','jpeg','gif','webp'].includes(ext);
  if (isImage) return url; // images open fine directly
  // Google viewer handles PDF, DOCX, XLSX, etc.
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=false`;
}

function docCard(asset, item, filesColId) {
    const ext = (asset.file_extension || '').toLowerCase();
    const size = formatFileSize(asset.file_size);
    const emoji = fileEmoji(ext);
    const date = asset.created_at ? new Date(asset.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    const previewUrl = getPreviewUrl(asset.public_url, ext);
    
    return `
    <div class="doc-card">
      <div class="doc-card-icon">${emoji}</div>
      <div class="doc-card-name">${escHtml(asset.name)}</div>
      <div class="doc-card-meta">${ext}${size ? ' · ' + size : ''}${date ? ' · ' + date : ''}</div>
      <a class="doc-card-open" href="${escHtml(previewUrl)}" target="_blank" rel="noopener">
        Open
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/></svg>
      </a>
    </div>
  `;
}

function fileEmoji(ext) {
    const map = { PDF: '📄', DOC: '📝', DOCX: '📝', XLS: '📊', XLSX: '📊', PNG: '🖼️', JPG: '🖼️', JPEG: '🖼️', GIF: '🖼️', ZIP: '📦', CSV: '📊' };
    return map[ext] || '📎';
}

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Updates panel ─────────────────────────────────────────────

async function renderUpdatesPanel(panel, item) {
    panel.innerHTML = `<div class="tab-loading"><div class="spinner-ring"></div> Loading updates…</div>`;

    try {
        const res = await monday.api(`
      query ($itemId: ID!) {
        items(ids: [$itemId]) {
          updates(limit: 25) {
            id
            body
            created_at
            creator { id name }
          }
        }
      }
    `, { variables: { itemId: String(item.id) } });

        const updates = res?.data?.items?.[0]?.updates || [];

        if (!updates.length) {
            panel.innerHTML = `
        <div class="updates-panel">
          <div class="updates-empty">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clip-rule="evenodd"/></svg>
            <p>No updates on this item yet.</p>
          </div>
        </div>
      `;
            return;
        }

        panel.innerHTML = `
      <div class="updates-panel">
        ${updates.map(u => updateCard(u)).join('')}
      </div>
    `;
    } catch (err) {
        panel.innerHTML = `<div class="updates-panel"><div class="updates-empty"><p>Failed to load updates: ${escHtml(err.message)}</p></div></div>`;
    }
}

function updateCard(update) {
    const name = update.creator?.name || 'Unknown';
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const date = update.created_at
        ? new Date(update.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : '';
    // Strip basic HTML tags from monday update body for plain text display
    const body = (update.body || '').replace(/<[^>]+>/g, '').trim();

    return `
    <div class="update-card">
      <div class="update-card-header">
        <div class="update-avatar">${escHtml(initials)}</div>
        <span class="update-author">${escHtml(name)}</span>
        <span class="update-date">${date}</span>
      </div>
      <div class="update-body">${escHtml(body)}</div>
    </div>
  `;
}
