// Initialize the SDK
const monday = mondaySdk();

/**
 * Main function to orchestrate data fetching
 */
async function init() {
    try {
        updateStatus("Fetching context...");
        const context = await monday.get("context");

        console.log(JSON.stringify(context.data, null, 5));
        updateStatus(context.data.boardId);

    } catch (err) {
        console.error("App Error:", err);
        updateStatus("Failed to load data.");
    }
}

/**
 * Executes the GraphQL query
 */
async function fetchItemFromAPI(itemId) {
    const query = `query {
        items (ids: [${itemId}]) {
            name
            column_values {
                column { title }
                text
            }
        }
    }`;

    const response = await monday.api(query);
    return response.data.items[0];
}

/**
 * Updates the UI with the data
 */
function renderItem(item) {
    document.getElementById('item-name').innerText = item.name;
    const container = document.getElementById('column-container');
    container.innerHTML = ""; // Clear status message

    item.column_values.forEach(cv => {
        const row = document.createElement('div');
        row.className = 'column-row';
        row.innerHTML = `
            <span class="column-name">${cv.column.title}</span>
            <span class="column-value">${cv.text || '-'}</span>
        `;
        container.appendChild(row);
    });
}

function updateStatus(text) {
    const container = document.getElementById('column-container');
    container.innerHTML = `<p class="status-message">${text}</p>`;
}

// Start the app
init();