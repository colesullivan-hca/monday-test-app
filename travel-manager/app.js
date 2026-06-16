// =============================================================================
//  app.js  —  App bootstrap, routing, and save logic.
//  You should not need to edit this for normal config changes.
//  To add new editable fields to the forms, see forms-pre.js / forms-post.js.
// =============================================================================

import { fetchAllBoards, assembleTrips, MUTATION_CHANGE_COLUMN } from './data.js';
import { BOARDS, HCA_PACKET_COLS, ISTE_PACKET_COLS, ISTE_SUBITEM_COLS } from './config.js';
import { renderSidebar, renderDetail, renderEmptyState } from './render.js';
import { collectPreFormData, initPreFormListeners, collectPreFormSnapshot } from './forms-pre.js';
import { collectPostFormData, initPostFormListeners, ensureIsteSubitems, collectPostFormSnapshot } from './forms-post.js';

const monday = window.mondaySdk();

// App state
let trips            = {};
let activeId         = sessionStorage.getItem('activeId') || null;
let activeTab        = sessionStorage.getItem('activeTab') || 'pre';
let originalFormData = null;
let isDirty          = false;

function persistState() {
  if (activeId)  sessionStorage.setItem('activeId',  activeId);
  if (activeTab) sessionStorage.setItem('activeTab', activeTab);
}


// ---------------------------------------------------------------------------
//  Boot
// ---------------------------------------------------------------------------

async function refreshTrips() {
  const syncEl = document.getElementById('last-synced');
  if (syncEl) syncEl.textContent = 'Syncing…';

  // Save scroll positions before re-render
  const leftPane  = document.querySelector('.split-pane__left');
  const rightPane = document.querySelector('.split-pane__right');
  const leftScroll  = leftPane?.scrollTop  || 0;
  const rightScroll = rightPane?.scrollTop || 0;

  try {
    const raw   = await fetchAllBoards(monday);
    const fresh = assembleTrips(raw);
    Object.assign(trips, fresh);

    renderSidebar(trips, { onSelect });
    highlightSidebarItem(activeId);

    if (activeId && !isDirty) {
      renderDetail(trips[activeId], activeTab, { onSavePre, onSavePost, onTabSwitch, onNotifyTraveler, onOpenFile });
      snapshotAndWatch(activeTab);

      // Restore scroll positions after re-render
      requestAnimationFrame(() => {
        const l = document.querySelector('.split-pane__left');
        const r = document.querySelector('.split-pane__right');
        if (l) l.scrollTop = leftScroll;
        if (r) r.scrollTop = rightScroll;
      });
    }

    if (syncEl) syncEl.textContent =
      `Synced ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (err) {
    console.error('Background refresh failed:', err);
    if (syncEl) syncEl.textContent = 'Sync failed';
  }
}

async function backfillIsteDefaults(trip) {
  const needed = trip._isteBackfillNeeded;
  if (!needed || !Object.keys(needed).length) return;

  const ISTE_BACKFILL_MAP = {
    iste_supplierName: ISTE_PACKET_COLS.iste_supplierName,
    iste_supplierId:   ISTE_PACKET_COLS.iste_supplierId,
    iste_division:     ISTE_PACKET_COLS.iste_division,
    iste_postOfDuty:   ISTE_PACKET_COLS.iste_postOfDuty,
    iste_residence:    ISTE_PACKET_COLS.iste_residence,
  };

  const saves = [];
  for (const [tripKey, colId] of Object.entries(ISTE_BACKFILL_MAP)) {
    if (!colId || !(tripKey in needed)) continue;  // ← only fields that were blank
    saves.push(
      monday.api(MUTATION_CHANGE_COLUMN, {
        variables: {
          boardId:  String(BOARDS.istePacket),
          itemId:   String(trip.mondayItemId_iste),
          columnId: colId,
          value:    serializeColumnValue(colId, needed[tripKey]),
        },
      }).catch(err => console.warn(`backfill failed for ${tripKey}:`, err))
    );
  }

  if (saves.length) {
    await Promise.all(saves);
    console.log(`Backfilled ${saves.length} ISTE field(s) for trip ${trip.tripID}`);
  }

  trip._isteBackfillNeeded = {};  // ← clear so re-selecting the same trip is a no-op
}


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
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  // Boolean columns
  if (typeof value === 'boolean') {
    return JSON.stringify({ checked: value ? 'true' : 'false' });
  }

  const prefix = colId.split('_')[0];
  switch (prefix) {
    case 'color':
      return JSON.stringify({ label: String(value) });
    case 'date':
      return value ? JSON.stringify({ date: String(value) }) : '""';
    case 'long':
      return JSON.stringify({ text: String(value) });
    case 'numeric':
    case 'numbers':
      return JSON.stringify(String(parseFloat(value) || 0));
    case 'boolean':                                          // ← add this
      return JSON.stringify({ checked: value ? 'true' : 'false' });
    default:
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
    const restoreId = activeId && trips[activeId] ? activeId : null;
    const fallback  = Object.values(trips).find(t => t.state === 'preTravel');
    const selectId  = restoreId || fallback?.tripID;

    if (selectId) {
      // If restoring, skip the tab default logic in onSelect by setting directly
      if (restoreId) {
        renderDetail(trips[restoreId], activeTab, { onSavePre, onSavePost, onTabSwitch, onNotifyTraveler, onOpenFile });
        highlightSidebarItem(restoreId);
        initFileDialogListeners();
        snapshotAndWatch(activeTab);
        backfillIsteDefaults(trips[restoreId]);
      } else {
        onSelect(selectId);
      }
    }

    const trip = trips[activeId];
    if (trip?.mondayItemId_iste) {
      const ready = await ensureIsteSubitems(trip, monday);
      refreshTrips();
      if (!ready) return;
    }

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

  document.getElementById('last-synced').textContent = 
        `Last synced ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  window.addEventListener('focus', async () => {
    if (!isDirty) await refreshTrips();
  });

  setInterval(async () => {
    if (!isDirty && !document.hidden) await refreshTrips();
  }, 120_000);
}


// ---------------------------------------------------------------------------
//  Navigation
// ---------------------------------------------------------------------------

async function onSelect(tripId) {
  if (isDirty && !(await confirmDiscard())) return;
  isDirty  = false;
  activeId  = tripId;
  activeTab = trips[tripId].istePacketUrl ? 'post' : 'pre';
  persistState();
  renderDetail(trips[tripId], activeTab, { onSavePre, onSavePost, onTabSwitch, onNotifyTraveler, onOpenFile });
  highlightSidebarItem(tripId);
  initFileDialogListeners();
  snapshotAndWatch('pre');
  backfillIsteDefaults(trips[tripId]);
  const trip = trips[activeId];
  if (trip?.mondayItemId_iste) {
    const ready = await ensureIsteSubitems(trip, monday);
    refreshTrips();
    if (!ready) return;
  }
}

async function onTabSwitch(tab) {
  if (isDirty && !(await confirmDiscard())) return;
  isDirty   = false;
  activeTab = tab;
  persistState();

  if (tab === 'post') {
    const trip = trips[activeId];
    if (trip?.mondayItemId_iste) {
      const ready = await ensureIsteSubitems(trip, monday);
      refreshTrips();
      if (!ready) return;
    }
  }

  renderDetail(trips[activeId], tab, { onSavePre, onSavePost, onTabSwitch, onNotifyTraveler, onOpenFile });
  initFileDialogListeners();
  snapshotAndWatch(tab);
}

function reimbursementURL(tripID){
  const baseURL = 'https://forms.monday.com/forms/23ad52a366e30773dfddc027ec1f6ef3?r=use1';
  return baseURL + `&formid=${tripID}`;
}

function onOpenFile({ boardId, itemId, columnId, assetId }) {
  monday.execute('openFilesDialog', {
    boardId:  String(boardId),
    itemId:   String(itemId),
    columnId: String(columnId),
    assetId:  String(assetId),
  });
}

async function onNotifyTraveler({ email, name, trip })  {
  if (!email) {
    monday.execute('notice', { message: 'No email on file for this traveler.', type: 'error' });
    return;
  }

  const COLUMN_IDS = {
    recipientEmail: 'email_mm47wxe7', 
    ccEmail: 'email_mm47vtan',  
    text: 'text_mm47tab7',
    longText: 'long_text_mm479ejb'
  };

  const url = reimbursementURL(activeId);

  try {
    // 1. Get the current board's context
    const context = await monday.get("context");

    // 2. Fetch the current logged-in user's email address
    const userQuery = `query { me { email name } }`;
    const userResponse = await monday.api(userQuery);
    
    if (userResponse.errors || !userResponse.data?.me) {
      throw new Error("Could not retrieve current user profile.");
    }
    
    const currentUserEmail = userResponse.data.me.email;
    const currentUserName = userResponse.data.me.name;

    // 3. Prepare the mutation payload
    const mutation = `
      mutation AddItemWithCC($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_item (board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
          id
        }
      }
    `;

    // 4. Map the email addresses to their respective columns
    const columnData = {
      // The recipient's email (static or passed from elsewhere in your app)
      [COLUMN_IDS.recipientEmail]: { email: 'cole.sullivan@hca.nm.gov', text: "Recipient" },
      
      // Dynamic CC column filled using the current user's fetched data
      [COLUMN_IDS.ccEmail]: { email: currentUserEmail, text: `CC: ${currentUserName}` },
      
      [COLUMN_IDS.text]: "Reimbursement form needed — ${trip}",
      [COLUMN_IDS.longText]: { text: `<p> Hi ${name},</p>` +
                              `<p> We're ready to process your reimbursement for "${trip}" but haven't received your completed form yet.</p>` +
                              `<p>Please submit it at your earliest convenience using this link:</p>` +
                              `<p>${url}\n\n</p>` +
                              `<p>Thank you</p>` }
    };

    const variables = {
      boardId: 18417451375,
      itemName: `Notification email ${currentUserName}`,
      columnValues: JSON.stringify(columnData)
    };

    // 5. Send the payload to monday.com
    const response = await monday.api(mutation, { variables });
    
    if (response.errors) {
      monday.execute('notice', { message: 'There was an issue sending email to traveler', type: 'error' });
    } else {
      monday.execute('notice', { message: 'Email sent to traveler', type: 'success' });
    }

  } catch (err) {
    console.error("Error executing action:", err);
  }
}

// async function onNotifyTraveler({ email, name, trip }) {
//   if (!email) {
//     monday.execute('notice', { message: 'No email on file for this traveler.', type: 'error' });
//     return;
//   }

//   const url = reimbursementURL(activeId);
//   const subject = encodeURIComponent(`Reimbursement form needed — ${trip}`);
  
//   const body = encodeURIComponent(
//     `Hi ${name},\n\n` +
//     `We're ready to process your reimbursement for "${trip}" but haven't received your completed form yet.\n\n` +
//     `Please submit it at your earliest convenience using this link:\n` +
//     `${url}\n\n` +
//     `Thank you`
//   );

//   window.open(`mailto:${email}?subject=${subject}&body=${body}`);
// }

function highlightSidebarItem(tripId) {
  document.querySelectorAll('.sidebar-trip').forEach(el => {
    el.classList.toggle('active', el.dataset.tripId === tripId);
  });
}

// ---------------------------------------------------------------------------
//  Dirty tracking
// ---------------------------------------------------------------------------

function updateSaveButton() {
  const btn = document.getElementById('save-btn');
  if (!btn) return;
  btn.classList.toggle('save-btn--dirty', isDirty);
}

function snapshotAndWatch(tab) {
  originalFormData = tab === 'pre' ? collectPreFormData() : collectPostFormData();
  isDirty = false;

  const formId = tab === 'pre' ? 'pre-travel-form' : 'post-travel-form';
  const form   = document.getElementById(formId);
  if (!form) return;

  const handler = () => {
    const current = tab === 'pre' ? collectPreFormData() : collectPostFormData();
    isDirty = false;

    for (const [key, value] of Object.entries(current)) {
      if (key === 'isteRows') {
        (value || []).forEach((row, i) => {
          const rowEl = form.querySelector(`.iste-row[data-row="${i}"]`);
          if (!rowEl) return;
          const rowDirty = JSON.stringify(row) !== JSON.stringify(originalFormData?.isteRows?.[i]);
          if (rowDirty) isDirty = true;   // ← was missing
          rowEl.querySelectorAll('.iste-input').forEach(input => {
            input.classList.toggle('input--dirty', rowDirty);
          });
        });
        continue;
      }

      const changed = JSON.stringify(value) !== JSON.stringify(originalFormData?.[key]);
      if (changed) isDirty = true;

      const el = form.querySelector(`#${key}, [name="${key}"]`);
      if (el) {
        if (el.type === 'radio') {
          form.querySelectorAll(`[name="${el.name}"]`).forEach(r => {
            r.closest('td, div')?.classList.toggle('input--dirty', changed);
          });
        } else {
          el.classList.toggle('input--dirty', changed);
        }
      }
    }

    updateSaveButton();  // ← call after all keys processed
  };

  form.addEventListener('input',  handler);
  form.addEventListener('change', handler);

  if (tab === 'post') {
    const isteStatus = document.getElementById('ISTEStatus');
    if (isteStatus) {
      isteStatus.addEventListener('change', handler);
    }
  }
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
      showSaveStatus('No changes to save', 'success', 2500);
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

    const snapshot = collectPreFormSnapshot();
    await monday.api(MUTATION_CHANGE_COLUMN, {
      variables: {
        boardId:  String(BOARDS.hcaPacket),
        itemId:   String(trip.mondayItemId_hca),
        columnId: HCA_PACKET_COLS.hca_formSnapshot,
        value:    serializeColumnValue(HCA_PACKET_COLS.hca_formSnapshot, snapshot),
      },
    });

    rehydrateTrip(trip);
    renderDetail(trip, activeTab, { onSavePre, onSavePost, onTabSwitch, onNotifyTraveler, onOpenFile });
    renderSidebar(trips, { onSelect });
    highlightSidebarItem(activeId);
    originalFormData = formData;
    isDirty = false;
    showSaveStatus('Saved', 'success', 2500);

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
    if (formData.iste_voucherBasis !== undefined) {
      formData.iste_prepaidVoucher = formData.iste_voucherBasis === 'Prepaid Voucher';
      formData.iste_finalVoucher   = formData.iste_voucherBasis === 'Final Voucher';
    }
    if (formData.iste_perDiemBasis !== undefined) {
      formData.iste_actual        = formData.iste_perDiemBasis === 'Actual';
      formData.iste_approvedRates = formData.iste_perDiemBasis === 'Approved Rates';
    }

    const { isteRows, ...columnData } = formData;
    const { isteRows: origRows, ...origColumnData } = originalFormData || {};

    const changedColumns = Object.fromEntries(
      Object.entries(columnData).filter(([k, v]) =>
        JSON.stringify(v) !== JSON.stringify(origColumnData?.[k])
      )
    );

    const changedRows = (isteRows || []).filter((row, i) =>
      JSON.stringify(row) !== JSON.stringify(origRows?.[i])
    );

    if (!Object.keys(changedColumns).length && !changedRows.length) {
      showSaveStatus('No changes to save', 'success', 2500);
      return;
    }

    showSaveStatus('Saving…', 'info');


    // Save column fields
    for (const [fieldKey, value] of Object.entries(changedColumns)) {
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

      trip[fieldKey] = typeof value === 'boolean'
        ? (value ? 'v' : '')
        : typeof value === 'object'
          ? (value.label ?? value.date ?? '')
          : value;
    }

    // Save subitem rows
    if (changedRows.length) {
      await saveIsteSubitems(trip, isteRows, origRows);
    }

    if (formData.isteRows) {
      formData.isteRows.forEach((row, i) => {
        if (trip.isteSubitems?.[i]) {
          Object.assign(trip.isteSubitems[i], row);
        }
      });
    }

    const snapshot = collectPostFormSnapshot();
    const SNAPSHOT_WRITES = [
      ['iste_generalSnapshot', snapshot.general],
      ['iste_rowsSnapshot',    snapshot.rows],
      ['iste_totalsSnapshot',  snapshot.totals],
    ];

    for (const [key, value] of SNAPSHOT_WRITES) {
      await monday.api(MUTATION_CHANGE_COLUMN, {
        variables: {
          boardId:  String(BOARDS.istePacket),
          itemId:   String(trip.mondayItemId_iste),
          columnId: ISTE_PACKET_COLS[key],
          value:    serializeColumnValue(ISTE_PACKET_COLS[key], value),
        },
      });
    }

    rehydrateTrip(trip);
    renderDetail(trip, activeTab, { onSavePre, onSavePost, onTabSwitch, onNotifyTraveler });
    renderSidebar(trips, { onSelect });
    highlightSidebarItem(activeId);
    originalFormData = formData;
    isDirty = false;
    showSaveStatus('Saved', 'success', 2500);

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

async function saveIsteSubitems(trip, rows, originalRows) {
  // We need the subitem board ID — stored on trip from data.js
  const subitemBoardId = trip.isteSubitemBoardId;
  if (!subitemBoardId) {
    console.error('No subitem board ID on trip — cannot save rows');
    return;
  }

  const requests = [];

  rows.forEach((row, i) => {
    // Skip if unchanged
    const orig = originalRows?.[i];
    if (orig && JSON.stringify(row) === JSON.stringify(orig)) return;

    // Skip completely blank rows with no subitemId
    const hasData = row.date || row.destination ||
                    row.miles || row.mileage || row.perdiem || row.other;
    if (!hasData && !row.subitemId) return;

    const colVals = {};
    const s = ISTE_SUBITEM_COLS;
    if (s.date        && row.date        !== orig?.date)
      colVals[s.date]        = row.date ? { date: row.date } : '';
    if (s.departTime  && row.departTime  !== orig?.departTime)
      colVals[s.departTime]  = row.departTime;
    if (s.arriveTime  && row.arriveTime  !== orig?.arriveTime)
      colVals[s.arriveTime]  = row.arriveTime;
    if (s.destination && row.destination !== orig?.destination)
      colVals[s.destination] = row.destination;
    if (s.odometer    && row.odometer    !== orig?.odometer)
      colVals[s.odometer]    = row.odometer;
    if (s.miles       && row.miles       !== orig?.miles)
      colVals[s.miles]       = String(row.miles);
    if (s.mileage     && row.mileage     !== orig?.mileage)
      colVals[s.mileage]     = String(row.mileage);
    if (s.perdiem     && row.perdiem     !== orig?.perdiem)
      colVals[s.perdiem]     = String(row.perdiem);
    if (s.other       && row.other       !== orig?.other)
      colVals[s.other]       = String(row.other);

    if (!Object.keys(colVals).length) return;

    if (row.subitemId) {
      requests.push(
        monday.api(MUTATION_CHANGE_SUBITEM_COLS, {
          variables: {
            subitemId:    String(row.subitemId),
            boardId:      String(subitemBoardId),  // subitem's own board, not parent
            columnValues: JSON.stringify(colVals),
          },
        }).catch(err => console.error('Subitem update error row', i, err))
      );
    } else if (hasData) {
      requests.push(
        monday.api(MUTATION_CREATE_SUBITEM, {
          variables: {
            parentId:     String(trip.mondayItemId_iste),
            name:         row.date || row.destination || `Row ${i + 1}`,
            columnValues: JSON.stringify(colVals),
          },
        }).catch(err => console.error('Subitem create error row', i, err))
      );
    }
  });

  if (requests.length) await Promise.all(requests);
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

function showSaveStatus(msg, type, timeout) {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.textContent = msg;
  el.className   = `save-status save-status--${type}`;
  el.classList.remove('hidden');
  if (timeout) monday.execute('notice', { message: msg, type: type, timeout: timeout}); 
  else monday.execute('notice', { message: msg, type: type }); 
  if (type === 'success') {
    setTimeout(() => el.classList.add('hidden'), 2500);
  }
}

// ---------------------------------------------------------------------------
//  File Dialog
// ---------------------------------------------------------------------------
function handleMondayUploadClick(event) {
  const el = event.target.closest('.monday-upload-btn');
  if (!el) return;

  // Prevent any weird double-bubbling behaviors
  event.preventDefault();

  monday.execute("openAppFeatureModal", {
    url: `https://nmhca.monday.com/boards/18412077420/views/256095973/pulses/${el.dataset.itemId}`,
    urlParams: { tab: "notifications" },
    width: "600px",
    height: "700px",
    returnToPreviousModal: true
  }).then((res) => {
    // triggered when a user closes the dialog
  });
}

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
  document.body.removeEventListener('click', handleMondayUploadClick);
  document.body.addEventListener('click', handleMondayUploadClick);
}

init();