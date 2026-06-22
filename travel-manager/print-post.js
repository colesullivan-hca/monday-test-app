// =============================================================================
//  print-post.js  —  ISTE PDF generation for the post-travel form.
//
//  This module is intentionally self-contained:
//    • No imports from the rest of the app.
//    • Reads the live DOM that buildPostForm() (forms-post.js) renders.
//    • Depends only on PDFLib being available as a global (loaded via CDN).
//
//  HOW TO ADAPT FOR FORMS-PRE:
//    1. Duplicate this file as print-pre.js.
//    2. Update PDF_URL to point at the correct base PDF for that form.
//    3. Update HEADER_TEXT_MAP, HEADER_SELECT_MAP, HEADER_SPAN_MAP,
//       RADIO_CHECKBOX_MAP, and rowFieldNames() (if it has itemized rows)
//       to match that form's element IDs and PDF field names.
//    4. Rename generateIstePdf to something like generatePreTravelPdf.
//    5. In app.js: import it, define an onPrintPre callback that calls it,
//       and pass onPrintPre into renderDetail alongside onPrint.
//    6. In forms-pre.js: wire a Print button the same way buildPostForm()
//       and initPostFormListeners() do below — give the button an id,
//       and call onPrint() from initPreFormListeners().
//    Everything else (the wiring, the callback pattern) stays identical.
// =============================================================================

const PDF_URL = './ISTE.pdf';

// ---------------------------------------------------------------------------
//  Field maps
//  Each map is: { 'PDF field name': 'DOM element id' }
//  Change these when the PDF is re-exported with new field names.
// ---------------------------------------------------------------------------

// Plain text inputs/textareas: form.getTextField(pdfField).setText(el.value)
const HEADER_TEXT_MAP = {
  'AGENCY NAME':           'iste_agencyName',
  'VOUCHER':               'iste_businessUnit',
  'VOUCHER NUMBER':        'iste_voucherNumber',
  'SUPPLIER NAME':         'iste_supplierName',
  'SUPPLIER ID':           'iste_supplierId',
  'Post of Duty':          'iste_postOfDuty',
  'Residence':             'iste_residence',
  'Vehicle License Plate': 'iste_licensePlate',
  'Vehicle Model  Year':   'iste_vehicleModel',
  'Advance_Amount':        'iste_advance',
};

// Select/dropdown elements: form.getDropdown(pdfField).select(el.value)
const HEADER_SELECT_MAP = {
  'Dropdown7': 'iste_vehicleType',
  'Dropdown5': 'iste_boardAttendance',
  'Dropdown6': 'iste_boardMeetingLength',
};

// Read-only total <span>s: form.getTextField(pdfField).setText(el.textContent)
const HEADER_SPAN_MAP = {
  'Mile_Total':        'iste_milesTotal',
  'MILEAGEROW_TOTAL':  'iste_mileageTotal',
  'PER DIEMRow_Total': 'iste_perdiemTotal',
  'OTHERRow_Total':    'iste_otherTotal',
  'ALL_Total':         'iste_grandTotal',
  'Final_Total':       'iste_adjTotal',
};

// Radio groups → pairs of PDF checkboxes.
// Each entry: { radioName, values: [ { radioValue, pdfField }, ... ] }
const RADIO_CHECKBOX_MAP = [
  {
    radioName: 'iste_voucherBasis',
    values: [
      { radioValue: 'Prepaid Voucher', pdfField: 'Prepaid' },
      { radioValue: 'Final Voucher',   pdfField: 'Final Voucher' },
    ],
  },
  {
    radioName: 'iste_perDiemBasis',
    values: [
      { radioValue: 'Actual',          pdfField: 'Check Box6' },
      { radioValue: 'Approved Rates',  pdfField: 'Check Box7' },
    ],
  },
];


// ---------------------------------------------------------------------------
//  Row PDF field name generator
//
//  Mirrors the numbering scheme from the original standalone app's
//  addPDFInputs() so the same ISTE.pdf file can be reused unchanged.
//
//  Row index i is 0-based (0 = first data row).
// ---------------------------------------------------------------------------

function rowFieldNames(i) {
  const n = i + 1; // 1-based row number used by the PDF field names

  // The PDF uses a ".0" suffix for the first row on some fields, then
  // increments the suffix for rows 2-15 (i ≥ 1).
  return {
    date:    i === 0 ? 'DATE ITEMIZED COSTS BY DAYRow1.0'
                     : `DATE ITEMIZED COSTS BY DAYRow1.${i}`,
    depart:  i === 0 ? 'DEPARTURERow1.0'
                     : `DEPARTURERow1.${i}`,
    arrive:  i === 0 ? 'ARRIVALRow1.0'
                     : `ARRIVALRow1.${i}`,
    dest:    i === 0 ? 'ENTER DESTINATION AND NATURE OF OFFICIAL BUSINESSRow1.0'
                     : `ENTER DESTINATION AND NATURE OF OFFICIAL BUSINESSRow1.${i}`,
    odo:     i === 0 ? 'START AND FINISHRow1.0'
                     : `START AND FINISHRow1.${i}`,
    miles:   `NO OF MILESRow_${n}`,
    mileage: `MILEAGERow${n}`,
    perdiem: `PER DIEMRow${n}`,
    other:   i === 0 ? 'OTHERRow1.0' : `OTHERRow${n}`,
    total:   `Total ${n}`,
  };
}


// ---------------------------------------------------------------------------
//  Safe PDF setters — log a warning instead of throwing if a field is missing.
//  Useful during development when the PDF and the map fall out of sync.
// ---------------------------------------------------------------------------

function safeText(form, fieldName, value) {
  try {
    form.getTextField(fieldName).setText(String(value ?? ''));
  } catch {
    console.warn(`print-post: PDF text field not found: "${fieldName}"`);
  }
}

function safeSelect(form, fieldName, value) {
  try {
    if (value) form.getDropdown(fieldName).select(value);
  } catch {
    console.warn(`print-post: PDF dropdown not found: "${fieldName}"`);
  }
}

function safeCheck(form, fieldName, checked) {
  try {
    const f = form.getCheckBox(fieldName);
    checked ? f.check() : f.uncheck();
  } catch {
    console.warn(`print-post: PDF checkbox not found: "${fieldName}"`);
  }
}


// ---------------------------------------------------------------------------
//  generateIstePdf()
//  Called by the Print button (wired in initPostFormListeners via app.js).
// ---------------------------------------------------------------------------

export async function generateIstePdf() {
  const { PDFDocument } = PDFLib;  // global from CDN

  const existingBytes = await fetch(PDF_URL).then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingBytes);
  const form   = pdfDoc.getForm();

  // Helpers that read the live DOM rendered by buildPostForm()
  const val  = id => document.getElementById(id)?.value       ?? '';
  const text = id => document.getElementById(id)?.textContent ?? '';

  // ── Header: plain text fields ────────────────────────────────────
  for (const [pdfField, domId] of Object.entries(HEADER_TEXT_MAP)) {
    safeText(form, pdfField, val(domId));
  }

  // ── Header: dropdowns ────────────────────────────────────────────
  for (const [pdfField, domId] of Object.entries(HEADER_SELECT_MAP)) {
    safeSelect(form, pdfField, val(domId));
  }

  // ── Footer: computed total spans ─────────────────────────────────
  for (const [pdfField, domId] of Object.entries(HEADER_SPAN_MAP)) {
    safeText(form, pdfField, text(domId));
  }

  // ── Radio groups → PDF checkboxes ────────────────────────────────
  for (const { radioName, values } of RADIO_CHECKBOX_MAP) {
    const selected = document.querySelector(`input[name="${radioName}"]:checked`)?.value || '';
    for (const { radioValue, pdfField } of values) {
      safeCheck(form, pdfField, selected === radioValue);
    }
  }

  // ── Itemized rows ─────────────────────────────────────────────────
  document.querySelectorAll('.iste-row').forEach((row, i) => {
    const get    = col => row.querySelector(`[data-iste-col="${col}"]`)?.value || '';
    const fields = rowFieldNames(i);
    const rowTotal = row.querySelector('.iste-row-total')?.textContent || '';

    safeText(form, fields.date,    get('date'));
    safeText(form, fields.depart,  get('departTime'));
    safeText(form, fields.arrive,  get('arriveTime'));
    safeText(form, fields.dest,    get('destination'));
    safeText(form, fields.odo,     get('odometer'));
    safeText(form, fields.miles,   get('miles'));
    safeText(form, fields.mileage, get('mileage'));
    safeText(form, fields.perdiem, get('perdiem'));
    safeText(form, fields.other,   get('other'));
    safeText(form, fields.total,   rowTotal);
  });

  // ── Download ──────────────────────────────────────────────────────
  const bytes = await pdfDoc.save();
  const blob  = new Blob([bytes], { type: 'application/pdf' });
  const url   = URL.createObjectURL(blob);
  const link  = Object.assign(document.createElement('a'), {
    href:     url,
    download: 'ISTE_Report.pdf',
  });
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}