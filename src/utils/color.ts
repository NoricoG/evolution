import { Diet, DietGenes } from "../genetics/diet.js";

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h * 12) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export function dietToColor(diet: Diet): string {
    const herbivoreValue = diet.genes[DietGenes.Herbivore].value;
    const carnivoreValue = diet.genes[DietGenes.Carnivore].value;

    const mostlyHerbivore = herbivoreValue > carnivoreValue;

    // green for herbivores, red for carnivores
    const hue = mostlyHerbivore ? 120 : 0;
    const saturation = 0.75;
    const lightness = 0.5;

    const [r, g, b] = hslToRgb(hue / 360, saturation, lightness);
    return `rgb(${r}, ${g}, ${b})`;
}
