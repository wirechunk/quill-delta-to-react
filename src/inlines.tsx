import { DeltaInsertOp } from './delta-insert-op.js';
import { Fragment, FunctionComponent } from 'react';
import type { CustomRenderer, RenderDeltaOptions } from './render-delta.js';
import { Inline } from './inline.js';

export const Inlines: FunctionComponent<{
  ops: DeltaInsertOp[];
  options: RenderDeltaOptions;
  customRenderer: CustomRenderer | null | undefined;
}> = ({ ops, options, customRenderer }) => {
  const lastIndex = ops.length - 1;
  return ops.map((op, i) => {
    if (i > 0 && i === lastIndex && op.isJustNewline()) {
      return <Fragment key={i} />;
    }
    return (
      <Inline
        key={i}
        op={op}
        contextOp={null}
        options={options}
        customRenderer={customRenderer}
      />
    );
  });
};
