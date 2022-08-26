import { executeScript } from './chrome';
import { DetectionResult } from './models/detectionResult';

export const d4sQuery = 'div#jpedal div object[type="image/svg+xml"]';

export async function detectDigi4School(tabId: number): Promise<DetectionResult> {
  const result = await executeScript(tabId, {
    code: `(() => {
      const obj = document.querySelector('${d4sQuery}');

      return [
        obj !== null,
        document.title,
        obj?.width || 0,
        obj?.height || 0
      ];
    })();`
  }) as [[boolean, string, number, number]] | undefined;

  if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0]) && result[0].length >= 4) {
    return {
      detected: result[0][0] === true,
      title: result[0][1],
      width: result[0][2],
      height: result[0][3]
    };
  }

  return { detected: false, title: '', width: 0, height: 0 };
}
