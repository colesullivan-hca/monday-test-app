const monday = window.mondaySdk();
let currentBoardId = null;
let items = [];

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

function num(v) {
  return parseFloat(v) || 0;
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

  const context = await monday.get('context');
  console.log(context.data);

  try {
    const ctx = await monday.get('context');
    const itemId = ctx?.data?.itemId;
    const boardId = ctx?.data?.boardId;

    if (!itemId || !boardId) {
      throw new Error('No item/board context found. Open this in a monday item view.');
    }

    currentBoardId = boardId;

    const query = `
      query {
        items(ids: [${itemId}]) {
          id
          name
          column_values {
            id
            text
            value
          }
        }
      }
    `;

    const res = await monday.api(query);

    if (res?.errors?.length) {
      throw new Error(res.errors.map(e => e.message).join('; '));
    }

    const item = res?.data?.items?.[0];
    if (!item) throw new Error('Item not found');

    document.querySelectorAll('[data-col]').forEach(field => {
      const col = item.column_values.find(c => c.id === field.dataset.col);
      field.value = col?.text || '0';
      field.setAttribute('readonly', true);
    });

    calculateTotals();
  } catch (err) {
    console.error('[TravelForm]', err);
    monday.execute('notice', {
      message: err.message || 'Failed to load item',
      type: 'error'
    });
  }
}

init();