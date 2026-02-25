const minWeight = 0.1;
const maxWeight = 2;

function randomWeight(): number {
    return minWeight + Math.random() * (maxWeight - minWeight);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h * 12) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

const actionHues: { [key: string]: number } = {
    FeedChildAction: 0, GainTraitAction: 51, GatherAction: 103,
    HideAction: 154, HuntAction: 206, ReproduceAction: 257, ScavengeAction: 309,
};

const weightToString = (weight: number | null): string => {
    if (weight === null) return "x";
    return weight.toFixed(1);
}

function similarStrategy(a: Strategy, b: Strategy): boolean {
    const hashA = a.toString();
    const hashB = b.toString();

    // check if every character in the has is at most one away
    for (let i = 0; i < hashA.length; i++) {
        // both x (inactive) is equal
        if (hashA[i] == "x" && hashB[i] == "x") continue;
        // one x and one not x is different
        if (hashA[i] == "x" || hashB[i] == "x") return false;

        const numA = parseInt(hashA[i]);
        const numB = parseInt(hashB[i]);
        if (Math.abs(numA - numB) > 1) {
            return false;
        }
    }
    return true;
}

class Strategy {
    weights: { [key: string]: number | null };
    diet: Diet;

    static randomStrategy(diet: Diet): Strategy {
        const weights = {
            GatherAction: diet == Diet.CARNIVORE || diet == Diet.SCAVENGER ? null : randomWeight(),
            HuntAction: diet == Diet.HERBIVORE || diet == Diet.SCAVENGER ? null : randomWeight(),
            ScavengeAction: diet != Diet.SCAVENGER ? null : randomWeight(),
            HideAction: randomWeight(),
            ReproduceAction: randomWeight(),
            FeedChildAction: randomWeight(),
            GainTraitAction: randomWeight(),
        }

        return new Strategy(weights, diet);
    }

    constructor(weights: { [key: string]: number | null }, diet: Diet) {
        this.diet = diet;
        this.weights = weights;
    }

    toString(): string {
        // map weight from min-max range to 0-9
        function toNum(weight: number): string {
            if (weight === null) return "x";

            const normalized = (weight - minWeight) / (maxWeight - minWeight); // 0.0 to 1.0
            const bucket = Math.floor(normalized * 10);
            const clamped = Math.min(9, bucket); // in case weight == maxWeight
            return clamped.toString();
        }

        // put dash between groups of actions
        let groupedHash = "";
        for (const group of actionGroups) {
            if (groupedHash) {
                groupedHash += "-";
            }
            groupedHash += group.map(action => toNum(this.weights[action])).join("");
        }

        return groupedHash;
    }

    toColorOld(): string {
        let r = 0, g = 0, b = 0, total = 0;
        for (const [action, weight] of Object.entries(this.weights)) {
            const h = actionHues[action] / 360;
            const [rc, gc, bc] = hslToRgb(h, 0.8, 0.5);
            r += rc * weight; g += gc * weight; b += bc * weight;
            total += weight;
        }
        return `rgb(${Math.round(r / total)},${Math.round(g / total)},${Math.round(b / total)})`;
    }

    toColor(): string {
        const dietHueCenters: { [key in Diet]: number } = {
            [Diet.CARNIVORE]: 10, //red
            [Diet.HERBIVORE]: 120, // green
            [Diet.OMNIVORE]: 210, //blue
            [Diet.SCAVENGER]: 300, //purple
        };
        // each diet gets a ±90° range around its center hue
        const hueRange = 90 * 2;

        // weighted-average of action hues, using only active (non-null) weights
        let weightedHueSum = 0, totalWeight = 0, weightSum = 0, weightCount = 0;
        let wMin = maxWeight, wMax = minWeight;
        for (const [action, weight] of Object.entries(this.weights)) {
            if (weight === null) continue;
            weightedHueSum += actionHues[action] * weight;
            totalWeight += weight;
            weightSum += weight;
            weightCount++;
            if (weight < wMin) wMin = weight;
            if (weight > wMax) wMax = weight;
        }

        // map the weighted hue (0–360°) to an offset of hueRange around the diet's center hue
        const avgActionHue = totalWeight > 0 ? weightedHueSum / totalWeight : 180;
        const hueOffset = (avgActionHue / 360 - 0.5) * hueRange;
        const finalHue = ((dietHueCenters[this.diet] + hueOffset) % 360 + 360) % 360;

        // vary lightness based on average weight magnitude (heavier weights → brighter)
        const avgWeight = weightCount > 0 ? weightSum / weightCount : 1;
        const lightness = 0.35 + 0.3 * ((avgWeight - minWeight) / (maxWeight - minWeight));

        // vary saturation based on weight spread (more extreme/varied strategy → more vivid)
        const weightSpread = weightCount > 1 ? (wMax - wMin) / (maxWeight - minWeight) : 0;
        const saturation = 0.55 + 0.4 * weightSpread;

        const [r, g, b] = hslToRgb(finalHue / 360, saturation, lightness);
        return `rgb(${r},${g},${b})`;
    }

    decide(actions: Action[], individual: Individual): Action | null {
        if (actions.length == 0) {
            return null;
        }

        const weightedActions = actions.map(action => {
            const weight = this.weights[action.constructor.name] ?? 1;
            return { action, weight };
        });

        const totalWeight = weightedActions.reduce((sum, aw) => sum + aw.weight, 0);
        const randomWeight = Math.random() * totalWeight;
        let remainingWeight = randomWeight;

        for (const aw of weightedActions) {
            if (remainingWeight < aw.weight) {
                return aw.action;
            }
            remainingWeight -= aw.weight;
        }
        console.error("No action chosen, this should not happen");
        return null;
    }
}
