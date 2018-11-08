/**
 * Color Thief v2.0
 * by Lokesh Dhakar - http://www.lokeshdhakar.com
 *
 * Thanks
 * ------
 * Nick Rabinowitz - For creating quantize.js.
 * John Schulz - For clean up and optimization. @JFSIII
 * Nathan Spady - For adding drag and drop support to the demo page.
 *
 * License
 * -------
 * Copyright 2011, 2015 Lokesh Dhakar
 * Released under the MIT license
 * https://raw.githubusercontent.com/lokesh/color-thief/master/LICENSE
 *
 * @license
 */

const { loadImage } = require('canvas');

const CanvasImage = require('./canvas-image');
const { quantize } = require('./mmcq');

/**
 * Use the median cut algorithm provided by quantize.js
 * to cluster similar colors.
 *
 * BUGGY: Function does not always return the requested amount of colors.
 * It can be +/- 2.
 *
 * @param {HTMLImageElement} sourceImage
 *     The HTML image element to pull the color palette from.
 *
 * @param {number=} colorCount
 *     Determines the size of the palette; the number of colors returned.
 *     If not set, it defaults to 5.
 *
 * @param {number=} quality
 *     Quality is an optional argument. It needs to be an integer.
 *     1 is the highest quality settings. 5 is the default.
 *     There is a trade-off between quality and speed. The bigger
 *     the number, the faster the palette generation but the greater
 *     the likelihood that colors will be missed.
 *
 * @return {{r: number, g: number, b: number}[]}
 */
const getPalette = (sourceImage, colorCount = 5, quality = 5) => {
    if (colorCount < 2 || colorCount > 256) {
        colorCount = 5;
    }
    if (quality < 1) {
        quality = 5;
    }

    // Create custom CanvasImage object.
    const image = new CanvasImage(sourceImage);
    const imageData = image.getImageData();
    const pixels = imageData.data;
    const pixelCount = image.getPixelCount();

    // Store the RGB values in an array format suitable for quantize function.
    const pixelArray = [];
    for (let i = 0, offset, r, g, b, a; i < pixelCount; i += quality) {
        offset = i * 4;
        r = pixels[offset + 0];
        g = pixels[offset + 1];
        b = pixels[offset + 2];
        a = pixels[offset + 3];
        // If pixel is mostly opaque and not white.
        if (a >= 125) {
            if (!(r > 250 && g > 250 && b > 250)) {
                pixelArray.push([r, g, b]);
            }
        }
    }

    // Send array to quantize function which clusters values
    // using median cut algorithm.
    const cmap = quantize(pixelArray, colorCount);
    // If no palette is generated, it is mostly like that
    // the given image is completely white.
    const palette = cmap ? cmap.palette() : [[255, 255, 255]];

    return palette;
};

/**
 * Use the median cut algorithm provided by quantize.js to cluster similar
 * colors and return the base color from the largest cluster.
 *
 * @param {HTMLImageElement} sourceImage
 *     The HTML image element to pull the color palette from.
 *
 * @param {number=} quality
 *     Quality is an optional argument. It needs to be an integer.
 *     1 is the highest quality settings. 5 is the default. There is a
 *     trade-off between quality and speed. The bigger the number, the
 *     faster a color will be returned but the greater the likelihood that
 *     it will not be the visually most dominant color.
 *
 * @return {{r: number, g: number, b: number}}
 */
exports.getColor = (sourceImage, quality) => {
    const palette = getPalette(sourceImage, 5, quality);
    return palette[0];
};

/**
 * Use the median cut algorithm provided by quantize.js
 * to cluster similar colors.
 *
 * BUGGY: Function does not always return the requested amount of colors.
 * It can be +/- 2.
 *
 * @param {string} URL The URL or file path to an image. In case of a URL,
 *     it is subject to the cross origin policy.
 *
 * @param {number=} colorCount
 *     Determines the size of the palette; the number of colors returned.
 *     If not set, it defaults to 5.
 *
 * @param {number=} quality
 *     Quality is an optional argument. It needs to be an integer.
 *     1 is the highest quality settings. 5 is the default.
 *     There is a trade-off between quality and speed. The bigger
 *     the number, the faster the palette generation but the greater
 *     the likelihood that colors will be missed.
 *
 * @return {Promise<{r: number, g: number, b: number}[]>}
 */
exports.getPaletteFromURL = async (URL, colorCount, quality) => {
    return loadImage(URL).then(image => getPalette(image, colorCount, quality));
};

/**
 * Use the median cut algorithm provided by quantize.js
 * to cluster similar colors.
 *
 * @param {string} imageURL
 *     The URL or file path to an image. In case of a URL,
 *     it is subject to the cross origin policy.
 *
 * @param {number=} quality
 *     Quality is an optional argument. It needs to be an integer.
 *     1 is the highest quality settings. 5 is the default.
 *     There is a trade-off between quality and speed. The bigger
 *     the number, the faster the palette generation but the greater
 *     the likelihood that colors will be missed.
 *
 * @return {Promise<{r: number, g: number, b: number}>}
 */
exports.getColorFromURL = async (imageURL, quality) => {
    return loadImage(imageURL).then(image => {
        const palette = getPalette(image, 5, quality);
        const dominantColor = palette[0];
        return dominantColor;
    });
};
