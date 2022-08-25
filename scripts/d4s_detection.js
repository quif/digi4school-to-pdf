(() => {
  if (window.d4s_detection) return;
  window.d4s_detection = true;

  browser.runtime.onMessage.addListener((message) => {
    if (message.type !== 'valid') {
      return;
    }

    const svgContainer = document.evaluate(
      '//*[@id="jpedal"]/div[2]/object',
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    const isValidDigi4SchoolSite = svgContainer !== null && svgContainer.type === 'image/svg+xml';

    return Promise.resolve({ injected: isValidDigi4SchoolSite, title: document.title });
  });
})();
