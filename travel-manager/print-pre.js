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

const TEMPLATE_URL = './HCA_Out_of_State_Travel_Request_Form.xlsx';
const DOWNLOAD_NAME = 'Request.xlsx';

// ---------------------------------------------------------------------------
//  Cell address maps
//  Always write to the top-left cell of a merged region.
//  Change these when the template changes — nothing else needs to move.
// ---------------------------------------------------------------------------

// DOM element ID → Excel cell address (plain text and numeric fields)
const HEADER_MAP = {
    hca_division:          'A3',
    hca_date:              'D3',
    hca_traveler:          'A6',
    hca_shareId:           'C6',
    hca_title:             'D6',
    hca_destination:       'A9',
    hca_conferenceName:    'B9',
    hca_departureDate:     'C9',
    hca_returnDate:        'E9',

    hca_airfare:        'C12',
    hca_mileage:        'C13',
    hca_transport:      'C14',
    hca_fees:           'C15',
    hca_parking:        'C16',
    hca_carRental:      'C17',
    hca_perDiem:        'C19',
    hca_meals:          'C20',
    hca_lodging:        'C21',
    hca_confFees:       'C23',
    hca_otherExp:       'C24',

    hca_airfarePO:      'E12',
    hca_mileagePO:      'E13',
    hca_transportPO:    'E14',
    hca_feesPO:         'E15',
    hca_parkingPO:      'E16',
    hca_carRentalPO:    'E17',
    hca_perDiemPO:      'E19',
    hca_mealsPO:        'E20',
    hca_lodgingPO:      'E21',
    hca_confFeesPO:     'E23',
    hca_otherExpPO:     'E24',

    hca_justification:  'A28',
};

const NUMERIC_FIELDS = new Set([
    'hca_shareId', 'hca_airfare', 'hca_mileage', 'hca_transport', 'hca_fees',
    'hca_parking', 'hca_carRental', 'hca_perDiem', 'hca_meals',
    'hca_lodging', 'hca_confFees', 'hca_otherExp',  
    // 'hca_airfarePO',
    // 'hca_mileagePO',
    // 'hca_transportPO',
    // 'hca_feesPO',
    // 'hca_parkingPO',
    // 'hca_carRentalPO',
    // 'hca_perDiemPO',
    // 'hca_mealsPO',
    // 'hca_lodgingPO',
    // 'hca_confFeesPO',
    // 'hca_otherExpPO',  
]);

// DOM span ID → Excel cell address (computed totals — written as numbers).
// These addresses are in the BASE template (totals block at row 34).
// At write time they are adjusted by the row offset produced by adding/removing
// itemized rows.
const TOTALS_MAP = {
    // hca_travelTotal:    'C18',
    hca_travelPOTotal:  'E18',
    // hca_lodgingTotal:   'C22',
    hca_lodgingPOTotal: 'E22',
    // hca_grandTotal:     'C25',
    hca_grandPOTotal:   'E25',
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

export async function generateDFAXlsx() {
  if (!window.XlsxPopulate) {
    throw new Error(
      'xlsx-populate is not loaded. Add CDN script before using exporter.'
    );
  }

  const val = id =>
    document.getElementById(id)?.value?.trim() ?? '';

  const text = id =>
    document.getElementById(id)?.textContent?.trim().replace('$', '') ?? '';

  // ---------------- Load template ----------------
  const buf = await fetch(TEMPLATE_URL).then(r => r.arrayBuffer());
  const wb = await window.XlsxPopulate.fromDataAsync(buf);
  const ws = wb.sheet(0);

  // ---------------- Header fields ----------------
  for (const [domId, addr] of Object.entries(HEADER_MAP)) {
    if (val(domId) === '0') continue;
    const type = NUMERIC_FIELDS.has(domId) ? 'number' : 'text';
    writeCell(ws, addr, val(domId), type);
  }

  // ---------------- Totals ----------------
  for (const [domId, addr] of Object.entries(TOTALS_MAP)) {
    writeCell(ws, addr, text(domId), 'number');
  }

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