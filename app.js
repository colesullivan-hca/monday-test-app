const monday = window.mondaySdk();
let currentBoardId = null;
let currentItemId = null;
let isLocked;
const originalValues = {};

// Helper to parse numbers
function num(v) {
  return parseFloat(v) || 0;
}

// Only sends fields that have changed since last load/save
async function saveAllData() {
  const columnValues = {};

  document.querySelectorAll('[data-col]').forEach(field => {
    const colId = field.dataset.col;
    if (field.value !== originalValues[colId]) {
      columnValues[colId] = field.value;
    }
  });

  if (Object.keys(columnValues).length === 0) {
    monday.execute('notice', {
      message: 'No changes to save.',
      type: 'info'
    });
    return;
  }

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

    // Update baseline so subsequent saves don't re-send unchanged fields
    Object.keys(columnValues).forEach(colId => {
      originalValues[colId] = columnValues[colId];
    });

    monday.execute('notice', {
      message: 'Changes saved successfully!',
      type: 'success'
    });

    const saveBtn = document.getElementById('saveButton');
    saveBtn.classList.add("saveInactive");
  } catch (err) {
    console.error('Save error:', err);
    monday.execute('notice', {
      message: 'Error saving data.',
      type: 'error'
    });
  }
}

function calculateTotals() {
  const travelTotal = ['airfare', 'mileage', 'transport', 'fees', 'parking', 'car_rental']
    .reduce((sum, id) => sum + num(document.querySelector(`#${id}`).value), 0);

  const lodgingTotal = ['per_diem', 'meals', 'lodging']
    .reduce((sum, id) => sum + num(document.querySelector(`#${id}`).value), 0);

  const grandTotal = travelTotal + lodgingTotal +
    num(document.querySelector('#conference_fees').value) +
    num(document.querySelector('#other_expenses').value);

  document.getElementById('travelTotal').textContent = `$${travelTotal.toFixed(2)}`;
  document.getElementById('lodgingTotal').textContent = `$${lodgingTotal.toFixed(2)}`;
  document.getElementById('grandTotal').textContent = `$${grandTotal.toFixed(2)}`;

  const travelPOTotal = ['airfarePO', 'mileagePO', 'transportPO', 'feesPO', 'parkingPO', 'car_rentalPO']
    .reduce((sum, id) => sum + num(document.querySelector(`#${id}`).value), 0);

  const lodgingPOTotal = ['per_diemPO', 'mealsPO', 'lodgingPO']
    .reduce((sum, id) => sum + num(document.querySelector(`#${id}`).value), 0);

  const grandPOTotal = travelPOTotal + lodgingPOTotal +
    num(document.querySelector('#conference_feesPO').value) +
    num(document.querySelector('#other_expensesPO').value);

  document.getElementById('travelPOTotal').textContent = `$${travelPOTotal.toFixed(2)}`;
  document.getElementById('lodgingPOTotal').textContent = `$${lodgingPOTotal.toFixed(2)}`;
  document.getElementById('grandPOTotal').textContent = `$${grandPOTotal.toFixed(2)}`;

  if(!isLocked) {
    const saveBtn = document.getElementById('saveButton');
    saveBtn.classList.remove("saveInactive");
  }

}

document.querySelectorAll('.cost').forEach(input => {
  input.addEventListener('input', calculateTotals);
});

async function init() {
  // monday.setToken('');

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

    if (!item) {
      throw new Error('Could not load item data.');
    }

    // Status check: change 'color_mm2xe9t' to your actual Status column ID if needed
    const statusCol = item.column_values.find(c => c.id === 'color_mm2xe9t');
    isLocked = statusCol?.text.includes('Ready');

    document.querySelectorAll('[data-col]').forEach(field => {
      const col = item.column_values.find(c => c.id === field.dataset.col);
      field.value = col?.text || '0';

      // Snapshot original value for dirty tracking
      originalValues[field.dataset.col] = field.value;

      if (isLocked) {
        field.setAttribute('readonly', true);
        field.classList.add('locked-field');
      }
    });

    const saveBtn = document.getElementById('saveButton');
    if (isLocked) {
    } else {
      saveBtn.style.display = 'block';
      saveBtn.addEventListener('click', saveAllData);
    }

    calculateTotals();
  } catch (err) {
    console.error('Init error:', err);
  }
}

init();