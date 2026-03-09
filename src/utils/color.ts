import { Brain } from "../simulation/genetics/brain.js";

export class Color {

    // diet: lighter, hue-shifted
    static herbivore = "rgb(22, 163, 74)";   // green-600
    static omnivore = "rgb(37, 99, 235)";    // blue-600
    static carnivore = "rgb(220, 38, 38)";   // red-600

    // impact: deep, saturated hues
    static good = "rgb(52, 211, 153)";       // emerald-400 (teal-green)
    static neutral = "rgb(100, 116, 139)";   // slate-500
    static bad = "rgb(251, 113, 133)";       // rose-400 (pink-red)

    static plantOrMeat = this.omnivore;
    static eatOrReproduce = this.neutral;

    static rgbToRgba(rgb: string, alpha: number): string {
        return rgb.replace("rgb(", "rgba(").replace(")", `, ${alpha.toFixed(2)})`);
    }

    static hslToRgb(h: number, s: number, l: number): [number, number, number] {
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => {
            const k = (n + h * 12) % 12;
            return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        };
        return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
    }

    static genomeToColor(brain: Brain): string {
        // 0 = plant (herbivore/green), 1 = meat (carnivore/red)
        const herbivoreValue = 1 - brain.plantOrMeat.value;

        // minValue is mapped to red (hue 0), maxValue is mapped to green (hue 130)
        // inbetween is scaled linearly
        const minValue = 0.1;
        const maxValue = 0.9;
        const clampedHerbivoreValue = Math.min(maxValue, Math.max(minValue, herbivoreValue));

        const hue = (clampedHerbivoreValue - minValue) / (maxValue - minValue) * 130;

        const eatValue = 1 - brain.eatOrReproduce.value;
        const saturation = 0.5 + eatValue / 2;

        const lightness = 0.6;

        const [r, g, b] = Color.hslToRgb(hue / 360, saturation, lightness);
        return `rgb(${r}, ${g}, ${b})`;
    }
}
