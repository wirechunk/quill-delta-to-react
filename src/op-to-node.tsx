import type { AttributeKeyValueTuple } from './funcs-html.js';
import { JSX, ReactNode } from 'react';
import { DeltaInsertOp } from './DeltaInsertOp.js';
import { ScriptType } from './value-types.js';
import { IMention } from './mentions/MentionSanitizer.js';
import { OpAttributeSanitizer } from './OpAttributeSanitizer.js';
import { newLine } from './constants.js';
import { preferSecond } from './helpers/array.js';

export type InlineStyleType =
  | ((value: string, op: DeltaInsertOp) => string | undefined)
  | { [x: string]: string };

export interface InlineStyles {
  indent?: InlineStyleType;
  align?: InlineStyleType;
  direction?: InlineStyleType;
  font?: InlineStyleType;
  size?: InlineStyleType;
}

const DEFAULT_INLINE_FONTS: { [key: string]: string } = {
  serif: 'font-family: Georgia, Times New Roman, serif',
  monospace: 'font-family: Monaco, Courier New, monospace',
};

export const DEFAULT_INLINE_STYLES: InlineStyles = {
  font: (value) => DEFAULT_INLINE_FONTS[value] || 'font-family:' + value,
  size: {
    small: 'font-size: 0.75em',
    large: 'font-size: 1.5em',
    huge: 'font-size: 2.5em',
  },
  indent: (value, op) => {
    var indentSize = parseInt(value, 10) * 3;
    var side = op.attributes['direction'] === 'rtl' ? 'right' : 'left';
    return 'padding-' + side + ':' + indentSize + 'em';
  },
  direction: (value, op) => {
    if (value === 'rtl') {
      return (
        'direction:rtl' + (op.attributes['align'] ? '' : '; text-align:inherit')
      );
    }
    return undefined;
  },
};

export type OpToNodeConverterOptions = {
  classPrefix?: string;
  inlineStyles?: boolean | InlineStyles;
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
  customClasses?: (op: DeltaInsertOp) => string | string[] | void;
  customCssStyles?: (op: DeltaInsertOp) => string | string[] | void;
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

  getHtml(): ReactNode {
    if (this.op.isJustNewline() && !this.op.isContainerBlock()) {
      return newLine;
    }

    return this.renderNode().node;
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

  getCssStyles(): string[] {
    var attrs: any = this.op.attributes;

    var propsArr = [['color']];
    if (!!this.options.inlineStyles || !this.options.allowBackgroundClasses) {
      propsArr.push(['background', 'background-color']);
    }
    if (this.options.inlineStyles) {
      propsArr = propsArr.concat([
        ['indent'],
        ['align', 'text-align'],
        ['direction'],
        ['font', 'font-family'],
        ['size'],
      ]);
    }

    return (this.getCustomCssStyles() || [])
      .concat(
        propsArr
          .filter((item) => !!attrs[item[0]])
          .map((item: any[]) => {
            let attribute = item[0];
            let attrValue = attrs[attribute];

            let attributeConverter: InlineStyleType =
              (this.options.inlineStyles &&
                (this.options.inlineStyles as any)[attribute]) ||
              (DEFAULT_INLINE_STYLES as any)[attribute];

            if (typeof attributeConverter === 'object') {
              return attributeConverter[attrValue];
            } else if (typeof attributeConverter === 'function') {
              var converterFn = attributeConverter as (
                value: string,
                op: DeltaInsertOp,
              ) => string;
              return converterFn(attrValue, this.op);
            } else {
              return preferSecond(item) + ':' + attrValue;
            }
          }),
      )
      .filter((item: any) => item !== undefined);
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
      var mention: IMention = this.op.attributes.mention!;
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
      tagAttrs.push(['style', styles.join(';')]);
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
    if (
      this.options.customCssStyles &&
      typeof this.options.customCssStyles === 'function'
    ) {
      const res = this.options.customCssStyles.apply(null, [this.op]);
      if (res) {
        return Array.isArray(res) ? res : [res];
      }
    }
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

    type TagOrKeyToTag =
      | [keyof JSX.IntrinsicElements]
      | [string, keyof JSX.IntrinsicElements];

    const blockTags: TagOrKeyToTag[] = [
      ['blockquote'],
      ['code-block', 'pre'],
      ['list', this.options.listItemTag || 'li'],
      ['header'],
      ['align', paragraphTag],
      ['direction', paragraphTag],
      ['indent', paragraphTag],
    ];

    for (const [firstItem, secondItem] of blockTags) {
      if (attrs[firstItem]) {
        const customTag = this.getCustomTag(firstItem);
        if (customTag) {
          return customTag;
        }
        if (firstItem === 'header') {
          return `h${attrs[firstItem]}` as keyof JSX.IntrinsicElements;
        }
        return secondItem ?? (firstItem as keyof JSX.IntrinsicElements);
      }
    }

    if (this.op.isCustomTextBlock()) {
      return this.getCustomTag('renderAsBlock') || paragraphTag;
    }

    // inlines
    const inlineTags: TagOrKeyToTag[] = [
      ['link', 'a'],
      ['mentions', 'a'],
      ['script'],
      ['bold', 'strong'],
      ['italic', 'em'],
      ['strike', 's'],
      ['underline', 'u'],
      ['code'],
    ];

    for (const [firstItem, secondItem] of inlineTags) {
      if (attrs[firstItem]) {
        const customTag = this.getCustomTag(firstItem);
        if (customTag) {
          return customTag;
        }
        if (firstItem === 'script') {
          return attrs[firstItem] === ScriptType.Sub ? 'sub' : 'sup';
        }
        return secondItem ?? (firstItem as keyof JSX.IntrinsicElements);
      }
    }

    return 'span';
  }
}
