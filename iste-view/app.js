const monday = window.mondaySdk();
let currentBoardId = null;
let currentItemId = null;
let isLocked;
const originalValues = {};

async function generatePdf(data) {
    const { PDFDocument } = PDFLib;

    // 2. Fetch your static PDF template
    const url = './ISTE.pdf';
    const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

    // 3. Load the PDF and get the form fields
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    // 4. Fill the fields by their names (set in Acrobat/LibreOffice)
    document.querySelectorAll('[data-pdf]').forEach(field => {
      const pdfId = field.dataset.pdf;
      const text = field.value || field.textContent;
      form.getTextField(pdfId).setText(text);
    });

    // 5. Save the PDF and create a local URL
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(blob);

    // 6. Push to the iframe
    document.getElementById('pdf-viewer').src = pdfUrl;
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
            const newInput = input.slice(0, -1) + num;
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
      .reduce((sum, id) => sum + num(document.querySelector(`#${id}`).value), 0);
  const totalsTotalField = document.getElementById('totalsTotal');
  totalsTotalField.textContent = totalsTotal.toFixed(2);

  advance = num(document.getElementById('advanceAmount'));
  finalTotal = totalsTotal + advance;
  document.getElementById('finalTotal').textContent = finalTotal;
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
          console.log('subitem');
          item1 = subitems?.find(s => s.id === field.dataset.itemId);
        }
        else item1 = item;
        const col = item1.column_values.find(c => c.id === field.dataset.col);
        if (field.type === 'checkbox') {
          field.checked = col?.text === "v"; 
        } else {
          field.value = col?.text || '';
        }
        console.log(item1.id + ' ' + col?.text);
        // Snapshot original value for dirty tracking
        // originalValues[field.dataset.col] = field.value;

      });
      calculateTotals();
  }
  catch (err) {
      console.error('Init error:', err);
  }
}

init();