import {
  OpAttributeSanitizer,
  OpAttributeSanitizerOptions,
} from './OpAttributeSanitizer.js';

// See https://github.com/quill-mention/quill-mention
export type Mention = {
  class?: string;
  target?: string;
  link?: string;
  [index: string]: unknown;
};

type UnknownDirtyMention = {
  [key in keyof Mention]?: unknown;
};

const isDirtyMention = (value: unknown): value is UnknownDirtyMention =>
  !!value && typeof value === 'object';

const validClassRegex = /^[\w -]{1,500}$/i;

export class MentionSanitizer {
  static sanitize(
    dirtyObj: unknown,
    sanitizeOptions: OpAttributeSanitizerOptions,
  ): Mention {
    const cleanObj: Mention = {};

    if (!isDirtyMention(dirtyObj)) {
      return cleanObj;
    }

    for (const [key, value] of Object.entries(dirtyObj)) {
      switch (key) {
        case 'class':
          if (
            typeof value === 'string' &&
            MentionSanitizer.isValidClass(value)
          ) {
            cleanObj.class = value;
          }
          break;
        case 'target':
          if (
            typeof value === 'string' &&
            OpAttributeSanitizer.isValidTarget(value)
          ) {
            cleanObj.target = value;
          }
          break;
        case 'link':
          if (typeof value === 'string') {
            cleanObj.link = sanitizeOptions.urlSanitizer(value);
          }
          break;
        default:
          cleanObj[key] = value;
      }
    }

    return cleanObj;
  }

  private static isValidClass(value: string) {
    return validClassRegex.test(value);
  }
}
