import type { OpAttributeSanitizerOptions } from './sanitize-attributes.js';
import {
  InsertData,
  InsertDataCustom,
  InsertDataQuill,
} from './insert-data.js';
import { DataType } from './value-types.js';

const isNonNullObject = (obj: unknown): obj is Record<string, unknown> =>
  !!obj && typeof obj === 'object';

export type DeltaInsertOpType = {
  insert: string | Record<string, unknown>;
  attributes?: Record<string, unknown> | null;
};

// A basic structural check.
export const isDeltaInsertOp = (op: unknown): op is DeltaInsertOpType =>
  !!op &&
  typeof op === 'object' &&
  (typeof (op as DeltaInsertOpType).insert === 'string' ||
    isNonNullObject((op as DeltaInsertOpType).insert)) &&
  (!(op as DeltaInsertOpType).attributes ||
    typeof (op as DeltaInsertOpType).attributes === 'object');

export const convertInsertValue = (
  insert: string | Record<string, unknown>,
  sanitizeOptions: OpAttributeSanitizerOptions,
): InsertData | null => {
  if (typeof insert === 'string') {
    return new InsertDataQuill(DataType.Text, insert);
  }

  return DataType.Image in insert
    ? new InsertDataQuill(
        DataType.Image,
        sanitizeOptions.urlSanitizer(insert[DataType.Image] as string),
      )
    : DataType.Video in insert
      ? new InsertDataQuill(
          DataType.Video,
          sanitizeOptions.urlSanitizer(insert[DataType.Video] as string),
        )
      : DataType.Formula in insert
        ? new InsertDataQuill(
            DataType.Formula,
            insert[DataType.Formula] as string,
          )
        : new InsertDataCustom(insert);
};
