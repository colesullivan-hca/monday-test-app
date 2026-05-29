const monday = window.mondaySdk();
let currentBoardId = null;
let currentItemId = null;
let isLocked = false;
const originalValues = {};

// CONFIGURATION: Replace these string IDs with your actual column IDs from your Subitems board
const SUBITEM_COL_IDS = {
  type: "color_mm32gfgv",       // Subitem column ID for Transportation Type
  date: "date_mm32jk22",       // Subitem column ID for Date
  amount: "numeric_mm32yqpz",   // Subitem column ID for Amount
  tip: "numeric_mm327arh",      // Subitem column ID for Tip
  files: "file_mm33209m"        // Subitem column ID for Receipts (File Column)
};

/**
 * Initializes the application, pulls context, and queries the parent item and its subitems.
 */
async function init() {
  try {
    const context = await monday.get('context');
    currentItemId = context?.data?.itemId;
    currentBoardId = context?.data?.boardId;

    if (!currentItemId || !currentBoardId) {
      throw new Error('Please open this app inside a monday item view.');
    }

    // Fully optimized GraphQL query addressing type conflicts and missing schema fields
    const query = `query {
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
            ... on FileValue {
              files {
                ... on FileAssetValue {
                  asset_id
                  name
                  asset {
                    public_url
                  }
                }
                ... on FileDocValue {
                  file_id
                  url
                }
                ... on FileLinkValue {
                  file_id
                  name
                  url
                }
                ... on FileAssetInvalidValue {
                  asset_id
                  invalid_name: name
                  error
                }
              }
            }
          }
        }
      }
    }`;

    const res = await monday.api(query);
    const item = res?.data?.items?.[0];

    if (!item) {
      throw new Error('Could not load item data.');
    }

    // Check if the item is locked based on parent status
    const statusCol = item.column_values.find(c => c.id === 'color_mm2xe9t');
    isLocked = statusCol?.text?.includes('Ready');

    // 1. Populate standard parent board text/date layout fields
    document.querySelectorAll('[data-col]').forEach(field => {
      if (field.classList.contains('receipt-box')) return;

      const col = item.column_values.find(c => c.id === field.dataset.col);
      if (!col) return;

      const valueString = col.text || '';
      if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
        field.value = valueString;
      } else {
        field.textContent = valueString;
      }
      originalValues[field.dataset.col] = valueString;

      if (isLocked) {
        field.setAttribute('readonly', true);
        field.classList.add('locked-field');
      }
    });

    // 2. Process and dynamically render the Transportation subitems
    renderTransportationSubitems(item.subitems || []);

  } catch (err) {
    console.error('Initialization Error:', err);
  }
}

/**
 * Sweeps away placeholder transport elements and generates clean semantic markup rows.
 */
function renderTransportationSubitems(subitems) {
  const transportTable = document.querySelector('.transport').closest('table');
  const noTransportWarning = document.querySelector('style[style*="display: none"], .label[style*="rgb(121, 0, 0)"]');

  // Purge old placeholder rows (keeping headers/section titles)
  const existingRows = transportTable.querySelectorAll('tr');
  existingRows.forEach(row => {
    if (!row.querySelector('.section-title') && !row.querySelector('th')) {
      row.remove();
    }
  });

  if (subitems.length === 0) {
    if (noTransportWarning) noTransportWarning.parentElement.style.display = 'table-row';
    return;
  } else {
    if (noTransportWarning) noTransportWarning.parentElement.style.display = 'none';
  }

  subitems.forEach(subitem => {
    const row = document.createElement('tr');
    row.className = 'transport-row';

    const typeCol = subitem.column_values.find(c => c.id === SUBITEM_COL_IDS.type);
    const dateCol = subitem.column_values.find(c => c.id === SUBITEM_COL_IDS.date);
    const amountCol = subitem.column_values.find(c => c.id === SUBITEM_COL_IDS.amount);
    const tipCol = subitem.column_values.find(c => c.id === SUBITEM_COL_IDS.tip);
    const filesCol = subitem.column_values.find(c => c.id === SUBITEM_COL_IDS.files);

    row.innerHTML = `
      <td class="label">Type: <span class="value">${typeCol?.text || ''}</span></td>
      <td class="label">Date: <span class="value">${dateCol?.text || ''}</span></td>
      <td class="label">Amount: <span class="value">${amountCol?.text || ''}</span></td>
      <td class="label">Tip: <span class="value">${tipCol?.text || ''}</span></td>
      <td class="label">
        <div class="receipt-box">
          <span>Receipts:</span>
        </div>
      </td>
    `;

    const receiptBoxContainer = row.querySelector('.receipt-box');
    buildDynamicReceiptButtons(receiptBoxContainer, filesCol);

    transportTable.appendChild(row);
  });
}

/**
 * Builds separate actionable elements for zero, one, or multiple receipt links/assets.
 */
function buildDynamicReceiptButtons(containerElement, columnData) {
  if (!columnData || !columnData.files || columnData.files.length === 0) {
    const fallbackText = document.createElement('span');
    fallbackText.textContent = ' None';
    fallbackText.style.color = '#888';
    fallbackText.style.fontStyle = 'italic';
    containerElement.appendChild(fallbackText);
    return;
  }

  columnData.files.forEach((file, index) => {
    if (file.error) return; // Skip invalid asset files safely

    const wrapper = document.createElement('div');
    wrapper.className = 'file-entry-wrapper';
    wrapper.style.display = 'inline-block';
    wrapper.style.marginLeft = '8px';

    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    
    // Fallback logic resolving names safely across varying schema definitions
    const displayName = file.name || file.invalid_name || 'Receipt';
    actionButton.title = `View File: ${displayName}`;
    actionButton.textContent = `📄 Receipt ${index + 1}`;

    // Routing Logic: External Storage (Links/Docs) vs Native Uploaded Assets
    if (file.url) {
      actionButton.className = 'open-link-direct';
      actionButton.setAttribute('data-url', file.url);
    } else if (file.asset_id) {
      actionButton.className = 'open-modal';
      actionButton.setAttribute('data-asset-id', file.asset_id);
      
      // Inject pre-fetched public url if valid to reduce runtime API calls
      if (file.asset?.public_url) {
        actionButton.setAttribute('data-pre-url', file.asset.public_url);
      }

      const dialogElement = document.createElement('dialog');
      dialogElement.className = 'preview-modal';
      
      const iframeElement = document.createElement('iframe');
      iframeElement.className = 'modal-content';
      iframeElement.frameBorder = '0';
      iframeElement.src = ''; // Lazy loaded on open click

      dialogElement.appendChild(iframeElement);
      wrapper.appendChild(dialogElement);
    }

    wrapper.insertBefore(actionButton, wrapper.firstChild);
    containerElement.appendChild(wrapper);
  });
}

/**
 * Utility fallback function providing token renewals for uploaded local files.
 */
async function getMondayFileUrl(assetId) {
  try {
    const assetQuery = `query { assets (ids: [${assetId}]) { public_url } }`;
    const response = await monday.api(assetQuery);
    
    if (response.data?.assets?.[0]) {
      return response.data.assets[0].public_url;
    }
    return 'about:blank';
  } catch (error) {
    console.error('Error fetching file asset link mapping:', error);
    return 'about:blank';
  }
}

/* ==========================================================================
    Global Delegation Action Event Handlers
   ========================================================================== */

document.addEventListener('click', async (e) => {
  // 1. Direct external link redirection routing
  const linkTargetBtn = e.target.closest('.open-link-direct');
  if (linkTargetBtn) {
    const directUrl = linkTargetBtn.getAttribute('data-url');
    if (directUrl) window.open(directUrl, '_blank');
    return;
  }

  // 2. Local system asset modal display previews
  const openTargetBtn = e.target.closest('.open-modal');
  if (openTargetBtn) {
    const parentContainer = openTargetBtn.closest('.file-entry-wrapper');
    const assignedModal = parentContainer.querySelector('.preview-modal');
    const dynamicIframe = assignedModal.querySelector('.modal-content');
    const contextAssetId = openTargetBtn.getAttribute('data-asset-id');
    const preFetchedUrl = openTargetBtn.getAttribute('data-pre-url');

    if (contextAssetId && !dynamicIframe.src) {
      dynamicIframe.src = 'about:blank';
      // Load pre-fetched direct link if alive, else call fallback API generator
      const secureCloudUrl = preFetchedUrl ? preFetchedUrl : await getMondayFileUrl(contextAssetId);
      dynamicIframe.src = secureCloudUrl;
    }

    assignedModal.showModal();
  }
});

// Click outside standard modal backdrop listener closing active element window
document.addEventListener('click', (e) => {
  if (e.target.tagName === 'DIALOG' && e.target.hasAttribute('open')) {
    e.target.close();
  }
});

init();