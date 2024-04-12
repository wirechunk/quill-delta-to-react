# Render Quill's Delta ops in React

Converts [Quill's](https://quilljs.com) [Delta](https://quilljs.com/docs/delta/) format to HTML.

## Quickstart

Installation
```
npm install quill-delta-to-react
```

Usage
```javascript
import { RenderDelta } from 'quill-delta-to-react';

const ops =  [
  { "insert": "Hello\n" },
  { "insert": "This is colorful", "attributes": { "color": "#ff0000" } },
  { "insert": "\n" }
];

const App = () => {
  return (
    <RenderDelta ops={ops} />
  );
};
```

## Principles

This library is designed to provide a lot of _flexibility_ and _extensibility_. You can customize nearly anything about the rendering.

At the same time, we take _performance_ seriously. You can have many instances of a RenderDelta component on a page, and it will render
quickly and efficiently.

## Configuration

`QuillDeltaToHtmlConverter` accepts a few configuration options as shown below:

|Option | Type | Default | Description                                                                                                                                                                                                             
|---|---|---|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|`paragraphTag`| string |  'p' | Custom tag to wrap inline html elements                                                                                                                                                                                 |
|`classPrefix`| string | 'ql' | A css class name to prefix class generating styles such as `size`, `font`, etc.                                                                                                                                         |
|`inlineStyles`| boolean or object | false | If true or an object, use inline styles instead of classes. See Rendering Inline Styles section below for using an object                                                                                               |
|`multiLineBlockquote`| boolean | true | Instead of rendering multiple `blockquote` elements for quotes that are consecutive and have same styles(`align`, `indent`, and `direction`), it renders them into only one                                             |
|`multiLineHeader`| boolean | true | Same deal as `multiLineBlockquote` for headers                                                                                                                                                                          |
|`multiLineCodeBlock`| boolean | true | Same deal as `multiLineBlockquote` for code-blocks                                                                                                                                                                      |
|`linkRel`| string | none | Specifies a value to put on the `rel` attr on all links. This can be overridden by an individual link op by specifying the `rel` attribute in the respective op's attributes                                            |
|`linkTarget`| string | '_blank' | Specifies target for all links; use `''` (empty string) to not generate `target` attribute. This can be overridden by an individual link op by specifiying the `target` with a value in the respective op's attributes. |
|`allowBackgroundClasses`| boolean | false | If true, classes will be added for the background attribute                                                                                                                                                             |
|`urlSanitizer`| function `(url: string): string` | undefined | A function that is called once per url in the ops (image, video, link) for you to do custom sanitizatio                                                                                                                 |
|`customTag`| function `(format: string, op: DeltaInsertOp): string \| undefined` | undefined | Callback allows to provide custom tag for some format                                                                                                                                                                   |
|`customAttributes`| function `(op: DeltaInsertOp): { [key: string]: string } \| undefined` | undefined | Allows to provide custom html tag attributes                                                                                                                                                                            |
|`customClasses`| function `(op: DeltaInsertOp): string \| string[] \| undefined` | undefined | Allows to provide custom classes                                                                                                                                                                                        |
|`customCssStyles`| function `(op: DeltaInsertOp): string \| string[] \| undefined` | undefined | Allows to provide custom CSS styles                                                                                                                                                                                     |

## Rendering Inline Styles

The easiest way to enable this is to pass the option `inlineStyles: true`.

You can customize styles by passing an object for `inlineStyles` instead. Below is how the default inline styles are configured:

```javascript
const DEFAULT_INLINE_STYLES = {
  direction: (value, op) => {
    if (value === 'rtl') {
      if (op.attributes['align']) {
        return {
          direction: 'rtl',
        };
      }
      return {
        direction: 'rtl',
        textAlign: 'inherit',
      };
    }
    return undefined;
  },
  font: (value) => {
    switch (value) {
    case 'serif':
      return { fontFamily: 'Georgia, Times New Roman, serif' };
    case 'monospace':
      return { fontFamily: 'Monaco, Courier New, monospace' };
    default:
      if (typeof value === 'string') {
        return { fontFamily: value };
      }
    }
  },
  size: (value) => {
    switch (value) {
    case 'small':
      return { fontSize: '0.75em' };
    case 'large':
      return { fontSize: '1.5em' };
    case 'huge':
      return { fontSize: '2.5em' };
    default:
      return undefined;
    }
  },
  indent: (value, op) => {
    const indentSize = Number(value) * 3;
    return {
      [op.attributes['direction'] === DirectionType.Rtl
        ? 'paddingRight'
        : 'paddingLeft']: `${indentSize}em`,
    };
  },
};
```

Keys to this object are the names of attributes from Quill. The values are a function that takes the value of the attribute and the Op object
and returns an object of CSS properties (or undefined).

## Advanced Custom Rendering

In addition to providing custom HTML element tags, classes, styles, and any other attribute, you can define custom Op types and provide a
rendering function for these types.

By default your custom ops will be treated as inlines, but you can set the `renderAsBlock: true` property in an op's attributes to have it
rendered as a block.
