import {
  ListType,
  AlignType,
  DirectionType,
  ScriptType,
} from './value-types.js';
import { MentionSanitizer } from './MentionSanitizer.js';
import type { Mention } from './MentionSanitizer.js';

export type OpAttributes = {
  background?: string | undefined;
  color?: string | undefined;
  font?: string | undefined;
  size?: string | undefined;
  width?: string | number | undefined;

  link?: string | undefined;
  bold?: boolean | undefined;
  italic?: boolean | undefined;
  underline?: boolean | undefined;
  strike?: boolean | undefined;
  script?: ScriptType;

  code?: boolean | undefined;

  list?: ListType;
  blockquote?: boolean | undefined;
  'code-block'?: string | boolean | undefined;
  header?: 1 | 2 | 3 | 4 | 5 | 6 | undefined;
  align?: AlignType;
  direction?: DirectionType;
  indent?: number | undefined;
  table?: string | undefined;

  mentions?: boolean | undefined;
  mention?: Mention | undefined;
  target?: string | undefined;
  rel?: string | undefined;

  // Set renderAsBlock to true on a custom blot to render it as block.
  renderAsBlock?: boolean | undefined;
  [key: string]: unknown;
};

export type OpAttributeSanitizerOptions = {
  urlSanitizer: (url: string) => string;
};

const validFontNameRegex = /^[a-z0-9 -]{1,50}$/i;

const validRelRegex = /^[a-z\s\-]{1,250}$/i;

const validTargetRegex = /^[\w-]{1,50}$/i;

const alignTypes = Object.values(AlignType);

const isAlignType = (align: unknown): align is AlignType =>
  alignTypes.includes(align as never);

const listTypes = Object.values(ListType);

const isListType = (list: unknown): list is ListType =>
  listTypes.includes(list as never);

export class OpAttributeSanitizer {
  static sanitize(
    dirtyAttrs: Record<string | number | symbol, unknown>,
    sanitizeOptions: OpAttributeSanitizerOptions,
  ): OpAttributes {
    const cleanAttrs: OpAttributes = {};

    if (!dirtyAttrs || typeof dirtyAttrs !== 'object') {
      return cleanAttrs;
    }

    const booleanAttrs = [
      'bold',
      'italic',
      'underline',
      'strike',
      'code',
      'blockquote',
      'code-block',
      'renderAsBlock',
    ] as const;

    const colorAttrs = ['background', 'color'] as const;

    const {
      font,
      size,
      link,
      script,
      list,
      header,
      align,
      direction,
      indent,
      mentions,
      mention,
      width,
      target,
      rel,
    } = dirtyAttrs;

    const codeBlock = dirtyAttrs['code-block'];

    const sanitizedAttrs = [
      ...booleanAttrs,
      ...colorAttrs,
      'font',
      'size',
      'link',
      'script',
      'list',
      'header',
      'align',
      'direction',
      'indent',
      'mentions',
      'mention',
      'width',
      'target',
      'rel',
      'code-block',
    ];

    booleanAttrs.forEach((prop) => {
      const v = dirtyAttrs[prop];
      if (v) {
        cleanAttrs[prop] = !!v;
      }
    });

    colorAttrs.forEach((prop) => {
      const val = dirtyAttrs[prop];
      if (
        typeof val === 'string' &&
        (OpAttributeSanitizer.isValidHexColor(val) ||
          OpAttributeSanitizer.IsValidColorLiteral(val) ||
          OpAttributeSanitizer.IsValidRGBColor(val))
      ) {
        cleanAttrs[prop] = val;
      }
    });

    if (
      typeof font === 'string' &&
      OpAttributeSanitizer.isValidFontName(font)
    ) {
      cleanAttrs.font = font;
    }

    if (typeof size === 'string' && OpAttributeSanitizer.isValidSize(size)) {
      cleanAttrs.size = size;
    }

    if (
      width &&
      (typeof width === 'number' || typeof width === 'string') &&
      OpAttributeSanitizer.IsValidWidth(width + '')
    ) {
      cleanAttrs.width = width;
    }

    if (link && typeof link === 'string') {
      cleanAttrs.link = sanitizeOptions.urlSanitizer(link);
    }

    if (
      typeof target === 'string' &&
      OpAttributeSanitizer.isValidTarget(target)
    ) {
      cleanAttrs.target = target;
    }

    if (typeof rel === 'string' && OpAttributeSanitizer.IsValidRel(rel)) {
      cleanAttrs.rel = rel;
    }

    if (codeBlock) {
      if (
        typeof codeBlock === 'string' &&
        OpAttributeSanitizer.IsValidLang(codeBlock)
      ) {
        cleanAttrs['code-block'] = codeBlock;
      } else {
        cleanAttrs['code-block'] = !!codeBlock;
      }
    }

    if (script === ScriptType.Sub || script === ScriptType.Super) {
      cleanAttrs.script = script;
    }

    if (isListType(list)) {
      cleanAttrs.list = list;
    }

    if (header && !isNaN(Number(header))) {
      cleanAttrs.header = Math.max(
        Math.min(Math.round(Number(header)), 6),
        1,
      ) as 1 | 2 | 3 | 4 | 5 | 6;
    }

    if (isAlignType(align)) {
      cleanAttrs.align = align;
    }

    if (direction === DirectionType.Rtl) {
      cleanAttrs.direction = direction;
    }

    if (indent && Number(indent)) {
      cleanAttrs.indent = Math.min(Number(indent), 30);
    }

    if (mentions && mention) {
      cleanAttrs.mentions = !!mentions;
      cleanAttrs.mention = MentionSanitizer.sanitize(mention, sanitizeOptions);
    }

    return Object.keys(dirtyAttrs).reduce((cleaned, k) => {
      // This is a custom attribute. Put it back.
      if (!sanitizedAttrs.includes(k)) {
        cleaned[k] = dirtyAttrs[k];
      }
      return cleaned;
    }, cleanAttrs);
  }

  static isValidHexColor(colorStr: string) {
    return !!colorStr.match(/^#([0-9A-F]{6}|[0-9A-F]{3})$/i);
  }

  static IsValidColorLiteral(colorStr: string) {
    return !!colorStr.match(/^[a-z]{1,50}$/i);
  }

  static IsValidRGBColor(colorStr: string) {
    const re =
      /^rgb\(((0|25[0-5]|2[0-4]\d|1\d\d|0?\d?\d),\s*){2}(0|25[0-5]|2[0-4]\d|1\d\d|0?\d?\d)\)$/i;
    return !!colorStr.match(re);
  }

  static isValidFontName(fontName: string) {
    return validFontNameRegex.test(fontName);
  }

  static isValidSize(size: string) {
    return !!size.match(/^[a-z0-9\-]{1,20}$/i);
  }

  static IsValidWidth(width: string) {
    return !!width.match(/^[0-9]*(px|em|%)?$/);
  }

  static isValidTarget(target: string) {
    return validTargetRegex.test(target);
  }

  static IsValidRel(relStr: string) {
    return validRelRegex.test(relStr);
  }

  static IsValidLang(lang: string | boolean) {
    if (typeof lang === 'boolean') {
      return true;
    }
    return !!lang.match(/^[a-zA-Z\s\-\\\/\+]{1,50}$/i);
  }
}
