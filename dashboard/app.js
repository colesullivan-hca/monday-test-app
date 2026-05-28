import * as render from "./render.js";
import {TRAVEL_STATUS} from "./enum.js";

const monday = window.mondaySdk();
let tripData;
let trips;

const TRAVEL_FORM_COLUMNS = {
    tripID: '',
    title: 'text_mm2vj6tf',
    location: 'text_mm2vk860',
    dates: '',
    packetStatus: 'color_mm2xe9t',
    supervisorApproval: 'color_mm2x5q1s',
    divisionApproval: 'color_mm2xnfbh',
    ASDAproval: 'color_mm2x8nh2',
    OOSApproval: 'color_mm2xerea',
    rentalApproval: '',
    roomRatesApproval: '', 
    startDate: 'date_mm2vze0a',
    endDate: 'date_mm2vnvrc',
}

const ISTE_COLUMNS = {
    ISTEDone: '',
    ISTEApproved: '',
}

const BOARD_MAP = {
    travelForm: 18412077420,
    ISTEForm: 18412077425
}

function formatDate(dateString, type) {
    if (!dateString) return '';
    if (type === 'short') return new Date(`${dateString}T00:00:00`).toLocaleString('en-US', { month: 'short'});
    else return new Date(`${dateString}T00:00:00`).toLocaleString('en-US', { month: 'short', day: 'numeric' });
}

function fillTripSteps(trip) {
    const preTravelSteps = [];

    preTravelSteps.push({text: 'Submit ITD Travel Request', state: 'done', actor: 'Traveler'});
    preTravelSteps.push({text: 'Initial Concept Approval', state: 'done', actor: 'Supervisor'});
    preTravelSteps.push({text: 'Compile HCA Travel Packet', state: trip.packetStatus === 'Ready For Approvals' ? 'done' : '', actor: 'Travel Team'});
    preTravelSteps.push({text: 'HCA Form Approval', state: trip.supervisorApproval === 'Approved'? 'done' : trip.supervisorApproval === 'Denied'? 'denied' : '', actor: 'Supervisor'});
    preTravelSteps.push({text: 'Division Review & Sign-off', state: trip.divisionApproval === 'Approved'? 'done' : trip.divisionApproval === 'Denied'? 'denied' : '', actor: 'ITD Division'});
    preTravelSteps.push({text: 'ASD Review & Sign-off', state: trip.ASDAproval === 'Approved'? 'done' : trip.ASDAproval === 'Denied'? 'denied' : '', actor: 'ASD Budget'});
    preTravelSteps.push({text: 'Final Executive Authorization', state: trip.OOSApproval === 'Approved'? 'done' : trip.OOSApproval === 'Denied'? 'denied' : '', actor: 'OOS (Deputy Sec)'});
    preTravelSteps.push({text: 'SHARE PO Generation & Sourcing', state: '', actor: 'Travel Team'});
    const currentStep = preTravelSteps.find(step => step.state !== 'done' && step.state !== 'denied');
    if (currentStep) currentStep.state = 'current';

    trip.preTravelSteps = preTravelSteps;

    const completedSteps = preTravelSteps.filter(step => step.state === 'done').length;
    const totalSteps = preTravelSteps.length;
    trip.progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
}

function fillTripObjects(tripData) {
    const trips = {};
    const travelItems = tripData[BOARD_MAP.travelForm] || [];

    travelItems.forEach(item => {
        const cols = item.column_values || [];
        
        // 1. Create a fast lookup map: { "color_mm2xe9t": { id: "...", text: "..." } }
        const colMap = Object.fromEntries(cols.map(c => [c.id, c]));

        const tripID = colMap[TRAVEL_FORM_COLUMNS.tripID]?.text || item.id || crypto.randomUUID();
        
        if (!trips[tripID]) {
            trips[tripID] = {};
        }

        const trip = trips[tripID];

        Object.keys(TRAVEL_FORM_COLUMNS).forEach(key => {
            if (key === 'tripID') {
                trip[key] = tripID;
                return;
            }

            const columnId = TRAVEL_FORM_COLUMNS[key];

            trip[key] = colMap[columnId]?.text || '';
        });

        const dates = `${formatDate(trip.startDate, 'long')} - ${formatDate(trip.endDate, 'long')}`;
        trip.dates = dates;

        trip.url = item.url;

        fillTripSteps(trip);
    });

    return trips;
}

async function fetchItemsFromBoards(boardIds) {
    const INITIAL_QUERY = `
        query ($boardId: ID!, $limit: Int!) {
            boards(ids: [$boardId]) {
            items_page(limit: $limit) {
                cursor
                items {
                id
                name
                url
                column_values { id type text }
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
                id
                name
                url
                column_values { id type text }
            }
            }
        }
        `;

    // This object will hold separate arrays for each board
    // e.g., { "1234567890": [...], "18412077425": [...] }    
    const boardDataResult = {};

    for (const boardId of boardIds) {
        // console.log(`Fetching items for board ID: ${boardId}...`);
        
        // Initialize an empty array for this specific board
        boardDataResult[boardId] = [];
        
        let hasMore = true;
        let cursor = null;

        while (hasMore) {
        let query = !cursor ? INITIAL_QUERY : NEXT_PAGE_QUERY;
        let variables = !cursor ? { boardId, limit: 50 } : { cursor };

        const res = await monday.api(query, { variables });
        
        const itemsPageData = !cursor 
            ? res.data.boards[0].items_page 
            : res.data.next_items_page;

        if (itemsPageData.items) {
            // Push items specifically into this board's array
            boardDataResult[boardId].push(...itemsPageData.items);
        }

        cursor = itemsPageData.cursor;
        hasMore = !!cursor;
        }
        
        // console.log(`Finished board ${boardId}. Found ${boardDataResult[boardId].length} items.`);
    }

    return boardDataResult;
}

async function init() {
  const loadingScreen = document.getElementById("loading-screen");
  try {
    const context = await monday.get('context');
    const currentBoardId = context?.data?.boardId;

    console.log(context.data);

    if (!currentBoardId) {
      throw new Error('Please open this in a monday object.');
    }

    tripData = await fetchItemsFromBoards([BOARD_MAP.travelForm, BOARD_MAP.ISTEForm]);
    console.log(tripData);

    trips = fillTripObjects(tripData);
    console.log(trips);

    const container = document.querySelector('.pre-travel.stack');
    container.innerHTML = render.renderDashboard(trips);

    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }

  } catch (err) {
    console.error('Init error:', err);
    if (loadingScreen) {
      loadingScreen.innerHTML = `<p style="color: red;">Failed to load data. Please refresh.</p>`;
    }
  }
}
init();