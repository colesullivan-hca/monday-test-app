// =============================================================================
//  render.js  —  All DOM rendering. No business logic here.
//  To change what the travel team's editable form looks like, see:
//    forms-pre.js   (Board 2 — HCA packet fields)
//    forms-post.js  (Board 4 — ISTE reimbursement fields)
// =============================================================================

import { buildPreForm, collectPreFormData }   from './forms-pre.js';
import { buildPostForm, collectPostFormData } from './forms-post.js';


// ---------------------------------------------------------------------------
//  Sidebar
// ---------------------------------------------------------------------------

export function renderSidebar(trips, { onSelect }) {
  const sidebar = document.getElementById('sidebar-list');

  // Filter to active trips only (not completed)
  const active = Object.values(trips).filter(t => t.state !== 'completed');

  // Group by state
  const groups = {
    travelling: { label: 'Currently Travelling', trips: [] },
    postTravel: { label: 'Post-Travel',           trips: [] },
    preTravel:  { label: 'Pre-Travel',            trips: [] },
  };

  for (const trip of active) {
    if (groups[trip.state]) groups[trip.state].trips.push(trip);
  }

  sidebar.innerHTML = Object.entries(groups)
    .filter(([, g]) => g.trips.length)
    .map(([stateKey, group]) => `
      <div class="sidebar-group">
        <div class="sidebar-group-label">${group.label}</div>
        ${group.trips.map(trip => sidebarTripHTML(trip)).join('')}
      </div>
    `).join('');

  // Wire click handlers
  sidebar.querySelectorAll('.sidebar-trip').forEach(el => {
    el.addEventListener('click', () => onSelect(el.dataset.tripId));
  });
}

function sidebarTripHTML(trip) {
  const stateChip = {
    preTravel:  `<span class="chip chip--pre">Pre-Travel</span>`,
    postTravel: `<span class="chip chip--post">Post-Travel</span>`,
    travelling: `<span class="chip chip--travel">Travelling</span>`,
  }[trip.state] || '';

  const progress = trip.state === 'postTravel' ? trip.postProgress : trip.preProgress;

  return `
    <div class="sidebar-trip" data-trip-id="${trip.tripID}">
      <div class="sidebar-trip__name">${trip.title || trip.tripID}</div>
      <div class="sidebar-trip__meta">${trip.location || ''} · ${trip.dates || ''}</div>
      <div class="sidebar-trip__footer">
        ${stateChip}
        <div class="sidebar-progress">
          <div class="sidebar-progress__bar" style="width:${progress}%"></div>
        </div>
      </div>
    </div>
  `;
}


// ---------------------------------------------------------------------------
//  Empty state (nothing selected yet)
// ---------------------------------------------------------------------------

export function renderEmptyState() {
  document.getElementById('detail-panel').innerHTML = `
    <div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
      <p>Select a trip to review</p>
    </div>
  `;
}


// ---------------------------------------------------------------------------
//  Detail panel
// ---------------------------------------------------------------------------

export function renderDetail(trip, activeTab, { onSavePre, onSavePost, onTabSwitch }) {
  const panel = document.getElementById('detail-panel');

  panel.innerHTML = `
    ${detailHeaderHTML(trip)}
    ${pipelineHTML(trip, activeTab)}
    ${tabsHTML(activeTab)}
    <div id="tab-content" class="tab-content"></div>
    <div class="detail-footer">
      <div id="save-status" class="save-status hidden"></div>
      <div class="footer-links">
        ${trip.requestUrl    ? `<a href="${trip.requestUrl}" target="_blank" class="footer-link">Request form ↗</a>` : ''}
        ${trip.isteUrl       ? `<a href="${trip.isteUrl}" target="_blank" class="footer-link">ISTE form ↗</a>` : ''}
        ${trip.hcaUrl        ? `<a href="${trip.hcaUrl}" target="_blank" class="footer-link">HCA packet ↗</a>` : ''}
        ${trip.istePacketUrl ? `<a href="${trip.istePacketUrl}" target="_blank" class="footer-link">ISTE packet ↗</a>` : ''}
      </div>
      <button id="save-btn" class="btn btn--primary">Save to monday</button>
    </div>
  `;

  // Render the correct tab content
  const tabContent = document.getElementById('tab-content');
  if (activeTab === 'pre') {
    tabContent.innerHTML = splitPaneHTML(
      travelerRequestPaneHTML(trip),
      buildPreForm(trip)
    );
  } else {
    tabContent.innerHTML = splitPaneHTML(
      travelerReimbPaneHTML(trip),
      buildPostForm(trip)
    );
  }

  // Wire tab switches
  panel.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => onTabSwitch(btn.dataset.tab));
  });

  // Wire save button
  document.getElementById('save-btn').addEventListener('click', () => {
    if (activeTab === 'pre') {
      onSavePre(collectPreFormData());
    } else {
      onSavePost(collectPostFormData());
    }
  });
}


// ---------------------------------------------------------------------------
//  Detail header
// ---------------------------------------------------------------------------

function detailHeaderHTML(trip) {
  const statusClass = trip.warning ? 'status-badge--warning'
    : trip.statusClass ? `status-badge--${trip.statusClass.replace('status-', '')}` : '';

  return `
    <div class="detail-header">
      <div class="detail-header__identity">
        <h1 class="detail-title">${trip.title || trip.tripID}</h1>
        <p class="detail-meta">${trip.location || '—'} &nbsp;·&nbsp; ${trip.dates || '—'} &nbsp;·&nbsp; Trip #${trip.tripID}</p>
      </div>
      <div class="status-badge ${statusClass}">
        ${trip.warning || trip.statusText || 'In Progress'}
      </div>
    </div>
  `;
}


// ---------------------------------------------------------------------------
//  Pipeline tracker
// ---------------------------------------------------------------------------

function pipelineHTML(trip, activeTab) {
  const steps = activeTab === 'pre' ? trip.preTravelSteps : trip.postTravelSteps;
  if (!steps?.length) return '';

  return `
    <div class="pipeline">
      ${steps.map((step, i) => `
        <div class="pipeline__step pipeline__step--${step.state}">
          <div class="pipeline__node">
            ${step.state === 'done'    ? checkIcon() : ''}
            ${step.state === 'denied' ? xIcon()     : ''}
            ${step.state === 'current' ? `<span class="pipeline__num">${i + 1}</span>` : ''}
            ${step.state === ''        ? `<span class="pipeline__num">${i + 1}</span>` : ''}
          </div>
          <div class="pipeline__labels">
            <span class="pipeline__label">${step.label}</span>
            <span class="pipeline__actor">${step.actor}</span>
          </div>
        </div>
        ${i < steps.length - 1 ? '<div class="pipeline__connector"></div>' : ''}
      `).join('')}
    </div>
  `;
}

function checkIcon() {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 8 7 12 13 4"/></svg>`;
}
function xIcon() {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>`;
}


// ---------------------------------------------------------------------------
//  Tabs
// ---------------------------------------------------------------------------

function tabsHTML(activeTab) {
  return `
    <div class="tabs">
      <button class="tab-btn ${activeTab === 'pre'  ? 'active' : ''}" data-tab="pre">
        Pre-Travel
      </button>
      <button class="tab-btn ${activeTab === 'post' ? 'active' : ''}" data-tab="post">
        Post-Travel Reimbursement
      </button>
    </div>
  `;
}


// ---------------------------------------------------------------------------
//  Split pane wrapper
// ---------------------------------------------------------------------------

function splitPaneHTML(leftHTML, rightHTML) {
  return `
    <div class="split-pane">
      <div class="split-pane__left">
        ${leftHTML}
      </div>
      <div class="split-pane__divider"></div>
      <div class="split-pane__right">
        ${rightHTML}
      </div>
    </div>
  `;
}


// ---------------------------------------------------------------------------
//  Left pane: Traveler's original request (Board 1, read-only)
// ---------------------------------------------------------------------------

function travelerRequestPaneHTML(trip) {
  return `
    <div class="pane-header">
      <span class="pane-header__icon">${formIcon()}</span>
      <div>
        <div class="pane-header__title">Traveler Request</div>
        <div class="pane-header__sub">Board 1 · Read-only</div>
      </div>
    </div>

    <!-- ── TRAVELER REQUEST FIELDS ──────────────────────────────────────
         Add more read-only fields below by duplicating .read-field rows.
         Source data comes from TRAVELER_REQUEST_COLS in config.js.
    ────────────────────────────────────────────────────────────────── -->

    <div class="read-fields">
      ${readField('Title',       trip.title)}
      ${readField('Location',    trip.location)}
      ${readField('Dates',       trip.dates)}
      ${readField('Start date',  trip.startDate)}
      ${readField('End date',    trip.endDate)}
      <!-- Add more here:  ${readField('Purpose', trip.purpose)}  -->
    </div>

    ${attachmentsHTML(trip.requestAssets, 'Traveler attachments')}
  `;
}


// ---------------------------------------------------------------------------
//  Left pane: Traveler's reimbursement submission (Board 3, read-only)
// ---------------------------------------------------------------------------

function travelerReimbPaneHTML(trip) {
  return `
    <div class="pane-header">
      <span class="pane-header__icon">${receiptIcon()}</span>
      <div>
        <div class="pane-header__title">Reimbursement Submission</div>
        <div class="pane-header__sub">Board 3 · Read-only</div>
      </div>
    </div>

    <!-- ── REIMBURSEMENT FIELDS ─────────────────────────────────────────
         Add more read-only fields below.
         Source data comes from TRAVELER_REIMB_COLS in config.js.
    ────────────────────────────────────────────────────────────────── -->

    <div class="read-fields">
      ${readField('Total claimed', trip.totalClaimed)}
      ${readField('Per diem days', trip.perDiemDays)}
      ${readField('Mileage',       trip.mileage)}
      <!-- Add more here: ${readField('Notes', trip.receiptsNotes)} -->
    </div>

    ${attachmentsHTML(trip.reimbAssets, 'Submitted receipts')}
  `;
}


// ---------------------------------------------------------------------------
//  Attachments list
// ---------------------------------------------------------------------------

function attachmentsHTML(assets = [], label = 'Attachments') {
  if (!assets.length) return '';

  return `
    <div class="attachments">
      <div class="attachments__label">${label}</div>
      ${assets.map(a => `
        <a href="${a.public_url}" target="_blank" class="attachment">
          ${attachIcon(a.file_extension)}
          <span class="attachment__name">${a.name}</span>
          <span class="attachment__ext">${a.file_extension?.toUpperCase() || ''}</span>
        </a>
      `).join('')}
    </div>
  `;
}

function attachIcon(ext) {
  const isPdf = ext?.toLowerCase() === 'pdf';
  return isPdf
    ? `<svg class="attachment__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg>`
    : `<svg class="attachment__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`;
}


// ---------------------------------------------------------------------------
//  Shared helpers
// ---------------------------------------------------------------------------

export function readField(label, value) {
  return `
    <div class="read-field">
      <div class="read-field__label">${label}</div>
      <div class="read-field__value">${value || '<span class="empty-val">—</span>'}</div>
    </div>
  `;
}

function formIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>`;
}
function receiptIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4"/></svg>`;
}
