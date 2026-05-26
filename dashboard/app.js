const monday = window.mondaySdk();

async function init() {
  try {
    const context = await monday.get('context');
    currentItemId = context?.data?.itemId;
    currentBoardId = context?.data?.boardId;

    console.log(context.data);

    if (!currentItemId || !currentBoardId) {
      throw new Error('Please open this in a monday object.');
    }

  } catch (err) {
    console.error('Init error:', err);
  }
}

init();