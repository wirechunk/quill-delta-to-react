import {
  InlineStyles,
  OpToNodeConverterOptions,
  OpToHtmlConverter,
} from './op-to-node.js';
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
  TDataGroup,
  VideoItem,
} from './grouper/group-types.js';
import { nestLists } from './grouper/nestLists.js';
import {
  OpAttributeSanitizerOptions,
  OpAttributeSanitizer,
} from './OpAttributeSanitizer.js';
import { groupTables } from './grouper/TableGrouper.js';
import { denormalizeInsertOp } from './denormalizeInsertOp.js';
import { convertInsertValue } from './convert-insert-value.js';
import { Component, Fragment, JSX, ReactNode } from 'react';
import { br, newLine } from './constants.js';

type RenderDeltaOptions = OpAttributeSanitizerOptions &
  OpToNodeConverterOptions & {
    orderedListTag: keyof JSX.IntrinsicElements;
    bulletListTag: keyof JSX.IntrinsicElements;
    multiLineBlockquote: boolean;
    multiLineHeader: boolean;
    multiLineCodeBlock: boolean;
    multiLineParagraph: boolean;
    multiLineCustomBlock: boolean;
  };

type RenderDeltaProps = {
  deltaOps: unknown[];
  options?: Partial<RenderDeltaOptions>;
};

type RenderDeltaState = {
  options: RenderDeltaOptions;
  converterOptions: OpToNodeConverterOptions;
};

export class RenderDelta extends Component<RenderDeltaProps, RenderDeltaState> {
  constructor(props: RenderDeltaProps) {
    super(props);

    const options: RenderDeltaOptions = {
      orderedListTag: 'ol',
      bulletListTag: 'ul',
      multiLineBlockquote: true,
      multiLineHeader: true,
      multiLineCodeBlock: true,
      multiLineParagraph: true,
      multiLineCustomBlock: true,
      classPrefix: 'ql',
      inlineStyles: false,
      listItemTag: 'li',
      paragraphTag: 'p',
      linkTarget: '_blank',
      allowBackgroundClasses: false,
      urlSanitizer: (url) => url,
      ...props.options,
    };

    let inlineStyles: Partial<InlineStyles> | undefined;
    if (options.inlineStyles) {
      if (typeof options.inlineStyles === 'object') {
        inlineStyles = options.inlineStyles;
      } else {
        inlineStyles = {};
      }
    }

    const converterOptions: OpToNodeConverterOptions = {
      classPrefix: options.classPrefix,
      inlineStyles,
      listItemTag: options.listItemTag,
      paragraphTag: options.paragraphTag,
      linkRel: options.linkRel,
      linkTarget: options.linkTarget,
      allowBackgroundClasses: options.allowBackgroundClasses,
      customTag: options.customTag,
      customAttributes: options.customAttributes,
      customClasses: options.customClasses,
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
        return converter.renderNode().node;
      }
      // InlineGroup
      return this.renderInlines((group as InlineGroup).ops, true);
    });
  }

  getListTag(op: DeltaInsertOp): keyof JSX.IntrinsicElements {
    return op.isOrderedList()
      ? this.state.options.orderedListTag
      : op.isBulletList()
        ? this.state.options.bulletListTag
        : op.isCheckedList()
          ? this.state.options.bulletListTag
          : this.state.options.bulletListTag;
  }

  getGroupedOps(): TDataGroup[] {
    const deltaOps: DeltaInsertOp[] = [];
    for (const unknownOp of this.props.deltaOps) {
      if (isDeltaInsertOp(unknownOp)) {
        const denormalizedOps = denormalizeInsertOp(unknownOp);
        for (const { insert, attributes } of denormalizedOps) {
          const insertVal = convertInsertValue(insert, this.state.options);
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

  private renderList(list: ListGroup): ReactNode {
    const Tag = this.getListTag(list.items[0].item.op);
    return <Tag>{list.items.map((li) => this.renderListItem(li))}</Tag>;
  }

  renderListItem(li: ListItem): ReactNode {
    li.item.op.attributes.indent = 0;
    const converter = new OpToHtmlConverter(
      li.item.op,
      this.state.converterOptions,
    );
    const { render } = converter.renderNode();
    return render(
      <>
        {this.renderInlines(li.item.ops, false)}
        {li.innerList && this.renderList(li.innerList)}
      </>,
    );
  }

  private renderTable(table: TableGroup): ReactNode {
    return (
      <table>
        <tbody>
          <tr>
            {table.rows.map((row) =>
              row.cells.map((cell) => this.renderTableCell(cell)),
            )}
          </tr>
        </tbody>
      </table>
    );
  }

  private renderTableCell(cell: TableCell): ReactNode {
    const converter = new OpToHtmlConverter(
      cell.item.op,
      this.state.converterOptions,
    );
    const { render } = converter.renderNode();
    const cellElements = this.renderInlines(cell.item.ops, false);
    return (
      <td data-row={cell.item.op.attributes.table}>{render(cellElements)}</td>
    );
  }

  private renderBlock(bop: DeltaInsertOp, ops: DeltaInsertOp[]) {
    const converter = new OpToHtmlConverter(bop, this.state.converterOptions);
    const { render } = converter.renderNode();

    if (bop.isCodeBlock()) {
      return render(
        ops.map((iop) =>
          iop.isCustomEmbed() ? this.renderCustom(iop, bop) : iop.insert.value,
        ),
      );
    }

    const inlines = ops.map((op) => this.renderInline(op, bop));
    return render(inlines.length ? inlines : br);
  }

  private renderInlines(ops: DeltaInsertOp[], isInlineGroup = true): ReactNode {
    const lastIndex = ops.length - 1;
    const html = ops.map((op, i) => {
      if (i > 0 && i === lastIndex && op.isJustNewline()) {
        return '';
      }
      return this.renderInline(op, null);
    });
    if (!isInlineGroup) {
      return html;
    }

    const Tag = this.state.options.paragraphTag || 'p';

    if (
      (html.length === 1 && html[0] === br) ||
      this.state.options.multiLineParagraph
    ) {
      return <Tag>{html}</Tag>;
    }

    return (
      <Tag>
        {html.map((node, i) => (
          <Fragment key={i}>{node === '' ? br : node}</Fragment>
        ))}
      </Tag>
    );
  }

  private renderInline(
    op: DeltaInsertOp,
    contextOp: DeltaInsertOp | null,
  ): ReactNode {
    if (op.isCustomEmbed()) {
      return this.renderCustom(op, contextOp);
    }
    if (op.isJustNewline() && !op.isContainerBlock()) {
      return newLine;
    }
    const converter = new OpToHtmlConverter(op, this.state.converterOptions);
    const { node } = converter.renderNode();
    return Array.isArray(node)
      ? node.map((n) => (n === newLine ? br : n))
      : node;
  }

  private renderCustom(
    _op: DeltaInsertOp,
    _contextOp: DeltaInsertOp | null,
  ): ReactNode {
    // TODO
    return null;
  }
}
