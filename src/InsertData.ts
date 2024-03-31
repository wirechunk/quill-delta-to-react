import type { DataType } from './value-types.js';

export class InsertDataQuill {
  constructor(
    readonly type: DataType,
    readonly value: string,
  ) {}
}

export class InsertDataCustom {
  constructor(
    readonly type: string,
    readonly value: any,
  ) {
    this.type = type;
    this.value = value;
  }
}

export type InsertData = InsertDataCustom | InsertDataQuill;
