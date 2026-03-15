export class Constants {
    static readonly plantSearchAttempts = 5 + Math.round(Math.random() * 5);
    static readonly huntAttempts = 1 + Math.round(Math.random() * 2);

    static readonly reproductiveAge = 2;
    static readonly maxChildrenPerReproduction = 2;
}

export class EnvironmentConstants {
    static readonly preserveRemainingFood = 0.1 + Math.random() * 0.2;

    static readonly minFoodRegeneration = 15 + Math.round(Math.random() * 15);
    static readonly maxFoodRegeneration = 30 + Math.round(Math.random() * 30);

    static readonly stepFoodRegeneration = 0.001 + Math.random() * 0.1;
}

export class GeneConstants {
    static readonly shiftRange = 0.01 + Math.random() * 0.04;
    static readonly geneInvertChance = 0.001 + Math.random() * 0.06;

    static readonly learnImprovement = 0.01;
}

export class EnergyConstants {
    static readonly whenBorn = 3;
    static readonly max = 7;

    // cost per turn, added to any action
    static readonly anyAction = -1;

    // gain when eating
    static readonly plantSearchAction = 3;
    static readonly huntAction = 3;

    // no extra cost for learning
    static readonly learnAction = 0;

    // buffer needed to reproduce, not spent but must be exceeded
    static readonly bufferForReproduction = 4;
    // energy spent per child when reproducing
    static readonly reproductionPerChild = -1;
}
