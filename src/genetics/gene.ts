export class Gene {
    static shiftRange = 0.1;
    static geneFlipChance = 0; // disabled for testing

    // between 0 and 1 (inclusive)
    value: number;

    constructor(value: number) {
        this.value = value;
    }

    static random(): Gene {
        const randomValue = Math.random();
        return new Gene(randomValue);
    }

    toString(): string {
        // exactly 0
        if (this.value == 0) return "x";

        // map value from 0-1 to 0-9
        const bucket = Math.ceil(this.value * 10) - 1;
        return bucket.toString();
    }

    mutate(): Gene {
        if (Math.random() < Gene.geneFlipChance) {
            return this.invert();
        } else {
            return this.shift();
        }
    }

    invert(): Gene {
        return new Gene(1 - this.value);
    }

    shift(): Gene {
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
