# Render Quill's Delta ops in React

See [Quill](https://quilljs.com), [Delta](https://quilljs.com/docs/delta/)

## Quickstart

Installation

```
npm install quill-delta-to-react
```

Usage

```
import { RenderDelta } from 'quill-delta-to-react';

const ops = [
  { insert: 'Hello\n' },
  { insert: 'This is colorful', attributes: { color: '#ff0000' } },
  { insert: '\n' },
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

Finally, this library keeps dependencies to a minimum, and the dependencies that it has are kept up-to-date.

## Configuration

The `RenderDelta` component accepts a few configuration options with the `options` prop as shown below:

| Option                   | Type                                                                 | Default | Description                                                                                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paragraphTag`           | string                                                               | 'p'     | A custom tag to wrap paragraph elements.                                                                                                                                                      |
| `classPrefix`            | string                                                               | 'ql'    | A CSS class name to prefix classes for styles such as `size` and `font`.                                                                                                                      |
| `inlineStyles`           | boolean or object                                                    | false   | If true or an object, use inline styles instead of classes. See the Rendering Inline Styles section below for details.                                                                        |
| `multiLineBlockquote`    | boolean                                                              | true    | Instead of rendering multiple `blockquote` elements for quotes that are consecutive and have exactly the same attributes, render them into only one.                                          |
| `multiLineHeader`        | boolean                                                              | true    | Same deal as `multiLineBlockquote` for headers.                                                                                                                                               |
| `multiLineCodeBlock`     | boolean                                                              | true    | Same deal as `multiLineBlockquote` for code-blocks.                                                                                                                                           |
| `linkRel`                | string                                                               | none    | Specifies a `rel` attribute's value to put on all links. This can be overridden for any individual link by specifiying a `rel` property with a value in the respective op's attributes.       |
| `linkTarget`             | string                                                               | none    | Specifies a `target` attribute's value to put on all links. This can be overridden for any individual link by specifiying a `target` property with a value in the respective op's attributes. |
| `allowBackgroundClasses` | boolean                                                              | false   | If true, classes will be added for the background attribute.                                                                                                                                  |
| `urlSanitizer`           | function (url: string): string                                       | none    | A function that is called once per URL in the ops (image, video, link) for you to do sanitization.                                                                                            |
| `customTag`              | function (format: string, op: DeltaInsertOp): string \| undefined    | none    | Callback allows to provide custom tag for some formats.                                                                                                                                       |
| `customAttributes`       | function (op: DeltaInsertOp): { [key: string]: string } \| undefined | none    | Allows to provide custom HTML tag attributes.                                                                                                                                                 |
| `customClasses`          | function (op: DeltaInsertOp): string \| string[] \| undefined        | none    | A function that can provide custom classes for any op (except for custom op types).                                                                                                           |
| `customCssStyles`        | function (op: DeltaInsertOp): string \| string[] \| undefined        | none    | A function that can provide custom CSS styles for any op (except for custom op types).                                                                                                        |

## Rendering Inline Styles

The easiest way to enable this is to pass the option `inlineStyles: true`.

You can customize styles by passing an object for `inlineStyles` instead. Below is how the default inline styles are configured:

```
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
rendering function for these types with a `customRenderer` prop.

By default your custom ops will be treated as inlines, but you can set the `renderAsBlock: true` property in an op's attributes to have it
rendered as a block.
