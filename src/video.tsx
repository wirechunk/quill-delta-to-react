import type { DeltaInsertOp } from './delta-insert-op.js';
import type { FunctionComponent } from 'react';
import { RenderOp } from './render-op.js';
import type { RenderDeltaOptions } from './render-delta.js';

export const Video: FunctionComponent<{
  op: DeltaInsertOp;
  options: RenderDeltaOptions;
}> = ({ op, options }) => {
  const ro = new RenderOp(op, options);
  return ro.renderOp(null);
};
