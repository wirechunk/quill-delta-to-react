import {
  IOpAttributeSanitizerOptions,
  IUrlSanitizerFn,
} from './OpAttributeSanitizer.js';
import * as url from './helpers/url.js';
import { encodeLink } from './funcs-html.js';

class OpLinkSanitizer {
  static sanitize(link: string, options: IOpAttributeSanitizerOptions) {
    let sanitizerFn: IUrlSanitizerFn = () => {
      return undefined;
    };
    if (options && typeof options.urlSanitizer === 'function') {
      sanitizerFn = options.urlSanitizer;
    }
    let result = sanitizerFn(link);
    return typeof result === 'string' ? result : encodeLink(url.sanitize(link));
  }
}

export { OpLinkSanitizer };
