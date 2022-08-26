import SVGtoPDF from 'svg-to-pdfkit';
import PDFDocument from 'pdfkit';
import { addRuntimeListener, sendRuntimeMessage } from './chrome';
import { GenerationOptions } from './models/generationOptions';
import { xhrGetGeneric } from './utils/xhrGet';
import { d4sQuery } from './digi4SchoolDetector';
import { svgAsPngUri } from 'save-svg-as-png';
import { toDataUri } from './utils/toDataUri';
import { getPageUrlFormatter } from './utils/getPageUrlFormatter';
import { ModalUi } from './modal/modalUi';

(() => {
  function addPageAsVector(doc: PDFKit.PDFDocument, svg: string): Promise<void> {
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

  function addPageAsPng(doc: PDFKit.PDFDocument, svg: string, scale: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const template = document.createElement('div');
      template.innerHTML = svg;

      const svgElement = template.childNodes[0] as SVGElement;
      svgElement.style.backgroundColor = 'white';

      svgAsPngUri(svgElement, { scale }, (uri: string) => {
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

  async function getAllImageUrisFromXmlDocument(baseUrl: string, xmlDocument: Document): Promise<{ uri: string; url: string; }[]> {
    const uriImagePromises: Promise<{ uri: string; url: string; }>[] = [];

    for (const c of xmlDocument.children[0].children) {
      if (c.localName === 'image') {
        const href = c.attributes['xlink:href'].textContent;
        uriImagePromises.push(toDataUri(`${baseUrl}${href}`));
      }
    }

    return await Promise.all(uriImagePromises);
  }

  async function parseSvgHtml(baseUrl: string, svgText: string): Promise<string> {
    const parser = new DOMParser();

    let updatedResponse = svgText;
    let xmlDocument = parser.parseFromString(svgText, 'text/xml');

    const uris = await getAllImageUrisFromXmlDocument(baseUrl, xmlDocument);
    for (const { uri, url } of uris) {
      // substring in order to get the original path from the svg
      updatedResponse = updatedResponse.replace(url.substring(baseUrl.length), uri);
    }

    xmlDocument = parser.parseFromString(updatedResponse, 'text/xml');

    return xmlDocument.documentElement.outerHTML;
  }

  async function downloadPageSvg(pageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      xhrGetGeneric(`${pageUrl}.svg`, (xhr) => {
        xhr.onerror = reject;
        xhr.onreadystatechange = async () => {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            resolve(xhr.responseText);
          }
        };
      });
    });
  }

  async function generatePdf(options: GenerationOptions) {
    const url = new URL(window.location.href);
    const baseUrl = (url.origin + url.pathname).replace(/\/[^\/]+?$/, '/');

    const object = document.querySelector<HTMLObjectElement>(d4sQuery);

    const width = Number(object?.width ?? 0);
    const height = Number(object?.height ?? 0);

    const pdfDoc = new PDFDocument({
      autoFirstPage: false,
      size: [width * options.scale, height * options.scale],
      margin: 0
    });

    const chunks: (string | Uint8Array)[] = [];
    pdfDoc.pipe({
      write: function (chunk) {
        chunks.push(chunk);
        return true;
      },
      end: function () {
        const pdfBlob = new Blob(chunks, { type: 'application/octet-stream' });
        const blobUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${options.title}.pdf`;
        a.click();
        URL.revokeObjectURL(blobUrl);

        return this;
      },
      on: function () { return this; },
      once: function () { return this; },
      emit: function () { return true; }
    });

    const conversionProgress = {
      title: document.title,
      fromPage: options.fromPage,
      toPage: options.toPage,
      curPage: options.fromPage - 1,
      pageCount: options.pageCount,
      timestampStart: Date.now()
    };

    sendRuntimeMessage({
      type: 'start-conversion',
      conversionProgress
    });

    let canceled = false;
    addRuntimeListener((msg) => {
      if (msg.type === 'cancel-conversion') {
        canceled = true;
      }
    });

    window.onbeforeunload = () => {
      sendRuntimeMessage({ type: 'stop-conversion' });
      pdfDoc.end();
    };

    let addPageCallback = addPageAsVector;
    if (options.savemethod === 'png') {
      addPageCallback = (doc, svg) => addPageAsPng(doc, svg, options.scale);
    }

    const getPageUrl = await getPageUrlFormatter(baseUrl, options.fromPage);

    for (let page = options.fromPage; page <= options.toPage; page++) {
      if (canceled) {
        break;
      }

      try {
        const svgText = await downloadPageSvg(getPageUrl(page));

        const svgHtml = await parseSvgHtml(`${baseUrl}${page}/`, svgText);

        pdfDoc.addPage();

        await addPageCallback(pdfDoc, svgHtml);
      } catch (error: any) {
        canceled = true;
        if (error.msg) alert(error.msg);
        else console.error(error);
      }

      conversionProgress.curPage = page;
      sendRuntimeMessage({
        type: 'update-progress',
        conversionProgress
      });
    }

    pdfDoc.end();

    sendRuntimeMessage({ type: 'stop-conversion' });

    window.onbeforeunload = () => { };
  }

  function runInject(modalId: string) {
    const ui = ModalUi.create(modalId);

    const pageCount = document.getElementById('goBtn')?.childElementCount ?? 0;

    M.Modal.init(document.querySelectorAll('.modal'));
    M.FormSelect.init(document.querySelectorAll('select#save-method-select'));

    const modalInstance = M.Modal.getInstance(ui.modal);
    modalInstance.open();

    ui.saveMethodSelect.onchange = () => {
      if (ui.saveMethodSelect.value === 'png') {
        ui.pngInfo.style.display = 'initial';
        ui.vectorInfo.style.display = 'none';
      } else {
        ui.vectorInfo.style.display = 'initial';
        ui.pngInfo.style.display = 'none';
      }
    };

    ui.scaleInput.oninput = () => (ui.scaleLabel.innerText = (Number(ui.scaleInput.value) * 0.25).toString());

    ui.fromPageInput.max = pageCount.toString();
    ui.toPageInput.max = pageCount.toString();

    function checkPageRangeInputError() {
      const fromPage = Number(ui.fromPageInput.value);
      const toPage = Number(ui.toPageInput.value);

      if (
        !/^\d*$/.test(ui.fromPageInput.value) ||
        !/^\d*$/.test(ui.toPageInput.value) ||
        (toPage >= 1 && fromPage > toPage) ||
        fromPage > pageCount ||
        toPage > pageCount
      ) {
        ui.pageErrorElement.style.display = 'initial';
        ui.convertButton.classList.add('disabled');
      } else {
        ui.pageErrorElement.style.display = 'none';
        ui.convertButton.classList.remove('disabled');
      }
    }

    ui.fromPageInput.oninput = checkPageRangeInputError;
    ui.toPageInput.oninput = checkPageRangeInputError;

    function removeCustomCss() {
      modalInstance.close();
      sendRuntimeMessage({ type: 'remove-modal' });
    }

    ui.convertButton.onclick = async () => {
      try {
        await generatePdf({
          title: document.title,
          savemethod: ui.saveMethodSelect.value === 'png' ? 'png' : 'vector',
          scale: ui.saveMethodSelect.value === 'png' ? Number(ui.scaleInput.value) * 0.25 : 1,
          fromPage: ui.fromPageInput.value.length > 0 ? Number(ui.fromPageInput.value) : 1,
          toPage: ui.toPageInput.value.length > 0 ? Number(ui.toPageInput.value) : pageCount,
          pageCount
        });
      } finally {
        removeCustomCss();
      }
    };

    ui.closeButton.onclick = removeCustomCss;
  }

  function onMessage(message: any) {
    if (message.type === 'run-inject' && typeof message.modalId === 'string') {
      runInject(message.modalId);
    }
  }

  if (!chrome.runtime.onMessage.hasListener(onMessage)) {
    chrome.runtime.onMessage.addListener(onMessage);
  }
})();
