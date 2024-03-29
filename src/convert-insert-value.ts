import type { DeltaInsertOpType } from './DeltaInsertOp.js';
import type { IOpAttributeSanitizerOptions } from './OpAttributeSanitizer.js';
import { InsertData, InsertDataCustom, InsertDataQuill } from './InsertData.js';
import { DataType } from './value-types.js';
import { OpLinkSanitizer } from './OpLinkSanitizer.js';

export const convertInsertValue = (
  insert: DeltaInsertOpType['insert'],
  sanitizeOptions: IOpAttributeSanitizerOptions,
): InsertData | null => {
  if (typeof insert === 'string') {
    return new InsertDataQuill(DataType.Text, insert);
  }

  const keys = Object.keys(insert);
  if (!keys.length) {
    return null;
  }

  return DataType.Image in insert
    ? new InsertDataQuill(
        DataType.Image,
        OpLinkSanitizer.sanitize(
          insert[DataType.Image] as string,
          sanitizeOptions,
        ),
      )
    : DataType.Video in insert
      ? new InsertDataQuill(
          DataType.Video,
          OpLinkSanitizer.sanitize(
            insert[DataType.Video] as string,
            sanitizeOptions,
          ),
        )
      : DataType.Formula in insert
        ? new InsertDataQuill(
            DataType.Formula,
            insert[DataType.Formula] as string,
          )
        : // custom
          new InsertDataCustom(keys[0], insert[keys[0]]);
};
