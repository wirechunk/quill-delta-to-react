import {
  InlineStyles,
  OpToNodeConverterOptions,
  RenderOp,
} from './render-op.js';
import { DeltaInsertOp } from './DeltaInsertOp.js';
import {
  groupConsecutiveSameStyleBlocks,
  pairOpsWithTheirBlock,
} from './grouper/grouping.js';
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
import { nestLists } from './grouper/nest-lists.js';
import {
  OpAttributeSanitizerOptions,
  OpAttributeSanitizer,
} from './OpAttributeSanitizer.js';
import { groupTables } from './grouper/group-tables.js';
import { denormalizeInsertOp } from './denormalize.js';
import { convertInsertValue, isDeltaInsertOp } from './convert-insert-value.js';
import { Component, Fragment, JSX, ReactNode } from 'react';
import { br, newLine } from './constants.js';
import { InsertDataCustom } from './InsertData.js';

export type RenderDeltaOptions = OpAttributeSanitizerOptions &
  OpToNodeConverterOptions & {
    orderedListTag: keyof JSX.IntrinsicElements;
    bulletListTag: keyof JSX.IntrinsicElements;
    multiLineBlockquote: boolean;
    multiLineHeader: boolean;
    multiLineCodeBlock: boolean;
    multiLineParagraph: boolean;
    multiLineCustomBlock: boolean;
  };

export type CustomRenderer = (
  op: DeltaInsertOp<InsertDataCustom>,
  contextOp: DeltaInsertOp | null,
) => ReactNode;

export type RenderDeltaProps = {
  ops: unknown[];
  options?: Partial<RenderDeltaOptions>;
  customRenderer?: CustomRenderer;
};

export type RenderDeltaState = {
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
      mentionTag: options.mentionTag,
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
        return this.renderList(group);
      }
      if (group instanceof TableGroup) {
        return this.renderTable(group);
      }
      if (group instanceof BlockGroup) {
        return this.renderBlock(group.op, group.ops);
      }
      if (group instanceof BlotBlock) {
        return this.renderCustom(group.op, null);
      }
      if (group instanceof VideoItem) {
        return this.renderVideo(group.op);
      }
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
    for (const unknownOp of this.props.ops) {
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

    const groupedSameStyleBlocks = groupConsecutiveSameStyleBlocks(
      pairOpsWithTheirBlock(deltaOps),
      {
        blockquotes: this.state.options.multiLineBlockquote,
        header: this.state.options.multiLineHeader,
        codeBlocks: this.state.options.multiLineCodeBlock,
        customBlocks: this.state.options.multiLineCustomBlock,
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
    const converter = new RenderOp(li.item.op, this.state.converterOptions);
    return converter.renderOp(
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
    const converter = new RenderOp(cell.item.op, this.state.converterOptions);
    const cellElements = this.renderInlines(cell.item.ops, false);
    return (
      <td data-row={cell.item.op.attributes.table}>
        {converter.renderOp(cellElements)}
      </td>
    );
  }

  private renderBlock(blockOp: DeltaInsertOp, ops: DeltaInsertOp[]) {
    const converter = new RenderOp(blockOp, this.state.converterOptions);

    if (blockOp.isCodeBlock()) {
      return converter.renderOp(
        ops.map((iop) =>
          iop.isCustomEmbed()
            ? this.renderCustom(iop, blockOp)
            : (iop.insert.value as string),
        ),
      );
    }

    const inlines = ops.map((op) => this.renderInline(op, blockOp));
    return converter.renderOp(inlines.length ? inlines : br);
  }

  private renderInlines(
    ops: DeltaInsertOp[],
    isInlineGroup: boolean,
  ): ReactNode {
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
          // Either we should add the || node === null here or RenderO's renderFn should be changed to return an
          // empty string when isContainerBlock or when !(isMentions() || isFormula() || isText())
          <Fragment key={i}>
            {node === '' || node === null ? br : node}
          </Fragment>
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
    if (op.isContainerBlock()) {
      return null;
    }
    if (op.isJustNewline()) {
      return newLine;
    }
    if (op.isMentions() || op.isFormula() || op.isText()) {
      return op.insert.value;
    }
    return null;
  }

  private renderVideo(op: DeltaInsertOp): ReactNode {
    const ro = new RenderOp(op, this.state.converterOptions);
    return ro.renderOp(null);
  }

  private renderCustom(
    op: DeltaInsertOp<InsertDataCustom>,
    contextOp: DeltaInsertOp | null,
  ): ReactNode {
    return this.props.customRenderer?.(op, contextOp) ?? null;
  }
}
