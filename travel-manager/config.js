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
  hcaPacket:            18412077420,  

  // Board 3: Traveler submits reimbursement form + receipts after travel
  travelerReimbursement: 18412077424,  

  // Board 4: Travel team builds the ISTE statement for AP processing
  istePacket:           18412077425,
};


// ---------------------------------------------------------------------------
//  COLUMN IDs  —  Board 1: Traveler Request
// ---------------------------------------------------------------------------
export const TRAVELER_REQUEST_COLS = {
  tripID:       'text_mm35sbdp',   // Shared key that links all 4 boards
  title:        'text_mm2vj6tf',
  location:     'text_mm2vk860',
  startDate:    'date_mm2vze0a',
  endDate:      'date_mm2vnvrc',
  // --- Add more columns from Board 1 here ---
  // purpose:   'text_XXXXXXXX',
  // estimatedCost: 'numbers_XXXXXXXX',
  // rentalCar: 'color_XXXXXXXX',
  // roomRates: 'color_XXXXXXXX',
};


// ---------------------------------------------------------------------------
//  COLUMN IDs  —  Board 2: HCA Travel Packet (travel team editable)
// ---------------------------------------------------------------------------
export const HCA_PACKET_COLS = {
  tripID:             'text_mm35jsjp',  // Must match travelerRequest.tripID value
  packetStatus:       'color_mm2xe9t',
  supervisorApproval: 'color_mm2x5q1s',
  divisionApproval:   'color_mm2xnfbh',
  ASDApproval:        'color_mm2x8nh2',
  OOSApproval:        'color_mm2xerea',
  rentalApproval:     'color_mm3seyds',
  roomRatesApproval:  'color_mm3s84rd',
  // --- Add more columns from Board 2 here ---
  // internalNotes: 'text_XXXXXXXX',
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
