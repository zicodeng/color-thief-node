# Color Thief Node

<a href="https://www.npmjs.com/package/color-thief-node" target="_blank">
  <img src="https://badgen.net/npm/v/color-thief-node" alt="">
</a>

<a href="https://www.npmjs.com/package/color-thief-node" target="_blank">
  <img src="https://badgen.net/npm/dt/color-thief-node" alt="">
</a>

<a href="https://github.com/zicodeng/color-thief-node/stargazers" target="_blank">
  <img src="https://badgen.net/github/stars/zicodeng/color-thief-node" alt="">
</a>

<a href="https://github.com/zicodeng/color-thief-node/network/members" target="_blank">
  <img src="https://badgen.net/github/forks/zicodeng/color-thief-node" alt="">
</a>

<a href="https://github.com/zicodeng/color-thief-node/graphs/contributors" target="_blank">
  <img src="https://badgen.net/github/contributors/zicodeng/color-thief-node" alt="">
</a>

Color thief reimplementation for Node.js.

The [original color thief project](https://github.com/lokesh/color-thief) relies on the browser `Canvas` object to extract pixels from images. It does not work well in Node.js environment because the `Canvas` object does not natively exist in Node.js.

This project, however, relies on the [node-canvas library](https://github.com/Automattic/node-canvas) to simulate a `Canvas` object in Node.js environment. The source code has also been rewritten in **ES6** fashion with support for **promise**.

## Test

`npm run test`

or

`yarn test`

## Installation

`npm i color-thief-node`

or

`yarn add color-thief-node`

## Usage

### Get the Dominant Color from an Image

```js
const { getColorFromURL } = require('color-thief-node');

(async () => {
    const dominantColor = await getColorFromURL(imageURL);
})();
```

### Build a Color Palette from an Image

```js
const { getPaletteFromURL } = require('color-thief-node');

(async () => {
    const colorPallete = await getPaletteFromURL(imageURL);
})();
```

You can also check out `test/index.test.js` for more detailed example.
