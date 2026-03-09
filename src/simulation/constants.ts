export class Constants {
    static readonly foodAttempts = 9 + Math.round(Math.random() * 2);

    static readonly reproductiveAge = 2;
    static readonly maxChildrenPerReproduction = 2;
}

export class EnvironmentConstants {
    static readonly foodRegeneration = 15 + Math.round(Math.random() * 15);
    static readonly preserveRemainingFood = 0.1 + Math.random() * 0.2;
}

export class GeneConstants {
    static readonly shiftRange = 0.05 + Math.random() * 0.1;
    static readonly geneFlipChance = 0.05 + Math.random() * 0.1;
}

export class EnergyConstants {
    static readonly whenBorn = 3;
    static readonly max = 5;

    // cost per turn, added to any action
    static readonly anyAction = -1;

    // gain when eating
    static readonly eatPlantAction = 3;
    static readonly eatMeatAction = 3;

    // buffer needed to reproduce, not spent but must be exceeded
    static readonly bufferForReproduction = 4;
    // energy spent per child when reproducing
    static readonly reproductionPerChild = -1;
}
