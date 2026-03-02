import { Brain, BrainGenes } from "../genetics/brain.js";
import { Diet, DietGenes } from "../genetics/diet.js";

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h * 12) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export function genomeToColor(diet: Diet, brain: Brain): string {
    const herbivoreValue = diet.genes[DietGenes.Herbivore].value;

    // assumes that there are only two DietGenes (herbivore and carnivore)
    // assumes herbivoreValue + carnivoreValue == 1
    // minValue is mapped to red (hue 0), maxValue is mapped to green (hue 120)
    // inbetween is scaled linearly
    const minValue = 0.1;
    const maxValue = 0.9;
    const clampedHerbivoreValue = Math.min(maxValue, Math.max(minValue, herbivoreValue));

    const hue = (clampedHerbivoreValue - minValue) / (maxValue - minValue) * 120;

    const eatValue = brain.genes[BrainGenes.Eat].value;
    const saturation = 0.5 + eatValue / 2;

    const lightness = 0.6;

    const [r, g, b] = hslToRgb(hue / 360, saturation, lightness);
    return `rgb(${r}, ${g}, ${b})`;
}
