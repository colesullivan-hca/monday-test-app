// =============================================================================
//  app.js  —  App bootstrap, routing, and save logic.
//  You should not need to edit this for normal config changes.
//  To add new editable fields to the forms, see forms-pre.js / forms-post.js.
// =============================================================================

import { fetchAllBoards, assembleTrips, MUTATION_CHANGE_COLUMN } from './data.js';
import { BOARDS, HCA_PACKET_COLS, ISTE_PACKET_COLS } from './config.js';
import { renderSidebar, renderDetail, renderEmptyState } from './render.js';

const monday = window.mondaySdk();

// App state
let trips     = {};
let activeId  = null;
let activeTab = 'pre'; // 'pre' | 'post'


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

function onSelect(tripId) {
  activeId  = tripId;
  activeTab = 'pre';   // always open on pre-travel tab
  renderDetail(trips[tripId], activeTab, { onSavePre, onSavePost, onTabSwitch });
  highlightSidebarItem(tripId);
  initFileDialogListeners();
}

function onTabSwitch(tab) {
  activeTab = tab;
  renderDetail(trips[activeId], tab, { onSavePre, onSavePost, onTabSwitch });
  initFileDialogListeners();
}

function highlightSidebarItem(tripId) {
  document.querySelectorAll('.sidebar-trip').forEach(el => {
    el.classList.toggle('active', el.dataset.tripId === tripId);
  });
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
    showSaveStatus('Saving…', 'saving');

    for (const [fieldKey, value] of Object.entries(formData)) {
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

      // Keep local state current so pipeline re-renders correctly
      trip[fieldKey] = typeof value === 'object' ? (value.label ?? value.date ?? '') : value;
    }

    // Re-assemble trip pipelines with updated values
    rehydrateTrip(trip);
    renderDetail(trip, activeTab, { onSavePre, onSavePost, onTabSwitch });
    renderSidebar(trips, { onSelect });
    highlightSidebarItem(activeId);
    showSaveStatus('Saved', 'saved');

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
    showSaveStatus('Saving…', 'saving');

    for (const [fieldKey, value] of Object.entries(formData)) {
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

    rehydrateTrip(trip);
    renderDetail(trip, activeTab, { onSavePre, onSavePost, onTabSwitch });
    renderSidebar(trips, { onSelect });
    highlightSidebarItem(activeId);
    showSaveStatus('Saved', 'saved');

  } catch (err) {
    console.error('Save error:', err);
    showSaveStatus('Save failed — check console', 'error');
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
  if (type === 'saved') {
    setTimeout(() => el.classList.add('hidden'), 2500);
  }
}

// ---------------------------------------------------------------------------
//  File Dialog
// ---------------------------------------------------------------------------
function initFileDialogListeners() {
  document.querySelectorAll('.monday-file-btn').forEach(el => {
    el.addEventListener('click', () => {
      monday.execute('openFilesDialog', {
        boardId:  BOARDS.hcaPacket,
        itemId:   el.dataset.itemId,
        columnId: el.dataset.columnId,
        ...(el.dataset.assetId ? { assetId: el.dataset.assetId } : {}),
      });
    });
  });
  document.querySelectorAll('.monday-upload-btn').forEach(el => {
    el.addEventListener('click', () => {
      const payload = {
        boardId:  BOARDS.hcaPacket,
        itemId:   parseInt(el.dataset.itemId),
        columnId: String(el.dataset.columnId),
      };
      console.log('triggerFilesUpload payload:', payload);
      monday.execute('triggerFilesUpload', payload);
    });
  });
}


init();