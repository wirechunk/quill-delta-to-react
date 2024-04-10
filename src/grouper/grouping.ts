import { DeltaInsertOp } from './../DeltaInsertOp.js';
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
import { InsertDataQuill } from '../InsertData.js';
import { DataType } from '../value-types.js';

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
): Array<TDataGroup | BlockGroup[]> =>
  groupConsecutiveSatisfyingClassElementsWhile(
    groups,
    BlockGroup,
    (g, gPrev) =>
      (options.multiLineBlockquote && areBothSameBlockquotes(g, gPrev)) ||
      (options.multiLineCodeBlock && areBothSameCodeBlocks(g, gPrev)) ||
      (options.multiLineHeader && areBothSameHeaders(g, gPrev)),
  );

const areBothSameCodeBlocks = (g: BlockGroup, gOther: BlockGroup) =>
  g.op.isCodeBlock() && gOther.op.isCodeBlock() && g.op.hasSameAttr(gOther.op);

const areBothSameHeaders = (g: BlockGroup, gOther: BlockGroup) =>
  g.op.isHeader() && gOther.op.isHeader() && g.op.hasSameAttr(gOther.op);

const areBothSameBlockquotes = (g: BlockGroup, gOther: BlockGroup) =>
  g.op.isBlockquote() &&
  gOther.op.isBlockquote() &&
  g.op.hasSameAttr(gOther.op);
