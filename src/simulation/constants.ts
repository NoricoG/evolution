// export class Constant {
//     value: number;

//     constructor(public readonly average: number, variation: number) {
//         if (variation >= average) {
//             throw new Error("Variation must be smaller than average");
//         }
//         this.value = average + (Math.random() - 0.5) * variation;
//     }
// }

export class Constants {
    static readonly reproductiveAge = 2;
    static readonly maxChildrenPerReproduction = 2;

    static readonly huntingDistance = 5;
}

export class EnvironmentConstants {
    static readonly plantGrowthPerTile = 0.02;
    static readonly initialPlantAmount = 1.0;
}

export class GeneConstants {
    static readonly shiftRange = 0.05 + Math.random() * 0.05;
    static readonly geneInvertChance = 0.01 + Math.random() * 0.01;

    static readonly learnImprovement = 0.005;
}

export class EnergyConstants {
    static readonly whenBorn = 6;
    static readonly max = 10;

    // cost per turn, added to any action
    static readonly anyAction = -1;

    static readonly energyPerPlant = 10;
    static readonly maxEatPlantEnergy = 5;

    static readonly maxHuntEnergy = 15;

    static readonly moveAction = -1;

    // buffer needed to reproduce, not spent but must be exceeded
    static readonly bufferForReproduction = 7;
    // energy spent per child when reproducing
    static readonly reproductionPerChild = -1;
}
