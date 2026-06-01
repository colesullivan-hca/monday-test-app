const CONFIG = {
    boardIds: [
        18412077420,   // ← Replace with Board 1 ID
            // ← Replace with Board 2 ID
    ],
    // The ID of the "People" column that holds reviewers
    reviewerColumnId: 'multiple_person_mm3te832',       // ← Replace with your reviewer column ID

    // The ID of the status column to update on approve/deny
    statusColumnId: 'color_mm2xnfbh',         // ← Replace with your status column ID

    // Status column label values for approve/deny
    // These must match your board's status labels exactly
    statusApprovedLabel: 'Approved',  // ← Replace with your "approved" label
    statusDeniedLabel: 'Denied',    // ← Replace with your "denied" label
};

// Board display config: color dots and names per board ID
const BOARD_META = {
    [CONFIG.boardIds[0]]: { name: 'Board 1', color: '#0073ea' },
    [CONFIG.boardIds[1]]: { name: 'Board 2', color: '#00c875' },
};

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let monday = null;
let currentUser = null;
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

        const items = await fetchReviewItems(currentUser.id);
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

async function fetchCurrentUser() {
    const query = `query { me { id name email } }`;
    const res = await monday.api(query);
    return res?.data?.me || null;
}

async function fetchReviewItems(userId) {
    // Query both boards for items where the reviewer column contains this user
    const query = `
        query ($boardIds: [ID!]!) {
          boards(ids: $boardIds) {
            id
            name
            items_page(limit: 100) {
              items {
                id
                name
                updated_at
                column_values(ids: ["${CONFIG.reviewerColumnId}", "${CONFIG.statusColumnId}"]) {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `;

    const res = await monday.api(query, {
        variables: { boardIds: CONFIG.boardIds.map(String) }
    });

    const boards = res?.data?.boards || [];
    const matched = [];

    for (const board of boards) {
        const items = board.items_page?.items || [];
        for (const item of items) {
            const reviewerCol = item.column_values.find(c => c.id === CONFIG.reviewerColumnId);
            const statusCol = item.column_values.find(c => c.id === CONFIG.statusColumnId);

            if (reviewerColIncludesUser(reviewerCol, userId)) {
                matched.push({
                    id: item.id,
                    name: item.name,
                    boardId: board.id,
                    boardName: board.name,
                    updatedAt: item.updated_at,
                    statusText: statusCol?.text || '',
                    reviewStatus: deriveReviewStatus(statusCol?.text || ''),
                    columnValues: item.column_values,
                    rawItem: item,
                });
            }
        }
    }

    return matched;
}

function reviewerColIncludesUser(colValue, userId) {
    if (!colValue?.value) return false;
    try {
        const parsed = JSON.parse(colValue.value);
        const personsAndTeams = parsed?.personsAndTeams || [];
        return personsAndTeams.some(p => String(p.id) === String(userId) && p.kind === 'person');
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
    window.activeItem = item; // expose for your column-info code

    const meta = BOARD_META[item.boardId] || { name: item.boardName };
    document.getElementById('modal-board-label').textContent = meta.name;
    document.getElementById('modal-item-title').textContent = item.name;
    document.getElementById('modal-comment').value = '';

    // ── PLUG IN YOUR COLUMN VIEWER HERE ──
    // The slot element is ready. Call your existing function, e.g.:
    //   renderColumnInfo(document.getElementById('modal-columns-slot'), item);
    // For now it shows the placeholder defined in HTML.

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

    const item = activeItem;
    const comment = document.getElementById('modal-comment').value.trim();
    const label = decision === 'approved' ? CONFIG.statusApprovedLabel : CONFIG.statusDeniedLabel;

    setBtnsLoading(true);

    try {
        // 1. Find the index of the status label on this board
        const indexQuery = `
          query ($boardId: ID!, $columnId: String!) {
            boards(ids: [$boardId]) {
              columns(ids: [$columnId]) {
                settings_str
              }
            }
          }
        `;
        const idxRes = await monday.api(indexQuery, {
            variables: { boardId: String(item.boardId), columnId: CONFIG.statusColumnId }
        });

        const settingsRaw = idxRes?.data?.boards?.[0]?.columns?.[0]?.settings_str;
        const settings = JSON.parse(settingsRaw || '{}');
        const labelIndex = findStatusIndex(settings, label);

        if (labelIndex === null) {
            throw new Error(`Status label "${label}" not found on this board. Check CONFIG.`);
        }

        // 2. Update the status column
        const columnValue = JSON.stringify({ index: labelIndex });
        const mutation = `
          mutation ($itemId: ID!, $boardId: ID!, $colId: String!, $value: JSON!) {
            change_column_value(
              item_id: $itemId,
              board_id: $boardId,
              column_id: $colId,
              value: $value
            ) { id }
          }
        `;
        await monday.api(mutation, {
            variables: {
                itemId: String(item.id),
                boardId: String(item.boardId),
                colId: CONFIG.statusColumnId,
                value: columnValue,
            }
        });

        // 3. Optionally post comment via monday updates API
        if (comment) {
            await monday.api(`
            mutation ($itemId: ID!, $body: String!) {
              create_update(item_id: $itemId, body: $body) { id }
            }
          `, { variables: { itemId: String(item.id), body: comment } });
        }

        // 4. Update local state
        item.reviewStatus = decision;
        item.statusText = label;

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