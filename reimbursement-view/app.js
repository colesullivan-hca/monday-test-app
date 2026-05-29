const monday = window.mondaySdk();

let currentBoardId = null;
let currentItemId = null;
let isLocked = false;
const originalValues = {};

// CONFIGURATION: Replace these IDs with your actual column IDs
const PARENT_STATUS_COL_ID = 'color_mm2xe9t';

const SUBITEM_COL_IDS = {
  type:   'color_mm32gfgv',  // Transportation Type (Status/Color column)
  date:   'date_mm32jk22',   // Date
  amount: 'numeric_mm32yqpz',// Amount
  tip:    'numeric_mm327arh',// Tip
  files:  'file_mm33209m'    // Receipts (File column)
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Shows a user-visible error banner inside the app.
 */
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

/**
 * Parses the raw JSON `value` string from a file column and returns an array
 * of normalised file objects: { asset_id, name, url }.
 *
 * monday.com returns file column values as a JSON string like:
 *   { "files": [ { "assetId": 123, "name": "receipt.pdf", "fileType": "ASSET" }, … ] }
 *
 * We avoid inline GraphQL fragments (... on FileValue) because they are
 * unreliable across API versions and board configurations.
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
        url:      f.url  ?? null   // only present for link-type entries
      }));
  } catch {
    return [];
  }
}

// ─── Main init ───────────────────────────────────────────────────────────────

async function init() {
  try {
    const context = await monday.get('context');
    currentItemId = context?.data?.itemId;
    currentBoardId = context?.data?.boardId;

    if (!currentItemId || !currentBoardId) {
      throw new Error('Please open this app inside a monday.com item view.');
    }

    // Minimal query — file data is fetched via the `value` field (raw JSON)
    // rather than inline fragments, which are fragile across API versions.
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

    // ── Lock check ──────────────────────────────────────────────────────────
    const statusCol = item.column_values.find(c => c.id === PARENT_STATUS_COL_ID);
    isLocked = statusCol?.text?.includes('Ready') ?? false;

    // ── Populate parent-board fields (data-col attributes) ──────────────────
    document.querySelectorAll('[data-col]').forEach(field => {
      // Skip elements that are part of the subitem table (rendered separately)
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

    // ── Render transportation subitems ───────────────────────────────────────
    renderTransportationSubitems(item.subitems ?? []);

  } catch (err) {
    console.error('Initialization error:', err);
    showError(`Error: ${err.message}`);
  }
}

// ─── Subitem rendering ───────────────────────────────────────────────────────

/**
 * Clears any existing subitem rows and re-renders one row per subitem.
 * Expects a container element with id="transport-body" (a <tbody> or <div>).
 * Falls back gracefully if the container is missing.
 */
function renderTransportationSubitems(subitems) {
  // Use a dedicated container so we never accidentally destroy header rows.
  const container = document.getElementById('transport-body');
  const noDataMsg  = document.getElementById('no-transport-message');

  if (!container) {
    console.warn('renderTransportationSubitems: #transport-body not found in DOM.');
    return;
  }

  // Clear previous rows
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

    const files = parseFileColumnValue(filesRaw);

    const row = document.createElement('tr');
    row.className = 'transport-row';

    // Build the five standard cells
    row.innerHTML = `
      <td class="label">Type:   <span class="value">${escHtml(typeText)}</span></td>
      <td class="label">Date:   <span class="value">${escHtml(dateText)}</span></td>
      <td class="label">Amount: <span class="value">${escHtml(amountText)}</span></td>
      <td class="label">Tip:    <span class="value">${escHtml(tipText)}</span></td>
      <td class="label receipts-cell">Receipts: </td>
    `;

    const receiptsCell = row.querySelector('.receipts-cell');
    buildReceiptButtons(receiptsCell, files);

    container.appendChild(row);
  });
}

/**
 * Appends receipt buttons (or a "None" notice) to the given cell element.
 */
function buildReceiptButtons(cell, files) {
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
    btn.title = `View: ${file.name}`;

    if (file.url) {
      // External / link-type file — open directly
      btn.className = 'open-link-direct';
      btn.dataset.url = file.url;
    } else if (file.asset_id) {
      // Uploaded asset — preview in a <dialog>
      btn.className = 'open-modal';
      btn.dataset.assetId = String(file.asset_id);

      const dialog = document.createElement('dialog');
      dialog.className = 'preview-modal';

      const iframe = document.createElement('iframe');
      iframe.className = 'modal-content';
      iframe.setAttribute('frameborder', '0');
      // Mark as unloaded; we lazy-load the src on first open
      iframe.dataset.loaded = 'false';

      dialog.appendChild(iframe);
      wrapper.appendChild(dialog);
    }

    wrapper.prepend(btn);
    cell.appendChild(wrapper);
  });
}

// ─── Asset URL lookup ────────────────────────────────────────────────────────

/**
 * Fetches a fresh public URL for a monday.com uploaded asset.
 * Public URLs are time-limited, so we fetch on demand rather than caching.
 */
async function getMondayFileUrl(assetId) {
  try {
    const res = await monday.api(
      `query { assets(ids: [${assetId}]) { public_url } }`
    );
    return res?.data?.assets?.[0]?.public_url ?? 'about:blank';
  } catch (err) {
    console.error('getMondayFileUrl error:', err);
    return 'about:blank';
  }
}

// ─── Event delegation ────────────────────────────────────────────────────────

document.addEventListener('click', async (e) => {
  // Close modal when clicking the backdrop (the <dialog> element itself)
  if (e.target.tagName === 'DIALOG' && e.target.open) {
    e.target.close();
    return;
  }

  // Open external link
  const linkBtn = e.target.closest('.open-link-direct');
  if (linkBtn) {
    const url = linkBtn.dataset.url;
    if (url) window.open(url, '_blank');
    return;
  }

  // Open asset preview modal
  const modalBtn = e.target.closest('.open-modal');
  if (modalBtn) {
    const wrapper = modalBtn.closest('.file-entry-wrapper');
    const dialog  = wrapper?.querySelector('.preview-modal');
    const iframe  = dialog?.querySelector('.modal-content');

    if (!dialog || !iframe) return;

    // Lazy-load the iframe src only on first open
    if (iframe.dataset.loaded === 'false') {
      iframe.dataset.loaded = 'loading';
      const assetId = modalBtn.dataset.assetId;
      iframe.src = await getMondayFileUrl(assetId);
      iframe.dataset.loaded = 'true';
    }

    dialog.showModal();
  }
});

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Escapes a string for safe insertion as HTML text content. */
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

init();