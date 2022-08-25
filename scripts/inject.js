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
   * @param {string} modalId
   */
  function runInject(modalId) {
    /** @type {HTMLDivElement} */
    const modal = document.querySelector(`div#${modalId}`);

    let pages;

    browser;

    M.Modal.init(document.querySelectorAll('.modal'));
    M.FormSelect.init(document.querySelectorAll('#savemethod'));

    instance_modal = M.Modal.getInstance(modal);
    instance_modal.open();

    const vector_info = document.getElementById('vector-info');
    const png_info = document.getElementById('png-info');

    // interface listeners
    const savemethod = document.getElementById('savemethod');
    savemethod.onchange = () => {
      if (savemethod.value === 'png') {
        png_info.style.display = null;
        vector_info.style.display = 'none';
      } else {
        vector_info.style.display = null;
        png_info.style.display = 'none';
      }
    };

    const scale_display = document.getElementById('scale-display');
    const scale = document.getElementById('scale');

    scale.oninput = () => {
      scale_display.innerText = Number(scale.value) * 0.25;
    };

    const btn_convert = document.getElementById('button-convert');

    const from_page = document.getElementById('from-page');
    const to_page = document.getElementById('to-page');
    const page_error = document.getElementById('page-error');
    pages = document.getElementById('goBtn').childElementCount;

    from_page.max = pages;
    to_page.max = pages;

    const check_page_error = () => {
      if (
        from_page.value.match(/^[\d]*$/) === null ||
        to_page.value.match(/^[\d]*$/) === null ||
        (Number(to_page.value) >= 1 && Number(from_page.value) > Number(to_page.value)) ||
        Number(from_page.value) > pages ||
        Number(to_page.value) > pages
      ) {
        page_error.style.display = null;
        btn_convert.classList.add('disabled');
      } else {
        page_error.style.display = 'none';
        btn_convert.classList.remove('disabled');
      }
    };

    from_page.oninput = check_page_error;
    to_page.oninput = check_page_error;

    const remove_custom_css = () => {
      instance_modal.close();
      browser.runtime.sendMessage({ type: 'remove-modal' });
    };

    btn_convert.onclick = () => {
      const options = {
        title: document.title,
        savemethod: savemethod.value,
        scale: savemethod.value === 'png' ? scale.value * 0.25 : 1,
        from_page: from_page.value.length > 0 ? Number(from_page.value) : 1,
        to_page: to_page.value.length > 0 ? Number(to_page.value) : pages
      };

      console.log(options);

      generate_pdf(options);

      remove_custom_css();
    };

    document.getElementById('button-close').onclick = remove_custom_css;

    async function generate_pdf(options) {
      const http = new XMLHttpRequest();
      const url = new URL(window.location);
      const base_url = (url.origin + url.pathname).replace(/\/[^\/]+?$/, '/');
      console.log(url, base_url);

      const svg_container = document.evaluate(
        '//*[@id="jpedal"]/div[2]/object',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      const width = Number(svg_container.width);
      const height = Number(svg_container.height);
      console.log('before pdfdoc');

      const pdf_doc = new PDFDocument({
        autoFirstPage: false,
        size: [width * options.scale, height * options.scale],
        margin: 0
      });

      console.log('------', width, height);
      console.log(pdf_doc);

      const chunks = [];
      pdf_doc.pipe({
        // writable stream implementation
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
        // readable stream stub implementation
        on: () => {},
        once: () => {},
        emit: () => {}
      });

      console.log('after pdfdoc');

      const convert_progress = {
        title: document.title,
        from_page: options.from_page,
        cur_page: options.from_page - 1,
        to_page: options.to_page,
        page_count: pages,
        time_begin: new Date()
      };
      // send message to background script
      browser.runtime.sendMessage({
        type: 'start_converting',
        convert_progress
      });

      // cancel the convertion progress
      let canceled = false;
      browser.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'cancel_convert') canceled = true;
      });

      window.onbeforeunload = () => {
        browser.runtime.sendMessage({
          type: 'stop_converting'
        });
        pdf_doc.end();
      };

      for (let i = options.from_page; i <= options.to_page; i++) {
        if (canceled) break;
        console.log('start page 1');
        try {
          await download_svg(i);
        } catch (error) {
          if (error.cancel) canceled = true;
          if (error.msg) alert(error.msg);
          else console.error(error);
        }
        console.log('downloaded page ' + i);
        convert_progress.cur_page = i;
        browser.runtime.sendMessage({
          type: 'update_progress',
          convert_progress
        });
      }
      pdf_doc.end();
      browser.runtime.sendMessage({
        type: 'stop_converting'
      });

      window.onbeforeunload = undefined;
      console.log('done');

      function download_svg(page) {
        return new Promise((resolve, reject) => {
          getPageUrl(page).then((page_url) => {
            console.log(page_url);
            if (page_url === ``) {
              reject({
                msg: 'Die Seite ' + page + ' wurde nicht gefunden. Es kann sein, dass die URL anders ist, als erwartet.'
              });
            }

            console.log(`${page_url}.svg`);
            http.open('GET', `${page_url}.svg`);
            console.log(`${page_url}.svg`);
            http.onreadystatechange = () => {
              // cancel callback if request hasnt finished
              if (http.readyState !== XMLHttpRequest.DONE) return;
              console.log('in http');
              const parser = new DOMParser();

              const updated_response = http.responseText;
              const xml_doc = parser.parseFromString(updated_response, 'text/xml');
              const uri_image_promises = [];
              console.log('before xmldoc');
              for (const c of xml_doc.children[0].children) {
                if (c.localName === 'image') {
                  const href = c.attributes['xlink:href'].textContent;
                  console.log('href');
                  uri_image_promises.push(to_data_uri(`${base_url}${page}/${href}`)); //Doesn't need a fix, url structure doesn't change
                  //uri_image_promises.push(to_data_uri(`${page_url}/${href}`)); //probably breaks everything
                }
              }

              console.log('before promises');
              Promise.all(uri_image_promises).then((uris) => {
                console.log(uris);
                for (const { uri, url } of uris) {
                  updated_response = updated_response
                    // substring in order to get the original path from the svg
                    .replace(url.substring(`${base_url}${page}/`.length), uri);
                }
                const xml_doc = parser.parseFromString(updated_response, 'text/xml');
                const svg_html = xml_doc.documentElement.outerHTML;
                console.log('before add page');

                pdf_doc.addPage();

                console.log('after add page');
                let add_page;
                if (options.savemethod === 'vector') add_page = add_as_vector;
                else if (options.savemethod === 'png') add_page = add_as_png;

                console.log('before add svg');
                add_page(pdf_doc, svg_html)
                  .then(() => resolve(page))
                  .catch((error) => reject({ cancel: true, msg: error.msg, error }));
              });
            };
            http.send();
          });
        });

        function add_as_vector(doc, svg) {
          return new Promise((resolve, reject) => {
            console.log('before pdfkit add image', { width, height });
            try {
              SVGtoPDF(doc, svg, 0, 0, { assumePt: true });
            } catch (error) {
              reject({
                msg:
                  'Anscheinend funktioniert die Speichermethode "Vektor" bei diesem Buch ' +
                  'nicht, bitte versuche es erneut und wähle eine andere aus.'
              });
              return;
            }
            console.log('after pdfkit add image');
            resolve();
          });
        }

        function add_as_png(doc, svg) {
          return new Promise((resolve, reject) => {
            console.log(svgAsPngUri);
            const template = document.createElement('div');
            template.innerHTML = svg;
            const svg_elem = template.childNodes[0];
            svg_elem.style.background_color = 'white';
            console.log(svg_elem);
            svgAsPngUri(svg_elem, { scale: options.scale }, (uri, w, h) => {
              console.log('before pdfkit add image', doc.image);
              console.log(uri);
              console.log(options);
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

              console.log('after pdfkit add image');
              resolve();
            });
          });
        }
      }

      /**
       * @param {string} page
       * @returns {Promise<string>}
       */
      async function getPageUrl(page) {
        return xhrGet(`${base_url}${page}/${page}.svg`)
          .then(() => `${base_url}${page}/${page}`)
          .catch(() => xhrGet(`${base_url}${page}.svg`))
          .then(() => `${base_url}${page}`);
      }

      // used to parse images in svgs to pure data uris
      function to_data_uri(url) {
        return new Promise((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.responseType = 'blob';

          xhr.onload = function () {
            const reader = new FileReader();

            reader.onloadend = () => {
              resolve({
                uri: reader.result,
                url
              });
            };

            reader.readAsDataURL(xhr.response);
          };

          xhr.open('GET', url);
          xhr.send();
        });
      }
    }
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
