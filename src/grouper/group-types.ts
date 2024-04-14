import type { DeltaInsertOp } from '../delta-insert-op.js';
import type { InsertDataCustom, InsertDataQuill } from '../insert-data.js';

export class InlineGroup {
  constructor(readonly ops: DeltaInsertOp[]) {}
}

export class VideoItem {
  constructor(readonly op: DeltaInsertOp<InsertDataQuill>) {}
}

export class BlotBlock {
  constructor(readonly op: DeltaInsertOp<InsertDataCustom>) {}
}

export class BlockGroup {
  constructor(
    readonly op: DeltaInsertOp,
    readonly ops: DeltaInsertOp[],
  ) {}
}

export class ListGroup {
  constructor(readonly items: ListItem[]) {}
}

export class ListItem {
  constructor(
    readonly item: BlockGroup,
    readonly innerList: ListGroup | null = null,
  ) {}
}

export class TableGroup {
  constructor(readonly rows: TableRow[]) {}
}

export class TableRow {
  constructor(readonly cells: TableCell[]) {}
}

export class TableCell {
  constructor(readonly item: BlockGroup) {}
}

export type TDataGroup =
  | VideoItem
  | InlineGroup
  | BlockGroup
  | BlotBlock
  | ListItem
  | ListGroup
  | TableGroup
  | TableRow
  | TableCell;
