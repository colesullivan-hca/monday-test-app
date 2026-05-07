function switchMode(mode) {
    const editorBtn = document.getElementById('editorButton');
    const isteButton = document.getElementById('isteButton');
    if (mode === "iste") {
        isteButton.classList.add('inactive');
        editorBtn.classList.remove('inactive');
    }
    else {
        isteButton.classList.remove('inactive');
        editorBtn.classList.add('inactive');
    }
}