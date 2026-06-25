// =============================================================================
//  print-post.js  —  ISTE Excel download for the post-travel form.
//
//  Self-contained: no imports from the rest of the app.
//  Reads the live DOM rendered by buildPostForm() (forms-post.js) and fills
//  FY26_ISTE_Travel_Form_Template.xlsx via xlsx-populate (loaded via CDN).
//
//  Key behaviours vs the SheetJS version:
//    • Preserves all cell styles, borders, and number formats from the template.
//    • Writes exactly as many itemized rows as the form has — no MAX_ROWS cap.
//    • Deletes unused pre-formatted rows so the totals block sits immediately
//      below the last data row.
//    • Clones row 33's formatting for overflow rows when there are more data
//      rows than the template's 19 pre-formatted slots.
//    • Writes computed totals as plain numbers (no formulas).
//
//  LOAD xlsx-populate via CDN in index.html before this module is used:
//    <script src="https://cdn.jsdelivr.net/npm/xlsx-populate/browser/xlsx-populate.min.js"></script>
//
//  HOW TO ADAPT FOR FORMS-PRE:
//    1. Duplicate this file as print-pre.js.
//    2. Update TEMPLATE_URL and DOWNLOAD_NAME.
//    3. Update HEADER_MAP, TOTALS_MAP, RADIO_MAP, and ROW_COL_MAP to match
//       that form's DOM element IDs and cell addresses.
//    4. Rename generateIsteXlsx to something like generatePreXlsx.
//    5. In app.js: import it, pass as onPrint to renderDetail.
// =============================================================================

const TEMPLATE_URL = './FY26_ISTE_Travel_Form_Template.xlsx';
const DOWNLOAD_NAME = 'ISTE_Report.xlsx';

const FIRST_ROW = 15;
const TOTALS_START_ROW = 50;   // first row of the totals block (in the base template)
const ROW_TOTAL_COL = 'T';
const ADVANCE_CELL = 'T52';

// ---------------------------------------------------------------------------
//  Cell address maps
//  Always write to the top-left cell of a merged region.
//  Change these when the template changes — nothing else needs to move.
// ---------------------------------------------------------------------------

// DOM element ID → Excel cell address (plain text and numeric fields)
const HEADER_MAP = {
  iste_agencyName:         'B3',
  iste_businessUnit:       'N3',
  iste_voucherNumber:      'P3',
  iste_supplierName:       'B5',   // merged B5:F6
  iste_postOfDuty:         'K5',   // merged K5:Q7
  iste_licensePlate:       'G6',   // merged G6:H6
  iste_supplierId:         'B7',
  iste_vehicleModel:       'G8',   // merged G8:H8
  iste_residence:          'K8',   // merged K8:Q10
  // iste_boardAttendance:    'D9',   // merged D9:F9
  // iste_vehicleType:        'G10',  // merged G10:H10
  // iste_boardMeetingLength: 'D10',  // merged D10:F10
};

// DOM span ID → Excel cell address (computed totals — written as numbers).
// These addresses are in the BASE template (totals block at row 34).
// At write time they are adjusted by the row offset produced by adding/removing
// itemized rows.
const TOTALS_MAP = {
  iste_milesTotal:   'L50',  // merged L34:L35
  iste_mileageTotal: 'N50',  // merged N34:N35
  iste_perdiemTotal: 'P50',  // merged P34:P35
  iste_otherTotal:   'R50',  // merged R34:R35
  iste_grandTotal:   'T50',  // merged T34:T35
  iste_adjTotal:     'T54',  // merged T36:T37
};

// Adjusted subtotals by category.
const ADJ_SUBTOTAL_MAP = {
  // iste_mileageTotal: 'N36',  // merged N36:N37
  // iste_perdiemTotal: 'P36',  // merged P36:P37
  // iste_otherTotal:   'R36',  // merged R36:R37
};

// Radio button groups → pairs of [cell, value-that-triggers-X].
// Cell addresses are in the BASE template layout.
const RADIO_MAP = [
  {
    radioName: 'iste_voucherBasis',
    options: [
      { value: 'Prepaid Voucher', cell: 'S6' },
      { value: 'Final Voucher',   cell: 'S9' },
    ],
  },
  {
    radioName: 'iste_perDiemBasis',
    options: [
      { value: 'Actual',         cell: 'B36' },  // merged A35:B35
      { value: 'Approved Rates', cell: 'B38' },  // merged A37:B37
    ],
  },
];

// data-iste-col value → column letter and data type in the itemized rows.
const ROW_COL_MAP = {
  date:        { col: 'A', type: 'date'   },  // merged A:B, format mm-dd-yy
  departTime:  { col: 'C', type: 'text'   },
  arriveTime:  { col: 'D', type: 'text'   },  // merged D:E
  destination: { col: 'F', type: 'text'   },  // merged F:I
  odometer:    { col: 'K', type: 'text'   },
  miles:       { col: 'L', type: 'number' },
  mileage:     { col: 'N', type: 'number' },
  perdiem:     { col: 'P', type: 'number' },
  other:       { col: 'R', type: 'number' },
};


// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function dropdownIndex(options, selectedText) {
  const idx = options.indexOf(selectedText);
  return idx >= 0 ? idx + 1 : '';
}

// Parse "YYYY-MM-DD" → Excel date serial number (days since Dec 30, 1899).
function toExcelDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return Math.floor((d - new Date(1899, 11, 30)) / 86400000);
}

// Parse a column letter (A–Z, AA–XFD) to a 1-based column index.
function colToIndex(col) {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64;
  return n;
}

// Parse a cell address like "N34" into { col: 'N', row: 34 }.
function parseAddr(addr) {
  const m = addr.match(/^([A-Z]+)(\d+)$/i);
  return { col: m[1].toUpperCase(), row: parseInt(m[2], 10) };
}

// Rebuild an address from col letter + row number, offsetting the row.
function shiftAddr(addr, rowOffset) {
  const { col, row } = parseAddr(addr);
  return `${col}${row + rowOffset}`;
}

// Write a value to a cell via xlsx-populate, coercing to the right type.
function writeCell(sheet, addr, value, type) {
  const cell = sheet.cell(addr);

  if (value === null || value === undefined || value === '') {
    cell.value('');
    return;
  }

  if (type === 'date') {
    const serial = toExcelDate(String(value));
    if (serial !== null) {
      // xlsx-populate accepts a JS Date or a serial; using the serial keeps
      // the existing mm-dd-yy number format from the template intact.
      cell.value(serial);
    } else {
      cell.value(String(value));
    }
  } else if (type === 'number') {
    const n = parseFloat(String(value).replace(/,/g, ''));
    cell.value(isNaN(n) ? 0 : n);
  } else {
    cell.value(String(value));
  }
}


// ---------------------------------------------------------------------------
//  generateIsteXlsx()
//  Called by the Print button via initPostFormListeners → app.js → onPrint.
// ---------------------------------------------------------------------------

export async function generateIsteXlsx() {
  if (!window.XlsxPopulate) {
    throw new Error(
      'xlsx-populate is not loaded. Add CDN script before using exporter.'
    );
  }

  const val = id =>
    document.getElementById(id)?.value?.trim() ?? '';

  const text = id =>
    document.getElementById(id)?.textContent?.trim() ?? '';

  // ---------------- Load template ----------------
  const buf = await fetch(TEMPLATE_URL).then(r => r.arrayBuffer());
  const wb = await window.XlsxPopulate.fromDataAsync(buf);
  const ws = wb.sheet(0);

  // ---------------- DOM rows ----------------
  const domRows = Array.from(document.querySelectorAll('.iste-row'));

  // ---------------- Header fields ----------------
  for (const [domId, addr] of Object.entries(HEADER_MAP)) {
    writeCell(ws, addr, val(domId), 'text');
  }

  // ---------------- Radio groups ----------------
  for (const { radioName, options } of RADIO_MAP) {
    const selected =
      document.querySelector(`input[name="${radioName}"]:checked`)?.value || '';

    for (const { value, cell } of options) {
      writeCell(ws, cell, selected === value ? 'X' : '', 'text');
    }
  }

  // ---------------- Itemized rows ----------------
  domRows.forEach((row, i) => {
    const r = FIRST_ROW + i;

    const get = col =>
      row.querySelector(`[data-iste-col="${col}"]`)?.value ?? '';

    for (const [isteCol, { col, type }] of Object.entries(ROW_COL_MAP)) {
      writeCell(ws, `${col}${r}`, get(isteCol), type);
    }

    const rowTotal =
      row.querySelector('.iste-row-total')?.textContent?.trim() ?? '';

    writeCell(ws, `${ROW_TOTAL_COL}${r}`, rowTotal, 'number');
  });

  // ---------------- Hide + clear unused rows ----------------
  const lastItemRow = FIRST_ROW + domRows.length - 1;
  const lastItemLimit = TOTALS_START_ROW - 1;

  // only operate within the itemized region
  for (let r = lastItemRow + 1; r <= lastItemLimit; r++) {
    ws.row(r).hidden(true);

    const cols = ['A','C','D','F','K','L','N','P','R','T'];

    for (const c of cols) {
      ws.cell(`${c}${r}`).value(null);
    }
  }

  // ---------------- Totals ----------------
  for (const [domId, addr] of Object.entries(TOTALS_MAP)) {
    writeCell(ws, addr, text(domId), 'number');
  }

  writeCell(ws, ADVANCE_CELL, val('iste_advance'), 'number');

  // ---------------- Download ----------------
  const blob = await wb.outputAsync('blob');
  const url = URL.createObjectURL(blob);

  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: DOWNLOAD_NAME,
  });

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}