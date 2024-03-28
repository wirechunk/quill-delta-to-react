import { BlockGroup, ListGroup, ListItem, TDataGroup } from './group-types.js';
import { groupConsecutiveSatisfyingClassElementsWhile } from './../helpers/array.js';
import { inspect } from 'node:util';

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
  console.log('LB', inspect(listBlocked, false, null, true));
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
    console.log('IG', inspect(indentGroups, false, null, true));
    Array.from(indentGroups.entries())
      .sort(([a], [b]) => b - a)
      .forEach(([indent, listGroups]) => {
        listGroups.forEach((lg) => {
          const lgGroupIdx = group.indexOf(lg);
          for (let i = lgGroupIdx - 1; i >= 0; --i) {
            const groupElem = group[i];
            console.log('groupElem', i, groupElem);
            if (indent > (groupElem.items[0].item.op.attributes.indent ?? 0)) {
              let newListItem: ListItem;
              const parent = groupElem.items[groupElem.items.length - 1];
              console.log('PARENT', inspect(parent, false, null, true));
              if (parent.innerList) {
                newListItem = new ListItem(
                  parent.item,
                  new ListGroup(parent.innerList.items.concat(lg.items)),
                );
              } else {
                newListItem = new ListItem(parent.item, lg);
              }
              console.log(
                'group (before before)',
                inspect(group, false, null, true),
              );
              console.log('lgGroupIdx', lgGroupIdx);
              console.log(
                'group[lgGroupIdx] (before)',
                inspect(group[lgGroupIdx], false, null, true),
              );
              group[lgGroupIdx - 1] = new ListGroup(
                groupElem.items.with(groupElem.items.length - 1, newListItem),
                // groupElem.items.concat(newListItem),
              );
              console.log(
                'group[lgGroupIdx] (after)',
                inspect(group[lgGroupIdx], false, null, true),
              );
              console.log('group (before)', inspect(group, false, null, true));
              group.splice(lgGroupIdx, 1);
              console.log('group (after)', inspect(group, false, null, true));
              // Don't continue to the next group.
              return;
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
