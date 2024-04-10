import type { DeltaInsertOpType } from './convert-insert-value.js';

/**
 *  Splits by new line character ("\n") by putting new line characters into the
 *  array as well. Ex: "hello\n\nworld\n " => ["hello", "\n", "\n", "world", "\n", " "]
 */
export function tokenizeWithNewLines(str: string): string[] {
  if (str === '\n') {
    return [str];
  }

  const lines = str.split('\n');

  if (lines.length === 1) {
    return lines;
  }

  const lastIndex = lines.length - 1;

  return lines.reduce<string[]>((pv, line, ind) => {
    if (ind !== lastIndex) {
      if (line !== '') {
        pv = pv.concat(line, '\n');
      } else {
        pv.push('\n');
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
  if (typeof op.insert === 'object' || op.insert === '\n') {
    return [op];
  }

  const tokenized = tokenizeWithNewLines(op.insert);

  if (tokenized.length === 1) {
    return [op];
  }

  const nlObj: DeltaInsertOpType = { ...op, insert: '\n' };

  return tokenized.map((line) =>
    line === '\n' ? nlObj : { ...op, insert: line },
  );
};
