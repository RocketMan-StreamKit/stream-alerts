/**
 * Worker side of the DonationAlerts import: downloads the public widget page and turns its
 * donation variations into variants. The link (it contains a secret widget token) is used for
 * this single request only — it is never stored or logged.
 */
import {
  extractWidgetPage,
  importDonationVariations,
  parseWidgetUrl,
  widgetPageUrl,
  type DaImportResult,
} from './shared/donationalerts';

/**
 * Import parse result for the panel.
 * @example const res: DaParseResponse = { success: false, error: 'daBadLink' };
 */
export type DaParseResponse =
  | ({ success: true } & DaImportResult)
  | { success: false; error: 'daBadLink' | 'daFetchFailed' | 'daNotWidget' };

/**
 * Loads and parses a DonationAlerts alert widget.
 * @param link Widget link pasted by the user.
 * @param lang UI language for variant defaults.
 * @returns Donation variations of the linked group or an error code.
 * @example await parseDonationAlerts('https://www.donationalerts.com/widget/alerts?group_id=1&token=…', 'ru');
 */
export const parseDonationAlerts = async (
  link: string,
  lang: string
): Promise<DaParseResponse> => {
  const ref = parseWidgetUrl(link);
  if (!ref) return { success: false, error: 'daBadLink' };
  let html: string;
  try {
    html = await network.request.get(widgetPageUrl(ref), {
      Accept: 'text/html',
    });
  } catch (error) {
    // The error may echo the URL — log only the message class, never the token.
    console.error(
      '[stream-alerts] DonationAlerts widget request failed',
      error instanceof Error ? error.name : typeof error
    );
    return { success: false, error: 'daFetchFailed' };
  }
  const page = typeof html === 'string' ? extractWidgetPage(html) : null;
  if (!page) return { success: false, error: 'daNotWidget' };
  return {
    success: true,
    ...importDonationVariations(page, ref.groupId, lang),
  };
};
