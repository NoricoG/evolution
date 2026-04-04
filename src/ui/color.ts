import { Diet } from "@simulation/genetics/diet.js";

export class Color {

    static green = "rgb(22, 163, 74)";   // green-600
    static blue = "rgb(37, 99, 235)";    // blue-600
    static red = "rgb(220, 38, 38)";     // red-600

    static greenTeal = "rgb(52, 211, 153)";       // emerald-400 (teal-green)
    static blueSky = "rgb(56, 189, 248)";         // sky-400 (sky-blue)
    static redPink = "rgb(251, 113, 133)";       // rose-400 (pink-red)

    static purple = "rgb(167, 139, 250)";         // violet-400

    static rgbToRgba(rgb: string, alpha: number): string {
        return rgb.replace("rgb(", "rgba(").replace(")", `, ${alpha.toFixed(2)})`);
    }
}

export class Hue {
    static greenHue = 140 / 360;
    static blueHue = 220 / 360;
    static redHue = 0 / 360;
    static purpleHue = 270 / 360;
    static orangeHue = 30 / 360;
    static yellowHue = 55 / 360;
    static defaultSaturation = 0.5;

    static greenToRedRange = this.hueRange(this.greenHue, this.redHue, 9, 0.9, 0.4);

    static hueRange(fromHue: number, toHue: number, steps: number, saturation: number, luminance: number): string[] {
        return Array.from({ length: steps }, (_, i) => {
            const huePerStep = steps > 1 ? i / (steps - 1) : 0;
            const hue = fromHue + huePerStep * (toHue - fromHue);
            const [r, g, b] = Hue.hslToRgb(hue, saturation, luminance);
            return `rgb(${r}, ${g}, ${b})`;
        });
    }

    static hslToRgb(h: number, s: number, l: number): [number, number, number] {
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => {
            const k = (n + h * 12) % 12;
            return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        };
        return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
    }

    static genomeToColor(diet: Diet): string {
        const herbivoreValue = diet.meat.value;

        // minValue is mapped to red (hue 0), maxValue is mapped to green (hue 130)
        // inbetween is scaled linearly
        const minValue = 0.1;
        const maxValue = 0.9;
        const clampedHerbivoreValue = Math.min(maxValue, Math.max(minValue, herbivoreValue));

        const hue = (clampedHerbivoreValue - minValue) / (maxValue - minValue) * 130;

        // const eatValue = 1 - brain.surviveOrLearn.value;
        const eatValue = 0.8;
        const saturation = 0.5 + eatValue / 2;

        const lightness = 0.6;

        const [r, g, b] = Hue.hslToRgb(hue / 360, saturation, lightness);
        return `rgb(${r}, ${g}, ${b})`;
    }
}
