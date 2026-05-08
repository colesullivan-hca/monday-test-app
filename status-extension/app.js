const monday = window.mondaySdk();

monday.get('context').then(res => {
    console.log(res.data);
});