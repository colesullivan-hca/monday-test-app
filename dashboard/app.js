import * as render from "./render.js";
import {TRAVEL_STATUS} from "./enum.js";

const monday = window.mondaySdk();
let tripData;
let trips;

const TRAVEL_FORM_COLUMNS = {
    tripID: '',
    title: '',
    location: '',
    dates: '',
    travelPacketDone: 'color_mm2xe9t',
    supervisorApproval: 'color_mm2x5q1s',
    divisionApproval: 'color_mm2xnfbh',
    ASDAproval: 'color_mm2x8nh2',
    OOSApproval: 'color_mm2xerea',
    rentalApproval: '',
    roomRatesApproval: '', 
}

const ISTE_COLUMNS = {
    ISTEDone: '',
    ISTEApproved: '',
}

const BOARD_MAP = {
    travelForm: 18412077420,
    ISTEForm: 18412077425
}

function fillTripObjects(tripData) {
    const trips = {};
    const travelItems = tripData[BOARD_MAP.travelForm] || [];

    travelItems.forEach(item => {
        const cols = item.column_values || [];
        
        // 1. Create a fast lookup map: { "color_mm2xe9t": { id: "...", text: "..." } }
        const colMap = Object.fromEntries(cols.map(c => [c.id, c]));

        const tripID = colMap[TRAVEL_FORM_COLUMNS.tripID]?.text || crypto.randomUUID();
        
        if (!trips[tripID]) {
            trips[tripID] = {};
        }

        Object.keys(TRAVEL_FORM_COLUMNS).forEach(key => {
            if (key === 'tripID') {
                trips[tripID][key] = tripID;
                return;
            }

            const columnId = TRAVEL_FORM_COLUMNS[key];

            trips[tripID][key] = colMap[columnId]?.text;
        });
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
                column_values { id type text }
            }
            }
        }
        `;

    // This object will hold separate arrays for each board
    // e.g., { "1234567890": [...], "18412077425": [...] }    
    const boardDataResult = {};

    for (const boardId of boardIds) {
        console.log(`Fetching items for board ID: ${boardId}...`);
        
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
        
        console.log(`Finished board ${boardId}. Found ${boardDataResult[boardId].length} items.`);
    }

    return boardDataResult;
}

async function init() {
  try {
    const context = await monday.get('context');
    currentBoardId = context?.data?.boardId;

    console.log(context.data);

    if (!currentBoardId) {
      throw new Error('Please open this in a monday object.');
    }

    tripData = await fetchItemsFromBoards([BOARD_MAP.travelForm, BOARD_MAP.ISTEForm]);
    console.log(tripData);

    trips = fillTripObjects(tripData);
    console.log(trips);

  } catch (err) {
    console.error('Init error:', err);
  }
}
init();