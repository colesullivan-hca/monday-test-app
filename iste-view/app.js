const monday = window.mondaySdk();
let currentBoardId = null;
let currentItemId = null;
let isLocked;
const originalValues = {};

// Helper to parse numbers
function num(v) {
  return parseFloat(v) || 0;
}

function int(v) {
    return parseInt(v) || 0;
}

// Adds to the html datasets for the itemized rows for the pdf input names
function addPDFInputs() {
    const itemRows = document.querySelectorAll('.item-row');
    for (let i = 1; i < 15; i++) {
        const itemRow = itemRows[i];
        for (const child of itemRow.children) {
            const input = child.firstElementChild.dataset.pdf;
            let num = int(input.at(-1));
            if(num === 0) num = i;
            else num = i+1;
            const newInput = input.slice(0, -1) + num;
            child.firstElementChild.dataset.pdf = newInput;
        }
    }
}

async function init() {
    try {
        const itemRows = [];
        const itemRow = document.querySelector(".item-row");
        itemRows.push(itemRow);
        for (let i = 0; i < 14; i++) {
            const clone = itemRow.cloneNode(true);
            itemRows.push(clone);
        }
        itemRow.after(...itemRows);
        addPDFInputs();

        const context = await monday.get('context');
        currentItemId = context?.data?.itemId;
        currentBoardId = context?.data?.boardId;

        if (!currentItemId || !currentBoardId) {
        throw new Error('Please open this in a monday item view.');
        }

        const query = `query {
        items(ids: [${currentItemId}]) {
            column_values {
                id
                text
                type
            }
            subitems {
                id
                column_values {
                    id
                    text
                    type
                }
            }
        }
        }`;

        const res = await monday.api(query);
        const item = res?.data?.items?.[0];
        const subitems = item?.subitems;

        if (!item) {
            throw new Error('Could not load item data.');
        }

        const elements = document.querySelectorAll('.item-row');
        subitems?.forEach((subitem, index) => {
            const tds = elements[index].children;
            for (const td of tds) {
                td.firstElementChild.dataset.itemId = subitem.id;
            }
        });

        
        document.querySelectorAll('[data-col]').forEach(field => {
          let item1;
          if(field.dataset.itemId) {
            console.log('subitem');
            item1 = subitems?.find(s => s.id === field.dataset.itemId);
          }
          else item1 = item;
          const col = item1.column_values.find(c => c.id === field.dataset.col);
          field.value = col?.text || '0';
          console.log(item1.id + ' ' + col?.text);
          // Snapshot original value for dirty tracking
          // originalValues[field.dataset.col] = field.value;

        });

    }
    catch (err) {
        console.error('Init error:', err);
    }
}

init();