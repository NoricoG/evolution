"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gene = void 0;
class Gene {
    static minValue = 0.1;
    static maxValue = 2.0;
    static shiftRange = 0.5;
    static geneFlipChance = 0.05;
    value;
    constructor(value = null) {
        this.value = value;
    }
    static random() {
        const randomValue = Gene.minValue + Math.random() * (Gene.maxValue - Gene.minValue);
        return new Gene(randomValue);
    }
    toString() {
        if (this.value === null)
            return "x";
        // map value from min-max range to 0-9
        const normalized = (this.value - Gene.minValue) / (Gene.maxValue - Gene.minValue); // 0.0 to 1.0
        const bucket = Math.floor(normalized * 10);
        const clamped = Math.min(9, bucket); // in case value == maxValue
        return clamped.toString();
    }
    mutate() {
        if (Math.random() < Gene.geneFlipChance) {
            return this.invert();
        }
        else {
            return this.shift();
        }
    }
    invert() {
        if (this.value === null)
            return new Gene(null);
        const normalized = (this.value - Gene.minValue) / (Gene.maxValue - Gene.minValue);
        const invertedNormalized = 1 - normalized;
        const inverted = Gene.minValue + invertedNormalized * (Gene.maxValue - Gene.minValue);
        return new Gene(inverted);
    }
    shift() {
        if (this.value === null)
            return new Gene(null);
        const shift = Math.random() * Gene.shiftRange - Gene.shiftRange / 2;
        let shifted = this.value + shift;
        if (shifted < Gene.minValue) {
            shifted = Gene.minValue;
        }
        if (shifted > Gene.maxValue) {
            shifted = Gene.maxValue;
        }
        return new Gene(shifted);
    }
    static difference(geneA, geneB) {
        const a = geneA.toString();
        const b = geneB.toString();
        if (a == "x" && b == "x")
            return 0;
        if (a == "x" || b == "x")
            return 1;
        const numA = parseInt(a);
        const numB = parseInt(b);
        return Math.abs(numA - numB);
    }
}
exports.Gene = Gene;
