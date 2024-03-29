import {
  InlineStyles,
  IOpToHtmlConverterOptions,
  OpToHtmlConverter,
} from './OpToHtmlConverter.js';
import {
  DeltaInsertOp,
  DeltaInsertOpType,
  isDeltaInsertOp,
} from './DeltaInsertOp.js';
import { Grouper } from './grouper/Grouper.js';
import {
  BlockGroup,
  BlotBlock,
  InlineGroup,
  ListGroup,
  ListItem,
  TableCell,
  TableGroup,
  TableRow,
  TDataGroup,
  VideoItem,
} from './grouper/group-types.js';
import { nestLists } from './grouper/nestLists.js';
import { makeEndTag, makeStartTag } from './funcs-html.js';
import { GroupType } from './value-types.js';
import {
  IOpAttributeSanitizerOptions,
  OpAttributeSanitizer,
} from './OpAttributeSanitizer.js';
import { groupTables } from './grouper/TableGrouper.js';
import { denormalizeInsertOp } from './denormalizeInsertOp.js';
import { convertInsertVal } from './convertInsertVal.js';

interface IQuillDeltaToHtmlConverterOptions
  extends IOpAttributeSanitizerOptions,
    IOpToHtmlConverterOptions {
  orderedListTag?: string;
  bulletListTag?: string;

  multiLineBlockquote?: boolean;
  multiLineHeader?: boolean;
  multiLineCodeBlock?: boolean;
  multiLineParagraph?: boolean;
  multiLineCustomBlock?: boolean;
}

const brTag = '<br/>';

export class QuillDeltaToHtmlConverter {
  private readonly options: IQuillDeltaToHtmlConverterOptions;
  private readonly rawDeltaOps: DeltaInsertOpType[] = [];
  private readonly converterOptions: IOpToHtmlConverterOptions;

  // render callbacks
  private callbacks: any = {};

  constructor(deltaOps: any[], options?: IQuillDeltaToHtmlConverterOptions) {
    this.options = {
      paragraphTag: 'p',
      classPrefix: 'ql',
      inlineStyles: false,
      multiLineBlockquote: true,
      multiLineHeader: true,
      multiLineCodeBlock: true,
      multiLineParagraph: true,
      multiLineCustomBlock: true,
      allowBackgroundClasses: false,
      linkTarget: '_blank',
      ...options,
      orderedListTag: 'ol',
      bulletListTag: 'ul',
      listItemTag: 'li',
    };

    var inlineStyles: InlineStyles | undefined;
    if (!this.options.inlineStyles) {
      inlineStyles = undefined;
    } else if (typeof this.options.inlineStyles === 'object') {
      inlineStyles = this.options.inlineStyles;
    } else {
      inlineStyles = {};
    }

    this.converterOptions = {
      classPrefix: this.options.classPrefix,
      inlineStyles: inlineStyles,
      listItemTag: this.options.listItemTag,
      paragraphTag: this.options.paragraphTag,
      linkRel: this.options.linkRel,
      linkTarget: this.options.linkTarget,
      allowBackgroundClasses: this.options.allowBackgroundClasses,
      customTag: this.options.customTag,
      customTagAttributes: this.options.customTagAttributes,
      customCssClasses: this.options.customCssClasses,
      customCssStyles: this.options.customCssStyles,
    };
    this.rawDeltaOps = deltaOps;
  }

  _getListTag(op: DeltaInsertOp): string {
    return op.isOrderedList()
      ? this.options.orderedListTag + ''
      : op.isBulletList()
        ? this.options.bulletListTag + ''
        : op.isCheckedList()
          ? this.options.bulletListTag + ''
          : op.isUncheckedList()
            ? this.options.bulletListTag + ''
            : '';
  }

  getGroupedOps(): TDataGroup[] {
    const deltaOps: DeltaInsertOp[] = [];
    for (const unknownOp of this.rawDeltaOps) {
      if (isDeltaInsertOp(unknownOp)) {
        const denormalizedOps = denormalizeInsertOp(unknownOp);
        for (const { insert, attributes } of denormalizedOps) {
          const insertVal = convertInsertVal(insert, this.options);
          if (insertVal) {
            deltaOps.push(
              new DeltaInsertOp(
                insertVal,
                attributes
                  ? OpAttributeSanitizer.sanitize(attributes, this.options)
                  : undefined,
              ),
            );
          }
        }
      }
    }

    const groupedSameStyleBlocks = Grouper.groupConsecutiveSameStyleBlocks(
      Grouper.pairOpsWithTheirBlock(deltaOps),
      {
        blockquotes: !!this.options.multiLineBlockquote,
        header: !!this.options.multiLineHeader,
        codeBlocks: !!this.options.multiLineCodeBlock,
        customBlocks: !!this.options.multiLineCustomBlock,
      },
    );

    // Move all ops of same style consecutive blocks to the ops of first block and discard the rest.
    const groupedOps = groupedSameStyleBlocks.map((elm) => {
      if (Array.isArray(elm)) {
        const groupsLastInd = elm.length - 1;
        return new BlockGroup(
          elm[0].op,
          elm.flatMap((g, i) => {
            if (!g.ops.length) {
              return [DeltaInsertOp.createNewLineOp()];
            }
            return g.ops.concat(
              i < groupsLastInd ? [DeltaInsertOp.createNewLineOp()] : [],
            );
          }),
        );
      }
      if (elm instanceof BlockGroup && !elm.ops.length) {
        elm.ops.push(DeltaInsertOp.createNewLineOp());
      }
      return elm;
    });

    return nestLists(groupTables(groupedOps));
  }

  render() {
    return this.getGroupedOps()
      .map((group) => {
        if (group instanceof ListGroup) {
          return this._renderWithCallbacks(GroupType.List, group, () =>
            this.renderList(<ListGroup>group),
          );
        }
        if (group instanceof TableGroup) {
          return this._renderWithCallbacks(GroupType.Table, group, () =>
            this._renderTable(<TableGroup>group),
          );
        }
        if (group instanceof BlockGroup) {
          const g = <BlockGroup>group;

          return this._renderWithCallbacks(GroupType.Block, group, () =>
            this._renderBlock(g.op, g.ops),
          );
        }
        if (group instanceof BlotBlock) {
          return this._renderCustom(group.op, null);
        }
        if (group instanceof VideoItem) {
          return this._renderWithCallbacks(GroupType.Video, group, () => {
            const g = group as VideoItem;
            const converter = new OpToHtmlConverter(
              g.op,
              this.converterOptions,
            );
            return converter.getHtml();
          });
        }
        // InlineGroup
        return this._renderWithCallbacks(GroupType.InlineGroup, group, () => {
          return this._renderInlines((group as InlineGroup).ops, true);
        });
      })
      .join('');
  }

  _renderWithCallbacks(
    groupType: GroupType,
    group: TDataGroup,
    myRenderFn: () => string,
  ) {
    var html = '';
    var beforeCb = this.callbacks['beforeRender_cb'];
    html =
      typeof beforeCb === 'function'
        ? beforeCb.apply(null, [groupType, group])
        : '';

    if (!html) {
      html = myRenderFn();
    }

    var afterCb = this.callbacks['afterRender_cb'];
    html =
      typeof afterCb === 'function'
        ? afterCb.apply(null, [groupType, html])
        : html;

    return html;
  }

  renderList(list: ListGroup): string {
    var firstItem = list.items[0];
    return (
      makeStartTag(this._getListTag(firstItem.item.op)) +
      list.items.map((li: ListItem) => this.renderListItem(li)).join('') +
      makeEndTag(this._getListTag(firstItem.item.op))
    );
  }

  renderListItem(li: ListItem): string {
    li.item.op.attributes.indent = 0;
    var converter = new OpToHtmlConverter(li.item.op, this.converterOptions);
    var parts = converter.getHtmlParts();
    var liElementsHtml = this._renderInlines(li.item.ops, false);
    return (
      parts.openingTag +
      liElementsHtml +
      (li.innerList ? this.renderList(li.innerList) : '') +
      parts.closingTag
    );
  }

  _renderTable(table: TableGroup): string {
    return (
      makeStartTag('table') +
      makeStartTag('tbody') +
      table.rows.map((row: TableRow) => this._renderTableRow(row)).join('') +
      makeEndTag('tbody') +
      makeEndTag('table')
    );
  }

  _renderTableRow(row: TableRow): string {
    return (
      makeStartTag('tr') +
      row.cells.map((cell: TableCell) => this._renderTableCell(cell)).join('') +
      makeEndTag('tr')
    );
  }

  _renderTableCell(cell: TableCell): string {
    var converter = new OpToHtmlConverter(cell.item.op, this.converterOptions);
    var parts = converter.getHtmlParts();
    var cellElementsHtml = this._renderInlines(cell.item.ops, false);
    return (
      makeStartTag('td', {
        key: 'data-row',
        value: cell.item.op.attributes.table,
      }) +
      parts.openingTag +
      cellElementsHtml +
      parts.closingTag +
      makeEndTag('td')
    );
  }

  _renderBlock(bop: DeltaInsertOp, ops: DeltaInsertOp[]) {
    var converter = new OpToHtmlConverter(bop, this.converterOptions);
    var htmlParts = converter.getHtmlParts();

    if (bop.isCodeBlock()) {
      return (
        htmlParts.openingTag +
        ops
          .map((iop) =>
            iop.isCustomEmbed()
              ? this._renderCustom(iop, bop)
              : iop.insert.value,
          )
          .join('') +
        htmlParts.closingTag
      );
    }

    var inlines = ops.map((op) => this._renderInline(op, bop)).join('');
    return htmlParts.openingTag + (inlines || brTag) + htmlParts.closingTag;
  }

  _renderInlines(ops: DeltaInsertOp[], isInlineGroup = true) {
    var opsLen = ops.length - 1;
    var html = ops
      .map((op: DeltaInsertOp, i: number) => {
        if (i > 0 && i === opsLen && op.isJustNewline()) {
          return '';
        }
        return this._renderInline(op, null);
      })
      .join('');
    if (!isInlineGroup) {
      return html;
    }

    let startParaTag = makeStartTag(this.options.paragraphTag);
    let endParaTag = makeEndTag(this.options.paragraphTag);
    if (html === brTag || this.options.multiLineParagraph) {
      return startParaTag + html + endParaTag;
    }
    return (
      startParaTag +
      html
        .split(brTag)
        .map((v) => v || brTag)
        .join(endParaTag + startParaTag) +
      endParaTag
    );
  }

  _renderInline(op: DeltaInsertOp, contextOp: DeltaInsertOp | null) {
    if (op.isCustomEmbed()) {
      return this._renderCustom(op, contextOp);
    }
    var converter = new OpToHtmlConverter(op, this.converterOptions);
    return converter.getHtml().replace(/\n/g, brTag);
  }

  _renderCustom(op: DeltaInsertOp, contextOp: DeltaInsertOp | null) {
    var renderCb = this.callbacks['renderCustomOp_cb'];
    if (typeof renderCb === 'function') {
      return renderCb.apply(null, [op, contextOp]);
    }
    return '';
  }

  beforeRender(cb: (group: GroupType, data: TDataGroup) => string) {
    this.callbacks['beforeRender_cb'] = cb;
  }

  afterRender(cb: (group: GroupType, html: string) => string) {
    this.callbacks['afterRender_cb'] = cb;
  }

  renderCustomWith(
    cb: (op: DeltaInsertOp, contextOp: DeltaInsertOp) => string,
  ) {
    this.callbacks['renderCustomOp_cb'] = cb;
  }
}
