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
//  APPLICATION MODE
// ---------------------------------------------------------------------------
// export const MODE = 'test'
// export const MODE = 'dev'
export const MODE = 'prod'

// ---------------------------------------------------------------------------
//  BOARD IDs
// ---------------------------------------------------------------------------
export const BOARDS = {
  // Board 1: Traveler submits initial out-of-state travel request
  travelerRequest:      18412077417,

  // Board 2: Travel team builds the official HCA packet for approvals
  hcaPacket:            18412077420, 

  // Board 3: Traveler submits reimbursement form + receipts after travel
  travelerReimbursement: 18412077424,  

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
  
  // Supervisor info
  tr_supervisor:    'text_mm21ej4y',
  tr_supervisorEmail:'email_mm21a3sq',
  
  // Traveler info
  traveler:         '',
  tr_firstName:     'text_mm2149yj',
  tr_lastName:      'text_mm214zhc',
  tr_email:         'email_mm2xq18k',
  tr_division:      'color_mm36hm34',
  tr_position:      'text_mm21ecb6',
  tr_phone:         'phone_mm21zr34',
  tr_workCity:      'text_mm3862bq',
  tr_workState:     'color_mm38vtg3',
  tr_homeCity:      'text_mm3850m6',
  tr_homeState:     'color_mm38qytg',
  tr_vendorId:       'numeric_mm21n98s',
  tr_w9:            'file_mm21bca5',
  
  // Conference info
  tr_conference:    'text_mm21b390',
  tr_confCity:      'text_mm21bfng',
  tr_confState:     'text_mm216p86',
  tr_confStart:     'date_mm21qkrj',
  tr_confEnd:       'date_mm214633',
  tr_justification: 'text_mm21v5he',
  tr_confFee:       'color_mm21y3cg',
  tr_confFeeAmount: 'numeric_mm21245w',
  
  // Transportation info
  tr_prefAirline:   'text_mm216ynn',
  tr_outboundDate:  'date_mm218snw',
  tr_outboundTime:  'dropdown_mm2xg3my',
  tr_returnDate:    'date_mm217077',
  tr_returnTime:    'dropdown_mm2xnf5s',
  tr_bagFee:        'color_mm21h3bk',
  tr_bagFeeQuote:   'file0vnbcr0i',
  tr_parkingFee:    'color_mm219wwd',
  tr_parkingQuote:  'fileiktemkxs',
  tr_carRental:     'color_mm212v99',
  tr_carRentalExpl: 'long_text_mm21zaf2',
  tr_comments:      'long_text_mm21nd8m',

  // Lodging info
  tr_hotel:         'text_mm215drm',
  tr_checkin:       'date_mm21h786',
  tr_checkout:      'date_mm216s6e',
  tr_nights:        'numeric_mm21zqv2',
  tr_hotelCost:     'numeric_mm21td8',
  tr_roomRates:     'numeric_mm21ryww',
  tr_350Expl:       'long_text_mm21gvq',
  
  // Reimbursement
  tr_reimburseType: 'color_mm35r4bb',

};


// ---------------------------------------------------------------------------
//  COLUMN IDs  —  Board 2: HCA Travel Packet (travel team editable)
//  All IDs sourced from the HCA Travel Request standalone app (app.js).
// ---------------------------------------------------------------------------
export const HCA_PACKET_COLS = {
  tripID:             'text_mm35sbdp',  // Must match travelerRequest.tripID value

  // Trip identity
  title:            'text_mm2vj6tf',   // Conference name
  location:         'text_mm2vk860',   // Destination

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
  startDate:          'date_mm2vze0a',
  endDate:            'date_mm2vnvrc',
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
export const TRAVELER_REIMB_SUBITEM_COLS = {
  transportType:   'color_mm32gfgv',
  listType:        'text_mm32rvf0',
  date:            'date_mm32jk22',
  amount:          'numeric_mm32yqpz',
  tipAmount:       'numeric_mm327arh',
  receipt:         'file_mm33209m',
};

export const TRAVELER_REIMB_COLS = {
  tripID:           'text_mm35kp5n',
  reimb_date:       'date4',
  reimb_division:   'text_mm36xvyg',  
  reimb_name:       'text_mm32dwr1',
  reimb_supplierID: 'text_mm325j5s',
  reimb_departureDate: 'date_mm32tas8',
  reimb_departureTime: 'text_mm32a8qk',
  reimb_arrivalDate: 'date_mm32gjap',
  reimb_arrivalTime: 'text_mm323j64',
  reimb_mileageToAirport: 'numeric_mm32ynry',
  reimb_licensePlate: 'text_mm3263qb',
  reimb_carModel:   'text_mm32k4rx',
  reimb_carType:    'color_mm32f9gp',
  reimb_transportUsed: 'color_mm32d2c2',
  reimb_parkingFee: 'color_mm32qc1y',
  reimb_parkingFeeAmount: 'numeric_mm32w2q5',
  reimb_bagFee:     'color_mm32dyk9',
  reimb_bagFeeAmount: 'numeric_mm32hztf',
  reimb_rates:      'color_mm366rbp',
  reimb_rates:      'color_mm366rbp',
};


// ---------------------------------------------------------------------------
//  COLUMN IDs  —  Board 4: ISTE Reimbursement Packet (travel team editable)
// ---------------------------------------------------------------------------
// Add alongside ISTE_PACKET_COLS:
export const ISTE_SUBITEM_COLS = {
  date:        'date0',            // ← replace with your actual subitem column IDs
  departTime:  'text_mm33semp',
  arriveTime:  'text_mm33g5ts',
  destination: 'text_mm33vyy2',
  odometer:    'text_mm33rqhh',
  miles:       'numeric_mm33psy1',
  mileage:     'numeric_mm33fqwj',
  perdiem:     'numeric_mm334bhr',
  other:       'numeric_mm33d33d',
};

// And add header fields to ISTE_PACKET_COLS:
export const ISTE_PACKET_COLS = {
  tripID:             'text_mm35jsjp',
  ISTEStatus:         'color_mm3tt944',
  iste_supervisorEmail: 'email_mm47mgfq',
  iste_agencyName:    'text_mm32f6m5',
  iste_advanceAmount: 'numeric_mm34wpds',
  iste_division:      'text_mm38bwhw',
  iste_businessUnit:  'text_mm32vzws',
  iste_voucherNumber: 'text_mm33zev5',
  iste_supplierName:  'text_mm32xqxs',
  iste_supplierId:    'text_mm32zdd2',
  iste_attendance:    'color_mm322zrz',
  iste_lengthOfBoard: 'color_mm32ddxm',
  iste_postOfDuty:    'text_mm32ydbs',
  iste_residence:     'text_mm32f377',
  iste_licensePlate:  'text_mm328jte',
  iste_vehicleModel:  'text_mm32vtpv',
  iste_vehicleType:   'color_mm32b86r',
  travelerApproval_post:   'color_mm3tzwcd',
  supervisorApproval_post: 'color_mm3txq9z',
  iste_APApproval:         'color_mm3t1vzy',

  // Radio groups — derive booleans in onSavePost before saving
  iste_voucherBasis:  null,   // not a real column, handled in onSavePost
  iste_perDiemBasis:  null,   // not a real column, handled in onSavePost

  // Underlying boolean columns
  iste_prepaidVoucher: 'boolean_mm32z5q7',
  iste_finalVoucher:   'boolean_mm32n5pq',
  iste_actual:         'boolean_mm3490fe',
  iste_approvedRates:  'boolean_mm345nt4',
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
