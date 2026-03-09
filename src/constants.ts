export class Constants {
    static readonly reproductiveAge = 2;

    static readonly foodAttempts = 10;

    static readonly maxChildrenPerReproduction = 2;
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
