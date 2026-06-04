// =============================================================================
//  config.js  —  ALL monday.com IDs live here. Edit this file only.
// =============================================================================
//
//  HOW TO FIND IDs:
//    Board IDs   → open the board in monday, copy the number from the URL
//    Column IDs  → Board menu → Developers → Column IDs
//
// =============================================================================

// ---------------------------------------------------------------------------
//  BOARD IDs
// ---------------------------------------------------------------------------
export const BOARDS = {
  // Board 1: Traveler submits initial out-of-state travel request
  travelerRequest:      18412077420,

  // Board 2: Travel team builds the official HCA packet for approvals
  hcaPacket:            18412077421,   // ← replace with your real board ID

  // Board 3: Traveler submits reimbursement form + receipts after travel
  travelerReimbursement: 18412077422,  // ← replace with your real board ID

  // Board 4: Travel team builds the ISTE statement for AP processing
  istePacket:           18412077425,
};


// ---------------------------------------------------------------------------
//  COLUMN IDs  —  Board 1: Traveler Request (read-only in the left pane)
//  These are what the traveler submitted. Column IDs match the traveler's
//  standalone request form. The travel team sees these but cannot edit them.
// ---------------------------------------------------------------------------
export const TRAVELER_REQUEST_COLS = {
  tripID:           'text_mm35sbdp',   // Shared key that links all 4 boards

  // Trip identity
  title:            'text_mm2vj6tf',   // Conference name
  location:         'text_mm2vk860',   // Destination
  startDate:        'date_mm2vze0a',
  endDate:          'date_mm2vnvrc',

  // Traveler info
  tr_traveler:      'text_mm2vn25f',
  tr_shareId:       'text_mm2vh585',
  tr_positionTitle: 'text_mm2vc3h',
  tr_division:      'color_mm2vy7r8',

  // Cost estimates (traveler's original numbers — for reference)
  tr_airfare:       'numeric_mm2vt4x6',
  tr_mileage:       'numeric_mm2v1d3j',
  tr_transport:     'numeric_mm2vsqsd',
  tr_fees:          'numeric_mm2v651g',
  tr_parking:       'numeric_mm2v3q9x',
  tr_carRental:     'numeric_mm2vs9mf',
  tr_perDiem:       'numeric_mm2vsfjf',
  tr_meals:         'numeric_mm2vg56f',
  tr_lodging:       'numeric_mm2vt4ft',
  tr_confFees:      'numeric_mm2v4vtt',
  tr_otherExp:      'numeric_mm2vncda',

  // Justification
  tr_justification: 'long_text_mm2vd845',

  // --- Add more Board 1 columns here ---
};


// ---------------------------------------------------------------------------
//  COLUMN IDs  —  Board 2: HCA Travel Packet (travel team editable)
//  All IDs sourced from the HCA Travel Request standalone app (app.js).
// ---------------------------------------------------------------------------
export const HCA_PACKET_COLS = {
  tripID:             'text_mm35jsjp',  // Must match travelerRequest.tripID value

  // ── Approval status columns (color/status type) ──────────────────────────
  packetStatus:       'color_mm2xe9t',
  supervisorApproval: 'color_mm2x5q1s',
  divisionApproval:   'color_mm2xnfbh',
  ASDApproval:        'color_mm2x8nh2',
  OOSApproval:        'color_mm2xerea',
  rentalApproval:     'color_mm3seyds',
  roomRatesApproval:  'color_mm3s84rd',

  // ── Header ───────────────────────────────────────────────────────────────
  hca_division:       'color_mm2vy7r8',  // readonly — pulled from traveler board
  hca_date:           'date_mm2yy6cp',

  // ── Section 1: Traveler Information ──────────────────────────────────────
  hca_traveler:       'text_mm2vn25f',
  hca_shareId:        'text_mm2vh585',
  hca_title:          'text_mm2vc3h',

  // ── Section 2: Trip Information (mirrors Board 1 — travel team can update)
  hca_destination:    'text_mm2vk860',
  hca_conferenceName: 'text_mm2vj6tf',
  hca_departureDate:  'date_mm2vze0a',
  hca_returnDate:     'date_mm2vnvrc',

  // ── Section 3: Cost — Amounts ─────────────────────────────────────────────
  hca_airfare:        'numeric_mm2vt4x6',
  hca_mileage:        'numeric_mm2v1d3j',
  hca_transport:      'numeric_mm2vsqsd',
  hca_fees:           'numeric_mm2v651g',
  hca_parking:        'numeric_mm2v3q9x',
  hca_carRental:      'numeric_mm2vs9mf',
  hca_perDiem:        'numeric_mm2vsfjf',
  hca_meals:          'numeric_mm2vg56f',
  hca_lodging:        'numeric_mm2vt4ft',
  hca_confFees:       'numeric_mm2v4vtt',
  hca_otherExp:       'numeric_mm2vncda',

  // ── Section 3: Cost — PO Reimbursement Amounts ───────────────────────────
  hca_airfarePO:      'numeric_mm2vx6wy',
  hca_mileagePO:      'numeric_mm2vqaak',
  hca_transportPO:    'numeric_mm2vr1m5',
  hca_feesPO:         'numeric_mm2vcjps',
  hca_parkingPO:      'numeric_mm2vjmz',
  hca_carRentalPO:    'numeric_mm2vm1be',
  hca_perDiemPO:      'numeric_mm2vnekg',
  hca_mealsPO:        'numeric_mm2vrj5n',
  hca_lodgingPO:      'numeric_mm2vwf01',
  hca_confFeesPO:     'numeric_mm2v1ef6',
  hca_otherExpPO:     'numeric_mm2vd6bx',

  // ── Section 4: Justification ──────────────────────────────────────────────
  hca_justification:  'long_text_mm2vd845',

  // --- Add more Board 2 columns here ---
};


// ---------------------------------------------------------------------------
//  COLUMN IDs  —  Board 3: Traveler Reimbursement Submission
// ---------------------------------------------------------------------------
export const TRAVELER_REIMB_COLS = {
  tripID:       'text_XXXXXXXX',   // ← replace
  totalClaimed: 'numbers_XXXXXXXX', // ← replace
  perDiemDays:  'numbers_XXXXXXXX', // ← replace
  mileage:      'numbers_XXXXXXXX', // ← replace
  // --- Add more columns from Board 3 here ---
  // receiptsNotes: 'text_XXXXXXXX',
};


// ---------------------------------------------------------------------------
//  COLUMN IDs  —  Board 4: ISTE Reimbursement Packet (travel team editable)
// ---------------------------------------------------------------------------
export const ISTE_PACKET_COLS = {
  tripID:             'text_mm35jsjp',  // Must match travelerRequest.tripID value
  ISTEStatus:         'color_XXXXXXXX', // ← replace
  travelerApproval:   'color_XXXXXXXX', // ← replace
  supervisorApproval: 'color_XXXXXXXX', // ← replace
  approvedTotal:      'numbers_XXXXXXXX', // ← replace
  // --- Add more columns from Board 4 here ---
  // APNotes: 'text_XXXXXXXX',
};


// ---------------------------------------------------------------------------
//  DROPDOWN OPTION LABELS
//  The text values monday uses in status/color columns.
//  Update these if your board uses different label names.
// ---------------------------------------------------------------------------
export const STATUS_LABELS = {
  approved:      'Approved',
  denied:        'Denied',
  notApplicable: 'Not Applicable',
  readyForApprovals: 'Ready For Approvals',
};


// ---------------------------------------------------------------------------
//  PRE-TRAVEL PIPELINE STEPS
//  Controls the step tracker shown at the top of the Pre-Travel tab.
//  Each step maps to a column key from HCA_PACKET_COLS (or null for manual).
//  actor = label shown in the step chip.
// ---------------------------------------------------------------------------
export const PRE_TRAVEL_STEPS = [
  { label: 'ITD request submitted',     actor: 'Traveler',       autoComplete: true },
  { label: 'Concept approval',          actor: 'Supervisor',     autoComplete: true },
  { label: 'Compile HCA packet',        actor: 'Travel Team',    colKey: 'packetStatus',       doneValue: STATUS_LABELS.readyForApprovals },
  { label: 'HCA form approval',         actor: 'Supervisor',     colKey: 'supervisorApproval', doneValue: STATUS_LABELS.approved, deniedValue: STATUS_LABELS.denied },
  { label: 'Division review',           actor: 'ITD Division',   colKey: 'divisionApproval',   doneValue: STATUS_LABELS.approved, deniedValue: STATUS_LABELS.denied },
  { label: 'ASD review',               actor: 'ASD Budget',     colKey: 'ASDApproval',        doneValue: STATUS_LABELS.approved, deniedValue: STATUS_LABELS.denied },
  { label: 'Executive authorization',   actor: 'OOS/Deputy Sec', colKey: 'OOSApproval',        doneValue: STATUS_LABELS.approved, deniedValue: STATUS_LABELS.denied },
  // Optional steps — shown only when not "Not Applicable"
  { label: 'Rental car authorization',  actor: 'CFO',            colKey: 'rentalApproval',     doneValue: STATUS_LABELS.approved, deniedValue: STATUS_LABELS.denied, optional: true },
  { label: 'Room rates authorization',  actor: 'CFO',            colKey: 'roomRatesApproval',  doneValue: STATUS_LABELS.approved, deniedValue: STATUS_LABELS.denied, optional: true },
  { label: 'SHARE PO generation',       actor: 'Travel Team',    autoComplete: false },
];


// ---------------------------------------------------------------------------
//  POST-TRAVEL PIPELINE STEPS
//  Same structure as PRE_TRAVEL_STEPS, maps to ISTE_PACKET_COLS.
// ---------------------------------------------------------------------------
export const POST_TRAVEL_STEPS = [
  { label: 'Reimbursement form submitted', actor: 'Traveler',        autoComplete: false, isteUrlRequired: true },
  { label: 'Generate itemized statement',  actor: 'Travel Team',     colKey: 'ISTEStatus',         doneValue: STATUS_LABELS.readyForApprovals },
  { label: 'Traveler approval',            actor: 'Traveler',        colKey: 'travelerApproval',   doneValue: STATUS_LABELS.approved, deniedValue: STATUS_LABELS.denied },
  { label: 'Supervisor approval',          actor: 'Supervisor',      colKey: 'supervisorApproval', doneValue: STATUS_LABELS.approved, deniedValue: STATUS_LABELS.denied },
  { label: 'Payments processing',          actor: 'Accounts Payable', autoComplete: false },
];
