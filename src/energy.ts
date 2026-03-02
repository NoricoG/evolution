export class Energy {
    static readonly whenBorn = 3;
    static readonly max = 5;

    // cost per turn, added to any action
    static readonly anyAction = -1;

    // gain when eating
    static readonly herbivoreAction = 4;
    static readonly carnivoreAction = 4;

    // buffer needed to reproduce, not spent but must be exceeded
    static readonly bufferForReproduction = 4;
    // energy spent per child when reproducing
    static readonly reproductionPerChild = -1;
}
