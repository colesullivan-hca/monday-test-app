// =============================================================================
//  forms-pre.js  —  Travel team's editable form for the HCA travel packet.
//
//  THIS IS WHERE YOU PLUG IN YOUR PDF-MATCHED HTML.
//
//  HOW TO USE:
//  1. buildPreForm(trip)       → returns the full right-pane HTML string.
//                                Replace the placeholder section below with
//                                your own HTML that matches your internal PDF.
//
//  2. collectPreFormData()     → reads the DOM and returns { fieldKey: value }
//                                to be saved to Board 2 via the mutation.
//                                Add an entry here for every field you add above.
//
//  FIELD KEY → COLUMN ID MAPPING is in config.js under HCA_PACKET_COLS.
//  The key names you use in collectPreFormData() must match keys in that object.
// =============================================================================

// ---------------------------------------------------------------------------
//  Approval status options
//  Used by the built-in approval dropdowns. Edit to match your monday labels.
// ---------------------------------------------------------------------------
const APPROVAL_OPTIONS = ['', 'Approved', 'Denied', 'Pending'];
const PACKET_STATUS_OPTIONS = ['', 'In Preparation', 'Ready For Approvals', 'On Hold'];


// ---------------------------------------------------------------------------
//  buildPreForm(trip)
//  Returns HTML string for the right pane (Board 2 — editable).
//
//  ╔══════════════════════════════════════════════════════════════════════╗
//  ║  REPLACE EVERYTHING INSIDE THE "YOUR PDF FORM HTML" COMMENT BLOCK  ║
//  ║  with your own HTML. Keep the outer .edit-form wrapper.             ║
//  ╚══════════════════════════════════════════════════════════════════════╝
// ---------------------------------------------------------------------------

export function buildPreForm(trip) {
  return `
    <div class="pane-header">
      <span class="pane-header__icon">${editIcon()}</span>
      <div>
        <div class="pane-header__title">HCA Travel Packet</div>
        <div class="pane-header__sub">Board 2 · Editable — saves to monday</div>
      </div>
    </div>

    <div class="edit-form" id="pre-travel-form">

      <!-- ═══════════════════════════════════════════════════════════════
           YOUR PDF FORM HTML GOES HERE
           ───────────────────────────────────────────────────────────────
           Replace the field groups below with your own HTML that mirrors
           your internal HCA travel packet PDF layout.

           RULES:
           • Give every input/select an id that matches the fieldKey you
             use in collectPreFormData() below.
           • Use the helper CSS classes already defined in styles.css:
               .form-section      — a labeled group of fields
               .form-section__title — section heading
               .form-row          — a row of fields (uses CSS grid)
               .form-field        — a single label + input pair
               .form-label        — <label> text
               .form-input        — <input> or <textarea>
               .form-select       — <select>
           • Pre-populate fields with trip data using template literals:
               value="${'${trip.someField}'}"
           ═══════════════════════════════════════════════════════════════ -->

      <!-- SECTION: Packet status -->
      <div class="form-section">
        <div class="form-section__title">Packet Status</div>
        <div class="form-row">
          <div class="form-field">
            <label class="form-label" for="packetStatus">Packet status</label>
            <select class="form-select" id="packetStatus">
              ${selectOptions(PACKET_STATUS_OPTIONS, trip.packetStatus)}
            </select>
          </div>
        </div>
      </div>

      <!-- SECTION: Approvals -->
      <div class="form-section">
        <div class="form-section__title">Approvals</div>

        <div class="form-row form-row--2col">
          <div class="form-field">
            <label class="form-label" for="supervisorApproval">Supervisor</label>
            <select class="form-select" id="supervisorApproval">
              ${selectOptions(APPROVAL_OPTIONS, trip.supervisorApproval)}
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="divisionApproval">Division</label>
            <select class="form-select" id="divisionApproval">
              ${selectOptions(APPROVAL_OPTIONS, trip.divisionApproval)}
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="ASDApproval">ASD Budget</label>
            <select class="form-select" id="ASDApproval">
              ${selectOptions(APPROVAL_OPTIONS, trip.ASDApproval)}
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="OOSApproval">OOS / Deputy Sec</label>
            <select class="form-select" id="OOSApproval">
              ${selectOptions(APPROVAL_OPTIONS, trip.OOSApproval)}
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="rentalApproval">Rental Car (CFO)</label>
            <select class="form-select" id="rentalApproval">
              ${selectOptions([...APPROVAL_OPTIONS, 'Not Applicable'], trip.rentalApproval)}
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="roomRatesApproval">Room Rates (CFO)</label>
            <select class="form-select" id="roomRatesApproval">
              ${selectOptions([...APPROVAL_OPTIONS, 'Not Applicable'], trip.roomRatesApproval)}
            </select>
          </div>
        </div>
      </div>

      <!-- ─────────────────────────────────────────────────────────────
           ADD YOUR CUSTOM SECTIONS BELOW THIS LINE
           e.g. trip narrative, budget breakdown, hotel details, etc.
           ───────────────────────────────────────────────────────────── -->

      <!--
      <div class="form-section">
        <div class="form-section__title">Travel Details</div>
        <div class="form-row">
          <div class="form-field form-field--full">
            <label class="form-label" for="purposeNarrative">Purpose narrative</label>
            <textarea class="form-input form-input--textarea" id="purposeNarrative" rows="4">${'${trip.purposeNarrative || \"\"}'}</textarea>
          </div>
        </div>
      </div>
      -->

    </div>
  `;
}


// ---------------------------------------------------------------------------
//  collectPreFormData()
//  Reads all editable fields from the DOM and returns { fieldKey: value }.
//  The fieldKey must match a key in HCA_PACKET_COLS in config.js.
//
//  For status/color columns, monday expects: { "label": "Approved" }
//  For text columns, pass the raw string.
//  For date columns, pass: { "date": "YYYY-MM-DD" }
// ---------------------------------------------------------------------------

export function collectPreFormData() {
  const get    = id => document.getElementById(id);
  const status = id => ({ label: get(id)?.value || '' });
  const text   = id => get(id)?.value || '';

  return {
    // Status (color) columns → wrap in { label }
    packetStatus:       status('packetStatus'),
    supervisorApproval: status('supervisorApproval'),
    divisionApproval:   status('divisionApproval'),
    ASDApproval:        status('ASDApproval'),
    OOSApproval:        status('OOSApproval'),
    rentalApproval:     status('rentalApproval'),
    roomRatesApproval:  status('roomRatesApproval'),

    // Text columns → raw string
    // purposeNarrative: text('purposeNarrative'),

    // Date columns → { date: 'YYYY-MM-DD' }
    // someDate: { date: text('someDate') },
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
