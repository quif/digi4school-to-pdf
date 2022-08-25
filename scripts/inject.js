//@ts-check

(() => {
  /**
   * Sends a GET-Request using the XHR-Api
   * @param {string} url
   * @returns {Promise<any>}
   */
  function xhrGet(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== XMLHttpRequest.DONE) {
          return;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
        }

        if (xhr.status >= 300) {
          reject(xhr.statusText);
        }
      };

      xhr.open('GET', url);
      xhr.send();
    });
  }

  /**
   * @param {string} baseUrl
   * @param {number} page
   * @returns {Promise<string>}
   */
  async function getPageUrl(baseUrl, page) {
    return xhrGet(`${baseUrl}${page}/${page}.svg`)
      .then(() => `${baseUrl}${page}/${page}`)
      .catch(() => xhrGet(`${baseUrl}${page}.svg`))
      .then(() => `${baseUrl}${page}`);
  }

  /**
   * Used to parse images in svgs to pure data uris
   * @param {string} url
   * @returns {Promise<{ uri: string; url: string }>}
   */
  function toDataUri(url) {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'blob';

      xhr.onload = function () {
        const reader = new FileReader();

        reader.onloadend = () => {
          resolve({
            uri: typeof reader.result === 'string' ? reader.result : '',
            url
          });
        };

        reader.readAsDataURL(xhr.response);
      };

      xhr.open('GET', url);
      xhr.send();
    });
  }

  /**
   *
   * @param {{
   *  title: string;
   *  scale: number;
   *  fromPage: number;
   *  toPage: number;
   *  savemethod: 'png' | 'vector';
   *  pageCount: number;
   * }} options
   */
  async function generatePdf(options) {
    const http = new XMLHttpRequest();
    const url = new URL(window.location);
    const baseUrl = (url.origin + url.pathname).replace(/\/[^\/]+?$/, '/');

    const svgContainer = document.evaluate(
      '//*[@id="jpedal"]/div[2]/object',
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    const width = Number(svgContainer.width);
    const height = Number(svgContainer.height);

    const pdfDoc = new PDFDocument({
      autoFirstPage: false,
      size: [width * options.scale, height * options.scale],
      margin: 0
    });

    const chunks = [];
    pdfDoc.pipe({
      write: (chunk) => chunks.push(chunk),
      end: () => {
        const pdfBlob = new Blob(chunks, {
          type: 'application/octet-stream'
        });
        const blobUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${options.title}.pdf`;
        a.click();
        URL.revokeObjectURL(blobUrl);
      },
      on: () => {},
      once: () => {},
      emit: () => {}
    });

    const conversionProgress = {
      title: document.title,
      fromPage: options.fromPage,
      toPage: options.toPage,
      curPage: options.fromPage - 1,
      pageCount: options.pageCount,
      timestampStart: Date.now()
    };

    browser.runtime.sendMessage({
      type: 'start_converting',
      conversionProgress
    });

    let canceled = false;
    browser.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'cancel_convert') {
        canceled = true;
      }
    });

    window.onbeforeunload = () => {
      browser.runtime.sendMessage({ type: 'stop_converting' });
      pdfDoc.end();
    };

    for (let i = options.fromPage; i <= options.toPage; i++) {
      if (canceled) {
        break;
      }

      try {
        await downloadSvg(i);
      } catch (error) {
        if (error.cancel) canceled = true;
        if (error.msg) alert(error.msg);
        else console.error(error);
      }

      conversionProgress.curPage = i;
      browser.runtime.sendMessage({
        type: 'update_progress',
        conversionProgress
      });
    }

    pdfDoc.end();

    browser.runtime.sendMessage({ type: 'stop_converting' });

    window.onbeforeunload = () => {};

    /**
     * @param {number} page
     * @returns {Promise<any>}
     */
    function downloadSvg(page) {
      return new Promise((resolve, reject) => {
        getPageUrl(baseUrl, page).then((pageUrl) => {
          if (pageUrl === '') {
            reject({
              msg: 'Die Seite ' + page + ' wurde nicht gefunden. Es kann sein, dass die URL anders ist, als erwartet.'
            });
          }

          http.onreadystatechange = () => {
            if (http.readyState !== XMLHttpRequest.DONE) {
              return;
            }

            const parser = new DOMParser();

            let updatedResponse = http.responseText;
            const xmlDocument = parser.parseFromString(updatedResponse, 'text/xml');

            /** @type {Promise<{ uri: string; url: string }>[]} */
            const uriImagePromises = [];

            for (const c of xmlDocument.children[0].children) {
              if (c.localName === 'image') {
                const href = c.attributes['xlink:href'].textContent;
                uriImagePromises.push(toDataUri(`${baseUrl}${page}/${href}`));
              }
            }

            Promise.all(uriImagePromises).then((uris) => {
              for (const { uri, url } of uris) {
                // substring in order to get the original path from the svg
                updatedResponse = updatedResponse.replace(url.substring(`${baseUrl}${page}/`.length), uri);
              }

              const xml_doc = parser.parseFromString(updatedResponse, 'text/xml');
              const svgHtml = xml_doc.documentElement.outerHTML;

              pdfDoc.addPage();

              let addPage = addPageAsVector;
              if (options.savemethod === 'png') {
                addPage = addPageAsPng;
              }

              addPage(pdfDoc, svgHtml)
                .then(() => resolve(page))
                .catch((error) => reject({ cancel: true, msg: error.msg, error }));
            });
          };

          http.open('GET', `${pageUrl}.svg`);
          http.send();
        });
      });

      /**
       * @param {PDFDocument} doc
       * @param {string} svg
       * @returns {Promise<void>}
       */
      function addPageAsVector(doc, svg) {
        return new Promise((resolve, reject) => {
          try {
            SVGtoPDF(doc, svg, 0, 0, { assumePt: true });
            resolve();
          } catch {
            reject({
              msg:
                'Anscheinend funktioniert die Speichermethode "Vektor" bei diesem Buch ' +
                'nicht, bitte versuche es erneut und wähle eine andere aus.'
            });
          }
        });
      }

      /**
       * @param {PDFDocument} doc
       * @param {string} svg
       * @returns {Promise<void>}
       */
      function addPageAsPng(doc, svg) {
        return new Promise((resolve, reject) => {
          const template = document.createElement('div');
          template.innerHTML = svg;

          const svgElement = template.childNodes[0];
          svgElement.style.background_color = 'white';

          svgAsPngUri(svgElement, { scale: options.scale }, (uri) => {
            // reject "data:," uris, as an error occurred while converting!
            if (uri === 'data:,') {
              reject({
                msg:
                  'Anscheinend funktioniert die Speichermethode "PNG" bei diesem Buch ' +
                  'nicht, bitte versuche es erneut und wähle eine andere aus.'
              });
              return;
            }

            doc.image(uri, 0, 0);

            resolve();
          });
        });
      }
    }
  }

  /**
   * @param {string} modalId
   */
  function runInject(modalId) {
    /** @type {HTMLDivElement} */
    const modal = document.querySelector(`div#${modalId}`);

    M.Modal.init(document.querySelectorAll('.modal'));
    M.FormSelect.init(document.querySelectorAll('select#save-method-select'));

    instance_modal = M.Modal.getInstance(modal);
    instance_modal.open();

    /** @type {HTMLParagraphElement} */
    const vectorInfo = document.querySelector('p#vector-info');

    /** @type {HTMLDivElement} */
    const pngInfo = document.querySelector('div#png-info');

    /** @type {HTMLSelectElement} */
    const saveMethodSelect = document.querySelector('select#save-method-select');
    saveMethodSelect.onchange = () => {
      if (saveMethodSelect.value === 'png') {
        pngInfo.style.display = 'initial';
        vectorInfo.style.display = 'none';
      } else {
        vectorInfo.style.display = 'initial';
        pngInfo.style.display = 'none';
      }
    };

    /** @type {HTMLSpanElement} */
    const scaleLabel = document.querySelector('span#scale-display');

    /** @type {HTMLInputElement} */
    const scaleInput = document.querySelector('input#scale');

    scaleInput.oninput = () => (scaleLabel.innerText = (Number(scaleInput.value) * 0.25).toString());

    /** @type {HTMLButtonElement} */
    const convertButton = document.querySelector('button#button-convert');

    /** @type {HTMLInputElement} */
    const fromPageInput = document.querySelector('input#from-page');

    /** @type {HTMLInputElement} */
    const toPageInput = document.querySelector('input#to-page');

    /** @type {HTMLSpanElement} */
    const pageErrorElement = document.querySelector('span#page-error');

    const pageCount = document.getElementById('goBtn')?.childElementCount ?? 0;

    fromPageInput.max = pageCount;
    toPageInput.max = pageCount;

    function checkPageRangeInputError() {
      const fromPage = Number(fromPageInput.value);
      const toPage = Number(toPageInput.value);

      if (
        !/^\d*$/.test(fromPageInput.value) ||
        !/^\d*$/.test(toPageInput.value) ||
        (toPage >= 1 && fromPage > toPage) ||
        fromPage > pageCount ||
        toPage > pageCount
      ) {
        pageErrorElement.style.display = 'initial';
        convertButton.classList.add('disabled');
      } else {
        pageErrorElement.style.display = 'none';
        convertButton.classList.remove('disabled');
      }
    }

    fromPageInput.oninput = checkPageRangeInputError;
    toPageInput.oninput = checkPageRangeInputError;

    function removeCustomCss() {
      instance_modal.close();
      browser.runtime.sendMessage({ type: 'remove-modal' });
    }

    convertButton.onclick = () => {
      generatePdf({
        title: document.title,
        savemethod: saveMethodSelect.value === 'png' ? 'png' : 'vector',
        scale: saveMethodSelect.value === 'png' ? Number(scaleInput.value) * 0.25 : 1,
        fromPage: fromPageInput.value.length > 0 ? Number(fromPageInput.value) : 1,
        toPage: toPageInput.value.length > 0 ? Number(toPageInput.value) : pageCount,
        pageCount
      });

      removeCustomCss();
    };

    document.getElementById('button-close').onclick = removeCustomCss;
  }

  function onMessage(message) {
    if (message.type === 'run-inject' && typeof message.modalId === 'string') {
      runInject(message.modalId);
    }
  }

  if (!browser.runtime.onMessage.hasListener(onMessage)) {
    browser.runtime.onMessage.addListener(onMessage);
  }
})();
