enum Trait {
    LARGE = "large",
    BURROWING = "burrowing",
    SWIMMING = "swimming"
}

const traitOrder = [Trait.LARGE, Trait.BURROWING, Trait.SWIMMING];

function sortTraits(traits: Trait[]): Trait[] {
    return traits.sort((a, b) => traitOrder.indexOf(a) - traitOrder.indexOf(b));
}

enum Diet {
    // herbivore is lack of Diet
    CARNIVORE = "carnivore",
    OMNIVORE = "omnivore",
    SCAVENGER = "scavenger"
}

const allTraitsAndDiets: (Trait | Diet)[] = [...Object.values(Trait), ...Object.values(Diet)];

function getRandomTraitOrDiet(): Trait | Diet {
    return allTraitsAndDiets[Math.floor(Math.random() * allTraitsAndDiets.length)];
}
