import { GeneConstants } from "../constants";

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

    mutated(): Gene {
        if (Math.random() < GeneConstants.geneFlipChance) {
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

    static difference(geneA: Gene, geneB: Gene): number {
        const a = geneA.toString();
        const b = geneB.toString();
        if (a == "x" && b == "x") return 0;
        if (a == "x" || b == "x") return 1;

        const numA = parseInt(a);
        const numB = parseInt(b);
        return Math.abs(numA - numB);
    }
}
