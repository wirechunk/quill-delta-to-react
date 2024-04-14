import type { DataType } from './value-types.js';

export class InsertDataQuill<DT extends DataType = DataType> {
  constructor(
    readonly type: DT,
    readonly value: string,
  ) {}
}

export class InsertDataCustom {
  constructor(readonly value: Record<string, unknown>) {}
}

export type InsertData = InsertDataCustom | InsertDataQuill;
