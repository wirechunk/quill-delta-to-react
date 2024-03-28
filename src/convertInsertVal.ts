import { DeltaInsertOpType } from './DeltaInsertOp.js';
import { IOpAttributeSanitizerOptions } from './OpAttributeSanitizer.js';
import { InsertData, InsertDataCustom, InsertDataQuill } from './InsertData.js';
import { DataType } from './value-types.js';
import { OpLinkSanitizer } from './OpLinkSanitizer.js';

export const convertInsertVal = (
  insertPropVal: DeltaInsertOpType['insert'],
  sanitizeOptions: IOpAttributeSanitizerOptions,
): InsertData | null => {
  if (typeof insertPropVal === 'string') {
    return new InsertDataQuill(DataType.Text, insertPropVal);
  }

  const keys = Object.keys(insertPropVal);
  if (!keys.length) {
    return null;
  }

  return DataType.Image in insertPropVal
    ? new InsertDataQuill(
        DataType.Image,
        OpLinkSanitizer.sanitize(
          insertPropVal[DataType.Image] as string,
          sanitizeOptions,
        ),
      )
    : DataType.Video in insertPropVal
      ? new InsertDataQuill(
          DataType.Video,
          OpLinkSanitizer.sanitize(
            insertPropVal[DataType.Video] as string,
            sanitizeOptions,
          ),
        )
      : DataType.Formula in insertPropVal
        ? new InsertDataQuill(
            DataType.Formula,
            insertPropVal[DataType.Formula] as string,
          )
        : // custom
          new InsertDataCustom(keys[0], insertPropVal[keys[0]]);
};
