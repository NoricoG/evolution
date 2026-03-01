import { Action } from "../action.js";
import { Individual } from "../individual.js";

import { Chromosome } from "./chromosome.js";
import { Gene } from "./gene.js";

export enum BrainGenes {
    GatherAction = "GatherAction",
    HuntAction = "HuntAction",
    // ScavengeAction = "ScavengeAction",
    ReproduceAction = "ReproduceAction",
}

export class Brain extends Chromosome {

    static geneKeys = Object.values(BrainGenes);
    // static geneLabels = "🥕🍖🥩👶";
    static geneLabels = "🥕🥩👶";

    decide(actions: Action[]): Action | null {
        if (actions.length === 0) {
            return null;
        }

        const weightedActions = actions.map(action => {
            const weight = this.genes[action.constructor.name] || { value: 1 };
            return { action, weight };
        });

        // pick a random weight of the total weight range
        const totalWeight = weightedActions.reduce((sum, aw) => sum + aw.weight.value!, 0);
        const randomWeight = Math.random() * totalWeight;

        if (totalWeight === 0) {
            const actionsString = actions.map(a => a.constructor.name).join(" ");
            console.info(`This individual can do ${actionsString} but brain is ${this.toString()} so it does nothing`);
            return null
        }

        // find the action corresponding to the random weight
        let cumulativeWeight = 0;
        for (const aw of weightedActions) {
            cumulativeWeight += aw.weight.value;
            if (cumulativeWeight > randomWeight) {
                return aw.action;
            }
        }

        console.warn("No action chosen, this should not happen");
        return null;
    }

    mutatedCopy(): Brain {
        return new Brain(this.mutatedGenes());
    }

    static random(): Brain {
        return new Brain(Chromosome.randomGenes(Brain.geneKeys));
    }

    static debugHerbivore(): Brain {
        return new Brain({
            [BrainGenes.GatherAction]: new Gene(1),
            [BrainGenes.HuntAction]: new Gene(0),
            [BrainGenes.ReproduceAction]: new Gene(1),
        });
    }

    static debugCarnivore(): Brain {
        return new Brain({
            [BrainGenes.GatherAction]: new Gene(0),
            [BrainGenes.HuntAction]: new Gene(1),
            [BrainGenes.ReproduceAction]: new Gene(1),
        });
    }
}
