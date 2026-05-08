const monday = window.mondaySdk();

const context = await monday.get('context');
console.log(context.data);