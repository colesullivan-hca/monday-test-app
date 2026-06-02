const MODAL_TABS = {
    // Board 1: form view, documents, updates
    [CONFIG.board1.id]: [
        { id: 'form', label: 'Form', icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>' },
        { id: 'docs', label: 'Documents', icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>' },
        { id: 'updates', label: 'Updates', icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"/></svg>' },
    ],
    // Board 2: form view, documents, updates
    // Extend or simplify tabs here as needed for board 2
    [CONFIG.board2.id]: [
        { id: 'form', label: 'Form', icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>' },
        { id: 'docs', label: 'Documents', icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>' },
        { id: 'updates', label: 'Updates', icon: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"/></svg>' },
    ],
};

let activeModalTab = 'form';

// ── Tab rendering ─────────────────────────────────────────────

function renderModalTabs(item) {
    const tabs = MODAL_TABS[item.boardId] || MODAL_TABS[CONFIG.board1.id];
    const tabBar = document.getElementById('modal-tabs');
    const body = document.getElementById('modal-body');

    // Build tab buttons
    tabBar.innerHTML = tabs.map(t => `
    <button
      class="modal-tab ${t.id === activeModalTab ? 'active' : ''}"
      data-tab="${t.id}"
      onclick="switchModalTab('${t.id}')"
    >
      ${t.icon} ${t.label}
    </button>
  `).join('');

    // Build panels (all rendered, CSS hides inactive ones)
    body.innerHTML = tabs.map(t => `
    <div class="modal-panel ${t.id === activeModalTab ? 'active' : ''}" id="panel-${t.id}"></div>
  `).join('');

    // Render the initially active tab immediately, lazy-load others on click
    renderTabPanel(activeModalTab, item);
}

function switchModalTab(tabId) {
    if (tabId === activeModalTab) return;
    activeModalTab = tabId;

    document.querySelectorAll('.modal-tab').forEach(b =>
        b.classList.toggle('active', b.dataset.tab === tabId)
    );
    document.querySelectorAll('.modal-panel').forEach(p =>
        p.classList.toggle('active', p.id === `panel-${tabId}`)
    );

    // Lazy-render panel content on first visit
    const panel = document.getElementById(`panel-${tabId}`);
    if (panel && !panel.dataset.rendered) {
        renderTabPanel(tabId, activeItem);
    }
}

function renderTabPanel(tabId, item) {
    const panel = document.getElementById(`panel-${tabId}`);
    if (!panel) return;
    panel.dataset.rendered = '1';

    if (tabId === 'form') {
        renderFormPanel(panel, item);
    } else if (tabId === 'docs') {
        renderDocsPanel(panel, item);
    } else if (tabId === 'updates') {
        renderUpdatesPanel(panel, item);
    }
}

// ── Form panel ───────────────────────────────────────────────

function renderFormPanel(panel, item) {
    const isBoard1 = String(item.boardId) === String(CONFIG.board1.id);

    if (isBoard1) {
        renderBoard1Form(panel, item);
    } else {
        renderBoard2Form(panel, item);
    }
}

function renderBoard1Form(panel, item) {
    // Build a column value lookup map for convenience
    const col = (id) => {
        const c = item.columnValues?.find(c => c.id === id);
        return c?.text || '';
    };

    // Mirror your index.html table structure, populated from column values
    panel.innerHTML = `
    <div class="form-panel-wrap">
      <div class="form-container">
        <h1>HCA OUT of STATE TRAVEL REQUEST FORM</h1>
        <table>
          <tr>
            <td class="label">DIVISION:</td>
            <td>${escHtml(col('color_mm2vy7r8'))}</td>
            <td class="label">DATE:</td>
            <td>${escHtml(col('date_mm2yy6cp'))}</td>
          </tr>
        </table>
 
        <table>
          <tr><td colspan="4" class="section-title">Section 1. TRAVELER INFORMATION</td></tr>
          <tr>
            <td class="label">TRAVELER:</td>
            <td>${escHtml(col('text_mm2vn25f'))}</td>
            <td class="label">SHARE ID:</td>
            <td>${escHtml(col('text_mm2vh585'))}</td>
          </tr>
          <tr>
            <td class="label">POSITION/TITLE:</td>
            <td colspan="3">${escHtml(col('text_mm2vc3h'))}</td>
          </tr>
        </table>
 
        <table>
          <tr><td colspan="4" class="section-title">Section 2. TRIP INFORMATION</td></tr>
          <tr>
            <td class="label">DESTINATION:</td>
            <td>${escHtml(col('text_mm2vk860'))}</td>
            <td class="label">NAME OF CONFERENCE:</td>
            <td>${escHtml(col('text_mm2vj6tf'))}</td>
          </tr>
          <tr>
            <td class="label">DEPARTURE DATE:</td>
            <td>${escHtml(col('date_mm2vze0a'))}</td>
            <td class="label">RETURN DATE:</td>
            <td>${escHtml(col('date_mm2vnvrc'))}</td>
          </tr>
        </table>
 
        <table>
          <tr><td colspan="4" class="section-title">Section 3. COST INFORMATION</td></tr>
          <tr><th>ITEM</th><th>AMOUNT</th><th>ACCT CODE</th><th>REIMBURSEMENT PO AMOUNTS</th></tr>
          ${costRow('1. AIRLINE or OTHER FARES', col('numeric_mm2vt4x6'), '549700', col('numeric_mm2vx6wy'))}
          ${costRow('2. MILEAGE', col('numeric_mm2v1d3j'), '549700', col('numeric_mm2vqaak'))}
          ${costRow('3. MISC. TRANSPORTATION', col('numeric_mm2vsqsd'), '549700', col('numeric_mm2vr1m5'))}
          ${costRow('4. OTHER MILEAGE / FEES', col('numeric_mm2v651g'), '549700', col('numeric_mm2vcjps'))}
          ${costRow('\u00a0\u00a0\u00a0\u00a0AIRPORT PARKING', col('numeric_mm2v3q9x'), '549700', col('numeric_mm2vjmz'))}
          ${costRow('\u00a0\u00a0\u00a0\u00a0CAR RENTAL', col('numeric_mm2vs9mf'), '549700', col('numeric_mm2vm1be'))}
          <tr>
            <td>5. TOTAL LINES 1 through 4</td>
            <td class="right">${formatCurrency(sumCols(item, ['numeric_mm2vt4x6', 'numeric_mm2v1d3j', 'numeric_mm2vsqsd', 'numeric_mm2v651g', 'numeric_mm2v3q9x', 'numeric_mm2vs9mf']))}</td>
            <td></td>
            <td class="right">${formatCurrency(sumCols(item, ['numeric_mm2vx6wy', 'numeric_mm2vqaak', 'numeric_mm2vr1m5', 'numeric_mm2vcjps', 'numeric_mm2vjmz', 'numeric_mm2vm1be']))}</td>
          </tr>
          ${costRow('6. PER DIEM FINAL DAY', col('numeric_mm2vsfjf'), '549600', col('numeric_mm2vnekg'))}
          ${costRow('7. MEALS', col('numeric_mm2vg56f'), '549600', col('numeric_mm2vrj5n'))}
          ${costRow('8. LODGING', col('numeric_mm2vt4ft'), '549600', col('numeric_mm2vwf01'))}
          <tr>
            <td>9. TOTAL LINES 6 through 8</td>
            <td class="right">${formatCurrency(sumCols(item, ['numeric_mm2vsfjf', 'numeric_mm2vg56f', 'numeric_mm2vt4ft']))}</td>
            <td></td>
            <td class="right">${formatCurrency(sumCols(item, ['numeric_mm2vnekg', 'numeric_mm2vrj5n', 'numeric_mm2vwf01']))}</td>
          </tr>
          ${costRow('10. CONFERENCE FEES or DUES', col('numeric_mm2v4vtt'), '546800', col('numeric_mm2v1ef6'))}
          ${costRow('11. OTHER EXPENSES', col('numeric_mm2vncda'), '547900', col('numeric_mm2vd6bx'))}
          <tr>
            <td><strong>TOTAL</strong></td>
            <td class="right"><strong>${formatCurrency(sumCols(item, [
        'numeric_mm2vt4x6', 'numeric_mm2v1d3j', 'numeric_mm2vsqsd', 'numeric_mm2v651g',
        'numeric_mm2v3q9x', 'numeric_mm2vs9mf', 'numeric_mm2vsfjf', 'numeric_mm2vg56f',
        'numeric_mm2vt4ft', 'numeric_mm2v4vtt', 'numeric_mm2vncda'
    ]))}</strong></td>
            <td></td>
            <td class="right"><strong>${formatCurrency(sumCols(item, [
        'numeric_mm2vx6wy', 'numeric_mm2vqaak', 'numeric_mm2vr1m5', 'numeric_mm2vcjps',
        'numeric_mm2vjmz', 'numeric_mm2vm1be', 'numeric_mm2vnekg', 'numeric_mm2vrj5n',
        'numeric_mm2vwf01', 'numeric_mm2v1ef6', 'numeric_mm2vd6bx'
    ]))}</strong></td>
          </tr>
        </table>
 
        <table>
          <tr><td class="section-title">Section 4. JUSTIFICATION</td></tr>
          <tr><td style="white-space:pre-wrap;font-size:13px;padding:10px 8px;">${escHtml(col('long_text_mm2vd845'))}</td></tr>
        </table>
      </div>
    </div>
  `;
}

function costRow(label, amount, acct, po) {
    return `
    <tr>
      <td>${label}</td>
      <td class="right">${amount ? formatCurrency(parseFloat(amount)) : ''}</td>
      <td class="center">${acct}</td>
      <td class="right">${po ? formatCurrency(parseFloat(po)) : ''}</td>
    </tr>
  `;
}

function sumCols(item, colIds) {
    return colIds.reduce((sum, id) => {
        const c = item.columnValues?.find(c => c.id === id);
        return sum + (parseFloat(c?.text) || 0);
    }, 0);
}

function formatCurrency(n) {
    if (!n && n !== 0) return '';
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ── Board 2 form stub ─────────────────────────────────────────
// Replace this with your actual board 2 column IDs and layout

function renderBoard2Form(panel, item) {
    const col = (id) => item.columnValues?.find(c => c.id === id)?.text || '';

    panel.innerHTML = `
    <div class="form-panel-wrap">
      <div class="form-container">
        <h1>Board 2 Form</h1>
        <table>
          <tr><td colspan="2" class="section-title">Section 1. INFORMATION</td></tr>
          <!-- Add your board 2 rows here using col('your_column_id') -->
          <tr>
            <td class="label">FIELD 1:</td>
            <td>${escHtml(col('your_col_id_here'))}</td>
          </tr>
        </table>
        <p style="padding:12px;font-size:13px;color:#676879;">
          ↑ Replace with your board 2 column IDs and table structure.
        </p>
      </div>
    </div>
  `;
}

// ── Documents panel ───────────────────────────────────────────

async function renderDocsPanel(panel, item) {
    panel.innerHTML = `<div class="tab-loading"><div class="spinner-ring"></div> Loading files…</div>`;

    const filesColId = String(item.boardId) === String(CONFIG.board1.id)
        ? CONFIG.board1FilesColumnId
        : CONFIG.board2FilesColumnId;

    try {
        const res = await monday.api(`
      query ($itemId: ID!, $colId: String!) {
        items(ids: [$itemId]) {
          assets(column_ids: [$colId]) {
            id
            name
            file_size
            file_extension
            public_url
            created_at
          }
        }
      }
    `, { variables: { itemId: String(item.id), colId: filesColId } });

        const assets = res?.data?.items?.[0]?.assets || [];

        if (!assets.length) {
            panel.innerHTML = `
        <div class="docs-panel">
          <div class="docs-empty">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
            <p>No documents attached to this item.</p>
          </div>
        </div>
      `;
            return;
        }

        panel.innerHTML = `
      <div class="docs-panel">
        <div class="docs-grid">
          ${assets.map(a => docCard(a)).join('')}
        </div>
      </div>
    `;
    } catch (err) {
        panel.innerHTML = `<div class="docs-panel"><div class="docs-empty"><p>Failed to load files: ${escHtml(err.message)}</p></div></div>`;
    }
}

function docCard(asset) {
    const ext = (asset.file_extension || '').toUpperCase();
    const size = formatFileSize(asset.file_size);
    const emoji = fileEmoji(ext);
    const date = asset.created_at ? new Date(asset.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    return `
    <div class="doc-card">
      <div class="doc-card-icon">${emoji}</div>
      <div class="doc-card-name">${escHtml(asset.name)}</div>
      <div class="doc-card-meta">${ext}${size ? ' · ' + size : ''}${date ? ' · ' + date : ''}</div>
      <a class="doc-card-open" href="${escHtml(asset.public_url)}" target="_blank" rel="noopener">
        Open
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/></svg>
      </a>
    </div>
  `;
}

function fileEmoji(ext) {
    const map = { PDF: '📄', DOC: '📝', DOCX: '📝', XLS: '📊', XLSX: '📊', PNG: '🖼️', JPG: '🖼️', JPEG: '🖼️', GIF: '🖼️', ZIP: '📦', CSV: '📊' };
    return map[ext] || '📎';
}

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Updates panel ─────────────────────────────────────────────

async function renderUpdatesPanel(panel, item) {
    panel.innerHTML = `<div class="tab-loading"><div class="spinner-ring"></div> Loading updates…</div>`;

    try {
        const res = await monday.api(`
      query ($itemId: ID!) {
        items(ids: [$itemId]) {
          updates(limit: 25) {
            id
            body
            created_at
            creator { id name }
          }
        }
      }
    `, { variables: { itemId: String(item.id) } });

        const updates = res?.data?.items?.[0]?.updates || [];

        if (!updates.length) {
            panel.innerHTML = `
        <div class="updates-panel">
          <div class="updates-empty">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clip-rule="evenodd"/></svg>
            <p>No updates on this item yet.</p>
          </div>
        </div>
      `;
            return;
        }

        panel.innerHTML = `
      <div class="updates-panel">
        ${updates.map(u => updateCard(u)).join('')}
      </div>
    `;
    } catch (err) {
        panel.innerHTML = `<div class="updates-panel"><div class="updates-empty"><p>Failed to load updates: ${escHtml(err.message)}</p></div></div>`;
    }
}

function updateCard(update) {
    const name = update.creator?.name || 'Unknown';
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const date = update.created_at
        ? new Date(update.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : '';
    // Strip basic HTML tags from monday update body for plain text display
    const body = (update.body || '').replace(/<[^>]+>/g, '').trim();

    return `
    <div class="update-card">
      <div class="update-card-header">
        <div class="update-avatar">${escHtml(initials)}</div>
        <span class="update-author">${escHtml(name)}</span>
        <span class="update-date">${date}</span>
      </div>
      <div class="update-body">${escHtml(body)}</div>
    </div>
  `;
}
