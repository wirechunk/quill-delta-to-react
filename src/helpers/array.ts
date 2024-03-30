export type ArraySlice<T> = {
  sliceStartsAt: number;
  elements: T[];
};

/**
 * Returns a new array by putting consecutive elements that are instances of classType and satisfying
 * predicate (if provided) into a new array and returning others as they are.
 * Ex: [1, "ha", 3, "ha", "ha"] => [1, "ha", 3, ["ha", "ha"]]
 *      where predicate: (v, vprev) => typeof v === typeof vPrev
 */
export const groupConsecutiveSatisfyingClassElementsWhile = <T, GroupT>(
  arr: T[],
  classType: new (...args: any[]) => GroupT,
  predicate?: (currElm: GroupT, prevElm: GroupT) => boolean,
): Array<T | GroupT | GroupT[]> => {
  const groups: Array<T | GroupT | GroupT[]> = [];

  for (let i = 0; i < arr.length; i++) {
    const currElm = arr[i];
    const prevElm: T | undefined = arr[i - 1];
    if (
      prevElm &&
      currElm instanceof classType &&
      prevElm instanceof classType &&
      (!predicate || predicate(currElm, prevElm))
    ) {
      const currGroup = groups[groups.length - 1];
      if (Array.isArray(currGroup)) {
        currGroup.push(currElm);
      } else {
        groups[groups.length - 1] = [prevElm, currElm];
      }
    } else {
      groups.push(currElm);
    }
  }

  return groups;
};

/**
 * Returns a new array by putting consecutive elements satisfying predicate into a new array and
 * returning others as they are.
 */
export const groupConsecutiveElementsWhile = <T>(
  arr: T[],
  predicate: (currElm: T, prevElm: T) => boolean,
): Array<T | T[]> => {
  const groups: Array<T | T[]> = [];

  for (let i = 0; i < arr.length; i++) {
    const currElm = arr[i];
    const prevElm: T | undefined = arr[i - 1];
    if (prevElm && predicate(currElm, prevElm)) {
      const currGroup = groups[groups.length - 1];
      if (Array.isArray(currGroup)) {
        currGroup.push(currElm);
      } else {
        groups[groups.length - 1] = [prevElm, currElm];
      }
    } else {
      groups.push(currElm);
    }
  }

  return groups;
};

/**
 * Returns consecutive list of elements satisfying the predicate starting from startIndex
 * and traversing the array in reverse order.
 */
export function sliceFromReverseWhile<T>(
  arr: T[],
  startIndex: number,
  predicate: (currElm: T) => boolean,
): ArraySlice<T> {
  const result = {
    elements: [] as any[],
    sliceStartsAt: -1,
  };
  for (let i = startIndex; i >= 0; i--) {
    if (!predicate(arr[i])) {
      break;
    }
    result.sliceStartsAt = i;
    result.elements.unshift(arr[i]);
  }
  return result;
}
