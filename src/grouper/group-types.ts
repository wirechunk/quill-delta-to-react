import { DeltaInsertOp } from './../DeltaInsertOp.js';

export class InlineGroup {
  constructor(readonly ops: DeltaInsertOp[]) {}
}

class SingleItem {
  constructor(readonly op: DeltaInsertOp) {}
}

export class VideoItem extends SingleItem {}

export class BlotBlock extends SingleItem {}

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
  | ListItem
  | ListGroup
  | TableGroup
  | TableRow
  | TableCell;
