import { DeltaInsertOpType } from './DeltaInsertOp.js';
import { newLine } from './constants.js';

/**
 *  Splits by new line character ("\n") by putting new line characters into the
 *  array as well. Ex: "hello\n\nworld\n " => ["hello", "\n", "\n", "world", "\n", " "]
 */
export function tokenizeWithNewLines(str: string): string[] {
  if (str === newLine) {
    return [str];
  }

  const lines = str.split(newLine);

  if (lines.length === 1) {
    return lines;
  }

  const lastIndex = lines.length - 1;

  return lines.reduce<string[]>((pv, line, ind) => {
    if (ind !== lastIndex) {
      if (line !== '') {
        pv = pv.concat(line, newLine);
      } else {
        pv.push(newLine);
      }
    } else if (line !== '') {
      pv.push(line);
    }
    return pv;
  }, []);
}

/**
 * Split a text insert operation that has new lines into multiple ops where
 * each op is either a new line or a text containing no new lines.
 *
 * Why? It makes things easier when picking op that needs to be inside a block when
 * rendering to html
 *
 * Example:
 *  {insert: 'hello\n\nhow are you?\n', attributes: {bold: true}}
 *
 * Denormalized:
 *  [
 *      {insert: 'hello', attributes: {bold: true}},
 *      {insert: '\n', attributes: {bold: true}},
 *      {insert: '\n', attributes: {bold: true}},
 *      {insert: 'how are you?', attributes: {bold: true}},
 *      {insert: '\n', attributes: {bold: true}}
 *  ]
 */
export const denormalizeInsertOp = (
  op: DeltaInsertOpType,
): DeltaInsertOpType[] => {
  if (typeof op.insert === 'object' || op.insert === newLine) {
    return [op];
  }

  const newlinedArray = tokenizeWithNewLines(op.insert);

  if (newlinedArray.length === 1) {
    return [op];
  }

  const nlObj: DeltaInsertOpType = { ...op, insert: newLine };

  return newlinedArray.map((line) =>
    line === newLine ? nlObj : { ...op, insert: line },
  );
};
