import { DeltaInsertOp } from './delta-insert-op.js';
import { RenderOp } from './render-op.js';
import { Fragment } from 'react';
import { Inline } from './inline.js';
import type { CustomRenderer, RenderDeltaOptions } from './render-delta.js';

export const Block = ({
  blockOp,
  ops,
  options,
  customRenderer,
}: {
  blockOp: DeltaInsertOp;
  ops: DeltaInsertOp[];
  options: RenderDeltaOptions;
  customRenderer: CustomRenderer | null | undefined;
}) => {
  const converter = new RenderOp(blockOp, options);

  if (blockOp.isCodeBlock()) {
    return converter.renderOp(
      ops.map((iop, i) => (
        <Fragment key={i}>
          {iop.isCustomEmbed()
            ? (customRenderer?.(iop, blockOp) ?? null)
            : (iop.insert.value as string)}
        </Fragment>
      )),
    );
  }

  const lastInd = ops.length - 1;
  return converter.renderOp(
    ops.map((op, i) => {
      if (op.isJustNewline()) {
        return <Fragment key={i}>{i < lastInd ? '\n' : null}</Fragment>;
      }
      return (
        <Inline
          key={i}
          op={op}
          contextOp={blockOp}
          options={options}
          customRenderer={customRenderer}
        />
      );
    }),
  );
};
