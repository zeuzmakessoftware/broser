const view = document.getElementById('view');
const urlBar = document.getElementById('url-bar');
const backBtn = document.getElementById('back');
const forwardBtn = document.getElementById('forward');
const reloadBtn = document.getElementById('reload');
const goBtn = document.getElementById('go');

function navigate() {
    let url = urlBar.value;
    if (!url) return;

    // Simple protocol check
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
        url = 'https://' + url;
    }

    view.loadURL(url);
}

// Controls
backBtn.addEventListener('click', () => {
    if (view.canGoBack()) {
        view.goBack();
    }
});

forwardBtn.addEventListener('click', () => {
    if (view.canGoForward()) {
        view.goForward();
    }
});

reloadBtn.addEventListener('click', () => {
    view.reload();
});

goBtn.addEventListener('click', navigate);

urlBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        navigate();
    }
});

// WebView Events
view.addEventListener('did-navigate', (e) => {
    urlBar.value = e.url;
});

view.addEventListener('did-navigate-in-page', (e) => {
    urlBar.value = e.url;
});

view.addEventListener('dom-ready', () => {
    // Update buttons state if we wanted to (disable/enable)
    // urlBar.value = view.getURL();
});
