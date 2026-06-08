// =============================================================================
//  forms-post.js  —  ISTE Itemized Schedule of Travel Expenses (Board 4)
// =============================================================================

const APPROVAL_OPTIONS         = ['', 'Awaiting Review', 'Approved', 'Denied'];
const ISTE_STATUS_OPTIONS      = ['', 'In Preparation', 'Ready For Approvals', 'Reimbursement Complete'];
const VEHICLE_TYPE_OPTIONS     = ['', 'Personal Vehicle', 'State Vehicle']; 
const BOARD_ATTENDANCE_OPTIONS = ['', 'Not a Board Member', 'Physical Attendance', 'Virtual Attendance'];
const BOARD_LENGTH_OPTIONS     = ['', 'Not Applicable', '4 Hours or Longer', 'Less than 4 hours'];  


export function buildPostForm(trip) {
  // If reimbursement form not submitted yet, show the waiting state
  if (!trip.mondayItemId_reimb) {
    return buildWaitingState(trip);
  }

  const locked = trip.packetStatus === 'Ready For Approvals';
  const ro     = locked ? 'readonly' : '';
  const roSel  = locked ? 'disabled' : '';

  const t = trip; // shorthand

  return `
    <div class="pane-header">
      <span class="pane-header__icon">${editIcon()}</span>
      <div class="form-row form-row--2col pane-header__container">
        <div>
          <div class="pane-header__title">ISTE Reimbursement</div>
          <div class="pane-header__sub">Board 4 · Editable — saves to monday</div>
        </div>
        <div class="form-field">
          <label class="form-label" for="ISTEStatus">Statement status</label>
          <select class="form-select ${(t.ISTEStatus || '').replaceAll(" ", "").toLowerCase()}" id="ISTEStatus">
            ${selectOptions(ISTE_STATUS_OPTIONS, t.ISTEStatus)}
          </select>
        </div>
      </div>
    </div>

    <div class="iste-form" id="post-travel-form">

      <h2 class="iste-title">STATE OF NM ITEMIZED SCHEDULE OF TRAVEL EXPENSES</h2>

      <table class="iste-table">
        <tr>
          <td class="iste-label">AGENCY NAME:</td>
          <td><input class="iste-input" id="iste_agencyName" ${ro} value="${esc(t.iste_agencyName)}" readonly></td>
          
          <td class="iste-label">BUSINESS UNIT:</td>
          <td><input class="iste-input" id="iste_businessUnit" ${ro} value="${esc(t.iste_businessUnit)}"></td>
          
          <td class="iste-label">VOUCHER NUMBER:</td>
          <td><input class="iste-input" id="iste_voucherNumber" ${ro} value="${esc(t.iste_voucherNumber)}"></td>
          
          <td class="iste-label">
            <input type="radio" name="iste_voucherBasis" id="iste_isPrepaid" value="Prepaid Voucher" 
              ${t.iste_prepaidVoucher === 'v' ? 'checked' : ''} ${roSel} /> PREPAID VOUCHER
          </td>
          <td class="iste-label">
            <input type="radio" name="iste_voucherBasis" id="iste_isFinal" value="Final Voucher" 
              ${t.iste_finalVoucher === 'v' ? 'checked' : ''} ${roSel} /> FINAL VOUCHER
          </td>
        </tr>
      </table>
      
      <table class="iste-table">
        <tr>
          <td class="iste-label">SUPPLIER NAME:</td>
          <td><input class="iste-input" id="iste_supplierName" ${ro} value="${esc(t.iste_supplierName)}"></td>
          
          <td class="iste-label">SUPPLIER ID:</td>
          <td><input class="iste-input" id="iste_supplierId" ${ro} value="${esc(t.iste_supplierId)}"></td>
          
          <td class="iste-label">POST OF DUTY:</td>
          <td><input class="iste-input" id="iste_postOfDuty" ${ro} value="${esc(t.iste_postOfDuty)}"></td>
          
          <td class="iste-label">RESIDENCE:</td>
          <td><input class="iste-input" id="iste_residence" ${ro} value="${esc(t.iste_residence)}"></td>
        </tr>
        <tr>
          <td class="iste-label">VEHICLE LICENSE PLATE:</td>
          <td><input class="iste-input" id="iste_licensePlate" ${ro} value="${esc(t.iste_licensePlate)}"></td>
          
          <td class="iste-label">VEHICLE MODEL &amp; YEAR:</td>
          <td><input class="iste-input" id="iste_vehicleModel" ${ro} value="${esc(t.iste_vehicleModel)}"></td>
          
          <td class="iste-label">VEHICLE TYPE:</td>
          <td colspan="3">
            <select class="iste-select" id="iste_vehicleType" ${roSel}>
              ${selectOptions(VEHICLE_TYPE_OPTIONS, t.iste_vehicleType)}
            </select>
          </td>
        </tr>
      </table>
      
      <table class="iste-table">
        <tr>
          <td class="iste-label">BOARD/COMMISSION ATTENDANCE:</td>
          <td>
            <select class="iste-select" id="iste_boardAttendance" ${roSel}>
              ${selectOptions(BOARD_ATTENDANCE_OPTIONS, t.iste_attendance)}
            </select>
          </td>
          <td class="iste-label">LENGTH OF BOARD/COMMISSION MEETING:</td>
          <td>
            <select class="iste-select" id="iste_boardMeetingLength" ${roSel}>
              ${selectOptions(BOARD_LENGTH_OPTIONS, t.iste_lengthOfBoard)}
            </select>
          </td>
        </tr>
      </table>

      <table class="iste-table itemized">
        <colgroup>
          <col style="width: 100px;">
          <col style="width: 70px;">
          <col style="width: 70px;">
          <col style="width: 27%;">
        </colgroup>
        <tr>
          <td colspan="10" class="iste-section header-title" style="text-align: center; font-weight: bold;">ITEMIZED COSTS BY DAY</td>
        </tr>
        <tr>
          <th></th>
          <th colspan="2" style="text-align: center;">Time: AM or PM</th>
          <th>Nature of Expense</th>
          <th colspan="2" style="text-align: center;">Odometer Readings</th>
          <th colspan="4" style="text-align: center;">Amounts</th>
        </tr>
        <tr>
          <th style="font-size: 11px;">DATE</th>
          <th style="font-size: 11px;">DEPARTURE TIME</th>
          <th style="font-size: 11px;">ARRIVAL TIME</th>
          <th style="font-size: 11px;">DESTINATION AND NATURE OF BUSINESS</th>
          <th style="font-size: 11px;">ODOMETER START AND FINISH</th>
          <th style="font-size: 11px;">NO OF MILES</th>
          <th style="font-size: 11px;">MILEAGE</th>
          <th style="font-size: 11px;">PER DIEM</th>
          <th style="font-size: 11px;">OTHER</th>
          <th style="font-size: 11px;">TOTALS</th>
        </tr>
        
        <tbody id="iste-rows">
          ${(t.isteSubitems || Array(15).fill({})).map((row, i) => isteRowHTML(row, i)).join('')}
        </tbody>
        
        <tfoot>
          <tr>
            <th colspan="5" style="text-align: right; padding: 6px;">TOTALS</th>
            <td class="iste-right"><span id="iste_milesTotal">0.00</span></td>
            <td class="iste-right"><span id="iste_mileageTotal">0.00</span></td>
            <td class="iste-right"><span id="iste_perdiemTotal">0.00</span></td>
            <td class="iste-right"><span id="iste_otherTotal">0.00</span></td>
            <td class="iste-right"><strong><span id="iste_grandTotal">$0.00</span></strong></td>
          </tr>
          <tr>
            <th class="mergeright" colspan="5" style="text-align: right; padding: 6px;">ADVANCE AMOUNT @ 80%</th>
            <th class="mergeleft" colspan="4"></th>
            <td>
              <input class="iste-input iste-right" type="text" id="iste_advance" ${ro} value="${esc(t.iste_advanceAmount)}" placeholder="0.00">
            </td>
          </tr>
          <tr>
            <th class="mergeright" colspan="5" style="text-align: right; padding: 6px;">ADJUSTED REIMBURSEMENT</th>
            <th class="mergeleft" colspan="4"></th>
            <td class="iste-right"><strong><span id="iste_adjTotal">$0.00</span></strong></td>
          </tr>
        </tfoot>
      </table>

      <table class="iste-table">
        <tr>
        <colgroup> <col style="width: 33.33%;"> <col style="width: 33.33%;"> <col style="width: 33.33%;"> </colgroup>
          <td class="iste-label" style="width: 150px;">PER DIEM BASED ON:</td>
          <td class="iste-label" style="width: 120px;">
            <input type="radio" name="iste_perDiemBasis" id="iste_actual" value="Actual" 
              ${t.iste_actual === 'v' ? 'checked' : ''} ${roSel} /> ACTUAL
          </td>
          <td class="iste-label">
            <input type="radio" name="iste_perDiemBasis" id="iste_approvedRates" value="Approved Rates" 
              ${t.iste_approvedRates === 'v' ? 'checked' : ''} ${roSel} /> APPROVED RATES
          </td>
        </tr>
      </table>

      <table class="iste-table">
        <tr><td colspan="4" class="iste-section">APPROVALS</td></tr>
        <tr>
          <td class="iste-label">TRAVELER:</td>
          <td class="${(t.travelerApproval_post || '').replaceAll(" ", "").toLowerCase()}">
            <select class="iste-select" id="travelerApproval_post" ${roSel}>
              ${selectOptions(APPROVAL_OPTIONS, t.travelerApproval_post)}
            </select>
          </td>
          <td class="iste-label">SUPERVISOR:</td>
          <td class="${(t.supervisorApproval_post || '').replaceAll(" ", "").toLowerCase()}">
            <select class="iste-select" id="supervisorApproval_post" ${roSel}>
              ${selectOptions(APPROVAL_OPTIONS, t.supervisorApproval_post)}
            </select>
          </td>
        </tr>
      </table>

    </div>
  `;
}


// ---------------------------------------------------------------------------
//  Waiting state — shown when reimbursement form not yet submitted
// ---------------------------------------------------------------------------

function buildWaitingState(trip) {
  return `
    <div class="pane-header">
      <span class="pane-header__icon">${editIcon()}</span>
      <div>
        <div class="pane-header__title">ISTE Reimbursement</div>
        <div class="pane-header__sub">Board 4 · Waiting on traveler</div>
      </div>
    </div>
    <div class="pane-notice pane-notice--waiting">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>The traveler hasn't submitted their reimbursement form yet.</p>
      <button class="btn btn--primary" id="notify-traveler-btn"
        data-email="${trip.tr_email || ''}"
        data-name="${esc(trip.tr_firstName || trip.hca_traveler || 'Traveler')}"
        data-trip="${esc(trip.title || trip.tripID)}">
        Notify Traveler
      </button>
    </div>
  `;
}

// ---------------------------------------------------------------------------
//  Make sure there are exactly 15 itemized costs rows
// ---------------------------------------------------------------------------
export async function ensureIsteSubitems(trip, monday) {
  const REQUIRED = 15;
  const current = trip.isteSubitems?.length || 0;

  if (current > REQUIRED) {
    monday.execute('notice', {
      message: `This ISTE item has ${current} subitems but only ${REQUIRED} are supported. Please remove the extras in monday and reload.`,
      type: 'error',
    });
    return false;
  }

  if (current < REQUIRED) {
    monday.execute('notice', { message: 'Setting up itemized cost rows…', type: 'info' });

    const needed = REQUIRED - current;
    const createMutation = `
      mutation ($parentId: ID!, $name: String!) {
        create_subitem(parent_item_id: $parentId, item_name: $name) {
          id board { id }
        }
      }
    `;

    const results = await Promise.all(
      Array.from({ length: needed }, () =>
        monday.api(createMutation, {
          variables: {
            parentId: String(trip.mondayItemId_iste),
            name: 'Itemized Cost',
          }
        })
      )
    );

    // Add the new subitems to the local trip so isteRowHTML gets their IDs
    results.forEach(res => {
      const sub = res?.data?.create_subitem;
      if (!sub) return;
      if (!trip.isteSubitemBoardId) trip.isteSubitemBoardId = sub.board?.id;
      trip.isteSubitems.push({
        subitemId:   sub.id,
        date: '', departTime: '', arriveTime: '', destination: '',
        odometer: '', miles: 0, mileage: 0, perdiem: 0, other: 0,
      });
    });

    monday.execute('notice', { message: 'Ready!', type: 'success' });
  }

  return true;
}


// ---------------------------------------------------------------------------
//  Single itemized row
// ---------------------------------------------------------------------------

function isteRowHTML(row, i) {
  // data-subitem-id is set when the row comes from an existing monday subitem;
  // blank rows (new) have no subitem ID yet — set on save.
  const sid = row.subitemId ? `data-subitem-id="${row.subitemId}"` : '';
  return `
    <tr class="iste-row" data-row="${i}" ${sid}>
      <td><input class="iste-input" type="date"   data-iste-col="date"        value="${esc(row.date        || '')}" /></td>
      <td><input class="iste-input"               data-iste-col="departTime"  value="${esc(row.departTime  || '')}" /></td>
      <td><input class="iste-input"               data-iste-col="arriveTime"  value="${esc(row.arriveTime  || '')}" /></td>
      <td><input class="iste-input"               data-iste-col="destination" value="${esc(row.destination || '')}" /></td>
      <td><input class="iste-input"               data-iste-col="odometer"    value="${esc(row.odometer    || '')}" /></td>
      <td><input class="iste-input iste-miles"    data-iste-col="miles"       type="number" value="${esc(row.miles    || '')}" /></td>
      <td><input class="iste-input iste-cost"     data-iste-col="mileage"     type="number" value="${esc(row.mileage  || '')}" /></td>
      <td><input class="iste-input iste-cost"     data-iste-col="perdiem"     type="number" value="${esc(row.perdiem  || '')}" /></td>
      <td><input class="iste-input iste-cost"     data-iste-col="other"       type="number" value="${esc(row.other    || '')}" /></td>
      <td class="iste-num"><span class="iste-row-total">0.00</span></td>
    </tr>
  `;
}


// ---------------------------------------------------------------------------
//  initPostFormListeners()
//  Call after buildPostForm() HTML is in the DOM.
// ---------------------------------------------------------------------------

export function initPostFormListeners(onNotify) {
  calculateIsteTotals();

  document.querySelectorAll('.iste-cost, .iste-miles, #iste_advance').forEach(input => {
    input.addEventListener('input', calculateIsteTotals);
  });

  // Notify traveler button
  const notifyBtn = document.getElementById('notify-traveler-btn');
  if (notifyBtn) {
    notifyBtn.addEventListener('click', () => onNotify({
      email: notifyBtn.dataset.email,
      name:  notifyBtn.dataset.name,
      trip:  notifyBtn.dataset.trip,
    }));
  }
}

function calculateIsteTotals() {
  const n = el => parseFloat(el?.value) || 0;

  let milesSum = 0, mileageSum = 0, perdiemSum = 0, otherSum = 0;

  document.querySelectorAll('.iste-row').forEach(row => {
    const miles   = n(row.querySelector('[data-iste-col="miles"]'));
    const mileage = n(row.querySelector('[data-iste-col="mileage"]'));
    const perdiem = n(row.querySelector('[data-iste-col="perdiem"]'));
    const other   = n(row.querySelector('[data-iste-col="other"]'));
    const rowTotal = mileage + perdiem + other;

    row.querySelector('.iste-row-total').textContent = rowTotal.toFixed(2);
    milesSum   += miles;
    mileageSum += mileage;
    perdiemSum += perdiem;
    otherSum   += other;
  });

  const grandTotal = mileageSum + perdiemSum + otherSum;
  const advance    = parseFloat(document.getElementById('iste_advance')?.value) || 0;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v.toFixed(2); };
  set('iste_milesTotal',   milesSum);
  set('iste_mileageTotal', mileageSum);
  set('iste_perdiemTotal', perdiemSum);
  set('iste_otherTotal',   otherSum);
  set('iste_grandTotal',   grandTotal);
  set('iste_adjTotal',     grandTotal - advance);
}


// ---------------------------------------------------------------------------
//  collectPostFormData()
// ---------------------------------------------------------------------------

export function collectPostFormData() {
  const val     = id => document.getElementById(id)?.value ?? '';
  const checked = id => document.getElementById(id)?.checked ?? false;
  const status  = id => ({ label: val(id) });
  const num     = id => parseFloat(val(id)) || 0;

  const rows = [];
  document.querySelectorAll('.iste-row').forEach(row => {
    const get = col => row.querySelector(`[data-iste-col="${col}"]`)?.value || '';
    rows.push({
      subitemId:   row.dataset.subitemId || null,
      date:        get('date'),
      departTime:  get('departTime'),
      arriveTime:  get('arriveTime'),
      destination: get('destination'),
      odometer:    get('odometer'),
      miles:       parseFloat(get('miles'))   || 0,
      mileage:     parseFloat(get('mileage')) || 0,
      perdiem:     parseFloat(get('perdiem')) || 0,
      other:       parseFloat(get('other'))   || 0,
    });
  });

  return {
    ISTEStatus:              status('ISTEStatus'),
    travelerApproval_post:   status('travelerApproval_post'),   // was 'travelerApproval'
    supervisorApproval_post: status('supervisorApproval_post'),

    iste_agencyName:         val('iste_agencyName'),
    iste_businessUnit:       val('iste_businessUnit'),
    iste_voucherNumber:      val('iste_voucherNumber'),
    iste_supplierName:       val('iste_supplierName'),
    iste_supplierId:         val('iste_supplierId'),
    iste_postOfDuty:         val('iste_postOfDuty'),
    iste_residence:          val('iste_residence'),
    iste_licensePlate:       val('iste_licensePlate'),
    iste_vehicleModel:       val('iste_vehicleModel'),
    iste_vehicleType:        status('iste_vehicleType'),
    iste_attendance:         status('iste_boardAttendance'),    // was 'iste_attendance'
    iste_lengthOfBoard:      status('iste_boardMeetingLength'), // was 'iste_lengthOfBoard'
    iste_advanceAmount:      num('iste_advance'),

    iste_prepaidVoucher:     checked('iste_isPrepaid'),         // was 'iste_prepaidVoucher'
    iste_finalVoucher:       checked('iste_isFinal'),           // was 'iste_finalVoucher'
    iste_actual:             checked('iste_actual'),            // was 'iste_perDiemActual'
    iste_approvedRates:      checked('iste_approvedRates'),     // was 'iste_perDiemApproved'

    isteRows: rows,
  };
}


// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function selectOptions(options, currentValue) {
  return options.map(opt =>
    `<option value="${opt}" ${opt === currentValue ? 'selected' : ''}>${opt || ''}</option>`
  ).join('');
}

function esc(v) {
  return (v ?? '').toString().replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function editIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
}