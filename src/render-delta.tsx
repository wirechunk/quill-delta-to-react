import {
  InlineStyles,
  RenderOp,
  RenderOpOptions,
  renderOpOptionsDefault,
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
  OpAttributeSanitizer,
  OpAttributeSanitizerOptions,
} from './OpAttributeSanitizer.js';
import { groupTables } from './grouper/group-tables.js';
import { denormalizeInsertOp } from './denormalize.js';
import { convertInsertValue, isDeltaInsertOp } from './convert-insert-value.js';
import { Component, Fragment, JSX, ReactNode } from 'react';
import { InsertDataCustom, InsertDataQuill } from './InsertData.js';
import { DataType } from './value-types.js';

export type RenderDeltaOptions = OpAttributeSanitizerOptions &
  RenderOpOptions & {
    orderedListTag: keyof JSX.IntrinsicElements;
    bulletListTag: keyof JSX.IntrinsicElements;
    multiLineBlockquote: boolean;
    multiLineHeader: boolean;
    multiLineCodeBlock: boolean;
  };

export type CustomRenderer = (
  op: DeltaInsertOp<InsertDataCustom>,
  contextOp: DeltaInsertOp | null,
) => ReactNode;

export type RenderDeltaProps = {
  ops: unknown[];
  options?: Partial<RenderDeltaOptions> | null;
  customRenderer?: CustomRenderer | null;
};

export type RenderDeltaState = {
  options: RenderDeltaOptions;
};

export class RenderDelta extends Component<RenderDeltaProps, RenderDeltaState> {
  constructor(props: RenderDeltaProps) {
    super(props);

    let inlineStyles: boolean | Partial<InlineStyles> = false;
    if (props.options?.inlineStyles) {
      if (typeof props.options.inlineStyles === 'object') {
        inlineStyles = props.options.inlineStyles;
      } else {
        inlineStyles = {};
      }
    }

    const options: RenderDeltaOptions = {
      orderedListTag: 'ol',
      bulletListTag: 'ul',
      multiLineBlockquote: true,
      multiLineHeader: true,
      multiLineCodeBlock: true,
      urlSanitizer: (url) => url,
      ...renderOpOptionsDefault,
      ...props.options,
      inlineStyles,
    };

    this.state = {
      options,
    };
  }

  render(): ReactNode {
    return this.getGroupedOps().map((group, i) => {
      if (group instanceof ListGroup) {
        return (
          <RenderDelta.list
            key={i}
            list={group}
            options={this.state.options}
            customRenderer={this.props.customRenderer}
          />
        );
      }
      if (group instanceof TableGroup) {
        return (
          <RenderDelta.table
            key={i}
            tableOp={group}
            options={this.state.options}
            customRenderer={this.props.customRenderer}
          />
        );
      }
      if (group instanceof BlockGroup) {
        return (
          <RenderDelta.block
            key={i}
            blockOp={group.op}
            ops={group.ops}
            options={this.state.options}
            customRenderer={this.props.customRenderer}
          />
        );
      }
      if (group instanceof BlotBlock) {
        return (
          <RenderDelta.custom
            key={i}
            op={group.op}
            contextOp={null}
            customRenderer={this.props.customRenderer}
          />
        );
      }
      if (group instanceof VideoItem) {
        return <RenderDelta.video op={group.op} options={this.state.options} />;
      }
      const Tag = this.state.options.paragraphTag;
      return (
        <Tag key={i}>
          <RenderDelta.inlines
            ops={(group as InlineGroup).ops}
            options={this.state.options}
            customRenderer={this.props.customRenderer}
          />
        </Tag>
      );
    });
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
      this.state.options,
    );

    // Move all ops of same style consecutive blocks to the ops of first block and discard the rest.
    const groupedOps = groupedSameStyleBlocks.map((elm) => {
      if (Array.isArray(elm)) {
        const groupsLastInd = elm.length - 1;
        return new BlockGroup(
          elm[0].op,
          elm.flatMap((g, i) => {
            if (g.ops.length) {
              if (i < groupsLastInd) {
                return [...g.ops, DeltaInsertOp.createNewLineOp()];
              }
              return g.ops;
            }
            // Discard any other attributes so that we do not render any markup.
            const { insert } = g.op;
            if (insert instanceof InsertDataCustom) {
              return [DeltaInsertOp.createNewLineOp()];
            }
            return [
              new DeltaInsertOp(
                new InsertDataQuill(DataType.Text, insert.value),
              ),
            ];
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

  private static getListTag(
    op: DeltaInsertOp,
    options: RenderDeltaOptions,
  ): keyof JSX.IntrinsicElements {
    return op.isOrderedList()
      ? options.orderedListTag
      : op.isBulletList()
        ? options.bulletListTag
        : op.isCheckedList()
          ? options.bulletListTag
          : options.bulletListTag;
  }

  private static list({
    list,
    options,
    customRenderer,
  }: {
    list: ListGroup;
    options: RenderDeltaOptions;
    customRenderer: CustomRenderer | null | undefined;
  }): ReactNode {
    const Tag = RenderDelta.getListTag(list.items[0].item.op, options);
    return (
      <Tag>
        {list.items.map((li, i) => (
          <RenderDelta.listItem
            key={i}
            li={li}
            options={options}
            customRenderer={customRenderer}
          />
        ))}
      </Tag>
    );
  }

  private static listItem({
    li,
    options,
    customRenderer,
  }: {
    li: ListItem;
    options: RenderDeltaOptions;
    customRenderer: CustomRenderer | null | undefined;
  }): ReactNode {
    li.item.op.attributes.indent = 0;
    const converter = new RenderOp(li.item.op, options);
    return converter.renderOp(
      <>
        <RenderDelta.inlines
          ops={li.item.ops}
          options={options}
          customRenderer={customRenderer}
        />
        {li.innerList && (
          <RenderDelta.list
            list={li.innerList}
            options={options}
            customRenderer={customRenderer}
          />
        )}
      </>,
    );
  }

  private static table({
    tableOp,
    options,
    customRenderer,
  }: {
    tableOp: TableGroup;
    options: RenderDeltaOptions;
    customRenderer: CustomRenderer | null | undefined;
  }): ReactNode {
    return (
      <table>
        <tbody>
          {tableOp.rows.map((row, rowI) => (
            <tr key={rowI}>
              {row.cells.map((cell, cellI) => (
                <RenderDelta.tableCell
                  key={cellI}
                  cell={cell}
                  options={options}
                  customRenderer={customRenderer}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  private static tableCell({
    cell,
    options,
    customRenderer,
  }: {
    cell: TableCell;
    options: RenderDeltaOptions;
    customRenderer: CustomRenderer | null | undefined;
  }): ReactNode {
    const converter = new RenderOp(cell.item.op, options);
    return (
      <td data-row={cell.item.op.attributes.table}>
        {converter.renderOp(
          <RenderDelta.inlines
            ops={cell.item.ops}
            options={options}
            customRenderer={customRenderer}
          />,
        )}
      </td>
    );
  }

  private static block({
    blockOp,
    ops,
    options,
    customRenderer,
  }: {
    blockOp: DeltaInsertOp;
    ops: DeltaInsertOp[];
    options: RenderDeltaOptions;
    customRenderer: CustomRenderer | null | undefined;
  }) {
    const converter = new RenderOp(blockOp, options);

    if (blockOp.isCodeBlock()) {
      return converter.renderOp(
        ops.map((iop, i) =>
          iop.isCustomEmbed() ? (
            <RenderDelta.custom
              key={i}
              op={iop}
              contextOp={blockOp}
              customRenderer={customRenderer}
            />
          ) : (
            <Fragment key={i}>{iop.insert.value as string}</Fragment>
          ),
        ),
      );
    }

    const lastInd = ops.length - 1;
    return converter.renderOp(
      ops.map((op, i) => {
        if (op.isJustNewline()) {
          return <Fragment key={i}>{i < lastInd ? '\n' : null}</Fragment>;
        }
        return (
          <RenderDelta.inline
            key={i}
            op={op}
            contextOp={blockOp}
            options={options}
            customRenderer={customRenderer}
          />
        );
      }),
    );
  }

  private static inlines({
    ops,
    options,
    customRenderer,
  }: {
    ops: DeltaInsertOp[];
    options: RenderDeltaOptions;
    customRenderer: CustomRenderer | null | undefined;
  }): ReactNode[] {
    const lastIndex = ops.length - 1;
    return ops.map((op, i) => {
      if (i > 0 && i === lastIndex && op.isJustNewline()) {
        return <Fragment key={i} />;
      }
      return (
        <RenderDelta.inline
          key={i}
          op={op}
          contextOp={null}
          options={options}
          customRenderer={customRenderer}
        />
      );
    });
  }

  private static inline({
    op,
    contextOp,
    options,
    customRenderer,
  }: {
    op: DeltaInsertOp;
    contextOp: DeltaInsertOp | null;
    options: RenderDeltaOptions;
    customRenderer: CustomRenderer | null | undefined;
  }): ReactNode {
    if (op.isCustomEmbed()) {
      return (
        <RenderDelta.custom
          op={op}
          contextOp={contextOp}
          customRenderer={customRenderer}
        />
      );
    }
    const ro = new RenderOp(op, options);
    return ro.renderOp(
      op.insert.value === '\n' ? null : (op.insert as InsertDataQuill).value,
    );
  }

  private static video({
    op,
    options,
  }: {
    op: DeltaInsertOp;
    options: RenderDeltaOptions;
  }): ReactNode {
    const ro = new RenderOp(op, options);
    return ro.renderOp(null);
  }

  private static custom({
    op,
    contextOp,
    customRenderer,
  }: {
    op: DeltaInsertOp<InsertDataCustom>;
    contextOp: DeltaInsertOp | null;
    customRenderer: CustomRenderer | null | undefined;
  }): ReactNode {
    return customRenderer?.(op, contextOp) ?? null;
  }
}
