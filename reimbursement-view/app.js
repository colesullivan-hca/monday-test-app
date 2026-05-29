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
  tip: "numeric_mm327arh",         // Subitem column ID for Tip
  files: "file_mm33209m"   // Subitem column ID for Receipts (File Column)
};

async function init() {
  try {
    const context = await monday.get('context');
    currentItemId = context?.data?.itemId;
    currentBoardId = context?.data?.boardId;

    if (!currentItemId || !currentBoardId) {
      throw new Error('Please open this app inside a monday item view.');
    }

    // Fully updated GraphQL query supporting all FileValue polymorphic types
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
                  name
                  url
                }
                ... on FileLinkValue {
                  file_id
                  name
                  url
                }
                ... on FileAssetInvalidValue {
                  asset_id
                  name
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

    // Status / Read-only state check lock based on parent status
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

    // 2. Process and dynamic render the Transportation subitems
    renderTransportationSubitems(item.subitems || []);

  } catch (err) {
    console.error('Initialization Error:', err);
  }
}

/**
 * Sweeps away placeholder transport elements and generates clean semantic markup rows
 */
function renderTransportationSubitems(subitems) {
  const transportTable = document.querySelector('.transport').closest('table');
  const noTransportWarning = document.querySelector('style[style*="display: none"], .label[style*="rgb(121, 0, 0)"]');

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
 * Builds actionable button items capable of identifying file versus link structures
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
    if (file.error) return; // Skip invalid file structures safely

    const wrapper = document.createElement('div');
    wrapper.className = 'file-entry-wrapper';
    wrapper.style.display = 'inline-block';
    wrapper.style.marginLeft = '8px';

    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.title = `View File: ${file.name || 'Receipt'}`;
    actionButton.textContent = `📄 Receipt ${index + 1}`;

    // Determine strategy: Direct Links/Docs vs Uploaded Binary Assets
    if (file.url) {
      // For FileLinkValue or FileDocValue: Open directly or tag URL onto the button
      actionButton.className = 'open-link-direct';
      actionButton.setAttribute('data-url', file.url);
    } else if (file.asset_id) {
      // For FileAssetValue: Prepare local modal architecture
      actionButton.className = 'open-modal';
      actionButton.setAttribute('data-asset-id', file.asset_id);
      
      // OPTIMIZATION: Cache URL returned instantly from initial load if present
      if (file.asset?.public_url) {
        actionButton.setAttribute('data-pre-url', file.asset.public_url);
      }

      const dialogElement = document.createElement('dialog');
      dialogElement.className = 'preview-modal';
      
      const iframeElement = document.createElement('iframe');
      iframeElement.className = 'modal-content';
      iframeElement.frameBorder = '0';
      iframeElement.src = ''; // Lazy load on element execution click

      dialogElement.appendChild(iframeElement);
      wrapper.appendChild(dialogElement);
    }

    wrapper.insertBefore(actionButton, wrapper.firstChild);
    containerElement.appendChild(wrapper);
  });
}

/**
 * Fallback async request to fetch fresh 1-hour secure tokens if the initial one expired
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
    Global Modal & Redirection Delegation Triggers
   ========================================================================== */

document.addEventListener('click', async (e) => {
  // 1. Handle External Links and Docs safely in a new tab
  const linkTargetBtn = e.target.closest('.open-link-direct');
  if (linkTargetBtn) {
    const directUrl = linkTargetBtn.getAttribute('data-url');
    if (directUrl) window.open(directUrl, '_blank');
    return;
  }

  // 2. Handle Asset Previews with intelligent token reuse
  const openTargetBtn = e.target.closest('.open-modal');
  if (openTargetBtn) {
    const parentContainer = openTargetBtn.closest('.file-entry-wrapper');
    const assignedModal = parentContainer.querySelector('.preview-modal');
    const dynamicIframe = assignedModal.querySelector('.modal-content');
    const contextAssetId = openTargetBtn.getAttribute('data-asset-id');
    const preFetchedUrl = openTargetBtn.getAttribute('data-pre-url');

    if (contextAssetId && !dynamicIframe.src) {
      dynamicIframe.src = 'about:blank';
      // Use pre-fetched URL if available, fallback to active API call if expired or blank
      const secureCloudUrl = preFetchedUrl ? preFetchedUrl : await getMondayFileUrl(contextAssetId);
      dynamicIframe.src = secureCloudUrl;
    }

    assignedModal.showModal();
  }
});

document.addEventListener('click', (e) => {
  if (e.target.tagName === 'DIALOG' && e.target.hasAttribute('open')) {
    e.target.close();
  }
});

init();