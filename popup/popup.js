/** @type {HTMLAnchorElement} */
const convertBtn = document.getElementById('convert-btn');

/** @type {HTMLDivElement} */
const progress = document.getElementById('progress');

/** @type {HTMLDivElement} */
const progressBar = document.getElementById('progress-bar');

let tabid;

progress.style.display = 'none';

function disablePopup() {
  document.getElementById('cur-book').innerText = 'Buch nicht geöffnet';
  convertBtn.classList.add('disabled');
}

browser.tabs
  .query({ currentWindow: true, active: true })
  .then((tabs) => {
    if (/https:\/\/.*\/ebook\/.*/.test(tabs[0].url)) {
      return browser.tabs.sendMessage((tabid = tabs[0].id), { type: 'valid' });
    }

    disablePopup();
  })
  .then((response) => {
    if (response?.injected === true) {
      document.getElementById('cur-book').innerText = response.title;
    } else {
      disablePopup();
    }
  })
  .catch((e) => {
    console.error(e);
    disablePopup();
  });

convertBtn.onclick = () => {
  browser.tabs.sendMessage(tabid, { type: 'show-modal' }).then((result) => {
    browser.tabs.sendMessage(tabid, { type: 'run-inject', modalId: result.modalId }).then(() => {
      browser.runtime.sendMessage({ type: 'update-tab-id', tabid });
      window.close();
    });
  });
};

const uiCurrentPage = document.getElementById('cur-page');
const uiNumPages = document.getElementById('num-pages');
const uiTimer = document.getElementById('timer');

function updateProgressBar() {
  browser.runtime.sendMessage({ type: 'get-progress' }).then((msg) => {
    const { curPage, fromPage, toPage, timestampStart } = msg.conversionProgress;
    document.getElementById('cur-converting').innerText = msg.conversionProgress.title;

    const pageCount = toPage - fromPage + 1;
    const currentPage = curPage - fromPage + 1;
    const remainingPages = toPage - curPage + 1;

    uiCurrentPage.innerText = currentPage;
    uiNumPages.innerText = pageCount;

    const timeInS = (Date.now() - timestampStart) / 1000;
    const timePerPage = timeInS / currentPage;

    let remainingTime = Math.round(timePerPage * remainingPages);
    const hours = Math.floor(remainingTime / 3600);
    remainingTime -= hours * 3600;
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;

    if (Number.isFinite(hours)) {
      uiTimer.innerText = `${hours}h ${minutes}m ${seconds}s`;
    } else {
      uiTimer.innerText = `Nicht berechenbar`;
    }

    progressBar.style.width = (100 * currentPage) / pageCount + '%';
  });
}

function onIsConverting(msg) {
  document.getElementById('cur-book-text').style.display = 'none';
  document.getElementById('converting-text').style.display = null;
  document.getElementById('convert-details').style.display = null;
  progress.style.display = null;
  convertBtn.innerText = 'Abbrechen';

  setInterval(updateProgressBar, 250);

  convertBtn.onclick = () =>
    browser.tabs.sendMessage(msg.converting_tab, { type: 'cancel_convert' }).then(window.close);
}

browser.runtime.sendMessage({ type: 'is-converting' }).then((msg) => {
  console.log(msg);
  if (msg.converting) {
    onIsConverting(msg);
  } else {
    document.getElementById('cur-book-text').style.display = null;
    document.getElementById('converting-text').style.display = 'none';
    progress.style.display = 'none';
    convertBtn.innerText = 'Konvertieren';
  }
});
