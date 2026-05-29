import * as render from "./render.js";
import {TRAVEL_STATUS} from "./enum.js";
import "./stack-toggle.js";

const monday = window.mondaySdk();
let tripData;
let trips;

const TRAVEL_FORM_COLUMNS = {
    tripID: 'text_mm35sbdp',
    title: 'text_mm2vj6tf',
    location: 'text_mm2vk860',
    packetStatus: 'color_mm2xe9t',
    supervisorApproval: 'color_mm2x5q1s',
    divisionApproval: 'color_mm2xnfbh',
    ASDApproval: 'color_mm2x8nh2',
    OOSApproval: 'color_mm2xerea',
    rentalApproval: 'color_mm3seyds',
    roomRatesApproval: 'color_mm3s84rd', 
    startDate: 'date_mm2vze0a',
    endDate: 'date_mm2vnvrc',
}

const ISTE_COLUMNS = {
    tripID: 'text_mm35jsjp',
    ISTEStatus: '',
    ISTEApproval: '',
    // startDate: 'date_mm32tas8',
    // endDate: 'date_mm32gjap',
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

function fillPreTravelSteps(trip) {
    const steps = [];

    steps.push({text: 'Submit ITD Travel Request', state: 'done', actor: 'Traveler'});
    steps.push({text: 'Initial Concept Approval', state: 'done', actor: 'Supervisor'});
    steps.push({text: 'Compile HCA Travel Packet', state: trip.packetStatus === 'Ready For Approvals' ? 'done' : '', actor: 'Travel Team'});
    steps.push({text: 'HCA Form Approval', state: trip.supervisorApproval === 'Approved'? 'done' : trip.supervisorApproval === 'Denied'? 'denied' : '', actor: 'Supervisor'});
    steps.push({text: 'Division Review & Sign-off', state: trip.divisionApproval === 'Approved'? 'done' : trip.divisionApproval === 'Denied'? 'denied' : '', actor: 'ITD Division'});
    steps.push({text: 'ASD Review & Sign-off', state: trip.ASDApproval === 'Approved'? 'done' : trip.ASDApproval === 'Denied'? 'denied' : '', actor: 'ASD Budget'});
    steps.push({text: 'Final Executive Authorization', state: trip.OOSApproval === 'Approved'? 'done' : trip.OOSApproval === 'Denied'? 'denied' : '', actor: 'OOS (Deputy Sec)'});
    if (trip.rentalApproval != 'Not Applicable') {
        steps.push({text: 'Rental Car Authorization', state: trip.rentalApproval === 'Approved'? 'done' : trip.rentalApproval === 'Denied'? 'denied' : '', actor: 'CFO'});
    }
    if (trip.roomRatesApproval != 'Not Applicable') {
        steps.push({text: 'Room Rates Authorization', state: trip.roomRatesApproval === 'Approved'? 'done' : trip.roomRatesApproval === 'Denied'? 'denied' : '', actor: 'CFO'});
    }
    steps.push({text: 'SHARE PO Generation & Sourcing', state: '', actor: 'Travel Team'});

    const deniedStep = steps.find(step => step.state === 'denied');
    if (deniedStep) {
        trip.progressLabel = 'Halted: Action Required';
        trip.isDenied = 'denied';
        trip.statusText = TRAVEL_STATUS.DENIED;
    } else {
        const currentStep = steps.find(step => step.state !== 'done');
        if (currentStep) currentStep.state = 'current';
    }

    trip.preTravelSteps = steps;

    const completedSteps = steps.filter(step => step.state === 'done').length;
    const totalSteps = steps.length;
    trip.progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
}

function fillPostTravelSteps(trip) {
    const steps = [];
    const formSubmitted = trip.isteUrl;

    steps.push({text: 'Submit ITD Reimbursement Form & Receipts', state: formSubmitted ? 'done' : '', actor: 'Traveler'});
    steps.push({text: 'Generate Itemized Statement', state: trip.ISTEStatus === 'Ready For Approvals' ? 'done' : '', actor: 'Travel Team'});
    steps.push({text: 'Traveler Approval', state: '', actor: 'Traveler'});
    steps.push({text: 'Supervisor Approval', state: '', actor: 'Traveler'});
    steps.push({text: 'Payments Processing', state: '', actor: 'Accounts Payable'});

    const deniedStep = steps.find(step => step.state === 'denied');
    if (deniedStep) {
        trip.progressLabel = 'Halted: Action Required';
        trip.isDenied = 'denied';
        trip.statusText = TRAVEL_STATUS.DENIED;
    } else if (formSubmitted) {
        const currentStep = steps.find(step => step.state !== 'done');
        if (currentStep) currentStep.state = 'current';

        const completedSteps = steps.filter(step => step.state === 'done').length;
        const totalSteps = steps.length;
        trip.progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    }

    trip.postTravelSteps = steps;
}

function fillTripObjects(tripData) {
    const trips = {};
    const travelFormItems = tripData[BOARD_MAP.travelForm] || [];

    travelFormItems.forEach(item => {
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

        trip.requestUrl = item.url;

        fillPreTravelSteps(trip);
        fillPostTravelSteps(trip);
    });

    const ISTEFormItems = tripData[BOARD_MAP.ISTEForm] || [];
    ISTEFormItems.forEach(item => {
        const cols = item.column_values || [];
        
        // 1. Create a fast lookup map: { "color_mm2xe9t": { id: "...", text: "..." } }
        const colMap = Object.fromEntries(cols.map(c => [c.id, c]));

        const tripID = colMap[ISTE_COLUMNS.tripID]?.text || item.id || crypto.randomUUID();
        
        if (!trips[tripID]) {
            trips[tripID] = {};
        }

        const trip = trips[tripID];

        Object.keys(ISTE_COLUMNS).forEach(key => {
            if (key === 'tripID') {
                trip[key] = tripID;
                return;
            }

            const columnId = ISTE_COLUMNS[key];

            trip[key] = colMap[columnId]?.text || '';
        });

        const dates = `${formatDate(trip.startDate, 'long')} - ${formatDate(trip.endDate, 'long')}`;
        trip.dates = dates;

        trip.isteUrl = item.url;

        fillPostTravelSteps(trip);
    });

    Object.values(trips).forEach(trip => {
        trip.state = 'preTravel';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        if (today < start) {
            trip.state = 'preTravel';
        } else if (today >= start && today <= end) {
            trip.state = 'travelling';
        } else if (today > end) {
            if (trip.progress === 100) {
                trip.state = 'completed';
            } else {
                trip.state = 'postTravel';
            }
        }
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

    const preTravel = document.querySelector('.pre-travel.stack');
    const travelling = document.querySelector('.travelling.stack');
    const postTravel = document.querySelector('.post-travel.stack');
    const completed = document.querySelector('.completed.stack');
    
    const tripsList = Object.values(trips);
    preTravel.insertAdjacentHTML('beforeend', render.renderDashboard(tripsList.filter(trip => trip.state === 'preTravel')));
    travelling.insertAdjacentHTML('beforeend', render.renderDashboard(tripsList.filter(trip => trip.state === 'travelling')));
    postTravel.insertAdjacentHTML('beforeend', render.renderDashboard(tripsList.filter(trip => trip.state === 'postTravel')));
    completed.insertAdjacentHTML('beforeend', render.renderDashboard(tripsList.filter(trip => trip.state === 'completed')));

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