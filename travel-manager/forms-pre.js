// =============================================================================
//  forms-pre.js  —  HCA Travel Packet editor (Board 2).
//
//  This file contains your exact HCA OUT OF STATE TRAVEL REQUEST FORM HTML,
//  adapted to read from and write to the monday.com board.
//
//  TO ADD / CHANGE FIELDS:
//    1. Add the input/select to the HTML in buildPreForm() below
//    2. Add the column ID to HCA_PACKET_COLS in config.js
//    3. Add an entry in collectPreFormData() at the bottom of this file
//
//  LOCKING: When packetStatus is "Ready For Approvals" the form renders
//  read-only (matching your original standalone app behavior).
// =============================================================================

const APPROVAL_OPTIONS      = ['', 'Awaiting Review', 'Approved', 'Denied', 'Not Applicable'];
const PACKET_STATUS_OPTIONS = ['', 'In Preparation', 'Ready For Approvals', 'On Hold'];


// ---------------------------------------------------------------------------
//  buildPreForm(trip)
//  Renders the full HCA form HTML into the right pane.
//  trip = the assembled trip object from data.js
// ---------------------------------------------------------------------------

export function buildPreForm(trip) {
  // Lock all inputs when the packet is submitted for approvals
  const locked = trip.packetStatus === 'Ready For Approvals';
  const ro     = locked ? 'readonly' : '';
  const roSel  = locked ? 'disabled' : '';

  return `
    <div class="pane-header">
      <span class="pane-header__icon">${editIcon()}</span>
      <div>
        <div class="pane-header__title">HCA Travel Packet</div>
        <div class="pane-header__sub">Board 2 · Editable — saves to monday
          ${locked ? '<span class="locked-badge">Locked — Ready for Approvals</span>' : ''}
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════
         HCA OUT OF STATE TRAVEL REQUEST FORM
         Matches your internal PDF exactly. Column IDs are in config.js
         under HCA_PACKET_COLS. Add new rows by duplicating <tr> blocks.
    ════════════════════════════════════════════════════════════════════ -->

    <div class="hca-form" id="pre-travel-form">

      <h2 class="hca-title">HCA OUT OF STATE TRAVEL REQUEST FORM</h2>

      <!-- ── Header row ─────────────────────────────────────────────── -->
      <table class="hca-table">
        <tr>
          <td class="hca-label">DIVISION:</td>
          <td><input class="hca-input" id="hca_division" ${ro} value="${esc(trip.hca_division)}"></td>
          <td class="hca-label">DATE:</td>
          <td><input class="hca-input" type="date" id="hca_date" ${ro} value="${esc(trip.hca_date)}"></td>
        </tr>
      </table>

      <!-- ── Section 1: Traveler Information ───────────────────────── -->
      <table class="hca-table">
        <tr><td colspan="4" class="hca-section">Section 1. TRAVELER INFORMATION</td></tr>
        <tr>
          <td class="hca-label">TRAVELER:</td>
          <td><input class="hca-input" id="hca_traveler" ${ro} value="${esc(trip.hca_traveler)}"></td>
          <td class="hca-label">SHARE ID:</td>
          <td><input class="hca-input" id="hca_shareId" ${ro} value="${esc(trip.hca_shareId)}"></td>
        </tr>
        <tr>
          <td class="hca-label">POSITION/TITLE:</td>
          <td colspan="3"><input class="hca-input" id="hca_title" ${ro} value="${esc(trip.hca_title)}"></td>
        </tr>
      </table>

      <!-- ── Section 2: Trip Information ───────────────────────────── -->
      <table class="hca-table">
        <tr><td colspan="4" class="hca-section">Section 2. TRIP INFORMATION</td></tr>
        <tr>
          <td class="hca-label">DESTINATION:</td>
          <td><input class="hca-input" id="hca_destination" ${ro} value="${esc(trip.hca_destination)}"></td>
          <td class="hca-label">NAME OF CONFERENCE:</td>
          <td><input class="hca-input" id="hca_conferenceName" ${ro} value="${esc(trip.hca_conferenceName)}"></td>
        </tr>
        <tr>
          <td class="hca-label">DEPARTURE DATE:</td>
          <td><input class="hca-input" type="date" id="hca_departureDate" ${ro} value="${esc(trip.hca_departureDate)}"></td>
          <td class="hca-label">RETURN DATE:</td>
          <td><input class="hca-input" type="date" id="hca_returnDate" ${ro} value="${esc(trip.hca_returnDate)}"></td>
        </tr>
      </table>

      <!-- ── Section 3: Cost Information ───────────────────────────── -->
      <table class="hca-table">
        <tr><td colspan="4" class="hca-section">Section 3. COST INFORMATION</td></tr>
        <tr>
          <th class="hca-th">ITEM</th>
          <th class="hca-th">AMOUNT</th>
          <th class="hca-th">ACCT CODE</th>
          <th class="hca-th">REIMBURSEMENT PO AMOUNTS</th>
        </tr>
        <tr>
          <td>1. AIRLINE or OTHER FARES</td>
          <td><input class="hca-input hca-cost" id="hca_airfare"       ${ro} value="${esc(trip.hca_airfare)}"></td>
          <td class="hca-center">549700</td>
          <td><input class="hca-input hca-cost" id="hca_airfarePO"     ${ro} value="${esc(trip.hca_airfarePO)}"></td>
        </tr>
        <tr>
          <td>2. MILEAGE</td>
          <td><input class="hca-input hca-cost" id="hca_mileage"       ${ro} value="${esc(trip.hca_mileage)}"></td>
          <td class="hca-center">549700</td>
          <td><input class="hca-input hca-cost" id="hca_mileagePO"     ${ro} value="${esc(trip.hca_mileagePO)}"></td>
        </tr>
        <tr>
          <td>3. MISC. TRANSPORTATION</td>
          <td><input class="hca-input hca-cost" id="hca_transport"     ${ro} value="${esc(trip.hca_transport)}"></td>
          <td class="hca-center">549700</td>
          <td><input class="hca-input hca-cost" id="hca_transportPO"   ${ro} value="${esc(trip.hca_transportPO)}"></td>
        </tr>
        <tr>
          <td>4. OTHER MILEAGE / FEES</td>
          <td><input class="hca-input hca-cost" id="hca_fees"          ${ro} value="${esc(trip.hca_fees)}"></td>
          <td class="hca-center">549700</td>
          <td><input class="hca-input hca-cost" id="hca_feesPO"        ${ro} value="${esc(trip.hca_feesPO)}"></td>
        </tr>
        <tr>
          <td>&nbsp;&nbsp;&nbsp;AIRPORT PARKING</td>
          <td><input class="hca-input hca-cost" id="hca_parking"       ${ro} value="${esc(trip.hca_parking)}"></td>
          <td class="hca-center">549700</td>
          <td><input class="hca-input hca-cost" id="hca_parkingPO"     ${ro} value="${esc(trip.hca_parkingPO)}"></td>
        </tr>
        <tr>
          <td>&nbsp;&nbsp;&nbsp;CAR RENTAL</td>
          <td><input class="hca-input hca-cost" id="hca_carRental"     ${ro} value="${esc(trip.hca_carRental)}"></td>
          <td class="hca-center">549700</td>
          <td><input class="hca-input hca-cost" id="hca_carRentalPO"   ${ro} value="${esc(trip.hca_carRentalPO)}"></td>
        </tr>
        <tr>
          <td>5. TOTAL LINES 1–4</td>
          <td class="hca-right"><span id="hca_travelTotal">$0.00</span></td>
          <td></td>
          <td class="hca-right"><span id="hca_travelPOTotal">$0.00</span></td>
        </tr>
        <tr>
          <td>6. PER DIEM FINAL DAY</td>
          <td><input class="hca-input hca-cost" id="hca_perDiem"       ${ro} value="${esc(trip.hca_perDiem)}"></td>
          <td class="hca-center">549600</td>
          <td><input class="hca-input hca-cost" id="hca_perDiemPO"     ${ro} value="${esc(trip.hca_perDiemPO)}"></td>
        </tr>
        <tr>
          <td>7. MEALS</td>
          <td><input class="hca-input hca-cost" id="hca_meals"         ${ro} value="${esc(trip.hca_meals)}"></td>
          <td class="hca-center">549600</td>
          <td><input class="hca-input hca-cost" id="hca_mealsPO"       ${ro} value="${esc(trip.hca_mealsPO)}"></td>
        </tr>
        <tr>
          <td>8. LODGING</td>
          <td><input class="hca-input hca-cost" id="hca_lodging"       ${ro} value="${esc(trip.hca_lodging)}"></td>
          <td class="hca-center">549600</td>
          <td><input class="hca-input hca-cost" id="hca_lodgingPO"     ${ro} value="${esc(trip.hca_lodgingPO)}"></td>
        </tr>
        <tr>
          <td>9. TOTAL LINES 6–8</td>
          <td class="hca-right"><span id="hca_lodgingTotal">$0.00</span></td>
          <td></td>
          <td class="hca-right"><span id="hca_lodgingPOTotal">$0.00</span></td>
        </tr>
        <tr>
          <td>10. CONFERENCE FEES or DUES</td>
          <td><input class="hca-input hca-cost" id="hca_confFees"      ${ro} value="${esc(trip.hca_confFees)}"></td>
          <td class="hca-center">546800</td>
          <td><input class="hca-input hca-cost" id="hca_confFeesPO"    ${ro} value="${esc(trip.hca_confFeesPO)}"></td>
        </tr>
        <tr>
          <td>11. OTHER EXPENSES</td>
          <td><input class="hca-input hca-cost" id="hca_otherExp"      ${ro} value="${esc(trip.hca_otherExp)}"></td>
          <td class="hca-center">547900</td>
          <td><input class="hca-input hca-cost" id="hca_otherExpPO"    ${ro} value="${esc(trip.hca_otherExpPO)}"></td>
        </tr>
        <tr>
          <td><strong>TOTAL</strong></td>
          <td class="hca-right"><strong><span id="hca_grandTotal">$0.00</span></strong></td>
          <td></td>
          <td class="hca-right"><strong><span id="hca_grandPOTotal">$0.00</span></strong></td>
        </tr>
      </table>

      <!-- ── Section 4: Justification ──────────────────────────────── -->
      <table class="hca-table">
        <tr><td class="hca-section">Section 4. JUSTIFICATION</td></tr>
        <tr>
          <td>
            <textarea class="hca-input hca-textarea" id="hca_justification" ${ro}>${esc(trip.hca_justification)}</textarea>
          </td>
        </tr>
      </table>

      <!-- ── Section 5: Approval Status (travel team manages) ──────── -->
      <table class="hca-table">
        <tr><td colspan="4" class="hca-section">Section 5. APPROVALS</td></tr>
        <tr>
          <td class="hca-label">PACKET STATUS:</td>
          <td colspan="3">
            <select class="hca-select" id="packetStatus" ${roSel}>
              ${selectOptions(PACKET_STATUS_OPTIONS, trip.packetStatus)}
            </select>
          </td>
        </tr>
        <tr>
          <td class="hca-label">SUPERVISOR:</td>
          <td class="${trip.supervisorApproval.trim().toLowerCase()}">
            <select class="hca-select" id="supervisorApproval" ${roSel}>
              ${selectOptions(APPROVAL_OPTIONS, trip.supervisorApproval)}
            </select>
          </td>
          <td class="hca-label">DIVISION:</td>
          <td class="${trip.divisionApproval.trim().toLowerCase()}">
            <select class="hca-select" id="divisionApproval" ${roSel}>
              ${selectOptions(APPROVAL_OPTIONS, trip.divisionApproval)}
            </select>
          </td>
        </tr>
        <tr>
          <td class="hca-label">ASD BUDGET:</td>
          <td class="${trip.ASDApproval.trim().toLowerCase()}">
            <select class="hca-select" id="ASDApproval" ${roSel}>
              ${selectOptions(APPROVAL_OPTIONS, trip.ASDApproval)}
            </select>
          </td>
          <td class="hca-label">OOS / DEPUTY SEC:</td>
          <td class="${trip.OOSApproval.trim().toLowerCase()}">
            <select class="hca-select" id="OOSApproval" ${roSel}>
              ${selectOptions(APPROVAL_OPTIONS, trip.OOSApproval)}
            </select>
          </td>
        </tr>
        <tr>
          <td class="hca-label">RENTAL CAR (CFO):</td>
          <td class="${trip.rentalApproval.trim().toLowerCase()}">
            <select class="hca-select" id="rentalApproval" ${roSel}>
              ${selectOptions(APPROVAL_OPTIONS, trip.rentalApproval)}
            </select>
          </td>
          <td class="hca-label">ROOM RATES (CFO):</td>
          <td class="${trip.roomRatesApproval.trim().toLowerCase()}">
            <select class="hca-select" id="roomRatesApproval" ${roSel}>
              ${selectOptions(APPROVAL_OPTIONS, trip.roomRatesApproval)}
            </select>
          </td>
        </tr>
      </table>

      <!-- ── ADD MORE SECTIONS HERE ────────────────────────────────────
           Duplicate any <table class="hca-table"> block above.
           Give each new input a unique id, add it to HCA_PACKET_COLS
           in config.js, and add it to collectPreFormData() below.
      ─────────────────────────────────────────────────────────────── -->

    </div>
  `;
}


// ---------------------------------------------------------------------------
//  initPreFormListeners()
//  Call this AFTER buildPreForm() HTML is in the DOM.
//  Wires the live running totals on the cost columns.
// ---------------------------------------------------------------------------

export function initPreFormListeners() {
  document.querySelectorAll('.hca-cost').forEach(input => {
    input.addEventListener('input', calculateTotals);
  });
  calculateTotals();
}

function calculateTotals() {
  const n = id => parseFloat(document.getElementById(id)?.value) || 0;

  const travelTotal   = n('hca_airfare') + n('hca_mileage') + n('hca_transport')
                      + n('hca_fees')    + n('hca_parking') + n('hca_carRental');
  const lodgingTotal  = n('hca_perDiem') + n('hca_meals')   + n('hca_lodging');
  const grandTotal    = travelTotal + lodgingTotal + n('hca_confFees') + n('hca_otherExp');

  const travelPO      = n('hca_airfarePO')   + n('hca_mileagePO')   + n('hca_transportPO')
                      + n('hca_feesPO')      + n('hca_parkingPO')   + n('hca_carRentalPO');
  const lodgingPO     = n('hca_perDiemPO')   + n('hca_mealsPO')     + n('hca_lodgingPO');
  const grandPO       = travelPO + lodgingPO + n('hca_confFeesPO')  + n('hca_otherExpPO');

  const fmt = v => `$${v.toFixed(2)}`;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = fmt(v); };

  set('hca_travelTotal',    travelTotal);
  set('hca_lodgingTotal',   lodgingTotal);
  set('hca_grandTotal',     grandTotal);
  set('hca_travelPOTotal',  travelPO);
  set('hca_lodgingPOTotal', lodgingPO);
  set('hca_grandPOTotal',   grandPO);
}


// ---------------------------------------------------------------------------
//  collectPreFormData()
//  Returns { fieldKey: value } to be saved to Board 2.
//  fieldKey must match a key in HCA_PACKET_COLS in config.js.
//
//  monday column type → value format:
//    text / long_text  → raw string
//    numeric           → raw number (as string is fine)
//    date              → { "date": "YYYY-MM-DD" }
//    color / status    → { "label": "Approved" }
// ---------------------------------------------------------------------------

export function collectPreFormData() {
  const val    = id => document.getElementById(id)?.value ?? '';
  const status = id => ({ label: val(id) });
  const date   = id => val(id) ? { date: val(id) } : '';

  return {
    // ── Header ────────────────────────────────────────────────────────
    hca_division:       val('hca_division'),
    hca_date:           date('hca_date'),

    // ── Section 1: Traveler ───────────────────────────────────────────
    hca_traveler:       val('hca_traveler'),
    hca_shareId:        val('hca_shareId'),
    hca_title:          val('hca_title'),

    // ── Section 2: Trip ───────────────────────────────────────────────
    hca_destination:    val('hca_destination'),
    hca_conferenceName: val('hca_conferenceName'),
    hca_departureDate:  date('hca_departureDate'),
    hca_returnDate:     date('hca_returnDate'),

    // ── Section 3: Costs ──────────────────────────────────────────────
    hca_airfare:        val('hca_airfare'),
    hca_airfarePO:      val('hca_airfarePO'),
    hca_mileage:        val('hca_mileage'),
    hca_mileagePO:      val('hca_mileagePO'),
    hca_transport:      val('hca_transport'),
    hca_transportPO:    val('hca_transportPO'),
    hca_fees:           val('hca_fees'),
    hca_feesPO:         val('hca_feesPO'),
    hca_parking:        val('hca_parking'),
    hca_parkingPO:      val('hca_parkingPO'),
    hca_carRental:      val('hca_carRental'),
    hca_carRentalPO:    val('hca_carRentalPO'),
    hca_perDiem:        val('hca_perDiem'),
    hca_perDiemPO:      val('hca_perDiemPO'),
    hca_meals:          val('hca_meals'),
    hca_mealsPO:        val('hca_mealsPO'),
    hca_lodging:        val('hca_lodging'),
    hca_lodgingPO:      val('hca_lodgingPO'),
    hca_confFees:       val('hca_confFees'),
    hca_confFeesPO:     val('hca_confFeesPO'),
    hca_otherExp:       val('hca_otherExp'),
    hca_otherExpPO:     val('hca_otherExpPO'),

    // ── Section 4: Justification ──────────────────────────────────────
    hca_justification:  val('hca_justification'),

    // ── Section 5: Approvals (status/color columns) ───────────────────
    packetStatus:       status('packetStatus'),
    supervisorApproval: status('supervisorApproval'),
    divisionApproval:   status('divisionApproval'),
    ASDApproval:        status('ASDApproval'),
    OOSApproval:        status('OOSApproval'),
    rentalApproval:     status('rentalApproval'),
    roomRatesApproval:  status('roomRatesApproval'),
  };
}


// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function selectOptions(opts, current) {
  return opts.map(o =>
    `<option value="${o}" ${o === current ? 'selected' : ''}>${o || '— select —'}</option>`
  ).join('');
}

// Safely escape values for HTML attributes
function esc(v) {
  return (v ?? '').toString().replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function editIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
}
