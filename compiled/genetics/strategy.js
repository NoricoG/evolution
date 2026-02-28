"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Strategy = void 0;
const enums_js_1 = require("../enums.js");
const chromosome_js_1 = require("./chromosome.js");
const gene_js_1 = require("./gene.js");
function hslToRgb(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
        const k = (n + h * 12) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
const actionHues = {
    FeedChildAction: 0, GainTraitAction: 51, GatherAction: 103,
    HideAction: 154, HuntAction: 206, ReproduceAction: 257, ScavengeAction: 309,
};
const dietHueCenters = {
    [enums_js_1.Diet.CARNIVORE]: 10, //red
    [enums_js_1.Diet.HERBIVORE]: 120, // green
    [enums_js_1.Diet.OMNIVORE]: 210, //blue
    [enums_js_1.Diet.SCAVENGER]: 300, //purple
};
class Strategy {
    static groups = [
        ["GatherAction", "HuntAction", "ScavengeAction"],
        ["HideAction", "ReproduceAction", "FeedChildAction"]
    ];
    static headerString = "🥕🍗🦴-🛡️👶🍼";
    chromosome;
    diet;
    constructor(diet, genes) {
        this.chromosome = new chromosome_js_1.Chromosome(Strategy.groups, genes);
        if (diet != enums_js_1.Diet.HERBIVORE && diet != enums_js_1.Diet.OMNIVORE) {
            this.chromosome.genes["GatherAction"] = null;
        }
        if (diet != enums_js_1.Diet.OMNIVORE && diet != enums_js_1.Diet.CARNIVORE) {
            this.chromosome.genes["HuntAction"] = null;
        }
        if (diet != enums_js_1.Diet.SCAVENGER) {
            this.chromosome.genes["ScavengeAction"] = null;
        }
        this.diet = diet;
    }
    mutate() {
        const mutatedChromosome = this.chromosome.mutate();
        return new Strategy(this.diet, mutatedChromosome.genes);
    }
    static random(diet) {
        const chromosome = chromosome_js_1.Chromosome.random(Strategy.groups);
        return new Strategy(diet, chromosome.genes);
    }
    toString() {
        return this.chromosome.toString();
    }
    static similar(strategyA, strategyB) {
        return chromosome_js_1.Chromosome.similar(strategyA.chromosome, strategyB.chromosome, 1);
    }
    toColorOld() {
        let r = 0, g = 0, b = 0, total = 0;
        for (const [action, weight] of Object.entries(this.chromosome.genes)) {
            const h = actionHues[action] / 360;
            const [rc, gc, bc] = hslToRgb(h, 0.8, 0.5);
            r += rc * weight.value;
            g += gc * weight.value;
            b += bc * weight.value;
            total += weight.value;
        }
        return `rgb(${Math.round(r / total)},${Math.round(g / total)},${Math.round(b / total)})`;
    }
    toColor() {
        // each diet gets a ±90° range around its center hue
        const hueRange = 90 * 2;
        // weighted-average of action hues, using only active (non-null) weights
        let weightedHueSum = 0, totalWeight = 0, weightSum = 0, weightCount = 0;
        let wMin = gene_js_1.Gene.maxValue, wMax = gene_js_1.Gene.minValue;
        for (const [action, weight] of Object.entries(this.chromosome.genes)) {
            if (weight === null)
                continue;
            weightedHueSum += actionHues[action] * weight.value;
            totalWeight += weight.value;
            weightSum += weight.value;
            weightCount++;
            if (weight.value < wMin)
                wMin = weight.value;
            if (weight.value > wMax)
                wMax = weight.value;
        }
        // map the weighted hue (0–360°) to an offset of hueRange around the diet's center hue
        const avgActionHue = totalWeight > 0 ? weightedHueSum / totalWeight : 180;
        const hueOffset = (avgActionHue / 360 - 0.5) * hueRange;
        const finalHue = ((dietHueCenters[this.diet] + hueOffset) % 360 + 360) % 360;
        // vary lightness based on average weight magnitude (heavier weights → brighter)
        const avgWeight = weightCount > 0 ? weightSum / weightCount : 1;
        const lightness = 0.35 + 0.3 * ((avgWeight - gene_js_1.Gene.minValue) / (gene_js_1.Gene.maxValue - gene_js_1.Gene.minValue));
        // vary saturation based on weight spread (more extreme/varied strategy → more vivid)
        const weightSpread = weightCount > 1 ? (wMax - wMin) / (gene_js_1.Gene.maxValue - gene_js_1.Gene.minValue) : 0;
        const saturation = 0.55 + 0.4 * weightSpread;
        const [r, g, b] = hslToRgb(finalHue / 360, saturation, lightness);
        return `rgb(${r},${g},${b})`;
    }
    decide(actions, individual) {
        if (actions.length == 0) {
            return null;
        }
        const weightedActions = actions.map(action => {
            const weight = this.chromosome.genes[action.constructor.name] || { value: 1 };
            return { action, weight };
        });
        const totalWeight = weightedActions.reduce((sum, aw) => sum + aw.weight.value, 0);
        const randomWeight = Math.random() * totalWeight;
        let remainingWeight = randomWeight;
        for (const aw of weightedActions) {
            if (remainingWeight < aw.weight.value) {
                return aw.action;
            }
            remainingWeight -= aw.weight.value;
        }
        console.error("No action chosen, this should not happen");
        return null;
    }
}
exports.Strategy = Strategy;
