import {
  InlineStyles,
  IOpToHtmlConverterOptions,
  OpToHtmlConverter,
} from './OpToHtmlConverter.js';
import { DeltaInsertOp, isDeltaInsertOp } from './DeltaInsertOp.js';
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
import {
  IOpAttributeSanitizerOptions,
  OpAttributeSanitizer,
} from './OpAttributeSanitizer.js';
import { groupTables } from './grouper/TableGrouper.js';
import { denormalizeInsertOp } from './denormalizeInsertOp.js';
import { convertInsertVal } from './convertInsertVal.js';
import { Component, ReactNode } from 'react';

interface RenderDeltaOptions
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

type RenderDeltaProps = {
  deltaOps: unknown[];
  options?: RenderDeltaOptions;
};

type RenderDeltaState = {
  options: RenderDeltaOptions;
  converterOptions: IOpToHtmlConverterOptions;
};

export class RenderDelta extends Component<RenderDeltaProps, RenderDeltaState> {
  constructor(props: RenderDeltaProps) {
    super(props);

    const options: RenderDeltaOptions = {
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
      ...props.options,
      orderedListTag: 'ol',
      bulletListTag: 'ul',
      listItemTag: 'li',
    };

    let inlineStyles: InlineStyles | undefined;
    if (options.inlineStyles) {
      if (typeof options.inlineStyles === 'object') {
        inlineStyles = options.inlineStyles;
      } else {
        inlineStyles = {};
      }
    }

    const converterOptions: IOpToHtmlConverterOptions = {
      classPrefix: options.classPrefix,
      inlineStyles,
      listItemTag: options.listItemTag,
      paragraphTag: options.paragraphTag,
      linkRel: options.linkRel,
      linkTarget: options.linkTarget,
      allowBackgroundClasses: options.allowBackgroundClasses,
      customTag: options.customTag,
      customTagAttributes: options.customTagAttributes,
      customCssClasses: options.customCssClasses,
      customCssStyles: options.customCssStyles,
    };

    this.state = {
      options,
      converterOptions,
    };
  }

  render(): ReactNode {
    return this.getGroupedOps().map((group) => {
      if (group instanceof ListGroup) {
        return this.renderList(group as ListGroup);
      }
      if (group instanceof TableGroup) {
        return this.renderTable(group as TableGroup);
      }
      if (group instanceof BlockGroup) {
        const g = group as BlockGroup;

        return this.renderBlock(g.op, g.ops);
      }
      if (group instanceof BlotBlock) {
        return this.renderCustom(group.op, null);
      }
      if (group instanceof VideoItem) {
        const g = group as VideoItem;
        const converter = new OpToHtmlConverter(
          g.op,
          this.state.converterOptions,
        );
        return converter.getHtml();
      }
      // InlineGroup
      return this.renderInlines((group as InlineGroup).ops, true);
    });
  }

  getListTag(op: DeltaInsertOp): string {
    return op.isOrderedList()
      ? this.state.options.orderedListTag + ''
      : op.isBulletList()
        ? this.state.options.bulletListTag + ''
        : op.isCheckedList()
          ? this.state.options.bulletListTag + ''
          : op.isUncheckedList()
            ? this.state.options.bulletListTag + ''
            : '';
  }

  getGroupedOps(): TDataGroup[] {
    const deltaOps: DeltaInsertOp[] = [];
    for (const unknownOp of this.props.deltaOps) {
      if (isDeltaInsertOp(unknownOp)) {
        const denormalizedOps = denormalizeInsertOp(unknownOp);
        for (const { insert, attributes } of denormalizedOps) {
          const insertVal = convertInsertVal(insert, this.state.options);
          if (insertVal) {
            deltaOps.push(
              new DeltaInsertOp(
                insertVal,
                attributes
                  ? OpAttributeSanitizer.sanitize(
                      attributes,
                      this.state.options,
                    )
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
        blockquotes: !!this.state.options.multiLineBlockquote,
        header: !!this.state.options.multiLineHeader,
        codeBlocks: !!this.state.options.multiLineCodeBlock,
        customBlocks: !!this.state.options.multiLineCustomBlock,
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

  renderList(list: ListGroup): string {
    var firstItem = list.items[0];
    return (
      makeStartTag(this.getListTag(firstItem.item.op)) +
      list.items.map((li: ListItem) => this.renderListItem(li)).join('') +
      makeEndTag(this.getListTag(firstItem.item.op))
    );
  }

  renderListItem(li: ListItem): string {
    li.item.op.attributes.indent = 0;
    var converter = new OpToHtmlConverter(
      li.item.op,
      this.state.converterOptions,
    );
    var parts = converter.getHtmlParts();
    var liElementsHtml = this.renderInlines(li.item.ops, false);
    return (
      parts.openingTag +
      liElementsHtml +
      (li.innerList ? this.renderList(li.innerList) : '') +
      parts.closingTag
    );
  }

  renderTable(table: TableGroup): string {
    return (
      makeStartTag('table') +
      makeStartTag('tbody') +
      table.rows.map((row: TableRow) => this.renderTableRow(row)).join('') +
      makeEndTag('tbody') +
      makeEndTag('table')
    );
  }

  renderTableRow(row: TableRow): string {
    return (
      makeStartTag('tr') +
      row.cells.map((cell: TableCell) => this.renderTableCell(cell)).join('') +
      makeEndTag('tr')
    );
  }

  renderTableCell(cell: TableCell): string {
    var converter = new OpToHtmlConverter(
      cell.item.op,
      this.state.converterOptions,
    );
    var parts = converter.getHtmlParts();
    var cellElementsHtml = this.renderInlines(cell.item.ops, false);
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

  renderBlock(bop: DeltaInsertOp, ops: DeltaInsertOp[]) {
    const converter = new OpToHtmlConverter(bop, this.state.converterOptions);
    var htmlParts = converter.getHtmlParts();

    if (bop.isCodeBlock()) {
      return (
        htmlParts.openingTag +
        ops
          .map((iop) =>
            iop.isCustomEmbed()
              ? this.renderCustom(iop, bop)
              : iop.insert.value,
          )
          .join('') +
        htmlParts.closingTag
      );
    }

    var inlines = ops.map((op) => this.renderInline(op, bop)).join('');
    return htmlParts.openingTag + (inlines || brTag) + htmlParts.closingTag;
  }

  renderInlines(ops: DeltaInsertOp[], isInlineGroup = true) {
    var opsLen = ops.length - 1;
    var html = ops
      .map((op: DeltaInsertOp, i: number) => {
        if (i > 0 && i === opsLen && op.isJustNewline()) {
          return '';
        }
        return this.renderInline(op, null);
      })
      .join('');
    if (!isInlineGroup) {
      return html;
    }

    let startParaTag = makeStartTag(this.state.options.paragraphTag);
    let endParaTag = makeEndTag(this.state.options.paragraphTag);
    if (html === brTag || this.state.options.multiLineParagraph) {
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

  renderInline(op: DeltaInsertOp, contextOp: DeltaInsertOp | null) {
    if (op.isCustomEmbed()) {
      return this.renderCustom(op, contextOp);
    }
    const converter = new OpToHtmlConverter(op, this.state.converterOptions);
    return converter.getHtml().replace(/\n/g, brTag);
  }

  renderCustom(
    _op: DeltaInsertOp,
    _contextOp: DeltaInsertOp | null,
  ): ReactNode {
    // TODO
    return null;
  }
}
