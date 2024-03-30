import { JSX, ReactNode } from 'react';
import { DeltaInsertOp } from './DeltaInsertOp.js';
import { ScriptType } from './value-types.js';
import { Mention } from './mentions/MentionSanitizer.js';
import { OpAttributes, OpAttributeSanitizer } from './OpAttributeSanitizer.js';

export type InlineStyleType = (
  value: string,
  op: DeltaInsertOp,
) => Partial<CSSStyleDeclaration> | undefined;

export interface InlineStyles {
  indent: InlineStyleType;
  align: InlineStyleType;
  direction: InlineStyleType;
  font: InlineStyleType;
  size: InlineStyleType;
  [attribute: string]: InlineStyleType | undefined;
}

const DEFAULT_INLINE_STYLES: Pick<
  InlineStyles,
  'font' | 'size' | 'indent' | 'direction'
> = {
  font: (value) => {
    switch (value) {
      case 'serif':
        return { fontFamily: 'Georgia, Times New Roman, serif' };
      case 'monospace':
        return { fontFamily: 'Monaco, Courier New, monospace' };
      default:
        return { fontFamily: value };
    }
  },
  size: (value) => {
    switch (value) {
      case 'small':
        return { fontSize: '0.75em' };
      case 'large':
        return { fontSize: '1.5em' };
      case 'huge':
        return { fontSize: '2.5em' };
      default:
        return undefined;
    }
  },
  indent: (value, op): Partial<CSSStyleDeclaration> => {
    const indentSize = parseInt(value, 10) * 3;
    return {
      [op.attributes['direction'] === 'rtl' ? 'paddingRight' : 'paddingLeft']:
        `${indentSize}em`,
    };
  },
  direction: (value, op): Partial<CSSStyleDeclaration> | undefined => {
    if (value === 'rtl') {
      return {
        direction: 'rtl',
        textAlign: op.attributes['align'] ? undefined : 'inherit',
      };
    }
    return undefined;
  },
};

const blockTags = [
  'blockquote',
  'code-block',
  'list',
  'header',
  'align',
  'direction',
  'indent',
] as const;

const inlineTags = [
  'link',
  'mentions',
  'script',
  'bold',
  'italic',
  'strike',
  'underline',
  'code',
] as const;

type AttributeKeyValueTuple = [string, string | undefined];

export type OpToNodeConverterOptions = {
  classPrefix?: string;
  inlineStyles?: boolean | Partial<InlineStyles>;
  listItemTag?: keyof JSX.IntrinsicElements;
  paragraphTag?: keyof JSX.IntrinsicElements;
  linkRel?: string;
  linkTarget?: string;
  allowBackgroundClasses?: boolean;
  customTag?: (
    format: string,
    op: DeltaInsertOp,
  ) => keyof JSX.IntrinsicElements | undefined;
  customAttributes?: (
    op: DeltaInsertOp,
  ) => { [key: string]: string | undefined } | undefined;
  customClasses?: (op: DeltaInsertOp) => string | string[] | undefined;
  customCssStyles?: (
    op: DeltaInsertOp,
  ) => Partial<CSSStyleDeclaration> | undefined;
};

export type RenderNode = {
  render: (children: ReactNode) => ReactNode;
  node: ReactNode;
};

export class OpToHtmlConverter {
  private readonly options: OpToNodeConverterOptions;
  private readonly op: DeltaInsertOp;

  constructor(op: DeltaInsertOp, options?: OpToNodeConverterOptions) {
    this.op = op;
    this.options = {
      classPrefix: 'ql',
      inlineStyles: undefined,
      listItemTag: 'li',
      paragraphTag: 'p',
      ...options,
    };
  }

  prefixClass(className: string): string {
    if (this.options.classPrefix) {
      return `${this.options.classPrefix}-${className}`;
    }
    return className;
  }

  renderNode(): RenderNode {
    const Tag = this.getTag();

    let children: ReactNode = null;
    if (
      !this.op.isContainerBlock() &&
      (this.op.isMentions() || this.op.isFormula() || this.op.isText())
    ) {
      children = this.op.insert.value;
    }

    if (Tag === 'img' && this.op.attributes.link) {
      children = <a {...this.getLinkAttrs()}>{children}</a>;
    }

    const attributes = Object.fromEntries(this.getTagAttributes());

    return {
      render: (children) => <Tag {...attributes}>{children}</Tag>,
      node: <Tag {...attributes}>{children}</Tag>,
    };
  }

  getClasses(): string[] {
    if (this.options.inlineStyles) {
      return [];
    }

    const attrs = this.op.attributes;

    const props = ['indent', 'align', 'direction', 'font', 'size'];
    if (this.options.allowBackgroundClasses) {
      props.push('background');
    }

    return this.getCustomClasses().concat(
      props
        .filter(
          (prop) =>
            prop in attrs &&
            attrs[prop] &&
            (prop === 'background'
              ? OpAttributeSanitizer.IsValidColorLiteral(attrs[prop] as string)
              : true),
        )
        .map((prop) => `${prop}-${attrs[prop]}`)
        .concat(this.op.isFormula() ? 'formula' : [])
        .concat(this.op.isVideo() ? 'video' : [])
        .concat(this.op.isImage() ? 'image' : [])
        .map(this.prefixClass.bind(this)),
    );
  }

  getCssStyles(): Partial<CSSStyleDeclaration> {
    const { inlineStyles } = this.options;

    const propsArr: Array<keyof OpAttributes> = ['color'];
    if (inlineStyles || !this.options.allowBackgroundClasses) {
      propsArr.push('background');
    }
    if (inlineStyles) {
      propsArr.push('indent', 'align', 'direction', 'font', 'size');
    }

    const styles: Partial<CSSStyleDeclaration> = {
      ...this.getCustomCssStyles(),
    };

    for (const attribute of propsArr) {
      const value: unknown = this.op.attributes[attribute];
      if (typeof value === 'string') {
        const attributeStyles =
          inlineStyles &&
          typeof inlineStyles === 'object' &&
          inlineStyles[attribute];

        if (typeof attributeStyles === 'function') {
          Object.assign(styles, attributeStyles(value, this.op));
        } else {
          switch (attribute) {
            case 'background':
              styles.backgroundColor = value;
              break;
            case 'color':
              styles.color = value;
              break;
            case 'indent':
              Object.assign(
                styles,
                DEFAULT_INLINE_STYLES.indent(value, this.op),
              );
              break;
            case 'align':
              styles.textAlign = value;
              break;
            case 'direction':
              Object.assign(
                styles,
                DEFAULT_INLINE_STYLES.direction(value, this.op),
              );
              break;
            case 'font':
              Object.assign(styles, DEFAULT_INLINE_STYLES.font(value, this.op));
              break;
            case 'size':
              Object.assign(styles, DEFAULT_INLINE_STYLES.size(value, this.op));
              break;
          }
        }
      }
    }

    return styles;
  }

  getTagAttributes(): AttributeKeyValueTuple[] {
    if (this.op.attributes.code && !this.op.isLink()) {
      return [];
    }

    const customAttributes = this.getCustomTagAttributes();

    const tagAttrs: AttributeKeyValueTuple[] = customAttributes
      ? Object.entries(customAttributes)
      : [];

    const classes = this.getClasses();
    if (classes.length) {
      tagAttrs.push(['class', classes.join(' ')]);
    }

    if (this.op.isImage()) {
      if (this.op.attributes.width) {
        tagAttrs.push(['width', this.op.attributes.width]);
      }
      const src = this.op.insert.value;
      if (typeof src === 'string') {
        tagAttrs.push(['src', src]);
      }
      return tagAttrs;
    }

    if (this.op.isACheckList()) {
      tagAttrs.push([
        'data-checked',
        this.op.isCheckedList() ? 'true' : 'false',
      ]);
      return tagAttrs;
    }

    if (this.op.isFormula()) {
      return tagAttrs;
    }

    if (this.op.isVideo()) {
      tagAttrs.push(['frameborder', '0'], ['allowfullscreen', 'true']);
      const src = this.op.insert.value;
      if (typeof src === 'string') {
        tagAttrs.push(['src', src]);
      }
      return tagAttrs;
    }

    if (this.op.isMentions()) {
      var mention: Mention = this.op.attributes.mention!;
      if (mention.class) {
        tagAttrs.push(['class', mention.class]);
      }
      if (mention['end-point'] && mention.slug) {
        tagAttrs.push(['href', mention['end-point'] + '/' + mention.slug]);
      } else {
        tagAttrs.push(['href', 'about:blank']);
      }
      if (mention.target) {
        tagAttrs.push(['target', mention.target]);
      }
      return tagAttrs;
    }

    const styles = this.getCssStyles();
    if (styles.length) {
      tagAttrs.push(['style', styles]);
    }

    if (
      this.op.isCodeBlock() &&
      typeof this.op.attributes['code-block'] === 'string'
    ) {
      tagAttrs.push(['data-language', this.op.attributes['code-block']]);
      return tagAttrs;
    }

    if (this.op.isContainerBlock()) {
      return tagAttrs;
    }

    if (this.op.isLink()) {
      tagAttrs.push(...this.getLinkAttrs());
    }

    return tagAttrs;
  }

  getLinkAttrs() {
    const target =
      this.op.attributes.target ||
      (OpAttributeSanitizer.isValidTarget(this.options.linkTarget || '')
        ? this.options.linkTarget
        : undefined);

    const rel =
      this.op.attributes.rel ||
      (OpAttributeSanitizer.IsValidRel(this.options.linkRel || '')
        ? this.options.linkRel
        : undefined);

    const attrs: AttributeKeyValueTuple[] = [
      ['href', this.op.attributes.link!],
    ];
    if (target) {
      attrs.push(['target', target]);
    }
    if (rel) {
      attrs.push(['rel', rel]);
    }

    return attrs;
  }

  getCustomTag(format: string) {
    return this.options.customTag?.apply(null, [format, this.op]);
  }

  getCustomTagAttributes() {
    return this.options.customAttributes?.apply(null, [this.op]);
  }

  getCustomClasses() {
    if (this.options.customClasses) {
      const res = this.options.customClasses.apply(null, [this.op]);
      if (res) {
        return Array.isArray(res) ? res : [res];
      }
    }
    return [];
  }

  getCustomCssStyles() {
    return this.options.customCssStyles?.apply(null, [this.op]);
  }

  getTag(): keyof JSX.IntrinsicElements {
    // embeds
    if (!this.op.isText()) {
      return this.op.isVideo()
        ? 'iframe'
        : this.op.isImage()
          ? 'img'
          : // formula
            'span';
    }

    const attrs = this.op.attributes;

    // blocks
    const paragraphTag = this.options.paragraphTag || 'p';

    for (const item of blockTags) {
      if (attrs[item]) {
        const customTag = this.getCustomTag(item);
        if (customTag) {
          return customTag;
        }
        switch (item) {
          case 'blockquote':
            return item;
          case 'code-block':
            return 'pre';
          case 'list':
            return this.options.listItemTag || 'li';
          case 'header':
            switch (attrs[item]?.toString()) {
              case '1':
                return 'h1';
              case '2':
                return 'h2';
              case '3':
                return 'h3';
              case '4':
                return 'h4';
              case '5':
                return 'h5';
              case '6':
                return 'h6';
              default:
                return 'h1';
            }
          case 'align':
          case 'direction':
          case 'indent':
            return paragraphTag;
        }
      }
    }

    if (this.op.isCustomTextBlock()) {
      return this.getCustomTag('renderAsBlock') || paragraphTag;
    }

    // inlines
    for (const item of inlineTags) {
      if (attrs[item]) {
        const customTag = this.getCustomTag(item);
        if (customTag) {
          return customTag;
        }
        switch (item) {
          case 'link':
          case 'mentions':
            return 'a';
          case 'script':
            return attrs[item] === ScriptType.Sub ? 'sub' : 'sup';
          case 'bold':
            return 'strong';
          case 'italic':
            return 'em';
          case 'strike':
            return 's';
          case 'underline':
            return 'u';
          case 'code':
            return 'code';
        }
      }
    }

    return 'span';
  }
}
