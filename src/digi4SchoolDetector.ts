import { addRuntimeListener, executeScript } from './chromeSupport';
import { DetectionResult } from './models/detectionResult';

const d4sQuery = 'div#jpedal div object[type="image/svg+xml"]';

export async function detectDigi4School(tabId: number): Promise<DetectionResult> {
  const result = await executeScript(tabId, {
    code: `[document.querySelector('${d4sQuery}') !== null, document.title];`
  }) as [[boolean, string]] | undefined;

  if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0]) && result[0].length >= 2) {
    return {
      detected: result[0][0] === true,
      title: result[0][1]
    };
  }

  return { detected: false, title: '' };
}
