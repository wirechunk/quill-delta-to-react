import type { DeltaInsertOp } from './delta-insert-op.js';
import { Fragment, FunctionComponent, JSX } from 'react';
import { ListGroup } from './grouper/group-types.js';
import type { CustomRenderer, RenderDeltaOptions } from './render-delta.js';
import { RenderOp } from './render-op.js';
import { Inlines } from './inlines.js';

const getListTag = (
  op: DeltaInsertOp,
  options: RenderDeltaOptions,
): keyof JSX.IntrinsicElements => {
  return op.isOrderedList()
    ? options.orderedListTag
    : op.isBulletList()
      ? options.bulletListTag
      : op.isCheckedList()
        ? options.bulletListTag
        : options.bulletListTag;
};

export const List: FunctionComponent<{
  list: ListGroup;
  options: RenderDeltaOptions;
  customRenderer: CustomRenderer | null | undefined;
}> = ({ list, options, customRenderer }) => {
  const Tag = getListTag(list.items[0].item.op, options);
  return (
    <Tag>
      {list.items.map((li, i) => {
        // We don't render list items with Quill's indent class.
        delete li.item.op.attributes.indent;
        const render = new RenderOp(li.item.op, options);
        return (
          <Fragment key={i}>
            {render.renderOp(
              <Fragment>
                <Inlines
                  ops={li.item.ops}
                  options={options}
                  customRenderer={customRenderer}
                />
                {li.innerList && (
                  <List
                    list={li.innerList}
                    options={options}
                    customRenderer={customRenderer}
                  />
                )}
              </Fragment>,
            )}
          </Fragment>
        );
      })}
    </Tag>
  );
};
