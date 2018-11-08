/*!
 * quantize.js Copyright 2008 Nick Rabinowitz.
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 * @license
 */

// Fill out a couple protovis dependencies.
/*!
 * Block below copied from Protovis: http://mbostock.github.com/protovis/
 * Copyright 2010 Stanford Visualization Group
 * Licensed under the BSD License: http://www.opensource.org/licenses/bsd-license.php
 * @license
 */
const pv = {
    map(array, f) {
        const o = {};
        return f
            ? array.map((d, i) => {
                  o.index = i;
                  return f.call(o, d);
              })
            : array.slice();
    },
    naturalOrder(a, b) {
        return a < b ? -1 : a > b ? 1 : 0;
    },
    sum(array, f) {
        const o = {};
        return array.reduce(
            f
                ? (p, d, i) => {
                      o.index = i;
                      return p + f.call(o, d);
                  }
                : (p, d) => p + d,
            0
        );
    },
    max(array, f) {
        return Math.max.apply(null, f ? pv.map(array, f) : array);
    }
};

/**
 * Basic Javascript port of the MMCQ (modified median cut quantization)
 * algorithm from the Leptonica library (http://www.leptonica.com/).
 * Returns a color map you can use to map original pixels to the reduced
 * palette. Still a work in progress.
 *
 * @author Nick Rabinowitz
 */

// Private constants
const sigbits = 5;
const rshift = 8 - sigbits;
const maxIterations = 1000;
const fractByPopulations = 0.75;

// Get reduced-space color index for a pixel.
const getColorIndex = (r, g, b) => {
    return (r << (2 * sigbits)) + (g << sigbits) + b;
};

// Simple priority queue
class PQueue {
    constructor(comparator) {
        this.comparator = comparator;
        this.contents = [];
        this.sorted = false;
    }

    sort() {
        this.contents.sort(this.comparator);
        this.sorted = true;
    }

    push(o) {
        this.contents.push(o);
        this.sorted = false;
    }

    peek(index) {
        if (!this.sorted) this.sort();
        if (index === undefined) index = this.contents.length - 1;
        return this.contents[index];
    }

    pop() {
        if (!this.sorted) this.sort();
        return this.contents.pop();
    }

    size() {
        return this.contents.length;
    }

    map(f) {
        return this.contents.map(f);
    }

    debug() {
        if (!this.sorted) this.sort();
        return this.contents;
    }
}

// 3d color space box
class VBox {
    constructor(r1, r2, g1, g2, b1, b2, histo) {
        this.r1 = r1;
        this.r2 = r2;
        this.g1 = g1;
        this.g2 = g2;
        this.b1 = b1;
        this.b2 = b2;
        this.histo = histo;
    }

    volume(force) {
        let vbox = this;
        if (!vbox._volume || force) {
            vbox._volume =
                (vbox.r2 - vbox.r1 + 1) *
                (vbox.g2 - vbox.g1 + 1) *
                (vbox.b2 - vbox.b1 + 1);
        }
        return vbox._volume;
    }

    count(force) {
        let vbox = this,
            histo = vbox.histo;
        if (!vbox._count_set || force) {
            let npix = 0,
                index,
                i,
                j,
                k;
            for (i = vbox.r1; i <= vbox.r2; i++) {
                for (j = vbox.g1; j <= vbox.g2; j++) {
                    for (k = vbox.b1; k <= vbox.b2; k++) {
                        index = getColorIndex(i, j, k);
                        npix += histo[index] || 0;
                    }
                }
            }
            vbox._count = npix;
            vbox._count_set = true;
        }
        return vbox._count;
    }

    copy() {
        let vbox = this;
        return new VBox(
            vbox.r1,
            vbox.r2,
            vbox.g1,
            vbox.g2,
            vbox.b1,
            vbox.b2,
            vbox.histo
        );
    }

    avg(force) {
        let vbox = this,
            histo = vbox.histo;
        if (!vbox._avg || force) {
            let ntot = 0,
                mult = 1 << (8 - sigbits),
                rsum = 0,
                gsum = 0,
                bsum = 0,
                hval,
                i,
                j,
                k,
                histoindex;
            for (i = vbox.r1; i <= vbox.r2; i++) {
                for (j = vbox.g1; j <= vbox.g2; j++) {
                    for (k = vbox.b1; k <= vbox.b2; k++) {
                        histoindex = getColorIndex(i, j, k);
                        hval = histo[histoindex] || 0;
                        ntot += hval;
                        rsum += hval * (i + 0.5) * mult;
                        gsum += hval * (j + 0.5) * mult;
                        bsum += hval * (k + 0.5) * mult;
                    }
                }
            }
            if (ntot) {
                vbox._avg = [~~(rsum / ntot), ~~(gsum / ntot), ~~(bsum / ntot)];
            } else {
                vbox._avg = [
                    ~~((mult * (vbox.r1 + vbox.r2 + 1)) / 2),
                    ~~((mult * (vbox.g1 + vbox.g2 + 1)) / 2),
                    ~~((mult * (vbox.b1 + vbox.b2 + 1)) / 2)
                ];
            }
        }
        return vbox._avg;
    }

    contains(pixel) {
        let vbox = this,
            rval = pixel[0] >> rshift;
        gval = pixel[1] >> rshift;
        bval = pixel[2] >> rshift;
        return (
            rval >= vbox.r1 &&
            rval <= vbox.r2 &&
            gval >= vbox.g1 &&
            gval <= vbox.g2 &&
            bval >= vbox.b1 &&
            bval <= vbox.b2
        );
    }
}

// Color map
class CMap {
    constructor() {
        this.vboxes = new PQueue((a, b) => {
            return pv.naturalOrder(
                a.vbox.count() * a.vbox.volume(),
                b.vbox.count() * b.vbox.volume()
            );
        });
    }

    push(vbox) {
        this.vboxes.push({
            vbox: vbox,
            color: vbox.avg()
        });
    }

    palette() {
        return this.vboxes.map(vb => vb.color);
    }

    size() {
        return this.vboxes.size();
    }

    map(color) {
        let vboxes = this.vboxes;
        for (let i = 0; i < vboxes.size(); i++) {
            if (vboxes.peek(i).vbox.contains(color)) {
                return vboxes.peek(i).color;
            }
        }
        return this.nearest(color);
    }

    nearest(color) {
        let vboxes = this.vboxes,
            d1,
            d2,
            pColor;
        for (let i = 0; i < vboxes.size(); i++) {
            d2 = Math.sqrt(
                Math.pow(color[0] - vboxes.peek(i).color[0], 2) +
                    Math.pow(color[1] - vboxes.peek(i).color[1], 2) +
                    Math.pow(color[2] - vboxes.peek(i).color[2], 2)
            );
            if (d2 < d1 || d1 === undefined) {
                d1 = d2;
                pColor = vboxes.peek(i).color;
            }
        }
        return pColor;
    }
}

// Histo (1-d array, giving the number of pixels in
// each quantized region of color space), or null on error.
const getHisto = pixels => {
    let histosize = 1 << (3 * sigbits),
        histo = new Array(histosize),
        index,
        rval,
        gval,
        bval;
    pixels.forEach(pixel => {
        rval = pixel[0] >> rshift;
        gval = pixel[1] >> rshift;
        bval = pixel[2] >> rshift;
        index = getColorIndex(rval, gval, bval);
        histo[index] = (histo[index] || 0) + 1;
    });
    return histo;
};

const vboxFromPixels = (pixels, histo) => {
    let rmin = 1000000,
        rmax = 0,
        gmin = 1000000,
        gmax = 0,
        bmin = 1000000,
        bmax = 0,
        rval,
        gval,
        bval;
    // Find min/max
    pixels.forEach(pixel => {
        rval = pixel[0] >> rshift;
        gval = pixel[1] >> rshift;
        bval = pixel[2] >> rshift;
        if (rval < rmin) rmin = rval;
        else if (rval > rmax) rmax = rval;
        if (gval < gmin) gmin = gval;
        else if (gval > gmax) gmax = gval;
        if (bval < bmin) bmin = bval;
        else if (bval > bmax) bmax = bval;
    });
    return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
};

const medianCutApply = (histo, vbox) => {
    if (!vbox.count()) return;

    let rw = vbox.r2 - vbox.r1 + 1,
        gw = vbox.g2 - vbox.g1 + 1,
        bw = vbox.b2 - vbox.b1 + 1,
        maxw = pv.max([rw, gw, bw]);
    // Only one pixel, no split.
    if (vbox.count() == 1) {
        return [vbox.copy()];
    }
    // Find the partial sum arrays along the selected axis.
    let total = 0,
        partialsum = [],
        lookaheadsum = [],
        i,
        j,
        k,
        sum,
        index;
    if (maxw == rw) {
        for (i = vbox.r1; i <= vbox.r2; i++) {
            sum = 0;
            for (j = vbox.g1; j <= vbox.g2; j++) {
                for (k = vbox.b1; k <= vbox.b2; k++) {
                    index = getColorIndex(i, j, k);
                    sum += histo[index] || 0;
                }
            }
            total += sum;
            partialsum[i] = total;
        }
    } else if (maxw == gw) {
        for (i = vbox.g1; i <= vbox.g2; i++) {
            sum = 0;
            for (j = vbox.r1; j <= vbox.r2; j++) {
                for (k = vbox.b1; k <= vbox.b2; k++) {
                    index = getColorIndex(j, i, k);
                    sum += histo[index] || 0;
                }
            }
            total += sum;
            partialsum[i] = total;
        }
    } else {
        // maxw == bw
        for (i = vbox.b1; i <= vbox.b2; i++) {
            sum = 0;
            for (j = vbox.r1; j <= vbox.r2; j++) {
                for (k = vbox.g1; k <= vbox.g2; k++) {
                    index = getColorIndex(j, k, i);
                    sum += histo[index] || 0;
                }
            }
            total += sum;
            partialsum[i] = total;
        }
    }
    partialsum.forEach((d, i) => {
        lookaheadsum[i] = total - d;
    });
    const doCut = color => {
        let dim1 = color + '1',
            dim2 = color + '2',
            left,
            right,
            vbox1,
            vbox2,
            d2,
            count2 = 0;
        for (i = vbox[dim1]; i <= vbox[dim2]; i++) {
            if (partialsum[i] > total / 2) {
                vbox1 = vbox.copy();
                vbox2 = vbox.copy();
                left = i - vbox[dim1];
                right = vbox[dim2] - i;
                if (left <= right)
                    d2 = Math.min(vbox[dim2] - 1, ~~(i + right / 2));
                else d2 = Math.max(vbox[dim1], ~~(i - 1 - left / 2));
                // avoid 0-count boxes
                while (!partialsum[d2]) d2++;
                count2 = lookaheadsum[d2];
                while (!count2 && partialsum[d2 - 1])
                    count2 = lookaheadsum[--d2];
                // set dimensions
                vbox1[dim2] = d2;
                vbox2[dim1] = vbox1[dim2] + 1;
                return [vbox1, vbox2];
            }
        }
    };
    // Determine the cut planes.
    return maxw == rw ? doCut('r') : maxw == gw ? doCut('g') : doCut('b');
};

exports.quantize = (pixels, maxcolors) => {
    // Short-circuit
    if (!pixels.length || maxcolors < 2 || maxcolors > 256) {
        return false;
    }

    let histo = getHisto(pixels);

    // Check that we aren't below maxcolors already.
    let nColors = 0;
    histo.forEach(() => nColors++);

    // Get the beginning vbox from the colors.
    let vbox = vboxFromPixels(pixels, histo),
        pq = new PQueue((a, b) => pv.naturalOrder(a.count(), b.count()));
    pq.push(vbox);

    // Inner function to do the iteration.
    const iter = (lh, target) => {
        let ncolors = 1,
            niters = 0,
            vbox;
        while (niters < maxIterations) {
            vbox = lh.pop();
            if (!vbox.count()) {
                // Just put it back.
                lh.push(vbox);
                niters++;
                continue;
            }
            // Do the cut.
            let vboxes = medianCutApply(histo, vbox),
                vbox1 = vboxes[0],
                vbox2 = vboxes[1];

            if (!vbox1) {
                return;
            }
            lh.push(vbox1);
            if (vbox2) {
                // vbox2 can be null.
                lh.push(vbox2);
                ncolors++;
            }
            if (ncolors >= target) return;
            if (niters++ > maxIterations) {
                return;
            }
        }
    };

    // First set of colors, sorted by population.
    iter(pq, fractByPopulations * maxcolors);

    // Re-sort by the product of pixel occupancy times the size in color space.
    let pq2 = new PQueue((a, b) =>
        pv.naturalOrder(a.count() * a.volume(), b.count() * b.volume())
    );
    while (pq.size()) {
        pq2.push(pq.pop());
    }

    // Next set - generate the median cuts using the (npix * vol) sorting.
    iter(pq2, maxcolors - pq2.size());

    // Calculate the actual colors.
    let cmap = new CMap();
    while (pq2.size()) {
        cmap.push(pq2.pop());
    }

    return cmap;
};
