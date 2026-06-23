// =============================================================================
//  data.js  —  Fetches from monday and assembles unified trip objects.
//  You should not need to edit this file unless you add new boards.
// =============================================================================

import {
  MODE,
  BOARDS,
  TRAVELER_REQUEST_FILE_COLS,
  TRAVELER_REQUEST_COLS,
  HCA_PACKET_COLS,
  TRAVELER_REIMB_FILE_COLS,
  TRAVELER_REIMB_SUBITEM_COLS,
  TRAVELER_REIMB_COLS,
  ISTE_SUBITEM_COLS,
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
          subitems {
            id
            board { id }
            assets { id name public_url file_extension }
            column_values { id type text value }
          }
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
        subitems {
          id
          board { id }
          assets { id name public_url file_extension }
          column_values { id type text value }
        }
      }
    }
  }
`;

// Query to fetch activity updates for a single item
const UPDATES_QUERY = `
  query ($itemId: ID!) {
    items(ids: [$itemId]) {
      updates(limit: 100) {
        id
        body
        text_body
        created_at
        creator { name }
        replies {
          id
          body
          text_body
          created_at
          creator { name }
        }
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
  const items  = [];
  let cursor   = null;

  while (true) {
    const query     = !cursor ? INITIAL_QUERY : NEXT_PAGE_QUERY;
    const variables = !cursor ? { boardId, limit: 200 } : { cursor };

    let res;
    try {
      if (MODE === 'dev') {
        const response = await fetch("http://127.0.0.1:5000/get-monday-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ query, variables })
        });
        res = await response.json();
      }
      else if (MODE === 'test') {
        const response = await fetch(`./demo-queries/${boardId}.json`);
        res = await response.json();
      }
      else {
        res = await monday.api(query, { variables });
      }
    } catch (err) {
      console.error(`fetchBoard ${boardId} — API call failed:`, err);
      break;
    }

    // Log the raw response so you can inspect shape in the console if needed
    // console.debug(`fetchBoard ${boardId} raw:`, JSON.stringify(res).slice(0, 400));

    // The monday SDK can return errors inside res.errors even on HTTP 200
    if (res?.errors?.length) {
      console.error(`fetchBoard ${boardId} — GraphQL errors:`, res.errors);
      break;
    }

    let page;
    if (!cursor) {
      // Initial fetch: res.data.boards is an array; [0] is our board
      const board = res?.data?.boards?.[0];
      if (!board) {
        console.error(
          `fetchBoard ${boardId} — board not found. ` +
          `Check BOARDS in config.js. Raw response:`,
          res
        );
        break;
      }
      page = board.items_page;
    } else {
      page = res?.data?.next_items_page;
    }

    if (!page) {
      console.error(`fetchBoard ${boardId} — items_page missing from response`, res);
      break;
    }

    if (page.items?.length) items.push(...page.items);

    // If testing locally with a single static file, force break the loop 
    // to prevent infinite loops from static cursor data.
    if (typeof MODE !== 'undefined' && MODE === 'test') {
      break; 
    }
    cursor = page.cursor || null;
    if (!cursor) break;
  }

  return items;
}

export async function fetchTripActivity(monday, trip) {
  const requests = [];
  if (trip.mondayItemId_hca)  requests.push({ boardLabel: 'HCA Packet',       itemId: trip.mondayItemId_hca });
  if (trip.mondayItemId_iste) requests.push({ boardLabel: 'ISTE Reimb. Packet', itemId: trip.mondayItemId_iste });

  if (!requests.length) return [];

  const results = await Promise.all(requests.map(async ({ boardLabel, itemId }) => {
    try {
      let res;
      if (MODE === 'test') {
        return [];
      } else if (MODE === 'dev') {
        const response = await fetch('http://127.0.0.1:5000/get-monday-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: UPDATES_QUERY, variables: { itemId } }),
        });
        res = await response.json();
      } else {
        res = await monday.api(UPDATES_QUERY, { variables: { itemId } });
      }

      const updates = res?.data?.items?.[0]?.updates || [];
      const flat = [];

      for (const u of updates) {
        flat.push({
          id:        u.id,
          boardLabel,
          author:    u.creator?.name || 'Travel Update',
          body:      u.text_body || stripHtml(u.body) || '',
          createdAt: new Date(u.created_at),
          isReply:   false,
        });
        for (const r of (u.replies || [])) {
          flat.push({
            id:        r.id,
            boardLabel,
            author:    r.creator?.name || 'Travel Update',
            body:      r.text_body || stripHtml(r.body) || '',
            createdAt: new Date(r.created_at),
            isReply:   true,
          });
        }
      }
      return flat;
    } catch (err) {
      console.warn(`fetchTripActivity failed for item ${itemId}:`, err);
      return [];
    }
  }));

  // Merge all updates and sort newest-first
  return results.flat().sort((a, b) => b.createdAt - a.createdAt);
}

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export async function fetchAllBoards(monday) {
  const [travelerItems, hcaItems, reimbItems, isteItems] = await Promise.all([
    fetchBoard(monday, BOARDS.travelerRequest).catch(err => {
      console.error('travelerRequest fetch failed:', err); return [];
    }),
    fetchBoard(monday, BOARDS.hcaPacket).catch(err => {
      console.error('hcaPacket fetch failed:', err); return [];
    }),
    fetchBoard(monday, BOARDS.travelerReimbursement).catch(err => {
      console.error('travelerReimbursement fetch failed:', err); return [];
    }),
    fetchBoard(monday, BOARDS.istePacket).catch(err => {
      console.error('istePacket fetch failed:', err); return [];
    }),
  ]);

  // console.log('Fetched counts —', {
  //   travelerRequest:      travelerItems.length,
  //   hcaPacket:            hcaItems.length,
  //   travelerReimbursement: reimbItems.length,
  //   istePacket:           isteItems.length,
  // });

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
    const col = map[colId];
    if (!col) { result[key] = ''; continue; }

    // long_text columns store content in value JSON, not .text
    if (col.type === 'long_text') {
      try { result[key] = JSON.parse(col.value)?.text || ''; }
      catch { result[key] = col.text || ''; }
    // numeric columns: .text is already the number string
    } else {
      result[key] = col.text || '';
    }
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

    trip.requestFilesByCol = {};

    for (const [key, colId] of Object.entries(TRAVELER_REQUEST_FILE_COLS)) {
      const col = map[colId];
      if (!col) { trip.requestFilesByCol[key] = []; continue; }
      try {
        const fileRefs = JSON.parse(col.value)?.files || [];
        trip.requestFilesByCol[key] = fileRefs
          .map(f => item.assets?.find(a => String(a.id) === String(f.assetId)))
          .filter(Boolean);
      } catch {
        trip.requestFilesByCol[key] = [];
      }
    }

    Object.assign(trip, extract(map, TRAVELER_REQUEST_COLS));
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
    
    trip.dates = `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`;
    trip.startDateRaw = map[HCA_PACKET_COLS.startDate]?.text || '';
    trip.endDateRaw   = map[HCA_PACKET_COLS.endDate]?.text   || '';
  }

  // --- Board 3: Traveler reimbursement ---
  for (const item of reimbItems) {
    const map    = colMap(item);
    const tripId = map[TRAVELER_REIMB_COLS.tripID]?.text || item.id;
    const trip   = slot(tripId);

    trip.mondayItemId_reimb = item.id;
    trip.reimbUrl           = item.url;
    trip.reimbAssets        = item.assets || [];

    trip.reimbFilesByCol = {};

    for (const [key, colId] of Object.entries(TRAVELER_REIMB_FILE_COLS)) {
      const col = map[colId];
      if (!col) { trip.reimbFilesByCol[key] = []; continue; }
      try {
        const fileRefs = JSON.parse(col.value)?.files || [];
        trip.reimbFilesByCol[key] = fileRefs
          .map(f => item.assets?.find(a => String(a.id) === String(f.assetId)))
          .filter(Boolean);
      } catch {
        trip.reimbFilesByCol[key] = [];
      }
    }

    Object.assign(trip, extract(map, TRAVELER_REIMB_COLS));

    // Map transportation subitems
    trip.reimbSubitems = (item.subitems || []).map(sub => {
      const sm = colMap(sub);
      const sv = colId => sm[colId]?.text || '';

      // Find receipt asset — the file column's text is the asset ID
      const receiptColId  = TRAVELER_REIMB_SUBITEM_COLS.receipt;

      const receiptAssets = (() => {
        try {
          const files = JSON.parse(sm[receiptColId]?.value)?.files || [];
          return files
            .map(f => sub.assets?.find(a => String(a.id) === String(f.assetId)))
            .filter(Boolean);
        } catch { return []; }
      })();

      return {
        transportType: sv(TRAVELER_REIMB_SUBITEM_COLS.transportType),
        listType:      sv(TRAVELER_REIMB_SUBITEM_COLS.listType),
        date:          sv(TRAVELER_REIMB_SUBITEM_COLS.date),
        amount:        parseFloat(sv(TRAVELER_REIMB_SUBITEM_COLS.amount))   || 0,
        tipAmount:     parseFloat(sv(TRAVELER_REIMB_SUBITEM_COLS.tipAmount)) || 0,
        receiptAssets:  receiptAssets || null,
      };
    }).filter(row => row.transportType || row.date || row.amount);
  }

  // --- Board 4: ISTE packet ---
  for (const item of isteItems) {
    const map    = colMap(item);
    const tripId = map[ISTE_PACKET_COLS.tripID]?.text || item.id;
    const trip   = slot(tripId);

    trip.mondayItemId_iste = item.id;
    trip.istePacketUrl     = item.url;

    trip.isteSubitemBoardId  = item.subitems?.[0]?.board?.id || null;

    Object.assign(trip, extract(map, ISTE_PACKET_COLS));

    // Map subitems → row data for the itemized table
    trip.isteSubitems = (item.subitems || []).map(sub => {
      const sm = colMap(sub);
      const sv = colId => sm[colId]?.text || '';
      return {
        subitemId:   sub.id,
        date:        sv(ISTE_SUBITEM_COLS.date),
        departTime:  sv(ISTE_SUBITEM_COLS.departTime),
        arriveTime:  sv(ISTE_SUBITEM_COLS.arriveTime),
        destination: sv(ISTE_SUBITEM_COLS.destination),
        odometer:    sv(ISTE_SUBITEM_COLS.odometer),
        miles:       parseFloat(sv(ISTE_SUBITEM_COLS.miles))   || 0,  // ← parse
        mileage:     parseFloat(sv(ISTE_SUBITEM_COLS.mileage)) || 0,
        perdiem:     parseFloat(sv(ISTE_SUBITEM_COLS.perdiem)) || 0,
        other:       parseFloat(sv(ISTE_SUBITEM_COLS.other))   || 0,
      };
    });
  }

  // --- Compute pipelines, progress, state for every trip ---
  for (const trip of Object.values(trips)) {
    trip.preTravelSteps  = resolveSteps(PRE_TRAVEL_STEPS,  trip, null);
    trip.postTravelSteps = resolveSteps(POST_TRAVEL_STEPS, trip, trip.reimbUrl);

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

  // --- Auto-fill ISTE fields from Board 1 when they're blank ---
  for (const trip of Object.values(trips)) {
    if (!trip.mondayItemId_iste) continue;  // no ISTE item, skip

    trip._isteBackfillNeeded = {};  // ← new: tracks only fields that were actually blank

    const fill = (isteKey, sourceVal) => {
      if (!trip[isteKey] && sourceVal) {
        trip[isteKey] = sourceVal;
        trip._isteBackfillNeeded[isteKey] = sourceVal;  // ← mark it
      }
    };

    fill('iste_supplierName',  trip.tr_firstName && trip.tr_lastName
                                ? `${trip.tr_firstName} ${trip.tr_lastName}`
                                : trip.iste_supplierName);
    fill('iste_supplierId',    trip.tr_vendorId);
    fill('iste_division',      trip.tr_division);
    fill('iste_postOfDuty',    trip.tr_workCity && trip.tr_workState
                                ? `${trip.tr_workCity}, ${trip.tr_workState}`
                                : trip.iste_postOfDuty);
    fill('iste_residence',     trip.tr_homeCity && trip.tr_homeState
                                ? `${trip.tr_homeCity}, ${trip.tr_homeState}`
                                : trip.iste_residence);
    // fill('iste_supervisorEmail',  trip.tr_supervisorEmail);  
    fill('iste_destination',  trip.tr_confCity);  
  }

  return Object.fromEntries(
    Object.entries(trips).filter(([, trip]) => trip.mondayItemId_hca)
  );
}