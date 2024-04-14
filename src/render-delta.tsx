import {
  InlineStyles,
  RenderOpOptions,
  renderOpOptionsDefault,
} from './render-op.js';
import type { DeltaInsertOp } from './delta-insert-op.js';
import { groupOps } from './grouper/grouping.js';
import {
  BlockGroup,
  BlotBlock,
  InlineGroup,
  ListGroup,
  TableGroup,
  VideoItem,
} from './grouper/group-types.js';
import type { OpAttributeSanitizerOptions } from './sanitize-attributes.js';
import { Fragment, FunctionComponent, JSX, ReactNode, useMemo } from 'react';
import type { InsertDataCustom } from './insert-data.js';
import { List } from './list.js';
import { Inlines } from './inlines.js';
import { Block } from './block.js';
import { Table } from './table.js';
import { Video } from './video.js';

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

/**
 * Render Quill Delta ops.
 */
export const RenderDelta: FunctionComponent<RenderDeltaProps> = (props) => {
  const options = useMemo<RenderDeltaOptions>(() => {
    let inlineStyles: boolean | Partial<InlineStyles> = false;
    if (props.options?.inlineStyles) {
      if (typeof props.options.inlineStyles === 'object') {
        inlineStyles = props.options.inlineStyles;
      } else {
        inlineStyles = {};
      }
    }

    return {
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
  }, [props.options]);

  return groupOps(props.ops, options).map((group, i) => {
    if (group instanceof ListGroup) {
      return (
        <List
          key={i}
          list={group}
          options={options}
          customRenderer={props.customRenderer}
        />
      );
    }
    if (group instanceof TableGroup) {
      return (
        <Table
          key={i}
          tableOp={group}
          options={options}
          customRenderer={props.customRenderer}
        />
      );
    }
    if (group instanceof BlockGroup) {
      return (
        <Block
          key={i}
          blockOp={group.op}
          ops={group.ops}
          options={options}
          customRenderer={props.customRenderer}
        />
      );
    }
    if (group instanceof BlotBlock) {
      return (
        <Fragment key={i}>
          {props.customRenderer?.(group.op, null) ?? null}
        </Fragment>
      );
    }
    if (group instanceof VideoItem) {
      return <Video key={i} op={group.op} options={options} />;
    }
    const Tag = options.paragraphTag;
    return (
      <Tag key={i}>
        <Inlines
          ops={(group as InlineGroup).ops}
          options={options}
          customRenderer={props.customRenderer}
        />
      </Tag>
    );
  });
};
