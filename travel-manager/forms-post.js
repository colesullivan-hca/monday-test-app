// =============================================================================
//  forms-post.js  —  Travel team's editable form for the ISTE reimbursement.
//
//  THIS IS WHERE YOU PLUG IN YOUR PDF-MATCHED HTML (post-travel version).
//
//  Same structure as forms-pre.js — see that file for full instructions.
//  This one maps to Board 4 (ISTE packet) via ISTE_PACKET_COLS in config.js.
// =============================================================================

const APPROVAL_OPTIONS = ['', 'Approved', 'Denied', 'Pending'];
const ISTE_STATUS_OPTIONS = ['', 'In Preparation', 'Ready For Approvals', 'Submitted to AP'];


// ---------------------------------------------------------------------------
//  buildPostForm(trip)
//
//  ╔══════════════════════════════════════════════════════════════════════╗
//  ║  REPLACE EVERYTHING INSIDE THE "YOUR PDF FORM HTML" COMMENT BLOCK  ║
//  ║  with your own HTML. Keep the outer .edit-form wrapper.             ║
//  ╚══════════════════════════════════════════════════════════════════════╝
// ---------------------------------------------------------------------------

export function buildPostForm(trip) {
  return `
    <div class="pane-header">
      <span class="pane-header__icon">${editIcon()}</span>
      <div>
        <div class="pane-header__title">ISTE Reimbursement</div>
        <div class="pane-header__sub">Board 4 · Editable — saves to monday</div>
      </div>
    </div>

    <div class="edit-form" id="post-travel-form">

      <!-- ═══════════════════════════════════════════════════════════════
           YOUR PDF FORM HTML GOES HERE (Post-Travel / ISTE version)
           ───────────────────────────────────────────────────────────────
           Same rules as forms-pre.js.
           ═══════════════════════════════════════════════════════════════ -->

      <!-- SECTION: ISTE Status -->
      <div class="form-section">
        <div class="form-section__title">ISTE Status</div>
        <div class="form-row">
          <div class="form-field">
            <label class="form-label" for="ISTEStatus">Statement status</label>
            <select class="form-select" id="ISTEStatus">
              ${selectOptions(ISTE_STATUS_OPTIONS, trip.ISTEStatus)}
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="approvedTotal">Approved total ($)</label>
            <input class="form-input" type="number" step="0.01" id="approvedTotal"
              value="${trip.approvedTotal || ''}" placeholder="0.00" />
          </div>
        </div>
      </div>

      <!-- SECTION: Approvals -->
      <div class="form-section">
        <div class="form-section__title">Approvals</div>
        <div class="form-row form-row--2col">
          <div class="form-field">
            <label class="form-label" for="travelerApproval">Traveler</label>
            <select class="form-select" id="travelerApproval">
              ${selectOptions(APPROVAL_OPTIONS, trip.travelerApproval)}
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="supervisorApproval_post">Supervisor</label>
            <select class="form-select" id="supervisorApproval_post">
              ${selectOptions(APPROVAL_OPTIONS, trip.supervisorApproval)}
            </select>
          </div>
        </div>
      </div>

      <!-- ─────────────────────────────────────────────────────────────
           ADD YOUR CUSTOM ISTE SECTIONS BELOW THIS LINE
           e.g. itemized expense lines, per diem calculation table, etc.
           ───────────────────────────────────────────────────────────── -->

      <!--
      <div class="form-section">
        <div class="form-section__title">Expense breakdown</div>
        <div class="form-row form-row--2col">
          <div class="form-field">
            <label class="form-label" for="flightCost">Airfare</label>
            <input class="form-input" type="number" id="flightCost" value="${'${trip.flightCost || \"\"}'}" />
          </div>
          <div class="form-field">
            <label class="form-label" for="hotelCost">Lodging</label>
            <input class="form-input" type="number" id="hotelCost" value="${'${trip.hotelCost || \"\"}'}" />
          </div>
        </div>
      </div>
      -->

    </div>
  `;
}


// ---------------------------------------------------------------------------
//  collectPostFormData()
//  Returns { fieldKey: value } — keys must match ISTE_PACKET_COLS in config.js.
// ---------------------------------------------------------------------------

export function collectPostFormData() {
  const get    = id => document.getElementById(id);
  const status = id => ({ label: get(id)?.value || '' });
  const num    = id => parseFloat(get(id)?.value) || 0;

  return {
    ISTEStatus:         status('ISTEStatus'),
    travelerApproval:   status('travelerApproval'),
    supervisorApproval: status('supervisorApproval_post'),

    // Number columns → raw number
    approvedTotal: num('approvedTotal'),

    // Add more:
    // flightCost: num('flightCost'),
    // hotelCost:  num('hotelCost'),
  };
}


// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function selectOptions(options, currentValue) {
  return options.map(opt =>
    `<option value="${opt}" ${opt === currentValue ? 'selected' : ''}>${opt || '— select —'}</option>`
  ).join('');
}

function editIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
}
