import type { DeltaInsertOpType } from './DeltaInsertOp.js';
import type { OpAttributeSanitizerOptions } from './OpAttributeSanitizer.js';
import { InsertData, InsertDataCustom, InsertDataQuill } from './InsertData.js';
import { DataType } from './value-types.js';

export const convertInsertValue = (
  insert: DeltaInsertOpType['insert'],
  sanitizeOptions: OpAttributeSanitizerOptions,
): InsertData | null => {
  if (typeof insert === 'string') {
    return new InsertDataQuill(DataType.Text, insert);
  }

  const keys = Object.keys(insert);
  if (!keys.length) {
    return null;
  }

  const { urlSanitizer } = sanitizeOptions;

  return DataType.Image in insert
    ? new InsertDataQuill(
        DataType.Image,
        urlSanitizer(insert[DataType.Image] as string),
      )
    : DataType.Video in insert
      ? new InsertDataQuill(
          DataType.Video,
          urlSanitizer(insert[DataType.Video] as string),
        )
      : DataType.Formula in insert
        ? new InsertDataQuill(
            DataType.Formula,
            insert[DataType.Formula] as string,
          )
        : // custom
          new InsertDataCustom(keys[0], insert[keys[0]]);
};
