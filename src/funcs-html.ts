export type AttributeKeyValue = {
  key: string;
  value?: string;
};

export type AttributeKeyValueTuple = [string, string | undefined];

export enum EncodeTarget {
  Html = 0,
  Url = 1,
}

export const attrsArrayToObject = (attrs: AttributeKeyValue[] | undefined) =>
  attrs
    ? Object.fromEntries(
        attrs.map<AttributeKeyValueTuple>((attr) => [attr.key, attr.value]),
      )
    : undefined;

export const encodeLink = (str: string): string => {
  const linkMaps = encodeMappings(EncodeTarget.Url);
  const decoded = linkMaps.reduce(decodeMapping, str);
  return linkMaps.reduce(encodeMapping, decoded);
};

export function encodeMappings(mtype: EncodeTarget): string[][] {
  let maps = [
    ['&', '&amp;'],
    ['<', '&lt;'],
    ['>', '&gt;'],
    ['"', '&quot;'],
    ["'", '&#x27;'],
    ['\\/', '&#x2F;'],
    ['\\(', '&#40;'],
    ['\\)', '&#41;'],
  ];
  if (mtype === EncodeTarget.Html) {
    return maps.filter(
      ([v, _]) => v.indexOf('(') === -1 && v.indexOf(')') === -1,
    );
  } else {
    // for url
    return maps.filter(([v, _]) => v.indexOf('/') === -1);
  }
}

export function encodeMapping(str: string, mapping: string[]) {
  return str.replace(new RegExp(mapping[0], 'g'), mapping[1]);
}

function decodeMapping(str: string, mapping: string[]) {
  return str.replace(new RegExp(mapping[1], 'g'), mapping[0].replace('\\', ''));
}
