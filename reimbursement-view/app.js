const monday = window.mondaySdk();
let currentBoardId = null;
let currentItemId = null;

async function init() {
  try {
    const context = await monday.get('context');
    currentItemId = context?.data?.itemId;
    currentBoardId = context?.data?.boardId;

    if (!currentItemId || !currentBoardId) {
      throw new Error('Please open this in a monday item view.');
    }

    const query = `query {
      items(ids: [${currentItemId}]) {
        column_values {
          id
          text
          type
        }
      }
    }`;

    const res = await monday.api(query);
    const item = res?.data?.items?.[0];

    if (!item) {
      throw new Error('Could not load item data.');
    }

    // Status check: change 'color_mm2xe9t' to your actual Status column ID if needed
    const statusCol = item.column_values.find(c => c.id === 'color_mm2xe9t');
    isLocked = statusCol?.text.includes('Ready');

    document.querySelectorAll('[data-col]').forEach(field => {
      const col = item.column_values.find(c => c.id === field.dataset.col);
      field.value = col?.text || '0';

      // Snapshot original value for dirty tracking
      originalValues[field.dataset.col] = field.value;

      if (isLocked) {
        field.setAttribute('readonly', true);
        field.classList.add('locked-field');
      }
    });
  } catch (err) {
    console.error('Init error:', err);
  }
}

init();