const monday = window.mondaySdk();
let currentBoardId = null;
let currentItemId = null;
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
  return JSON.stringify(JSON.stringify(colValues)); // double-stringify for GraphQL inline
}

async function saveChanges() {
  const saveBtn = document.getElementById('saveButton');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

  try {
    const allFields = Array.from(document.querySelectorAll('[data-col]'));
    const dirtyFields = allFields.filter(f => fieldValue(f) !== originalValues[fieldKey(f)]);

    // Split into main item vs subitems
    const mainDirty = dirtyFields.filter(f => !f.dataset.itemId);
    const subitemMap = {};
    dirtyFields.filter(f => f.dataset.itemId).forEach(f => {
      const id = f.dataset.itemId;
      if (!subitemMap[id]) subitemMap[id] = [];
      subitemMap[id].push(f);
    });

    const mutations = [];

    if (mainDirty.length) {
      mutations.push(`
        updateMain: change_multiple_column_values(
          board_id: ${currentBoardId},
          item_id: ${currentItemId},
          column_values: ${buildColumnValues(mainDirty)}
        ) { id }
      `);
    }

    Object.entries(subitemMap).forEach(([itemId, fields], i) => {
      mutations.push(`
        updateSub${i}: change_multiple_column_values(
          board_id: ${currentBoardId},
          item_id: ${itemId},
          column_values: ${buildColumnValues(fields)}
        ) { id }
      `);
    });

    if (mutations.length) {
      const mutation = `mutation { ${mutations.join('\n')} }`;
      const res = await monday.api(mutation);
      if (res?.errors?.length) {
        console.error('Save errors:', res.errors);
        alert('Some fields failed to save. Check the console for details.');
        return;
      }
    }

    // Commit the new baseline and hide the save button
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

      const query2 = `query {
        boards(ids: [${currentBoardId}]) {
          columns(types: [status]) {
            id
            settings
          }
        }
      }`;

      const res2 = await monday.api(query2);
      const boardColumns = res2?.data?.boards[0]?.columns;

      if (boardColumns) {
        boardColumns.forEach(column => {
          const selectElement = document.querySelector(`select[data-col="${column.id}"]`);
          
          if (selectElement) {
            // Access labels from settings
            const labels = column.settings?.labels || {};

            selectElement.innerHTML = '';

            const options = Object.entries(labels).map(([id, val]) => {
              // Use val.label based on your mutation structure
              const labelText = val.label || val.text || val; 
              return new Option(labelText, labelText);
            });

            selectElement.append(...options);
          }
        });
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