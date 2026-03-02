export class Gene {
    static readonly shiftRange = 0.3;
    static readonly geneFlipChance = 0.05; // disabled for testing

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
        const bucket = this.getBucket();
        if (bucket == 0) return "x";
        return bucket.toString();
    }

    getBucket(): number {
        // keep exactly 0
        if (this.value == 0) return 0;

        // map 0.00_001 to 1 and map 1 to 9
        return Math.ceil(this.value * 9);
    }

    mutated(): Gene {
        if (Math.random() < Gene.geneFlipChance) {
            return this.inverted();
        } else {
            return this.shifted();
        }
    }

    private inverted(): Gene {
        return new Gene(1 - this.value);
    }

    private shifted(): Gene {
        const shift = Math.random() * Gene.shiftRange - Gene.shiftRange / 2;
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
