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
  const allB1Cols     = [...new Set([...b1PeopleCols, ...b1StatusCols])];
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