const monday = window.mondaySdk();
let currentBoardId = null;
let currentItemId = null;
let subitemBoardId = null;
let isLocked;
const originalValues = {};  // key: "<itemId|'main'>__<colId>" → value

// Returns a unique key for a field element
function fieldKey(field) {
  const itemId = field.dataset.itemId || 'main';
  return `${itemId}__${field.dataset.col}`;
}

// Returns the current "value" of a field in a comparable form
function fieldValue(field) {
  return field.type === 'checkbox' ? (field.checked ? 'v' : '') : field.value;
}

// Show/hide save button based on whether any field is dirty
function checkDirty() {
  const allFields = document.querySelectorAll('[data-col]');
  const isDirty = Array.from(allFields).some(f => fieldValue(f) !== originalValues[fieldKey(f)]);
  const saveBtn = document.getElementById('saveButton');
  if(isDirty) saveBtn.classList.remove('inactive');
  else saveBtn.classList.add('inactive');
}

// Attach dirty-tracking listeners to all [data-col] fields
function attachDirtyListeners() {
  document.querySelectorAll('[data-col]').forEach(field => {
    field.addEventListener('input', checkDirty);
    field.addEventListener('change', checkDirty);
  });
}

// Snapshot current values as the new baseline (call after load or after successful save)
function snapshotValues() {
  document.querySelectorAll('[data-col]').forEach(field => {
    originalValues[fieldKey(field)] = fieldValue(field);
  });
}

// Build a monday column_values JSON string for a set of changed fields
function buildColumnValues(fields) {
  const colValues = {};
  fields.forEach(field => {
    const colId = field.dataset.col;
    if (field.type === 'checkbox') {
      colValues[colId] = { checked: field.checked ? 'true' : 'false' };
    } else if (field.tagName === 'SELECT') {
      colValues[colId] = { label: field.value };
    } else {
      colValues[colId] = field.value;
    }
  });
  return JSON.stringify(colValues);
}

async function saveChanges() {
  const saveBtn = document.getElementById('saveButton');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

  try {
    const allFields = Array.from(document.querySelectorAll('[data-col]'));
    const dirtyFields = allFields.filter(f => fieldValue(f) !== originalValues[fieldKey(f)]);

    const mainDirty = dirtyFields.filter(f => !f.dataset.itemId);
    const subitemMap = {};
    dirtyFields.filter(f => f.dataset.itemId).forEach(f => {
      const id = f.dataset.itemId;
      if (!subitemMap[id]) subitemMap[id] = [];
      subitemMap[id].push(f);
    });

    const mutation = `mutation ($itemId: ID!, $boardId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(
        item_id: $itemId,
        board_id: $boardId,
        column_values: $columnValues
      ) { id }
    }`;

    const requests = [];

    if (mainDirty.length) {
      requests.push(monday.api(mutation, {
        variables: {
          itemId: String(currentItemId),
          boardId: String(currentBoardId),
          columnValues: buildColumnValues(mainDirty),
        }
      }));
    }
    Object.entries(subitemMap).forEach(([itemId, fields]) => {
      requests.push(monday.api(mutation, {
        variables: {
          itemId: String(itemId),
          boardId: String(subitemBoardId),
          columnValues: buildColumnValues(fields),
        }
      }));
    });

    const results = await Promise.all(requests);
    const errors = results.flatMap(r => r?.errors || []);
    if (errors.length) {
      console.error('Save errors:', errors);
      alert('Some fields failed to save. Check the console for details.');
      return;
    }
    else {
      monday.execute('notice', {
        message: 'Changes saved successfully!',
        type: 'success'
      });
    }

    snapshotValues();
    checkDirty();
  } catch (err) {
    console.error('Save error:', err);
    alert('Save failed. Check the console for details.');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
  }
}

// Wire up save button
const _saveBtn = document.getElementById('saveButton');
if (_saveBtn) {
  _saveBtn.style.display = 'block';
  _saveBtn.addEventListener('click', saveChanges);
}

async function generatePdf() {
    const { PDFDocument } = PDFLib;

    const url = './ISTE.pdf';
    const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    document.querySelectorAll('[data-pdf]').forEach(field => {
        const pdfFieldName = field.dataset.pdf;
        
        try {
            const pdfField = form.getField(pdfFieldName);

            if (field.type === 'checkbox') {
                // Check or uncheck based on the HTML checked state
                field.checked ? pdfField.check() : pdfField.uncheck();
            } 
            else if (field.tagName === 'SELECT') {
                // selectOption handles dropdowns/combo boxes
                if(field.value) pdfField.select(field.value);
            } 
            else {
                // Default to text for inputs, textareas, etc.
                const text = field.value || field.textContent || '';
                pdfField.setText(text);
            }
        } catch (error) {
            console.warn(`Field "${pdfFieldName}" not found in PDF or type mismatch:`, error);
        }
    });

    // form.flatten();
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    const pdfUrl = URL.createObjectURL(blob);
    // 1. Create a hidden anchor element
    const link = document.createElement('a');
    const pdfurl = URL.createObjectURL(blob);

    // 2. Set the download attribute and the URL
    link.href = pdfurl;
    link.download = 'ISTE_Report.pdf'; // You can name the file here

    // 3. Append to body, click it, and remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 4. Clean up the URL memory
    URL.revokeObjectURL(url);
}

document.getElementById('isteButton').addEventListener('click', generatePdf);

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
            let newInput = input.slice(0, -1) + num;
            if(input === "OTHERRow1.0") {
              num = i + 1;
              newInput = 'OTHERRow' + num;
            }
            child.firstElementChild.dataset.pdf = newInput;
        }
    }
}

function calculateTotals() {
  //row totals
  const itemRows = document.querySelectorAll('.item-row');
  itemRows.forEach(row => {
    let rowTotal = 0;
      const costInputs = row.querySelectorAll('.cost');
      for (const input of costInputs) {
        rowTotal += num(input.value);
      }
      const totalField = row.querySelector('.itemTotal');
      totalField.textContent = rowTotal.toFixed(2);
  }); 

  // miles total
  const miles = document.querySelectorAll('.miles');
  const milesTotal = Array.from(miles).reduce((sum, input) => sum + num(input.value), 0);
  const totalMilesField = document.getElementById('milesTotal');
  totalMilesField.textContent = milesTotal.toFixed(2);

  // other totals
  const totalIds = ['mileage', 'perdiem', 'other'];
  for (const id of totalIds) {
    costs = document.querySelectorAll(`.${id}`);
    let total = 0;
    for(const cost of costs) total += num(cost.value);
    let totalField = document.getElementById(`${id}Total`);
    let adjtotalField = document.getElementById(`${id}AdjTotal`);
    totalField.textContent = total.toFixed(2);
    adjtotalField.textContent = total.toFixed(2);
  }

  totalsTotal = ['mileageTotal', 'perdiemTotal', 'otherTotal']
      .reduce((sum, id) => sum + num(document.getElementById(id).textContent), 0);
  const totalsTotalField = document.getElementById('totalsTotal');
  totalsTotalField.textContent = totalsTotal.toFixed(2);

  advance = num(document.getElementById('advanceAmount').value);
  finalTotal = totalsTotal - advance;
  document.getElementById('finalTotal').textContent = finalTotal.toFixed(2);
}

document.querySelectorAll('.cost, .summable').forEach(input => {
  input.addEventListener('input', calculateTotals);
});

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
        boards(ids: [${currentBoardId}]) {
          columns(types: [status]) {
            id
            settings
          }
        }
        items(ids: [${currentItemId}]) {
          column_values { id text type }
          subitems {
            id
            board { id }
            column_values { id text type }
          }
        }
      }`;
      const res = await monday.api(query);
      const boardColumns = res?.data?.boards[0]?.columns;
      const item = res?.data?.items?.[0];
      if (!item) {
          throw new Error('Could not load item data.');
      }

      const REQUIRED_SUBITEMS = 15;
      const subitems = item?.subitems || [];
      if (subitems.length > REQUIRED_SUBITEMS) {
        alert(`This item has ${subitems.length} subitems but only ${REQUIRED_SUBITEMS} are supported. Please remove the extras and reload.`);
        return;
      }
      if (subitems.length < REQUIRED_SUBITEMS) {
        const needed = REQUIRED_SUBITEMS - subitems.length;
        const createMutation = `mutation ($itemId: ID!, $itemName: String!) {
          create_subitem(parent_item_id: $itemId, item_name: $itemName) { 
            id 
            board { id }
          }
        }`;

        const createRequests = Array.from({ length: needed }, (_, i) =>
          monday.api(createMutation, {
            variables: {
              itemId: String(currentItemId),
              itemName: 'Itemized Cost',
            }
          })
        );

        await Promise.all(createRequests);

        const reQuery = `query { items(ids: [${currentItemId}]) { subitems { id board { id } column_values { id text type } } } }`;
        const reRes = await monday.api(reQuery);
        subitems.splice(0, subitems.length, ...reRes.data.items[0].subitems);
      }
      subitemBoardId = subitems[0]?.board?.id;

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
          item1 = subitems?.find(s => s.id === field.dataset.itemId);
        }
        else item1 = item;
        const col = item1.column_values.find(c => c.id === field.dataset.col);
        if (field.type === 'checkbox') {
          field.checked = col?.text === "v"; 
        } else {
          field.value = col?.text || '';
        }
      });
      calculateTotals();
      snapshotValues();
      attachDirtyListeners();
  }
  catch (err) {
      console.error('Init error:', err);
  }
}

init();