import { GeneConstants } from "../constants.js";

export class Gene {
    // between 0 and 1 (inclusive)
    readonly value: number;

    constructor(value: number) {
        this.value = value;
    }

    static random(): Gene {
        const randomValue = Math.random();
        return new Gene(randomValue);
    }

    toString(): string {
        return this.bucket.toString();
    }

    get bucket(): number {
        // map 0-1 range to 1-9, (0.5 maps to 5)
        return Math.round(this.value * 8) + 1;
    }

    mutated(invert: boolean): Gene {
        if (invert && Math.random() < GeneConstants.geneInvertChance) {
            return this.inverted();
        } else {
            return this.shifted();
        }
    }

    private inverted(): Gene {
        return new Gene(1 - this.value);
    }

    private shifted(): Gene {
        const shift = Math.random() * GeneConstants.shiftRange - GeneConstants.shiftRange / 2;
        let shifted = this.value + shift;
        if (shifted < 0) {
            shifted = 0;
        }
        if (shifted > 1) {
            shifted = 1;
        }
        return new Gene(shifted);
    }

    static bucketDifference(geneA: Gene, geneB: Gene): number {
        const a = geneA.bucket;
        const b = geneB.bucket;

        return Math.abs(a - b);
    }
}
