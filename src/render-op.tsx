import {
  AnchorHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  IframeHTMLAttributes,
  ImgHTMLAttributes,
  JSX,
  ReactNode,
} from 'react';
import { DeltaInsertOp } from './DeltaInsertOp.js';
import { ScriptType } from './value-types.js';
import { OpAttributes, OpAttributeSanitizer } from './OpAttributeSanitizer.js';
import { Property } from 'csstype';

export type InlineStyleFn = (
  value: string | number,
  op: DeltaInsertOp,
) => Partial<CSSProperties> | undefined;

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
  'direction' | 'font' | 'indent' | 'size' | 'video'
> = {
  direction: (value, op): Partial<CSSProperties> | undefined => {
    if (value === 'rtl') {
      return {
        direction: 'rtl',
        textAlign: op.attributes['align'] ? undefined : 'inherit',
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
  indent: (value, op): Partial<CSSProperties> => {
    const indentSize = Number(value) * 3;
    return {
      [op.attributes['direction'] === 'rtl' ? 'paddingRight' : 'paddingLeft']:
        `${indentSize}em`,
    };
  },
  video: (): Partial<CSSProperties> => {
    return {
      border: 'none',
    };
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
  customAttributes?: <Tag extends keyof JSX.IntrinsicElements>(
    op: DeltaInsertOp,
    tag: Tag,
  ) => HTMLAttributes<{}> | undefined;
  customClasses?: (op: DeltaInsertOp) => string | string[] | undefined;
  customCssStyles?: (op: DeltaInsertOp) => Partial<CSSProperties> | undefined;
};

export type RenderNode = {
  render: (children: ReactNode) => ReactNode;
  node: ReactNode;
};

export class RenderOp {
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

    const attributes = this.getTagAttributes(Tag);

    let render: RenderNode['render'];

    if (Tag === 'img' && this.op.attributes.link) {
      render = (children) => (
        <a {...this.getLinkAttrs()}>
          <Tag {...attributes}>{children}</Tag>
        </a>
      );
    } else {
      render = (children) => <Tag {...attributes}>{children}</Tag>;
    }

    return {
      render,
      node: render(children),
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

  getCssStyles(): Partial<CSSProperties> {
    const { inlineStyles } = this.options;

    const propsArr: Array<keyof OpAttributes> = ['color'];
    if (inlineStyles || !this.options.allowBackgroundClasses) {
      propsArr.push('background');
    }
    if (inlineStyles) {
      propsArr.push('indent', 'align', 'direction', 'font', 'size');
    }

    const styles: Partial<CSSProperties> = {
      ...this.getCustomCssStyles(),
    };

    for (const attribute of propsArr) {
      const value: unknown = this.op.attributes[attribute];
      if (typeof value === 'string' || typeof value === 'number') {
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

  getTagAttributes<Tag extends keyof JSX.IntrinsicElements>(
    tag: Tag,
  ): HTMLAttributes<{}> {
    if (this.op.attributes.code && !this.op.isLink()) {
      return {};
    }

    const tagAttrs: HTMLAttributes<{}> = {
      ...this.options.customAttributes?.(this.op, tag),
      style: this.getCssStyles(),
    };

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
      // @ts-ignore
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
      // @ts-ignore
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

    const target =
      this.op.attributes.target ||
      (this.options.linkTarget &&
      OpAttributeSanitizer.isValidTarget(this.options.linkTarget)
        ? this.options.linkTarget
        : undefined);

    if (target) {
      attrs.target = target;
    }

    const rel =
      this.op.attributes.rel ||
      (this.options.linkRel &&
      OpAttributeSanitizer.IsValidRel(this.options.linkRel)
        ? this.options.linkRel
        : undefined);

    if (rel) {
      attrs.rel = rel;
    }

    return attrs;
  }

  getCustomTag(format: string) {
    return this.options.customTag?.apply(null, [format, this.op]);
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

    const { attributes } = this.op;

    // blocks
    for (const item of blockTags) {
      if (attributes[item]) {
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
            switch (attributes[item]?.toString()) {
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
            return this.options.paragraphTag || 'p';
        }
      }
    }

    if (this.op.isCustomTextBlock()) {
      return (
        this.getCustomTag('renderAsBlock') || this.options.paragraphTag || 'p'
      );
    }

    // inlines
    for (const item of inlineTags) {
      if (attributes[item]) {
        const customTag = this.getCustomTag(item);
        if (customTag) {
          return customTag;
        }
        switch (item) {
          case 'link':
          case 'mentions':
            return 'a';
          case 'script':
            return attributes[item] === ScriptType.Sub ? 'sub' : 'sup';
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
