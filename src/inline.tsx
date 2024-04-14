import type { DeltaInsertOp } from './delta-insert-op.js';
import type { FunctionComponent } from 'react';
import { RenderOp } from './render-op.js';
import type { InsertDataQuill } from './insert-data.js';
import type { CustomRenderer, RenderDeltaOptions } from './render-delta.js';

export const Inline: FunctionComponent<{
  op: DeltaInsertOp;
  contextOp: DeltaInsertOp | null;
  options: RenderDeltaOptions;
  customRenderer: CustomRenderer | null | undefined;
}> = ({ op, contextOp, options, customRenderer }) => {
  if (op.isCustomEmbed()) {
    return customRenderer?.(op, contextOp) ?? null;
  }
  const ro = new RenderOp(op, options);
  return ro.renderOp(
    op.insert.value === '\n' ? null : (op.insert as InsertDataQuill).value,
  );
};
