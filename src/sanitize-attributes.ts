import {
  ListType,
  AlignType,
  DirectionType,
  ScriptType,
} from './value-types.js';
import { sanitizeMention } from './sanitize-mention.js';
import type { Mention } from './sanitize-mention.js';

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

const alignTypes = Object.values(AlignType);

const isAlignType = (align: unknown): align is AlignType =>
  alignTypes.includes(align as never);

const listTypes = Object.values(ListType);

const isListType = (list: unknown): list is ListType =>
  listTypes.includes(list as never);

const validRGBColorRegex =
  /^rgb\(((0|25[0-5]|2[0-4]\d|1\d\d|0?\d?\d),\s*){2}(0|25[0-5]|2[0-4]\d|1\d\d|0?\d?\d)\)$/i;

export const isValidRGBColor = (colorStr: string): boolean =>
  validRGBColorRegex.test(colorStr);

const validHexColorRegex = /^#([0-9A-F]{6}|[0-9A-F]{3})$/i;

export const isValidHexColor = (colorStr: string): boolean =>
  validHexColorRegex.test(colorStr);

const validColorLiteralRegex = /^[a-z]{1,50}$/i;

export const isValidColorLiteral = (colorStr: string): boolean =>
  validColorLiteralRegex.test(colorStr);

const validFontNameRegex = /^[a-z0-9 -]{1,50}$/i;

export const isValidFontName = (fontName: string): boolean =>
  validFontNameRegex.test(fontName);

const validSizeRegex = /^[a-z0-9-]{1,20}$/i;

export const isValidSize = (size: string): boolean => validSizeRegex.test(size);

const validWidthRegex = /^[0-9]*(px|em|rem|%)?$/;

export const isValidWidth = (width: string): boolean =>
  validWidthRegex.test(width);

const validTargetRegex = /^[\w-]{1,50}$/i;

export const isValidTarget = (target: string): boolean =>
  validTargetRegex.test(target);

const validRelRegex = /^[a-z\s-]{1,250}$/i;

export const isValidRel = (rel: string): boolean => validRelRegex.test(rel);

const validLanguageRegex = /^[a-z\s\-\\/+]{1,50}$/i;

export const isValidLang = (lang: string): boolean =>
  validLanguageRegex.test(lang);

export const sanitizeAttributes = (
  dirtyAttrs: Record<string | number | symbol, unknown>,
  sanitizeOptions: OpAttributeSanitizerOptions,
): OpAttributes => {
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
      (isValidHexColor(val) || isValidColorLiteral(val) || isValidRGBColor(val))
    ) {
      cleanAttrs[prop] = val;
    }
  });

  if (typeof font === 'string' && isValidFontName(font)) {
    cleanAttrs.font = font;
  }

  if (typeof size === 'string' && isValidSize(size)) {
    cleanAttrs.size = size;
  }

  if (
    width &&
    (typeof width === 'number' || typeof width === 'string') &&
    isValidWidth(width.toString())
  ) {
    cleanAttrs.width = width;
  }

  if (link && typeof link === 'string') {
    cleanAttrs.link = sanitizeOptions.urlSanitizer(link);
  }

  if (typeof target === 'string' && isValidTarget(target)) {
    cleanAttrs.target = target;
  }

  if (typeof rel === 'string' && isValidRel(rel)) {
    cleanAttrs.rel = rel;
  }

  if (codeBlock) {
    if (typeof codeBlock === 'string' && isValidLang(codeBlock)) {
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
    cleanAttrs.header = Math.max(Math.min(Math.round(Number(header)), 6), 1) as
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6;
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
    cleanAttrs.mention = sanitizeMention(mention, sanitizeOptions);
  }

  return Object.keys(dirtyAttrs).reduce((cleaned, k) => {
    // This is a custom attribute. Put it back.
    if (!sanitizedAttrs.includes(k)) {
      cleaned[k] = dirtyAttrs[k];
    }
    return cleaned;
  }, cleanAttrs);
};
