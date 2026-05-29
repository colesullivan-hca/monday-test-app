const monday = window.mondaySdk();

let currentBoardId = null;
let currentItemId = null;
const originalValues = {};

const SUBITEM_COL_IDS = {
  type:   'color_mm32gfgv',   // Transportation Type (Status/Color column)
  date:   'date_mm32jk22',    // Date
  amount: 'numeric_mm32yqpz', // Amount
  tip:    'numeric_mm327arh', // Tip
  files:  'file_mm33209m'     // Receipts (File column)
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function showError(message) {
  let banner = document.getElementById('app-error-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'app-error-banner';
    banner.style.cssText =
      'background:#fff0f0;color:#900;padding:12px 16px;margin:8px;' +
      'border:1px solid #f99;border-radius:4px;font-size:13px;';
    document.body.prepend(banner);
  }
  banner.textContent = message;
  banner.style.display = 'block';
}

/** Escapes a string for safe insertion as HTML text content. */
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
 *
 * monday returns file column values as JSON like:
 *   { "files": [ { "assetId": 123, "name": "receipt.pdf", "fileType": "ASSET" }, ... ] }
 */
function parseFileColumnValue(rawValue) {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    const files = parsed?.files ?? [];
    return files
      .filter(f => !f.error)
      .map(f => ({
        asset_id: f.assetId ?? f.asset_id ?? null,
        name:     f.name ?? 'Receipt',
        url:      f.url  ?? null  // only present for link-type entries
      }));
  } catch {
    return [];
  }
}

// ─── Main init ────────────────────────────────────────────────────────────────

async function init() {
  try {
    const context = await monday.get('context');
    currentItemId = context?.data?.itemId;
    currentBoardId = context?.data?.boardId;

    if (!currentItemId || !currentBoardId) {
      throw new Error('Please open this app inside a monday.com item view.');
    }

    // We also fetch subitem board IDs so openFilesDialog gets the correct boardId.
    // Subitems live on their own auto-generated board, not the parent board.
    const query = `
      query {
        items(ids: [${currentItemId}]) {
          column_values {
            id
            text
            type
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

    const res = await monday.api(query);
    const item = res?.data?.items?.[0];

    if (!item) {
      throw new Error('Could not load item data. Check the board/item IDs.');
    }

    // ── Populate parent-board fields (elements with data-col attributes) ─────
    document.querySelectorAll('[data-col]').forEach(field => {
      if (field.closest('.transport-section')) return; // handled separately

      const col = item.column_values.find(c => c.id === field.dataset.col);
      if (!col) return;

      const value = col.text ?? '';
      if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
        field.value = value;
      } else {
        field.textContent = value;
      }
      originalValues[field.dataset.col] = value;

      field.setAttribute('readonly', true);
      field.classList.add('locked-field');
    });

    // ── Render transportation subitems ────────────────────────────────────────
    renderTransportationSubitems(item.subitems ?? []);

  } catch (err) {
    console.error('Initialization error:', err);
    showError(`Error: ${err.message}`);
  }
}

// ─── Subitem rendering ────────────────────────────────────────────────────────

function renderTransportationSubitems(subitems) {
  const container = document.getElementById('transport-body');
  const noDataMsg  = document.getElementById('no-transport-message');

  if (!container) {
    console.warn('renderTransportationSubitems: #transport-body not found in DOM.');
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

    const typeText   = get(SUBITEM_COL_IDS.type)?.text   ?? '';
    const dateText   = get(SUBITEM_COL_IDS.date)?.text   ?? '';
    const amountText = get(SUBITEM_COL_IDS.amount)?.text ?? '';
    const tipText    = get(SUBITEM_COL_IDS.tip)?.text    ?? '';
    const filesRaw   = get(SUBITEM_COL_IDS.files)?.value ?? null;
    const files      = parseFileColumnValue(filesRaw);

    const row = document.createElement('tr');
    row.className = 'transport-row';

    row.innerHTML = `
      <td class="label">Type:   <span class="value">${escHtml(typeText)}</span></td>
      <td class="label">Date:   <span class="value">${escHtml(dateText)}</span></td>
      <td class="label">Amount: <span class="value">${escHtml(amountText)}</span></td>
      <td class="label">Tip:    <span class="value">${escHtml(tipText)}</span></td>
      <td class="label receipts-cell">Receipts: </td>
    `;

    // openFilesDialog requires boardId + itemId + columnId + assetId.
    // Subitems have their own board ID (different from the parent board).
    const fileContext = {
      boardId:  subitem.board?.id ?? currentBoardId,
      itemId:   subitem.id,
      columnId: SUBITEM_COL_IDS.files
    };

    buildReceiptButtons(row.querySelector('.receipts-cell'), files, fileContext);
    container.appendChild(row);
  });
}

/**
 * Appends receipt buttons to a cell.
 *
 * Uses monday.execute('openFilesDialog', { boardId, itemId, columnId, assetId })
 * which requires all four params — passing only assetId causes "file not found".
 * This approach needs no extra OAuth scopes unlike the assets API.
 */
function buildReceiptButtons(cell, files, fileContext) {
  if (files.length === 0) {
    const none = document.createElement('span');
    none.textContent = ' None';
    none.style.cssText = 'color:#888;font-style:italic;';
    cell.appendChild(none);
    return;
  }

  files.forEach((file, index) => {
    const wrapper = document.createElement('span');
    wrapper.className = 'file-entry-wrapper';
    wrapper.style.cssText = 'display:inline-block;margin-left:8px;';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `📄 Receipt ${index + 1}`;
    btn.title = `View: ${escHtml(file.name)}`;

    if (file.url) {
      // External / link-type file — open in a new tab
      btn.className = 'open-link-direct';
      btn.dataset.url = file.url;
    } else if (file.asset_id) {
      // Uploaded asset — use monday's native viewer with all required params
      btn.className = 'open-asset';
      btn.dataset.assetId = String(file.asset_id);
      btn.dataset.boardId  = String(fileContext.boardId);
      btn.dataset.itemId   = String(fileContext.itemId);
      btn.dataset.columnId = fileContext.columnId;
    }

    wrapper.prepend(btn);
    cell.appendChild(wrapper);
  });
}

// ─── Event delegation ─────────────────────────────────────────────────────────

document.addEventListener('click', async (e) => {
  // Open external / link-type file in a new tab
  const linkBtn = e.target.closest('.open-link-direct');
  if (linkBtn) {
    const url = linkBtn.dataset.url;
    if (url) window.open(url, '_blank');
    return;
  }

  // Open uploaded asset using monday's native file viewer
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