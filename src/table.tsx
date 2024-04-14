import { TableGroup } from './grouper/group-types.js';
import type { FunctionComponent } from 'react';
import type { CustomRenderer, RenderDeltaOptions } from './render-delta.js';
import { RenderOp } from './render-op.js';
import { Inlines } from './inlines.js';

export const Table: FunctionComponent<{
  tableOp: TableGroup;
  options: RenderDeltaOptions;
  customRenderer: CustomRenderer | null | undefined;
}> = ({ tableOp, options, customRenderer }) => {
  return (
    <table>
      <tbody>
        {tableOp.rows.map((row, rowI) => (
          <tr key={rowI}>
            {row.cells.map((cell, cellI) => {
              const render = new RenderOp(cell.item.op, options);
              return (
                <td key={cellI} data-row={cell.item.op.attributes.table}>
                  {render.renderOp(
                    <Inlines
                      ops={cell.item.ops}
                      options={options}
                      customRenderer={customRenderer}
                    />,
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
