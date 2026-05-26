const monday = window.mondaySdk();
let trips;

function fillTrips(data) {
    
}

const COLUMN_MAP = {
    requestApproval,
    travelPacketDone,
    divisionApproval,
    ASDAproval,
    OOSApproval,
    rentalApproval,
    roomRatesApproval,
    ISTEDone,
    ISTEApproved,
    done
}

const BOARD_MAP = {
    travelForm: 1234567890,
    ISTEForm: 18412077425
}

async function fetchItemsFromBoards(boards) {
    const initialQuery = `
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

    trips = await fetchItemsFromBoards([BOARD_MAP.travelForm, BOARD_MAP.ISTEForm]);
    console.log(trips);

  } catch (err) {
    console.error('Init error:', err);
  }
}
init();