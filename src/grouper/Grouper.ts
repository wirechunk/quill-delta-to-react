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

class Grouper {
  static pairOpsWithTheirBlock(ops: DeltaInsertOp[]): TDataGroup[] {
    let result: TDataGroup[] = [];

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
    result.reverse();
    return result;
  }

  static groupConsecutiveSameStyleBlocks(
    groups: TDataGroup[],
    blocksOf: {
      header: boolean;
      codeBlocks: boolean;
      blockquotes: boolean;
      customBlocks: boolean;
    },
  ): Array<TDataGroup | BlockGroup[]> {
    return groupConsecutiveSatisfyingClassElementsWhile(
      groups,
      BlockGroup,
      (g, gPrev) =>
        (blocksOf.codeBlocks &&
          Grouper.areBothCodeblocksWithSameLang(g, gPrev)) ||
        (blocksOf.blockquotes &&
          Grouper.areBothBlockquotesWithSameAdi(g, gPrev)) ||
        (blocksOf.header && Grouper.areBothSameHeadersWithSameAdi(g, gPrev)) ||
        (blocksOf.customBlocks &&
          Grouper.areBothCustomBlockWithSameAttr(g, gPrev)),
    );
  }

  static areBothCodeblocksWithSameLang(g1: BlockGroup, gOther: BlockGroup) {
    return (
      g1.op.isCodeBlock() &&
      gOther.op.isCodeBlock() &&
      g1.op.hasSameLangAs(gOther.op)
    );
  }

  static areBothSameHeadersWithSameAdi(g1: BlockGroup, gOther: BlockGroup) {
    return g1.op.isSameHeaderAs(gOther.op) && g1.op.hasSameAdiAs(gOther.op);
  }

  static areBothBlockquotesWithSameAdi(g: BlockGroup, gOther: BlockGroup) {
    return (
      g.op.isBlockquote() &&
      gOther.op.isBlockquote() &&
      g.op.hasSameAdiAs(gOther.op)
    );
  }

  static areBothCustomBlockWithSameAttr(g: BlockGroup, gOther: BlockGroup) {
    return (
      g.op.isCustomTextBlock() &&
      gOther.op.isCustomTextBlock() &&
      g.op.hasSameAttr(gOther.op)
    );
  }
}

export { Grouper };
