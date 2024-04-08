import {
  ListType,
  AlignType,
  DirectionType,
  ScriptType,
} from './value-types.js';
import { MentionSanitizer } from './MentionSanitizer.js';
import type { Mention } from './MentionSanitizer.js';
import type { OptionalAttributes } from 'quill';

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

export class OpAttributeSanitizer {
  static sanitize(
    dirtyAttrs: OptionalAttributes['attributes'],
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
      const val: unknown = dirtyAttrs[prop];
      if (
        typeof val === 'string' &&
        (OpAttributeSanitizer.IsValidHexColor(val) ||
          OpAttributeSanitizer.IsValidColorLiteral(val) ||
          OpAttributeSanitizer.IsValidRGBColor(val))
      ) {
        cleanAttrs[prop] = val;
      }
    });

    if (font && OpAttributeSanitizer.IsValidFontName(font + '')) {
      cleanAttrs.font = font;
    }

    if (size && OpAttributeSanitizer.IsValidSize(size + '')) {
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
    if (target && OpAttributeSanitizer.isValidTarget(target)) {
      cleanAttrs.target = target;
    }

    if (rel && OpAttributeSanitizer.IsValidRel(rel)) {
      cleanAttrs.rel = rel;
    }

    if (codeBlock) {
      if (OpAttributeSanitizer.IsValidLang(codeBlock)) {
        cleanAttrs['code-block'] = codeBlock;
      } else {
        cleanAttrs['code-block'] = !!codeBlock;
      }
    }

    if (script === ScriptType.Sub || ScriptType.Super === script) {
      cleanAttrs.script = script;
    }

    if (
      list === ListType.Bullet ||
      list === ListType.Ordered ||
      list === ListType.Checked ||
      list === ListType.Unchecked
    ) {
      cleanAttrs.list = list;
    }

    if (header && !isNaN(Number(header))) {
      cleanAttrs.header = Math.max(
        Math.min(Math.round(Number(header)), 6),
        1,
      ) as 1 | 2 | 3 | 4 | 5 | 6;
    }

    if (
      [
        AlignType.Center,
        AlignType.Right,
        AlignType.Justify,
        AlignType.Left,
      ].find((a) => a === align)
    ) {
      cleanAttrs.align = align;
    }

    if (direction === DirectionType.Rtl) {
      cleanAttrs.direction = direction;
    }

    if (indent && Number(indent)) {
      cleanAttrs.indent = Math.min(Number(indent), 30);
    }

    if (mentions && mention) {
      const sanitizedMention = MentionSanitizer.sanitize(
        mention,
        sanitizeOptions,
      );
      if (Object.keys(sanitizedMention).length > 0) {
        cleanAttrs.mentions = !!mentions;
        cleanAttrs.mention = mention;
      }
    }
    return Object.keys(dirtyAttrs).reduce((cleaned, k) => {
      // this is a custom attr, put it back
      if (sanitizedAttrs.indexOf(k) === -1) {
        cleaned[k] = (<any>dirtyAttrs)[k];
      }
      return cleaned;
    }, cleanAttrs);
  }

  static IsValidHexColor(colorStr: string) {
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

  static IsValidFontName(fontName: string) {
    return !!fontName.match(/^[a-z\s0-9\- ]{1,30}$/i);
  }

  static IsValidSize(size: string) {
    return !!size.match(/^[a-z0-9\-]{1,20}$/i);
  }

  static IsValidWidth(width: string) {
    return !!width.match(/^[0-9]*(px|em|%)?$/);
  }

  static isValidTarget(target: string) {
    return !!target.match(/^[_a-zA-Z0-9\-]{1,50}$/);
  }

  static IsValidRel(relStr: string) {
    return !!relStr.match(/^[a-zA-Z\s\-]{1,250}$/i);
  }

  static IsValidLang(lang: string | boolean) {
    if (typeof lang === 'boolean') {
      return true;
    }
    return !!lang.match(/^[a-zA-Z\s\-\\\/\+]{1,50}$/i);
  }
}
