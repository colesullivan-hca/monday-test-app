const monday = window.mondaySdk();

async function init() {
  try {
    const context = await monday.get('context');
    currentBoardId = context?.data?.boardId;

    console.log(context.data);

    if (!currentBoardId) {
      throw new Error('Please open this in a monday object.');
    }

    const query = `query {
        boards(ids: [18412077420]) {
          columns(types: [status]) {
            id
            settings
          }
        }
      }`;
      const res = await monday.api(query);
      console.log(res.data);

  } catch (err) {
    console.error('Init error:', err);
  }
}
init();