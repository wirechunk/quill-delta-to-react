import { DeltaInsertOp } from '../delta-insert-op.js';
import {
  ArraySlice,
  groupConsecutiveSatisfyingClassElementsWhile,
  sliceFromReverseWhile,
} from './../helpers/array.js';
import {
  BlockGroup,
  BlotBlock,
  InlineGroup,
  TDataGroup,
  VideoItem,
} from './group-types.js';
import { InsertDataCustom, InsertDataQuill } from '../insert-data.js';
import { DataType } from '../value-types.js';
import {
  convertInsertValue,
  isDeltaInsertOp,
} from '../convert-insert-value.js';
import { denormalizeInsertOp } from '../denormalize.js';
import { sanitizeAttributes } from '../sanitize-attributes.js';
import { nestLists } from './nest-lists.js';
import { groupTables } from './group-tables.js';
import type { RenderDeltaOptions } from '../render-delta.js';

export const pairOpsWithTheirBlock = (ops: DeltaInsertOp[]): TDataGroup[] => {
  const result: TDataGroup[] = [];

  const lastInd = ops.length - 1;
  let opsSlice: ArraySlice<DeltaInsertOp>;

  for (let i = lastInd; i >= 0; i--) {
    const op = ops[i];

    if (op.isVideo()) {
      result.push(new VideoItem(op));
    } else if (op.isCustomEmbedBlock()) {
      result.push(new BlotBlock(op));
    } else if (op.isContainerBlock()) {
      opsSlice = sliceFromReverseWhile(
        ops,
        i - 1,
        (op) =>
          !op.isJustNewline() &&
          !op.isCustomEmbedBlock() &&
          !op.isVideo() &&
          !op.isContainerBlock(),
      );

      result.push(new BlockGroup(op, opsSlice.elements));
      i = opsSlice.sliceStartsAt > -1 ? opsSlice.sliceStartsAt : i;
    } else {
      opsSlice = sliceFromReverseWhile(
        ops,
        i - 1,
        (op) =>
          !op.isContainerBlock() &&
          !op.isJustNewline() &&
          (op.insert instanceof InsertDataQuill
            ? op.insert.type !== DataType.Video
            : !op.attributes.renderAsBlock),
      );
      result.push(new InlineGroup(opsSlice.elements.concat(op)));
      i = opsSlice.sliceStartsAt > -1 ? opsSlice.sliceStartsAt : i;
    }
  }

  return result.toReversed();
};

export const groupConsecutiveSameStyleBlocks = (
  groups: TDataGroup[],
  options: {
    multiLineBlockquote: boolean;
    multiLineCodeBlock: boolean;
    multiLineHeader: boolean;
  },
): Array<TDataGroup | [BlockGroup, ...BlockGroup[]]> =>
  groupConsecutiveSatisfyingClassElementsWhile(
    groups,
    BlockGroup,
    (g, gPrev) =>
      ((options.multiLineBlockquote && areBothBlockquotes(g, gPrev)) ||
        (options.multiLineCodeBlock && areBothCodeBlocks(g, gPrev)) ||
        (options.multiLineHeader && areBothHeaders(g, gPrev))) &&
      g.op.hasSameAttr(gPrev.op),
  );

const areBothBlockquotes = (g: BlockGroup, gOther: BlockGroup) =>
  g.op.isBlockquote() && gOther.op.isBlockquote();

const areBothCodeBlocks = (g: BlockGroup, gOther: BlockGroup) =>
  g.op.isCodeBlock() && gOther.op.isCodeBlock();

const areBothHeaders = (g: BlockGroup, gOther: BlockGroup) =>
  g.op.isHeader() && gOther.op.isHeader();

export const groupOps = (
  ops: unknown[],
  options: RenderDeltaOptions,
): TDataGroup[] => {
  const deltaOps: DeltaInsertOp[] = [];
  for (const unknownOp of ops) {
    if (isDeltaInsertOp(unknownOp)) {
      const denormalizedOps = denormalizeInsertOp(unknownOp);
      for (const { insert, attributes } of denormalizedOps) {
        const insertVal = convertInsertValue(insert, options);
        if (insertVal) {
          deltaOps.push(
            new DeltaInsertOp(
              insertVal,
              attributes ? sanitizeAttributes(attributes, options) : undefined,
            ),
          );
        }
      }
    }
  }

  const groupedSameStyleBlocks = groupConsecutiveSameStyleBlocks(
    pairOpsWithTheirBlock(deltaOps),
    options,
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
            new DeltaInsertOp(new InsertDataQuill(DataType.Text, insert.value)),
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
};
