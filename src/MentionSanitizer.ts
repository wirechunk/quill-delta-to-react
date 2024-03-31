import type { OpAttributeSanitizerOptions } from './OpAttributeSanitizer.js';

// See https://github.com/quill-mention/quill-mention
export type Mention = {
  name?: string;
  target?: string;
  slug?: string;
  class?: string;
  link?: string;
  [index: string]: unknown;
};

type UnknownDirtyMention = {
  [key in keyof Mention]?: unknown;
};

const isDirtyMention = (value: unknown): value is UnknownDirtyMention =>
  !!value && typeof value === 'object';

export class MentionSanitizer {
  static sanitize(
    dirtyObj: unknown,
    sanitizeOptions: OpAttributeSanitizerOptions,
  ): Mention {
    const cleanObj: Mention = {};

    if (!isDirtyMention(dirtyObj)) {
      return cleanObj;
    }

    if (
      typeof dirtyObj.class === 'string' &&
      MentionSanitizer.isValidClass(dirtyObj.class)
    ) {
      cleanObj.class = dirtyObj.class;
    }

    if (
      typeof dirtyObj.target === 'string' &&
      MentionSanitizer.isValidTarget(dirtyObj.target)
    ) {
      cleanObj.target = dirtyObj.target;
    }

    if (typeof dirtyObj.link === 'string') {
      cleanObj.link = sanitizeOptions.urlSanitizer(dirtyObj.link);
    }

    if (typeof dirtyObj.slug === 'string') {
      cleanObj.slug = dirtyObj.slug;
    }

    return cleanObj;
  }

  private static isValidClass(classAttr: string) {
    return !!classAttr.match(/^[a-zA-Z0-9_\-]{1,500}$/i);
  }

  private static isValidTarget(target: string) {
    return ['_self', '_blank', '_parent', '_top'].includes(target);
  }
}
