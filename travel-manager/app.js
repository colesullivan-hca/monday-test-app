// =============================================================================
//  app.js  —  App bootstrap, routing, and save logic.
//  You should not need to edit this for normal config changes.
//  To add new editable fields to the forms, see forms-pre.js / forms-post.js.
// =============================================================================

import { fetchAllBoards, assembleTrips, MUTATION_CHANGE_COLUMN } from './data.js';
import { BOARDS, HCA_PACKET_COLS, ISTE_PACKET_COLS, ISTE_SUBITEM_COLS } from './config.js';
import { renderSidebar, renderDetail, renderEmptyState } from './render.js';
import { collectPreFormData, initPreFormListeners } from './forms-pre.js';
import { collectPostFormData } from './forms-post.js';

const monday = window.mondaySdk();

// App state
let trips            = {};
let activeId         = null;
let activeTab        = 'pre'; // 'pre' | 'post'
let originalFormData = null;
let isDirty          = false;


// ---------------------------------------------------------------------------
//  Boot
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
//  serializeColumnValue(colId, value)
//  Converts a form value to the JSON string monday's API expects.
//  monday type detection is based on column ID prefix conventions:
//    color_*      → status/color  → { "label": "Approved" }
//    date_*       → date          → { "date": "YYYY-MM-DD" }
//    long_text_*  → long text     → { "text": "..." }
//    numeric_*    → number        → raw number string
//    text_*       → short text    → raw string
// ---------------------------------------------------------------------------
function serializeColumnValue(colId, value) {
  // Already an object (caller built the shape) — just stringify
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  const prefix = colId.split('_')[0];
  switch (prefix) {
    case 'color':
      return JSON.stringify({ label: String(value) });
    case 'date':
      return value ? JSON.stringify({ date: String(value) }) : '""';
    case 'long':       // long_text_*
      return JSON.stringify({ text: String(value) });
    case 'numeric':
    case 'numbers':
      return JSON.stringify(String(parseFloat(value) || 0));
    default:           // text_* and anything else
      return JSON.stringify(String(value));
  }
}

async function init() {
  const loader = document.getElementById('loader');

  try {
    const context = await monday.get('context');
    console.log('monday context:', context?.data);
    // If you see boardId / itemId / accountId here, the SDK is connected.
    // If context.data is empty, the app isn't running inside a monday view.

    const raw  = await fetchAllBoards(monday);
    trips      = assembleTrips(raw);

    renderSidebar(trips, { onSelect });
    renderEmptyState();

    // Auto-select first active trip if any
    const firstActive = Object.values(trips).find(t =>
      ['preTravel', 'postTravel', 'travelling'].includes(t.state)
    );
    if (firstActive) onSelect(firstActive.tripID);

  } catch (err) {
    console.error('Init error:', err);
    loader.innerHTML = `
      <div class="error-state">
        <p>Could not load trip data.</p>
        <p class="error-detail">${err.message}</p>
        <p class="error-detail">Check the console for details. Common causes:<br>
          • Board ID in config.js doesn't match an accessible board<br>
          • App doesn't have permission to read these boards<br>
          • App is being opened outside of a monday.com view
        </p>
        <button onclick="location.reload()">Retry</button>
      </div>`;
    return;
  }

  loader.classList.add('hidden');
}


// ---------------------------------------------------------------------------
//  Navigation
// ---------------------------------------------------------------------------

async function onSelect(tripId) {
  if (isDirty && !(await confirmDiscard())) return;
  isDirty  = false;
  activeId  = tripId;
  activeTab = 'pre';
  renderDetail(trips[tripId], activeTab, { onSavePre, onSavePost, onTabSwitch, onNotifyTraveler });
  highlightSidebarItem(tripId);
  initFileDialogListeners();
  snapshotAndWatch('pre');
}

async function onTabSwitch(tab) {
  if (isDirty && !(await confirmDiscard())) return;
  isDirty   = false;
  activeTab = tab;
  renderDetail(trips[activeId], tab, { onSavePre, onSavePost, onTabSwitch, onNotifyTraveler });
  initFileDialogListeners();
  snapshotAndWatch(tab);
}

async function onNotifyTraveler({ email, name, trip }) {
  if (!email) {
    monday.execute('notice', { message: 'No email on file for this traveler.', type: 'error' });
    return;
  }
  // monday.execute('sendNotification') requires a userId, not an email.
  // The cleanest option here is to open a pre-filled mailto link.
  const subject = encodeURIComponent(`Reimbursement form needed — ${trip}`);
  const body    = encodeURIComponent(
    `Hi ${name},\n\nWe're ready to process your reimbursement for "${trip}" but haven't received your completed form yet.\n\nPlease submit it at your earliest convenience.\n\nThank you`
  );
  window.open(`mailto:${email}?subject=${subject}&body=${body}`);
}

function highlightSidebarItem(tripId) {
  document.querySelectorAll('.sidebar-trip').forEach(el => {
    el.classList.toggle('active', el.dataset.tripId === tripId);
  });
}

// ---------------------------------------------------------------------------
//  Dirty tracking
// ---------------------------------------------------------------------------

function snapshotAndWatch(tab) {
  // Snapshot must happen after the DOM is rendered
  originalFormData = tab === 'pre' ? collectPreFormData() : collectPostFormData();
  isDirty = false;

  const formId = tab === 'pre' ? 'pre-travel-form' : 'post-travel-form';
  const form   = document.getElementById(formId);
  if (!form) return;

  const handler = () => {
    const current = tab === 'pre' ? collectPreFormData() : collectPostFormData();
    isDirty = Object.keys(current).some(
      k => JSON.stringify(current[k]) !== JSON.stringify(originalFormData[k])
    );
  };
  form.addEventListener('input',  handler);
  form.addEventListener('change', handler);
}

async function confirmDiscard() {
  const res = await monday.execute('confirm', {
    message:     'You have unsaved changes. Discard them?',
    confirmText: 'Discard',
    cancelText:  'Keep editing',
    severity:    'danger',
  });
  return res?.data?.confirm === true;
}


// ---------------------------------------------------------------------------
//  Save — Board 2 (HCA Packet)
// ---------------------------------------------------------------------------

async function onSavePre(formData) {
  const trip = trips[activeId];
  if (!trip?.mondayItemId_hca) {
    showSaveStatus('No HCA board item linked to this trip.', 'error');
    return;
  }

  try {
    showSaveStatus('Saving…', 'info');

    const changed = Object.fromEntries(
      Object.entries(formData).filter(([k, v]) =>
        JSON.stringify(v) !== JSON.stringify(originalFormData?.[k])
      )
    );

    if (!Object.keys(changed).length) {
      showSaveStatus('No changes to save', 'success');
      return;
    }

    for (const [fieldKey, value] of Object.entries(changed)) {
      const colId = HCA_PACKET_COLS[fieldKey];
      if (!colId || value === undefined) continue;

      await monday.api(MUTATION_CHANGE_COLUMN, {
        variables: {
          boardId:  String(BOARDS.hcaPacket),
          itemId:   String(trip.mondayItemId_hca),
          columnId: colId,
          value:    serializeColumnValue(colId, value),
        },
      });

      trip[fieldKey] = typeof value === 'object' ? (value.label ?? value.date ?? '') : value;
    }

    rehydrateTrip(trip);
    renderDetail(trip, activeTab, { onSavePre, onSavePost, onTabSwitch, onNotifyTraveler });
    renderSidebar(trips, { onSelect });
    highlightSidebarItem(activeId);
    originalFormData = formData;
    isDirty = false;
    showSaveStatus('Saved', 'success');

  } catch (err) {
    console.error('Save error:', err);
    showSaveStatus('Save failed — check console', 'error');
  }
}


// ---------------------------------------------------------------------------
//  Save — Board 4 (ISTE Packet)
// ---------------------------------------------------------------------------

async function onSavePost(formData) {
  const trip = trips[activeId];
  if (!trip?.mondayItemId_iste) {
    showSaveStatus('No ISTE board item linked to this trip.', 'error');
    return;
  }

  try {
    showSaveStatus('Saving…', 'info');

    const changed = Object.fromEntries(
      Object.entries(formData).filter(([k, v]) =>
        JSON.stringify(v) !== JSON.stringify(originalFormData?.[k])
      )
    );

    if (!Object.keys(changed).length) {
      showSaveStatus('No changes to save', 'success');
      return;
    }

    for (const [fieldKey, value] of Object.entries(changed)) {
      if (fieldKey === 'isteRows') continue;  // handled separately below
      const colId = ISTE_PACKET_COLS[fieldKey];
      if (!colId || value === undefined) continue;

      await monday.api(MUTATION_CHANGE_COLUMN, {
        variables: {
          boardId:  String(BOARDS.istePacket),
          itemId:   String(trip.mondayItemId_iste),
          columnId: colId,
          value:    serializeColumnValue(colId, value),
        },
      });

      trip[fieldKey] = typeof value === 'object' ? (value.label ?? value.date ?? '') : value;
    }

    // ── Save subitem rows ────────────────────────────────────────────────────
    if (formData.isteRows) {
      await saveIsteSubitems(trip, formData.isteRows);
    }

    rehydrateTrip(trip);
    renderDetail(trip, activeTab, { onSavePre, onSavePost, onTabSwitch, onNotifyTraveler });
    renderSidebar(trips, { onSelect });
    highlightSidebarItem(activeId);
    originalFormData = formData;
    isDirty = false;
    showSaveStatus('Saved', 'success');

  } catch (err) {
    console.error('Save error:', err);
    showSaveStatus('Save failed — check console', 'error');
  }
}



// ---------------------------------------------------------------------------
//  saveIsteSubitems(trip, rows)
//  Saves the ISTE itemized cost rows as monday subitems on Board 4.
//
//  Each row is one subitem. Logic:
//    - Row has subitemId + has data  → update existing subitem columns
//    - Row has no subitemId + has data → create new subitem, then set columns
//    - Row is blank (no date + no destination + all zeros) → skip
//
//  Column IDs for subitems come from ISTE_SUBITEM_COLS in config.js.
// ---------------------------------------------------------------------------

const MUTATION_CHANGE_SUBITEM_COLS = `
  mutation ($subitemId: ID!, $boardId: ID!, $columnValues: JSON!) {
    change_multiple_column_values(
      item_id: $subitemId
      board_id: $boardId
      column_values: $columnValues
    ) { id }
  }
`;

const MUTATION_CREATE_SUBITEM = `
  mutation ($parentId: ID!, $name: String!, $columnValues: JSON!) {
    create_subitem(
      parent_item_id: $parentId
      item_name: $name
      column_values: $columnValues
    ) { id }
  }
`;

async function saveIsteSubitems(trip, rows) {
  for (const row of rows) {
    // Skip blank rows
    const hasData = row.date || row.destination ||
                    row.miles || row.mileage || row.perdiem || row.other;
    if (!hasData) continue;

    // Build column values object for this row
    const colVals = {};
    const addCol = (colId, value, type) => {
      if (!colId || colId.includes('XXXXXXXX')) return;
      if (type === 'date')    colVals[colId] = value ? { date: value } : null;
      else if (type === 'num') colVals[colId] = String(parseFloat(value) || 0);
      else                    colVals[colId] = String(value || '');
    };

    addCol(ISTE_SUBITEM_COLS.date,        row.date,        'date');
    addCol(ISTE_SUBITEM_COLS.departTime,  row.departTime,  'text');
    addCol(ISTE_SUBITEM_COLS.arriveTime,  row.arriveTime,  'text');
    addCol(ISTE_SUBITEM_COLS.destination, row.destination, 'text');
    addCol(ISTE_SUBITEM_COLS.odometer,    row.odometer,    'text');
    addCol(ISTE_SUBITEM_COLS.miles,       row.miles,       'num');
    addCol(ISTE_SUBITEM_COLS.mileage,     row.mileage,     'num');
    addCol(ISTE_SUBITEM_COLS.perdiem,     row.perdiem,     'num');
    addCol(ISTE_SUBITEM_COLS.other,       row.other,       'num');

    // Remove null values
    Object.keys(colVals).forEach(k => colVals[k] === null && delete colVals[k]);

    try {
      if (row.subitemId) {
        // Update existing subitem
        await monday.api(MUTATION_CHANGE_SUBITEM_COLS, {
          variables: {
            subitemId:    String(row.subitemId),
            boardId:      String(BOARDS.istePacket),
            columnValues: JSON.stringify(colVals),
          },
        });
      } else {
        // Create new subitem — use date as the item name, or "New row"
        const name = row.date || row.destination || 'Row';
        await monday.api(MUTATION_CREATE_SUBITEM, {
          variables: {
            parentId:     String(trip.mondayItemId_iste),
            name,
            columnValues: JSON.stringify(colVals),
          },
        });
      }
    } catch (err) {
      console.error('Subitem save error for row', row, err);
      // Continue saving other rows even if one fails
    }
  }
}

// ---------------------------------------------------------------------------
//  Rehydrate pipeline after local edits
// ---------------------------------------------------------------------------

import { PRE_TRAVEL_STEPS, POST_TRAVEL_STEPS, STATUS_LABELS } from './config.js';

function resolveSteps(stepDefs, data, isteUrl) {
  // (same logic as data.js — kept here so we can update without a full re-fetch)
  const steps = [];
  for (const def of stepDefs) {
    if (def.optional && data[def.colKey] === STATUS_LABELS.notApplicable) continue;
    let state = '';
    if (def.autoComplete) state = 'done';
    else if (def.isteUrlRequired) state = isteUrl ? 'done' : '';
    else if (def.colKey) {
      const val = data[def.colKey] || '';
      if (val === def.doneValue)   state = 'done';
      if (val === def.deniedValue) state = 'denied';
    }
    steps.push({ label: def.label, actor: def.actor, state });
  }
  const hasDenial = steps.some(s => s.state === 'denied');
  if (!hasDenial) {
    const first = steps.find(s => s.state === '');
    if (first) first.state = 'current';
  }
  return steps;
}

function rehydrateTrip(trip) {
  trip.preTravelSteps  = resolveSteps(PRE_TRAVEL_STEPS,  trip, null);
  trip.postTravelSteps = resolveSteps(POST_TRAVEL_STEPS, trip, trip.reimbUrl);
  trip.preProgress     = Math.round(trip.preTravelSteps.filter(s => s.state === 'done').length / trip.preTravelSteps.length * 100);
  trip.postProgress    = Math.round(trip.postTravelSteps.filter(s => s.state === 'done').length / trip.postTravelSteps.length * 100);
}


// ---------------------------------------------------------------------------
//  Save status banner
// ---------------------------------------------------------------------------

function showSaveStatus(msg, type) {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.textContent = msg;
  el.className   = `save-status save-status--${type}`;
  el.classList.remove('hidden');
  monday.execute('notice', { message: msg, type: type, timeout: 2500}); 
  if (type === 'success') {
    setTimeout(() => el.classList.add('hidden'), 2500);
  }
}

// ---------------------------------------------------------------------------
//  File Dialog
// ---------------------------------------------------------------------------
function initFileDialogListeners() {
  // document.querySelectorAll('.monday-file-btn').forEach(el => {
  //   el.addEventListener('click', () => {
  //     monday.execute('openFilesDialog', {
  //       boardId:  BOARDS.hcaPacket,
  //       itemId:   el.dataset.itemId,
  //       columnId: el.dataset.columnId,
  //       ...(el.dataset.assetId ? { assetId: el.dataset.assetId } : {}),
  //     });
  //   });
  // });
  document.querySelectorAll('.monday-upload-btn').forEach(el => {
    el.addEventListener('click', () => {
      monday.execute("openAppFeatureModal", {
        url: "https://nmhca.monday.com/boards/18412077420/views/256095973/pulses/11979846987",
        urlParams: { tab: "notifications" },
        width: "600px",
        height: "700px",
        returnToPreviousModal: true
      }).then((res) => {
        // only triggered when a user closes the dialog
      });
      // const payload = {
      //   boardId:  BOARDS.hcaPacket,
      //   itemId:   parseInt(el.dataset.itemId),
      //   columnId: String(el.dataset.columnId),
      // };
      // console.log('triggerFilesUpload payload:', payload);
      // monday.execute('triggerFilesUpload', payload);
    });
  });
}


init();