import { DeltaInsertOp } from './../DeltaInsertOp.js';
import {
  ArraySlice,
  groupConsecutiveSatisfyingClassElementsWhile,
  sliceFromReverseWhile,
} from './../helpers/array.js';
import {
  VideoItem,
  InlineGroup,
  BlockGroup,
  TDataGroup,
  BlotBlock,
} from './group-types.js';

const canBeInBlock = (op: DeltaInsertOp) =>
  !(
    op.isJustNewline() ||
    op.isCustomEmbedBlock() ||
    op.isVideo() ||
    op.isContainerBlock()
  );

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
      opsSlice = sliceFromReverseWhile(ops, i - 1, canBeInBlock);

      result.push(new BlockGroup(op, opsSlice.elements));
      i = opsSlice.sliceStartsAt > -1 ? opsSlice.sliceStartsAt : i;
    } else {
      opsSlice = sliceFromReverseWhile(ops, i - 1, (op) => op.isInline());
      result.push(new InlineGroup(opsSlice.elements.concat(op)));
      i = opsSlice.sliceStartsAt > -1 ? opsSlice.sliceStartsAt : i;
    }
  }

  return result.toReversed();
};

export const groupConsecutiveSameStyleBlocks = (
  groups: TDataGroup[],
  blocksOf: {
    header: boolean;
    codeBlocks: boolean;
    blockquotes: boolean;
    customBlocks: boolean;
  },
): Array<TDataGroup | BlockGroup[]> =>
  groupConsecutiveSatisfyingClassElementsWhile(
    groups,
    BlockGroup,
    (g, gPrev) =>
      (blocksOf.codeBlocks && areBothCodeblocksWithSameLang(g, gPrev)) ||
      (blocksOf.blockquotes && areBothBlockquotesWithSameAdi(g, gPrev)) ||
      (blocksOf.header && areBothSameHeadersWithSameAdi(g, gPrev)) ||
      (blocksOf.customBlocks && areBothCustomBlockWithSameAttr(g, gPrev)),
  );

const areBothCodeblocksWithSameLang = (g1: BlockGroup, gOther: BlockGroup) =>
  g1.op.isCodeBlock() &&
  gOther.op.isCodeBlock() &&
  g1.op.hasSameLangAs(gOther.op);

const areBothSameHeadersWithSameAdi = (g1: BlockGroup, gOther: BlockGroup) =>
  g1.op.isSameHeaderAs(gOther.op) && g1.op.hasSameAdiAs(gOther.op);

const areBothBlockquotesWithSameAdi = (g: BlockGroup, gOther: BlockGroup) =>
  g.op.isBlockquote() &&
  gOther.op.isBlockquote() &&
  g.op.hasSameAdiAs(gOther.op);

const areBothCustomBlockWithSameAttr = (g: BlockGroup, gOther: BlockGroup) =>
  g.op.isCustomTextBlock() &&
  gOther.op.isCustomTextBlock() &&
  g.op.hasSameAttr(gOther.op);
