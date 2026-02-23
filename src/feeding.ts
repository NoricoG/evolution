abstract class Action {
    individual: Individual;

    constructor(individual: Individual) {
        this.individual = individual;
    }

    abstract execute(): void;
}

class HideAction extends Action {
    execute() {
        this.individual.shelter = true;
        state.climate.shelter--;

        log(`${this.individual.id} 🛡️ -> ${this.individual.statusString()}`);

        if (state.climate.shelter == 0) {
            log("0 shelter remaining");
        }
    }
}

class GatherAction extends Action {
    execute() {
        this.individual.hunger--;
        if (this.individual.species.traits.includes(Trait.BURROWING) && this.individual.hunger == 0) {
            this.individual.shelter = true;
        }

        state.climate.food--;

        log(`${this.individual.id} 🥕 -> ${this.individual.statusString()}`);
        if (state.climate.food == 0) {
            log("0 food remaining");
        }
    }
}

class HuntAction extends Action {
    victim: Individual;

    constructor(individual: Individual, victim: Individual) {
        super(individual);
        this.victim = victim;
    }

    execute() {
        this.individual.hunger -= this.victim.species.defaultHunger;
        if (this.individual.hunger < 0) {
            this.individual.hunger = 0;
        }
        if (this.individual.species.traits.includes(Trait.BURROWING) && this.individual.hunger == 0) {
            this.individual.shelter = true;
        }
        this.victim.eaten = true;
        log(`${this.individual.id} 🍗 ${this.victim.id} -> ${this.individual.statusString()}`);

        this.triggerScavanger();
    }

    triggerScavanger() {
        for (let species of state.species) {
            if (species.diet == Diet.SCAVENGER) {
                for (let individual of species.individuals) {
                    if (!individual.eaten && individual.hunger > 0) {
                        individual.hunger--;
                        if (individual.species.traits.includes(Trait.BURROWING) && individual.hunger == 0) {
                            individual.shelter = true;
                        }
                        log(` ${individual.id} 🦴 ${this.victim.id} -> ${individual.statusString()}`);
                        return;
                    }

                }
            }
        }
    }
}

function doFeeding() {
    actions();
    return doExtinction();
}


function actions() {
    const dietCounts = {}
    var herbivores: number = 0;
    for (let species of state.species) {
        if (species.diet) {
            dietCounts[species.diet] = (dietCounts[species.diet] || 0) + 1;
        } else {
            herbivores++;
        }
    }
    var diets = [];
    if (herbivores > 0) {
        diets.push(`${herbivores} herbivore${herbivores > 1 ? "s" : ""}`);
    }
    if (dietCounts[Diet.CARNIVORE]) {
        diets.push(`${dietCounts[Diet.CARNIVORE]} carnivore${dietCounts[Diet.CARNIVORE] > 1 ? "s" : ""}`);
    }
    if (dietCounts[Diet.OMNIVORE]) {
        diets.push(`${dietCounts[Diet.OMNIVORE]} omnivore${dietCounts[Diet.OMNIVORE] > 1 ? "s" : ""}`);
    }
    if (dietCounts[Diet.SCAVENGER]) {
        diets.push(`${dietCounts[Diet.SCAVENGER]} scavenger${dietCounts[Diet.SCAVENGER] > 1 ? "s" : ""}`);
    }
    log(diets.join(", "));

    state.climate = new Climate();
    log(`${state.climate!.food} food, ${state.climate!.shelter} shelter`);

    // reset hunger and shelter
    for (let species of state.species) {
        for (let individual of species.individuals) {
            individual.hunger = species.defaultHunger;
            individual.shelter = false;
        }
    }

    var allIndividuals = state.species.flatMap(species => species.individuals.map(individual => [species, individual] as const));

    var active = true;
    while (active) {
        active = false;

        // shuffle allIndividuals
        for (let i = allIndividuals.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allIndividuals[i], allIndividuals[j]] = [allIndividuals[j], allIndividuals[i]];
        }

        for (const [species, individual] of allIndividuals) {
            if (act(species, individual)) {
                active = true;
            }
        }
    }

    if (state.climate.food > 0) {
        log(`${state.climate.food} food remaining`);
    }
    if (state.climate.shelter > 0) {
        log(`${state.climate.shelter} shelter remaining`);
    }
}

function act(species: Species, individual: Individual) {
    if (individual.eaten) {
        return false;
    }

    const possibleActions = [];

    if (!individual.shelter && state.climate.shelter > 0) {
        possibleActions.push(new HideAction(individual));
    }

    if (individual.hunger > 0) {
        const canHunt = species.diet === Diet.CARNIVORE || species.diet === Diet.OMNIVORE;
        const canGather = species.diet != Diet.CARNIVORE;

        if (canHunt) {
            const victims = [];
            const sameSpeciesVictims = [];
            for (let victimSpecies of state.species) {
                for (let victimIndividual of victimSpecies.individuals) {
                    // can't eat itself
                    if (individual.id === victimIndividual.id) {
                        continue;
                    }

                    if (victimIndividual.canBeEatenBy(species)) {
                        if (victimSpecies == species) {
                            sameSpeciesVictims.push(victimIndividual);
                        } else {
                            victims.push(victimIndividual);
                        }
                    }
                }
            }

            if (victims.length > 0) {
                const victim = victims[Math.floor(Math.random() * victims.length)];
                possibleActions.push(new HuntAction(individual, victim));
            } else if (sameSpeciesVictims.length > 0) {
                const victim = sameSpeciesVictims[Math.floor(Math.random() * sameSpeciesVictims.length)];
                possibleActions.push(new HuntAction(individual, victim));
            }
        }

        if (canGather && state.climate.food > 0) {
            possibleActions.push(new GatherAction(individual));
        }
    }

    if (possibleActions.length > 0) {
        const action = possibleActions[Math.floor(Math.random() * possibleActions.length)];

        action.execute();
        return true;
    }
    return false;
}

function doExtinction(): [Individual[], Individual[]] {
    const eatenIndividuals: Individual[] = [];
    const starvedIndividuals: Individual[] = [];

    // separate dead individuals and update species
    for (let species of state.species) {
        const alive: Individual[] = [];

        for (let individual of species.individuals) {
            if (individual.eaten) {
                eatenIndividuals.push(individual);
            } else if (individual.hunger > 0) {
                starvedIndividuals.push(individual);
            } else {
                alive.push(individual);
            }
        }

        species.individuals = alive;
    }

    // remove extinct species
    state.species = state.species.filter(species => species.aliveIndividuals() > 0);

    if (starvedIndividuals.length > 0) {
        log(`${starvedIndividuals.length} individuals starved`);
    }

    return [eatenIndividuals, starvedIndividuals];
}
