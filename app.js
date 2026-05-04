const monday = window.mondaySdk();
let currentBoardId = null;
let currentItemId = null;

const BOARD_QUERY = (boardId) => `
  query {
    boards(ids: [${boardId}]) {
      items_page(limit: 100) {
        items {
          id
          name
          column_values {
            id
            text
            value
          }
        }
      }
    }
  }
`;

// Helper to parse numbers
function num(v) {
  return parseFloat(v) || 0;
}

// Collects all [data-col] values and sends to monday
async function saveAllData() {
  const columnValues = {};
  
  document.querySelectorAll('[data-col]').forEach(field => {
    const colId = field.dataset.col;
    // For monday 'numbers' columns, we just send the value as a string
    columnValues[colId] = field.value;
  });

  try {
    const query = `mutation ($itemId: ID!, $boardId: ID!, $columnValues: JSON!) {
      change_multiple_column_values (
        item_id: $itemId, 
        board_id: $boardId, 
        column_values: $columnValues
      ) {
        id
      }
    }`;

    const variables = {
      itemId: currentItemId,
      boardId: currentBoardId,
      columnValues: JSON.stringify(columnValues)
    };

    await monday.api(query, { variables });
    
    monday.execute('notice', {
      message: 'Changes saved successfully!',
      type: 'success'
    });
  } catch (err) {
    console.error(err);
    monday.execute('notice', {
      message: 'Error saving data.',
      type: 'error'
    });
  }
}

function calculateTotals() {
  const travelTotal = ['airfare','mileage','transport','fees','parking','car_rental']
    .reduce((sum,id)=>sum+num(document.querySelector(`#${id}`).value),0);

  const lodgingTotal = ['per_diem','meals','lodging']
    .reduce((sum,id)=>sum+num(document.querySelector(`#${id}`).value),0);

  const grandTotal = travelTotal + lodgingTotal +
    num(document.querySelector('#conference_fees').value) +
    num(document.querySelector('#other_expenses').value);

  document.getElementById('travelTotal').textContent = `$${travelTotal.toFixed(2)}`;
  document.getElementById('lodgingTotal').textContent = `$${lodgingTotal.toFixed(2)}`;
  document.getElementById('grandTotal').textContent = `$${grandTotal.toFixed(2)}`;

  const travelPOTotal = ['airfarePO','mileagePO','transportPO','feesPO','parkingPO','car_rentalPO']
    .reduce((sum,id)=>sum+num(document.querySelector(`#${id}`).value),0);

  const lodgingPOTotal = ['per_diemPO','mealsPO','lodgingPO']
    .reduce((sum,id)=>sum+num(document.querySelector(`#${id}`).value),0);

  const grandPOTotal = travelPOTotal + lodgingPOTotal +
    num(document.querySelector('#conference_feesPO').value) +
    num(document.querySelector('#other_expensesPO').value);

  document.getElementById('travelPOTotal').textContent = `$${travelPOTotal.toFixed(2)}`;
  document.getElementById('lodgingPOTotal').textContent = `$${lodgingPOTotal.toFixed(2)}`;
  document.getElementById('grandPOTotal').textContent = `$${grandPOTotal.toFixed(2)}`;
}

document.querySelectorAll('.cost').forEach(input => {
  input.addEventListener('input', calculateTotals);
});

async function init() {
  monday.setToken('');

  try {
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
      }
    }`;

    const res = await monday.api(query);
    const item = res?.data?.items?.[0];
    
    // 2. Status Check: Change 'status' to your actual Status Column ID
    const statusCol = item.column_values.find(c => c.id === 'color_mm2xe9t'); 
    const isLocked = statusCol?.text.includes('Ready');

    document.querySelectorAll('[data-col]').forEach(field => {
      const col = item.column_values.find(c => c.id === field.dataset.col);
      field.value = col?.text || '0';
      
      if (isLocked) {
        field.setAttribute('readonly', true);
        field.classList.add('locked-field'); // Optional CSS styling
      }
    });

    // 3. Handle Save Button Visibility
    const saveBtn = document.getElementById('saveButton');
    if (isLocked) {
      saveBtn.style.display = 'none';
    } else {
      saveBtn.addEventListener('click', saveAllData);
    }

    calculateTotals();
  } catch (err) {
    console.error(err);
  }
}

init();