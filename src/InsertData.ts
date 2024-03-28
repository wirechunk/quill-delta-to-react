import type { DataType } from './value-types.js';

export class InsertDataQuill {
  readonly type: DataType;
  readonly value: string;
  constructor(type: DataType, value: string) {
    this.type = type;
    this.value = value;
  }
}

export class InsertDataCustom {
  readonly type: string;
  readonly value: any;
  constructor(type: string, value: any) {
    this.type = type;
    this.value = value;
  }
}

export type InsertData = InsertDataCustom | InsertDataQuill;
