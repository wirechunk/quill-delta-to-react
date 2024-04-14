import {
  AnchorHTMLAttributes,
  CSSProperties,
  HTMLAttributes as ReactHTMLAttributes,
  IframeHTMLAttributes,
  ImgHTMLAttributes,
  JSX,
  ReactNode,
} from 'react';
import { DeltaInsertOp } from './delta-insert-op.js';
import { DirectionType, ScriptType } from './value-types.js';
import { isValidColorLiteral, OpAttributes } from './sanitize-attributes.js';
import type { Property } from 'csstype';
import { InsertData } from './insert-data.js';

export type InlineStyleFn = (
  value: string | number | boolean,
  op: DeltaInsertOp,
) => CSSProperties | undefined;

export type InlineStyles = {
  indent: InlineStyleFn;
  align: InlineStyleFn;
  direction: InlineStyleFn;
  font: InlineStyleFn;
  size: InlineStyleFn;
  video: InlineStyleFn;
  [attribute: string]: InlineStyleFn | undefined;
};

const DEFAULT_INLINE_STYLES: Pick<
  InlineStyles,
  'direction' | 'font' | 'indent' | 'size'
> = {
  direction: (value, op): CSSProperties | undefined => {
    if (value === 'rtl') {
      if (op.attributes['align']) {
        return {
          direction: 'rtl',
        };
      }
      return {
        direction: 'rtl',
        textAlign: 'inherit',
      };
    }
    return undefined;
  },
  font: (value) => {
    switch (value) {
      case 'serif':
        return { fontFamily: 'Georgia, Times New Roman, serif' };
      case 'monospace':
        return { fontFamily: 'Monaco, Courier New, monospace' };
      default:
        if (typeof value === 'string') {
          return { fontFamily: value };
        }
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
  indent: (value, op): CSSProperties => {
    const indentSize = Number(value) * 3;
    return {
      [op.attributes['direction'] === DirectionType.Rtl
        ? 'paddingRight'
        : 'paddingLeft']: `${indentSize}em`,
    };
  },
};

const blockAttributes = [
  'blockquote',
  'code-block',
  'list',
  'header',
  'align',
  'direction',
  'indent',
] as const;

export type BlockAttribute = (typeof blockAttributes)[number];

const inlineAttributes = [
  'link',
  'mentions',
  'script',
  'bold',
  'italic',
  'strike',
  'underline',
  'code',
] as const;

export type InlineAttribute = (typeof inlineAttributes)[number];

export type DataAttributes = {
  [key: `data-${string}`]: unknown;
};

export type HTMLAttributes = ReactHTMLAttributes<object> & DataAttributes;

export type RenderOpOptions = {
  classPrefix: string;
  inlineStyles: boolean | Partial<InlineStyles>;
  listItemTag: keyof JSX.IntrinsicElements;
  mentionTag: keyof JSX.IntrinsicElements;
  paragraphTag: keyof JSX.IntrinsicElements;
  linkRel?: string;
  linkTarget?: string;
  allowBackgroundClasses: boolean;
  customTag?: (
    format: BlockAttribute | InlineAttribute,
    op: DeltaInsertOp,
  ) => keyof JSX.IntrinsicElements | undefined;
  customAttributes?: (op: DeltaInsertOp) => HTMLAttributes | undefined;
  customClasses?: (op: DeltaInsertOp) => string | string[] | undefined;
  customCssStyles?: (op: DeltaInsertOp) => CSSProperties | undefined;
};

export const renderOpOptionsDefault = Object.freeze<RenderOpOptions>({
  classPrefix: 'ql',
  inlineStyles: false,
  listItemTag: 'li',
  mentionTag: 'a',
  paragraphTag: 'p',
  allowBackgroundClasses: false,
});

export class RenderOp<Insert extends InsertData> {
  private readonly options: RenderOpOptions;
  private readonly op: DeltaInsertOp<Insert>;

  constructor(op: DeltaInsertOp<Insert>, options?: Partial<RenderOpOptions>) {
    this.op = op;
    this.options = {
      ...renderOpOptionsDefault,
      ...options,
    };
  }

  renderOp(children?: ReactNode): ReactNode {
    const tags = this.getTags();
    const attributes = this.getTagAttributes();

    if (this.options.customAttributes) {
      Object.assign(attributes, this.options.customAttributes(this.op));
    }

    if (
      Array.isArray(tags) &&
      tags.length === 0 &&
      Object.keys(attributes).length
    ) {
      tags.push('span');
    }

    const renderFns: Array<(children: ReactNode) => ReactNode> = [];

    for (const Tag of Array.isArray(tags) ? tags : [tags]) {
      if (Tag === 'img') {
        if (this.op.attributes.link) {
          // Special support for a link containing an image.
          renderFns.push(() => (
            <a {...this.getLinkAttrs()}>
              <Tag {...attributes} />
            </a>
          ));
        } else {
          renderFns.push(() => <Tag {...attributes} />);
        }
        // Nothing can be inside an img.
        break;
      }
      if (Tag === 'iframe') {
        // Nothing can be inside an iframe.
        renderFns.push(() => <Tag {...attributes} />);
        break;
      }
      if (renderFns.length) {
        renderFns.push((children) => <Tag>{children}</Tag>);
      } else {
        renderFns.push((children) => <Tag {...attributes}>{children}</Tag>);
      }
    }

    return renderFns.reduceRight(
      (acc, fn) => (children) => fn(acc(children)),
      (children) => children,
    )(children);
  }

  getClasses(): string[] {
    if (this.options.inlineStyles) {
      return [];
    }

    const classes = this.getCustomClasses();

    const attrs = this.op.attributes;

    const prefix = this.options.classPrefix
      ? `${this.options.classPrefix}-`
      : '';

    if (attrs.align) {
      classes.push(`${prefix}align-${attrs.align}`);
    }
    if (
      attrs.background &&
      this.options.allowBackgroundClasses &&
      isValidColorLiteral(attrs.background)
    ) {
      classes.push(`${prefix}background-${attrs.background}`);
    }
    if (attrs.direction) {
      classes.push(`${prefix}direction-${attrs.direction}`);
    }
    if (attrs.font) {
      classes.push(`${prefix}font-${attrs.font}`);
    }
    if (attrs.indent) {
      classes.push(`${prefix}indent-${attrs.indent}`);
    }
    if (attrs.size) {
      classes.push(`${prefix}size-${attrs.size}`);
    }
    if (this.op.isFormula()) {
      classes.push(`${prefix}formula`);
    }
    if (this.op.isImage()) {
      classes.push(`${prefix}image`);
    }
    if (this.op.isVideo()) {
      classes.push(`${prefix}video`);
    }

    return classes;
  }

  getCssStyles(): CSSProperties {
    const { inlineStyles } = this.options;

    const propsArr: Array<keyof OpAttributes> = ['color'];
    if (inlineStyles || !this.options.allowBackgroundClasses) {
      propsArr.push('background');
    }
    if (inlineStyles) {
      propsArr.push('indent', 'align', 'direction', 'font', 'size');
    }

    const styles: CSSProperties = {
      // Set border to none for video embeds but allow custom styles to override this.
      ...(this.op.isVideo() ? { border: 'none' } : {}),
      ...this.options.customCssStyles?.(this.op),
    };

    for (const attribute of propsArr) {
      const value: unknown = this.op.attributes[attribute];
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        const attributeStyles =
          inlineStyles &&
          typeof inlineStyles === 'object' &&
          inlineStyles[attribute];

        if (attributeStyles) {
          Object.assign(styles, attributeStyles(value, this.op));
        } else {
          switch (attribute) {
            case 'background':
              if (typeof value === 'string') {
                styles.backgroundColor = value;
              }
              break;
            case 'color':
              if (typeof value === 'string') {
                styles.color = value;
              }
              break;
            case 'indent':
              Object.assign(
                styles,
                DEFAULT_INLINE_STYLES.indent(value, this.op),
              );
              break;
            case 'align':
              if (typeof value === 'string') {
                styles.textAlign = value as Property.TextAlign;
              }
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

  getTagAttributes(): HTMLAttributes {
    const tagAttrs: HTMLAttributes = {};

    const style = this.getCssStyles();
    if (Object.keys(style).length) {
      tagAttrs.style = style;
    }

    const classes = this.getClasses();
    if (classes.length) {
      tagAttrs.className = classes.join(' ');
    }

    if (this.op.isImage()) {
      const imgAttrs: ImgHTMLAttributes<HTMLImageElement> = {};
      if (this.op.attributes.width) {
        imgAttrs.width = this.op.attributes.width;
      }
      const src = this.op.insert.value;
      if (typeof src === 'string') {
        imgAttrs.src = src;
      }
      Object.assign(tagAttrs, imgAttrs);
      return tagAttrs;
    }

    if (this.op.isACheckList()) {
      tagAttrs['data-checked'] = this.op.isCheckedList();
      return tagAttrs;
    }

    if (this.op.isFormula()) {
      return tagAttrs;
    }

    if (this.op.isVideo()) {
      const src = this.op.insert.value;
      const iframeAttrs: IframeHTMLAttributes<HTMLIFrameElement> = {
        allowFullScreen: true,
        src: typeof src === 'string' ? src : undefined,
      };
      Object.assign(tagAttrs, iframeAttrs);
      return tagAttrs;
    }

    if (this.op.isMentions()) {
      const mention = this.op.attributes.mention;
      if (mention) {
        if (mention.class) {
          const { className } = tagAttrs;
          tagAttrs.className = className
            ? `${className} ${mention.class}`
            : mention.class;
        }
        const linkAttrs: AnchorHTMLAttributes<HTMLAnchorElement> = {};
        if (mention.link) {
          linkAttrs.href = mention.link;
        }
        if (mention.target) {
          linkAttrs.target = mention.target;
        }
        Object.assign(tagAttrs, linkAttrs);
      }
      return tagAttrs;
    }

    if (
      this.op.isCodeBlock() &&
      typeof this.op.attributes['code-block'] === 'string'
    ) {
      tagAttrs['data-language'] = this.op.attributes['code-block'];
      return tagAttrs;
    }

    if (!this.op.isContainerBlock() && this.op.isLink()) {
      Object.assign(tagAttrs, this.getLinkAttrs());
    }

    return tagAttrs;
  }

  getLinkAttrs(): AnchorHTMLAttributes<HTMLAnchorElement> {
    const attrs: AnchorHTMLAttributes<HTMLAnchorElement> = {
      href: this.op.attributes.link,
    };

    const target = this.op.attributes.target || this.options.linkTarget;
    if (target) {
      attrs.target = target;
    }

    const rel = this.op.attributes.rel || this.options.linkRel;
    if (rel) {
      attrs.rel = rel;
    }

    return attrs;
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

  private getTags():
    | keyof JSX.IntrinsicElements
    | Array<keyof JSX.IntrinsicElements> {
    // embeds
    if (this.op.isVideo()) {
      return 'iframe';
    }
    if (this.op.isImage()) {
      return 'img';
    }
    if (this.op.isFormula()) {
      return 'span';
    }

    const { attributes } = this.op;

    // blocks
    for (const format of blockAttributes) {
      const value = attributes[format];
      if (value) {
        const customTag = this.options.customTag?.(format, this.op);
        if (customTag) {
          return customTag;
        }
        switch (format) {
          case 'blockquote':
            return 'blockquote';
          case 'code-block':
            return 'pre';
          case 'list':
            return this.options.listItemTag || 'li';
          case 'header':
            switch (value) {
              case 1:
                return 'h1';
              case 2:
                return 'h2';
              case 3:
                return 'h3';
              case 4:
                return 'h4';
              case 5:
                return 'h5';
              case 6:
                return 'h6';
              default:
                return 'p';
            }
          case 'align':
          case 'direction':
          case 'indent':
            return this.options.paragraphTag || 'p';
        }
      }
    }

    // inlines
    const tags: Array<keyof JSX.IntrinsicElements> = [];

    for (const format of inlineAttributes) {
      const value = attributes[format];
      if (value) {
        const customTag = this.options.customTag?.(format, this.op);
        if (customTag) {
          tags.push(customTag);
        } else {
          switch (format) {
            case 'link':
            case 'mentions':
              tags.push(this.options.mentionTag || 'a');
              break;
            case 'script':
              tags.push(value === ScriptType.Sub ? 'sub' : 'sup');
              break;
            case 'bold':
              tags.push('strong');
              break;
            case 'italic':
              tags.push('em');
              break;
            case 'strike':
              tags.push('s');
              break;
            case 'underline':
              tags.push('u');
              break;
            case 'code':
              tags.push('code');
          }
        }
      }
    }

    // Note that this array may be empty, which is the case when there's no formatting or attributes needed for inline text.
    // The caller of this function may still render a wrapper tag if there are attributes.
    return tags;
  }
}
