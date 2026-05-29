const monday = window.mondaySdk();

let currentBoardId = null;
let currentItemId  = null;
let isLocked       = false;
const originalValues = {};

// ─── Configuration ────────────────────────────────────────────────────────────

const PARENT_STATUS_COL_ID = 'color_mm2xe9t';

// Parent item column IDs
const PARENT_COL_IDS = {
  parkingAmount:   'numeric_mm32w2q5', // Airport parking fee
  parkingFiles:    'file_mm33c37d',    // Airport parking receipt(s)
  baggageAmount:   'numeric_mm32hztf', // Baggage fee
  baggageFiles:    'file_mm3363sh',    // Baggage receipt(s)
  otherFiles:      'file_mm32hb6n',    // Other supporting documents
};

// Subitem column IDs (transportation rows)
const SUBITEM_COL_IDS = {
  type:      'color_mm32gfgv',    // Transportation type
  typeOther: 'text_mm32rvf0',     // Specified type when "Other"
  date:      'date_mm32jk22',     // Date
  amount:    'numeric_mm32yqpz',  // Amount
  tip:       'numeric_mm327arh',  // Tip
  files:     'file_mm33209m',     // Transport receipt(s)
};

// Collects every { boardId, itemId, columnId, assetId, url } across the whole form
// so the Download All button can open them in sequence.
const allFiles = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function showError(message) {
  let banner = document.getElementById('app-error-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'app-error-banner';
    banner.style.cssText =
      'background:#fff8f8;color:#c0392b;padding:10px 14px;margin-bottom:16px;' +
      'border:1px solid #f5c6c6;border-radius:4px;font-size:12px;';
    document.body.prepend(banner);
  }
  banner.textContent = message;
  banner.style.display = 'block';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Parses the raw JSON `value` string from a monday file column.
 * Returns an array of { asset_id, name, url } objects.
 */
function parseFileColumnValue(rawValue) {
  if (!rawValue) return [];
  try {
    const files = JSON.parse(rawValue)?.files ?? [];
    return files
      .filter(f => !f.error)
      .map(f => ({
        asset_id: f.assetId ?? f.asset_id ?? null,
        name:     f.name ?? 'File',
        url:      f.url  ?? null,
      }));
  } catch {
    return [];
  }
}

// ─── Main init ────────────────────────────────────────────────────────────────

async function init() {
  try {
    const context = await monday.get('context');
    currentItemId  = context?.data?.itemId;
    currentBoardId = context?.data?.boardId;

    if (!currentItemId || !currentBoardId) {
      throw new Error('Please open this app inside a monday.com item view.');
    }

    const query = `
      query {
        items(ids: [${currentItemId}]) {
          column_values {
            id
            text
            type
            value
          }
          subitems {
            id
            name
            board { id }
            column_values {
              id
              text
              type
              value
            }
          }
        }
      }
    `;

    const res  = await monday.api(query);
    const item = res?.data?.items?.[0];
    if (!item) throw new Error('Could not load item data. Check the board/item IDs.');

    // ── Lock check ───────────────────────────────────────────────────────────
    const statusCol = item.column_values.find(c => c.id === PARENT_STATUS_COL_ID);
    isLocked = statusCol?.text?.includes('Ready') ?? false;

    // ── Populate generic parent-board text/date fields ───────────────────────
    document.querySelectorAll('[data-col]').forEach(field => {
      if (field.closest('.transport-section')) return;
      const col = item.column_values.find(c => c.id === field.dataset.col);
      if (!col) return;
      const value = col.text ?? '';
      if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
        field.value = value;
      } else {
        field.textContent = value;
      }
      originalValues[field.dataset.col] = value;
      if (isLocked) {
        field.setAttribute('readonly', true);
        field.classList.add('locked-field');
      }
    });

    const getParent = id => item.column_values.find(c => c.id === id);

    // ── Airport parking ──────────────────────────────────────────────────────
    const parkingAmountEl = document.getElementById('parking-amount');
    if (parkingAmountEl) {
      parkingAmountEl.textContent = getParent(PARENT_COL_IDS.parkingAmount)?.text ?? '';
    }
    const parkingFiles = parseFileColumnValue(getParent(PARENT_COL_IDS.parkingFiles)?.value);
    const parkingCtx   = { boardId: currentBoardId, itemId: currentItemId, columnId: PARENT_COL_IDS.parkingFiles };
    buildReceiptButtons(document.getElementById('parking-receipts'), parkingFiles, parkingCtx, 'Parking Receipt');

    // ── Baggage ──────────────────────────────────────────────────────────────
    const baggageAmountEl = document.getElementById('baggage-amount');
    if (baggageAmountEl) {
      baggageAmountEl.textContent = getParent(PARENT_COL_IDS.baggageAmount)?.text ?? '';
    }
    const baggageFiles = parseFileColumnValue(getParent(PARENT_COL_IDS.baggageFiles)?.value);
    const baggageCtx   = { boardId: currentBoardId, itemId: currentItemId, columnId: PARENT_COL_IDS.baggageFiles };
    buildReceiptButtons(document.getElementById('baggage-receipts'), baggageFiles, baggageCtx, 'Baggage Receipt');

    // ── Other supporting documents ────────────────────────────────────────────
    const otherFiles = parseFileColumnValue(getParent(PARENT_COL_IDS.otherFiles)?.value);
    const otherCtx   = { boardId: currentBoardId, itemId: currentItemId, columnId: PARENT_COL_IDS.otherFiles };
    buildReceiptButtons(document.getElementById('other-documents'), otherFiles, otherCtx, 'Document');

    // ── Transportation subitems ───────────────────────────────────────────────
    renderTransportationSubitems(item.subitems ?? []);

    // ── Download All button ───────────────────────────────────────────────────
    const dlBtn = document.getElementById('download-all-btn');
    if (dlBtn) {
      if (allFiles.length === 0) {
        dlBtn.disabled = true;
        dlBtn.title = 'No files attached to this item';
      } else {
        dlBtn.addEventListener('click', downloadAllFiles);
      }
    }

  } catch (err) {
    console.error('Initialization error:', err);
    showError(`Error: ${err.message}`);
  }
}

// ─── Transportation subitem rendering ─────────────────────────────────────────

function renderTransportationSubitems(subitems) {
  const container = document.getElementById('transport-body');
  const noDataMsg  = document.getElementById('no-transport-message');

  if (!container) {
    console.warn('#transport-body not found in DOM.');
    return;
  }

  container.innerHTML = '';

  if (subitems.length === 0) {
    if (noDataMsg) noDataMsg.style.display = '';
    return;
  }
  if (noDataMsg) noDataMsg.style.display = 'none';

  subitems.forEach(subitem => {
    const get = id => subitem.column_values.find(c => c.id === id);

    const rawType    = get(SUBITEM_COL_IDS.type)?.text    ?? '';
    const typeOther  = get(SUBITEM_COL_IDS.typeOther)?.text ?? '';
    const typeText   = rawType.toLowerCase() === 'other' && typeOther ? typeOther : rawType;
    const dateText   = get(SUBITEM_COL_IDS.date)?.text    ?? '';
    const amountText = get(SUBITEM_COL_IDS.amount)?.text  ?? '';
    const tipText    = get(SUBITEM_COL_IDS.tip)?.text     ?? '';
    const files      = parseFileColumnValue(get(SUBITEM_COL_IDS.files)?.value);

    const row = document.createElement('tr');
    row.className = 'transport-row';
    row.innerHTML = `
      <td class="label">Type:   <span class="value">${escHtml(typeText)}</span></td>
      <td class="label">Date:   <span class="value">${escHtml(dateText)}</span></td>
      <td class="label">Amount: <span class="value">${escHtml(amountText)}</span></td>
      <td class="label">Tip:    <span class="value">${escHtml(tipText)}</span></td>
      <td class="label receipts-cell">Receipts:</td>
    `;

    const fileCtx = {
      boardId:  subitem.board?.id ?? currentBoardId,
      itemId:   subitem.id,
      columnId: SUBITEM_COL_IDS.files,
    };
    buildReceiptButtons(row.querySelector('.receipts-cell'), files, fileCtx, 'Receipt');
    container.appendChild(row);
  });
}

// ─── Receipt button builder ───────────────────────────────────────────────────

/**
 * Appends file buttons to a cell and registers each file in allFiles[]
 * so the Download All button can find them.
 *
 * @param {Element}  cell        - The TD element to append buttons into
 * @param {Array}    files       - Parsed file objects: { asset_id, name, url }
 * @param {Object}   fileContext - { boardId, itemId, columnId }
 * @param {string}   label       - Button label prefix (e.g. "Receipt", "Document")
 */
function buildReceiptButtons(cell, files, fileContext, label = 'File') {
  if (!cell) return;

  if (files.length === 0) {
    const none = document.createElement('span');
    none.textContent = ' None';
    none.style.cssText = 'color:#bbb;font-style:italic;margin-left:6px;';
    cell.appendChild(none);
    return;
  }

  files.forEach((file, index) => {
    // Register in allFiles for the Download All button
    allFiles.push({ ...fileContext, assetId: file.asset_id, url: file.url, name: file.name });

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `📷 ${file.name}`;
    btn.title = `View: ${escHtml(file.name)}`;

    if (file.url) {
      btn.className = 'open-link-direct';
      btn.dataset.url = file.url;
    } else if (file.asset_id) {
      btn.className = 'open-asset';
      btn.dataset.assetId  = String(file.asset_id);
      btn.dataset.boardId  = String(fileContext.boardId);
      btn.dataset.itemId   = String(fileContext.itemId);
      btn.dataset.columnId = fileContext.columnId;
    }

    cell.appendChild(btn);
  });
}

// ─── Download All ─────────────────────────────────────────────────────

/**
 * Downloads every attached file directly to the browser.
 *
 * Fetches all public_urls in a single batch GraphQL query (requires
 * assets:read scope), then fires an <a download> click for each one.
 * External link-type files open in a new tab since they can't be
 * force-downloaded cross-origin.
 * Downloads are staggered 300ms apart so the browser doesn't block them.
 */
async function downloadAllFiles() {
  const btn    = document.getElementById('download-all-btn');
  const status = document.getElementById('download-status');

  btn.disabled = true;
  if (status) status.textContent = 'Fetching file URLs…';

  const assets = allFiles.filter(f => f.assetId);
  const links  = allFiles.filter(f => f.url && !f.assetId);

  // Batch-fetch all public_urls in one query
  const assetUrlMap = {};
  if (assets.length > 0) {
    try {
      const ids = assets.map(f => f.assetId).join(', ');
      const res = await monday.api(`query { assets(ids: [${ids}]) { id public_url name } }`);
      (res?.data?.assets ?? []).forEach(a => {
        assetUrlMap[String(a.id)] = { url: a.public_url, name: a.name };
      });
    } catch (err) {
      console.error('Error fetching asset URLs:', err);
      showError('Could not fetch file URLs. Check that the assets:read scope is enabled.');
      btn.disabled = false;
      if (status) status.textContent = '';
      return;
    }
  }

  const downloads = [
    ...assets.map(f => ({
      url:  assetUrlMap[String(f.assetId)]?.url  ?? null,
      name: assetUrlMap[String(f.assetId)]?.name ?? f.name,
    })).filter(f => f.url),
    ...links.map(f => ({ url: f.url, name: f.name })),
  ];

  const total = downloads.length;
  if (total === 0) {
    if (status) status.textContent = 'No downloadable files found.';
    btn.disabled = false;
    return;
  }

  for (let i = 0; i < downloads.length; i++) {
    const { url, name } = downloads[i];
    if (status) status.textContent = `Downloading ${i + 1} of ${total}…`;

    const a = document.createElement('a');
    a.href     = url;
    a.download = name || `file-${i + 1}`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (i < downloads.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  if (status) status.textContent = `${total} file${total !== 1 ? 's' : ''} downloaded.`;
  btn.disabled = false;
}

// ─── Event delegation ─────────────────────────────────────────────────────────

document.addEventListener('click', async (e) => {
  const linkBtn = e.target.closest('.open-link-direct');
  if (linkBtn) {
    const url = linkBtn.dataset.url;
    if (url) window.open(url, '_blank');
    return;
  }

  const assetBtn = e.target.closest('.open-asset');
  if (assetBtn) {
    const assetId  = Number(assetBtn.dataset.assetId);
    const boardId  = Number(assetBtn.dataset.boardId);
    const itemId   = Number(assetBtn.dataset.itemId);
    const columnId = assetBtn.dataset.columnId;
    if (!assetId) return;
    try {
      await monday.execute('openFilesDialog', { boardId, itemId, columnId, assetId });
    } catch (err) {
      console.error('openFilesDialog error:', err);
      showError('Could not open file preview.');
    }
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

init();