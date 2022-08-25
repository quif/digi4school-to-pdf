/** @type {HTMLAnchorElement} */
const convertBtn = document.getElementById('convert-btn');

/** @type {HTMLDivElement} */
const progress = document.getElementById('progress');

/** @type {HTMLDivElement} */
const progressBar = document.getElementById('progress-bar');

let tabid;

progress.style.display = 'none';

// check if current page is a valid book page
const disable_popup = () => {
  document.getElementById('cur-book').innerText = 'Buch nicht geöffnet';
  convertBtn.classList.add('disabled');
};

browser.tabs
  .query({ currentWindow: true, active: true })
  .then((tabs) => {
    if (!tabs[0].url.match(/https:\/\/.*\/ebook\/.*/)) disable_popup();
    else return browser.tabs.sendMessage((tabid = tabs[0].id), { type: 'valid' });
  })
  .then((response) => {
    if (response && response.injected) document.getElementById('cur-book').innerText = response.title;
    else disable_popup();
  })
  .catch((e) => {
    console.error(e);
    disable_popup();
  });

convertBtn.onclick = () => {
  console.log('Button was clicked', browser.tabs);

  Promise.all([
    browser.tabs.insertCSS({ file: '/libraries/materialize/materialize.min.css' }),
    browser.tabs.executeScript({ file: '/libraries/pdfkit.standalone.min.js' }),
    browser.tabs.executeScript({ file: '/libraries/svg-to-pdfkit.min.js' }),
    browser.tabs.executeScript({ file: '/libraries/saveSvgAsPng.js' }),
    browser.tabs.executeScript({ file: '/libraries/materialize/materialize.min.js' })
  ])
    .then(() => browser.tabs.executeScript({ file: '/scripts/inject.js' }))
    .then(() => {
      browser.runtime.sendMessage({ type: 'update_tabid', tabid });
      console.log('inserted all scripts');
      window.close();
    });
};

const uiCurrentPage = document.getElementById('cur-page');
const uiNumPages = document.getElementById('num-pages');
const uiTimer = document.getElementById('timer');

browser.runtime.sendMessage({ type: 'is_converting' }).then((msg) => {
  console.log(msg);
  if (msg.converting) {
    document.getElementById('cur-book-text').style.display = 'none';
    document.getElementById('converting-text').style.display = null;
    document.getElementById('convert-details').style.display = null;
    progress.style.display = null;
    convertBtn.innerText = 'Abbrechen';

    setInterval(() => {
      browser.runtime.sendMessage({ type: 'get_progress' }).then((msg) => {
        let { cur_page, from_page, to_page, time_begin } = msg.convert_progress;
        document.getElementById('cur-converting').innerText = msg.convert_progress.title;

        uiCurrentPage.innerText = cur_page - from_page + 1;
        uiNumPages.innerText = to_page - from_page + 1;
        if (typeof time_begin !== Date) time_begin = Date.parse(time_begin);
        let time = Math.round((new Date() - time_begin) / 1000);
        console.log(time);
        let remaining_time = Math.round((time / (cur_page - from_page + 1)) * (to_page - cur_page));
        let hours = Math.floor(remaining_time / 3600);
        remaining_time -= hours * 3600;
        let minutes = Math.floor(remaining_time / 60);
        let seconds = remaining_time % 60;
        if (Number.isFinite(hours)) uiTimer.innerText = `${hours}h ${minutes}m ${seconds}s`;
        else uiTimer.innerText = `Nicht berechenbar`;
        progressBar.style.width = (100 * (cur_page - from_page + 1)) / (to_page - from_page) + '%';
        console.log(progressBar.style.width, msg.convert_progress);
      });
    }, 250);

    convertBtn.onclick = () => {
      browser.tabs.sendMessage(msg.converting_tab, { type: 'cancel_convert' }).then(window.close);
    };
  } else {
    document.getElementById('cur-book-text').style.display = null;
    document.getElementById('converting-text').style.display = 'none';
    progress.style.display = 'none';
    convertBtn.innerText = 'Konvertieren';
  }
});
