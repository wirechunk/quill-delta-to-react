import { BlockGroup, ListGroup, ListItem, TDataGroup } from './group-types.js';
import { groupConsecutiveSatisfyingClassElementsWhile } from './../helpers/array.js';

const convertListBlocksToListGroups = (items: TDataGroup[]): TDataGroup[] =>
  groupConsecutiveSatisfyingClassElementsWhile(
    items,
    BlockGroup,
    (g, gPrev) =>
      g.op.isList() &&
      gPrev.op.isList() &&
      g.op.isSameListAs(gPrev.op) &&
      g.op.hasSameIndentationAs(gPrev.op),
  ).map((item) => {
    if (Array.isArray(item)) {
      return new ListGroup(item.map((g) => new ListItem(g)));
    }
    if (item instanceof BlockGroup && item.op.isList()) {
      return new ListGroup([new ListItem(item)]);
    }
    return item;
  });

export const nestLists = (groups: TDataGroup[]): TDataGroup[] => {
  const listBlocked = convertListBlocksToListGroups(groups);

  const nested = groupConsecutiveSatisfyingClassElementsWhile(
    listBlocked,
    ListGroup,
  ).flatMap((group) => {
    if (!Array.isArray(group)) {
      return group;
    }

    const indentGroups: Map<number, ListGroup[]> = new Map();
    for (const cv of group) {
      const indent = cv.items[0].item.op.attributes.indent;
      if (indent) {
        const currentArray = indentGroups.get(indent);
        if (currentArray) {
          currentArray.push(cv);
        } else {
          indentGroups.set(indent, [cv]);
        }
      }
    }

    Array.from(indentGroups.entries())
      .sort(([a], [b]) => b - a)
      .forEach(([indent, listGroups]) => {
        listGroups.forEach((groupToMove) => {
          const groupToMoveGroupIdx = group.indexOf(groupToMove);
          for (let i = groupToMoveGroupIdx - 1; i >= 0; --i) {
            const destinationGroup = group[i];
            const destinationGroupIndent =
              destinationGroup.items[0].item.op.attributes.indent ?? 0;
            if (indent > destinationGroupIndent) {
              const parent =
                destinationGroup.items[destinationGroup.items.length - 1];
              const newListItem = new ListItem(
                parent.item,
                parent.innerList
                  ? new ListGroup(
                      parent.innerList.items.concat(groupToMove.items),
                    )
                  : groupToMove,
              );
              group[i] = new ListGroup(
                destinationGroup.items.with(
                  destinationGroup.items.length - 1,
                  newListItem,
                ),
              );
              const ig = indentGroups.get(destinationGroupIndent);
              if (ig) {
                const idx = ig.indexOf(destinationGroup);
                if (idx > -1) {
                  ig[idx] = group[i];
                }
              }
              group.splice(groupToMoveGroupIdx, 1);
              break;
            }
          }
        });
      });

    return group;
  });

  return groupConsecutiveSatisfyingClassElementsWhile(
    nested,
    ListGroup,
    (curr, prev) => curr.items[0].item.op.isSameListAs(prev.items[0].item.op),
  ).map((v) => {
    if (Array.isArray(v)) {
      return new ListGroup(v.flatMap((g) => g.items));
    }
    return v;
  });
};
