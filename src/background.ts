import 'materialize-css/sass/materialize.scss';

import { PopUp } from './popup';
import { PopUpUiLoadingError } from './popupUi';

import { Storage } from './storage';
import { IconUpdater } from './iconUpdater';

(async () => {
  console.log('Bundle was loaded');

  try {
    await PopUp.start();
    console.log('Started popup');
  } catch (e: any) {
    // Instanceof doesn't work
    if (!('type' in e) || e.type !== PopUpUiLoadingError) {
      throw e;
    }

    Storage.setup();
    IconUpdater.setup();
    console.log('Setup background services');
  }
})();
