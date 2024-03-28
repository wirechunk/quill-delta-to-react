import {
  BlockGroup,
  TableCell,
  TableGroup,
  TableRow,
  TDataGroup,
} from './group-types.js';
import {
  groupConsecutiveSatisfyingClassElementsWhile,
  groupConsecutiveElementsWhile,
} from '../helpers/array.js';

export class TableGrouper {
  group(groups: TDataGroup[]): TDataGroup[] {
    return groupConsecutiveSatisfyingClassElementsWhile(
      groups,
      BlockGroup,
      (g, gPrev) => g.op.isTable() && gPrev.op.isTable(),
    ).map((item) => {
      if (Array.isArray(item)) {
        return new TableGroup(this.convertTableBlocksToTableRows(item));
      }
      if (item instanceof BlockGroup && item.op.isTable()) {
        return new TableGroup([new TableRow([new TableCell(item)])]);
      }
      return item;
    });
  }

  private convertTableBlocksToTableRows(items: BlockGroup[]): TableRow[] {
    return groupConsecutiveElementsWhile(
      items,
      (g, gPrev) =>
        g.op.isTable() && gPrev.op.isTable() && g.op.isSameTableRowAs(gPrev.op),
    ).map(
      (item) =>
        new TableRow(
          Array.isArray(item)
            ? item.map((it) => new TableCell(it))
            : [new TableCell(item)],
        ),
    );
  }
}
