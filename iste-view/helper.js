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

// diable scrolling on numbers
document.addEventListener("wheel", function (event) {
    if (document.activeElement.type === "number") {
        document.activeElement.blur();
    }
});