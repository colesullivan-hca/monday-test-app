// =============================================================================
//  data.js  —  Fetches from monday and assembles unified trip objects.
//  You should not need to edit this file unless you add new boards.
// =============================================================================

import {
  BOARDS,
  TRAVELER_REQUEST_COLS,
  HCA_PACKET_COLS,
  TRAVELER_REIMB_COLS,
  ISTE_PACKET_COLS,
  STATUS_LABELS,
  PRE_TRAVEL_STEPS,
  POST_TRAVEL_STEPS,
} from './config.js';


// ---------------------------------------------------------------------------
//  GraphQL queries
// ---------------------------------------------------------------------------

const INITIAL_QUERY = `
  query ($boardId: ID!, $limit: Int!) {
    boards(ids: [$boardId]) {
      items_page(limit: $limit) {
        cursor
        items {
          id name url
          assets { id name public_url file_extension }
          column_values { id type text value }
        }
      }
    }
  }
`;

const NEXT_PAGE_QUERY = `
  query ($cursor: String!) {
    next_items_page(cursor: $cursor) {
      cursor
      items {
        id name url
        assets { id name public_url file_extension }
        column_values { id type text value }
      }
    }
  }
`;

// Mutation used by the save functions in app.js
export const MUTATION_CHANGE_COLUMN = `
  mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
    change_column_value(
      board_id: $boardId
      item_id: $itemId
      column_id: $columnId
      value: $value
    ) { id }
  }
`;


// ---------------------------------------------------------------------------
//  Fetch helpers
// ---------------------------------------------------------------------------

async function fetchBoard(monday, boardId) {
  const items = [];
  let cursor = null;

  while (true) {
    const query     = !cursor ? INITIAL_QUERY : NEXT_PAGE_QUERY;
    const variables = !cursor ? { boardId, limit: 50 } : { cursor };
    const res       = await monday.api(query, { variables });

    const page = !cursor
      ? res.data.boards[0].items_page
      : res.data.next_items_page;

    if (page.items) items.push(...page.items);
    cursor = page.cursor;
    if (!cursor) break;
  }

  return items;
}

export async function fetchAllBoards(monday) {
  const [travelerItems, hcaItems, reimbItems, isteItems] = await Promise.all([
    fetchBoard(monday, BOARDS.travelerRequest),
    fetchBoard(monday, BOARDS.hcaPacket),
    fetchBoard(monday, BOARDS.travelerReimbursement),
    fetchBoard(monday, BOARDS.istePacket),
  ]);

  return { travelerItems, hcaItems, reimbItems, isteItems };
}


// ---------------------------------------------------------------------------
//  Column extraction helpers
// ---------------------------------------------------------------------------

function colMap(item) {
  return Object.fromEntries((item.column_values || []).map(c => [c.id, c]));
}

function extract(map, colDefs) {
  const result = {};
  for (const [key, colId] of Object.entries(colDefs)) {
    if (key === 'tripID') continue;
    result[key] = map[colId]?.text || '';
  }
  return result;
}

function formatDate(str, style = 'long') {
  if (!str) return '';
  const opts = style === 'short'
    ? { month: 'short' }
    : { month: 'short', day: 'numeric' };
  return new Date(`${str}T00:00:00`).toLocaleString('en-US', opts);
}


// ---------------------------------------------------------------------------
//  Pipeline step resolver
// ---------------------------------------------------------------------------

function resolveSteps(stepDefs, data, isteUrl) {
  const steps = [];

  for (const def of stepDefs) {
    // Skip optional steps when "Not Applicable"
    if (def.optional && data[def.colKey] === STATUS_LABELS.notApplicable) continue;

    let state = '';
    if (def.autoComplete) {
      state = 'done';
    } else if (def.isteUrlRequired) {
      state = isteUrl ? 'done' : '';
    } else if (def.colKey) {
      const val = data[def.colKey] || '';
      if (val === def.doneValue)   state = 'done';
      if (val === def.deniedValue) state = 'denied';
    }

    steps.push({ label: def.label, actor: def.actor, state });
  }

  // Mark first non-done, non-denied as "current" (unless there's a denial)
  const hasDenial = steps.some(s => s.state === 'denied');
  if (!hasDenial) {
    const first = steps.find(s => s.state === '');
    if (first) first.state = 'current';
  }

  return steps;
}


// ---------------------------------------------------------------------------
//  Trip state (preTravel / travelling / postTravel / completed)
// ---------------------------------------------------------------------------

function tripState(startDate, endDate, preProgress, postProgress) {
  if (!startDate) return 'preTravel';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(`${startDate}T00:00:00`);
  const end   = new Date(`${endDate}T00:00:00`);

  if (today < start) return 'preTravel';
  if (today >= start && today <= end) return 'travelling';
  if (postProgress === 100) return 'completed';
  return 'postTravel';
}

function pct(steps) {
  if (!steps.length) return 0;
  return Math.round(steps.filter(s => s.state === 'done').length / steps.length * 100);
}


// ---------------------------------------------------------------------------
//  Main assembler
// ---------------------------------------------------------------------------

export function assembleTrips({ travelerItems, hcaItems, reimbItems, isteItems }) {
  const trips = {};

  // Helper to ensure a trip slot exists
  const slot = id => { if (!trips[id]) trips[id] = { tripID: id }; return trips[id]; };

  // --- Board 1: Traveler request ---
  for (const item of travelerItems) {
    const map    = colMap(item);
    const tripId = map[TRAVELER_REQUEST_COLS.tripID]?.text || item.id;
    const trip   = slot(tripId);

    trip.mondayItemId_request = item.id;  // saved for mutations
    trip.requestUrl           = item.url;
    trip.requestAssets        = item.assets || [];

    Object.assign(trip, extract(map, TRAVELER_REQUEST_COLS));

    trip.dates = `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`;
    trip.startDateRaw = map[TRAVELER_REQUEST_COLS.startDate]?.text || '';
    trip.endDateRaw   = map[TRAVELER_REQUEST_COLS.endDate]?.text   || '';
  }

  // --- Board 2: HCA packet ---
  for (const item of hcaItems) {
    const map    = colMap(item);
    const tripId = map[HCA_PACKET_COLS.tripID]?.text || item.id;
    const trip   = slot(tripId);

    trip.mondayItemId_hca = item.id;
    trip.hcaUrl           = item.url;
    trip.hcaAssets        = item.assets || [];

    Object.assign(trip, extract(map, HCA_PACKET_COLS));
  }

  // --- Board 3: Traveler reimbursement ---
  for (const item of reimbItems) {
    const map    = colMap(item);
    const tripId = map[TRAVELER_REIMB_COLS.tripID]?.text || item.id;
    const trip   = slot(tripId);

    trip.mondayItemId_reimb = item.id;
    trip.isteUrl            = item.url;
    trip.reimbAssets        = item.assets || [];

    Object.assign(trip, extract(map, TRAVELER_REIMB_COLS));
  }

  // --- Board 4: ISTE packet ---
  for (const item of isteItems) {
    const map    = colMap(item);
    const tripId = map[ISTE_PACKET_COLS.tripID]?.text || item.id;
    const trip   = slot(tripId);

    trip.mondayItemId_iste = item.id;
    trip.istePacketUrl     = item.url;

    Object.assign(trip, extract(map, ISTE_PACKET_COLS));
  }

  // --- Compute pipelines, progress, state for every trip ---
  for (const trip of Object.values(trips)) {
    trip.preTravelSteps  = resolveSteps(PRE_TRAVEL_STEPS,  trip, null);
    trip.postTravelSteps = resolveSteps(POST_TRAVEL_STEPS, trip, trip.isteUrl);

    trip.preProgress  = pct(trip.preTravelSteps);
    trip.postProgress = pct(trip.postTravelSteps);

    trip.state = tripState(trip.startDateRaw, trip.endDateRaw, trip.preProgress, trip.postProgress);

    // Warning flag
    if (!trip.requestUrl) trip.warning = 'Missing Form ID';

    // Status text (what the travel team sees)
    const denied = trip.preTravelSteps.find(s => s.state === 'denied')
                || trip.postTravelSteps.find(s => s.state === 'denied');
    if (denied) {
      trip.statusText = 'Action Required';
      trip.statusClass = 'status-denied';
    } else {
      const current = trip.postTravelSteps.find(s => s.state === 'current')
                   || trip.preTravelSteps.find(s => s.state === 'current');
      if (current) {
        const map = {
          'Compile HCA packet':          ['Travel Team Processing', 'status-team'],
          'SHARE PO generation':         ['Travel Team Processing', 'status-team'],
          'Generate itemized statement': ['Travel Team Processing', 'status-team'],
          'HCA form approval':           ['Pending Approval',       'status-pending'],
          'Division review':             ['Pending Approval',       'status-pending'],
          'ASD review':                  ['Pending Approval',       'status-pending'],
          'Executive authorization':     ['Pending Approval',       'status-pending'],
          'Rental car authorization':    ['Pending Approval',       'status-pending'],
          'Room rates authorization':    ['Pending Approval',       'status-pending'],
          'Traveler approval':           ['Pending Approval',       'status-pending'],
          'Supervisor approval':         ['Pending Approval',       'status-pending'],
          'Reimbursement form submitted':['Waiting on Traveler',    'status-waiting'],
          'Payments processing':         ['AP Processing',          'status-ap'],
        };
        [trip.statusText, trip.statusClass] = map[current.label] || ['In Progress', 'status-default'];
      }
    }
  }

  return trips;
}
