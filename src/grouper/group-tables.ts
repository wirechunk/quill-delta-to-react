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

const convertTableBlocksToTableRows = (items: BlockGroup[]): TableRow[] =>
  groupConsecutiveElementsWhile(
    items,
    (g, gPrev) =>
      g.op.isTable() &&
      gPrev.op.isTable() &&
      g.op.attributes.table === gPrev.op.attributes.table,
  ).map(
    (item) =>
      new TableRow(
        Array.isArray(item)
          ? item.map((it) => new TableCell(it))
          : [new TableCell(item)],
      ),
  );

export const groupTables = (groups: TDataGroup[]): TDataGroup[] =>
  groupConsecutiveSatisfyingClassElementsWhile(
    groups,
    BlockGroup,
    (g, gPrev) => g.op.isTable() && gPrev.op.isTable(),
  ).map((item) => {
    if (Array.isArray(item)) {
      return new TableGroup(convertTableBlocksToTableRows(item));
    }
    if (item instanceof BlockGroup && item.op.isTable()) {
      return new TableGroup([new TableRow([new TableCell(item)])]);
    }
    return item;
  });
