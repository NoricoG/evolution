function nextPhase() {
    display(state);

    switch (state.phase) {
        case Phase.Extinction:
            state.phase = Phase.Development;
            state = doDevelopment();
            break;
        case Phase.Development:
            state.phase = Phase.Feeding;
            state = doFeeding();
            break;
        case Phase.Feeding:
            state.phase = Phase.Extinction;
            state = doExtinction();
            break;
    }
}

function doDevelopment(): State {
    for (let player of state.players) {
        doDevelopmentForPlayer(player);
    }

    return state;
}

function doDevelopmentForPlayer(player: Player) {
    var actions = 2;
    for (let species of player.species) {
        actions += species.aliveIndividuals();
    }

    while (actions > 0) {
        actions--;
        const action = Math.random();
        const noSpecies = player.species.length === 0;

        const underdevelopedSpecies = player.species.map((species, index) => species.getTraitOrDietCount() < 3 ? index : -1).filter(index => index >= 0);
        const anyUnderdeveloped = underdevelopedSpecies.length > 0;

        if (action < 1 / 3 || noSpecies) {
            player.species.push(new Species(player));
        } else if (action < 2 / 3 && anyUnderdeveloped) {
            var traitOrDiet = getRandomTraitOrDiet();
            var chosenSpecies = underdevelopedSpecies[Math.floor(Math.random() * underdevelopedSpecies.length)];

            var added = false;
            while (!added && chosenSpecies < player.species.length) {
                added = player.species[chosenSpecies].addTraitOrDiet(traitOrDiet);
                chosenSpecies++;
            }
            if (!added) {
                player.species.push(new Species(player));
            }
        } else {
            player.species[Math.floor(Math.random() * player.species.length)].addIndividual();
        }
    }

    state.climate = new Climate();
}

abstract class Action {
    individual: Individual;

    constructor(individual: Individual) {
        this.individual = individual;
    }

    abstract execute(): void;
}

class HideAction extends Action {
    toString() {
        return `HIDE: ${this.individual}`;
    }

    execute() {
        this.individual.shelter = true;
        state.climate.shelter--;
    }
}

class GatherAction extends Action {
    toString() {
        return `GATHER: ${this.individual}`;
    }

    execute() {
        this.individual.hunger--;
        state.climate.food--;
    }
}

class HuntAction extends Action {
    victim: Individual;

    constructor(individual: Individual, victim: Individual) {
        super(individual);
        this.victim = victim;
    }

    toString() {
        return `HUNT: ${this.individual} (EATING ${this.victim})`;
    }

    execute() {
        this.individual.hunger--;
        this.victim.eaten = true;
    }
}

function doFeeding(): State {
    // reset hunger and shelter
    for (let player of state.players) {
        for (let species of player.species) {
            for (let individual of species.individuals) {
                individual.hunger = species.defaultHunger;
                individual.shelter = false;
            }
        }
    }

    var activity = true;
    while (activity) {
        activity = false;
        for (var i = 0; i < state.players.length; i++) {
            console.log(`Player ${i + 1} is taking actions`);

            var possibleActions = [];
            for (let species of state.players[i].species) {
                for (let individual of species.individuals) {
                    if (individual.eaten) {
                        continue;
                    }
                    if (!individual.shelter && state.climate.shelter > 0) {
                        possibleActions.push(new HideAction(individual));
                    }
                    if (individual.hunger > 0) {
                        const canHunt = species.diet === Diet.CARNIVORE || species.diet === Diet.OMNIVORE;
                        const canGather = species.diet != Diet.CARNIVORE;

                        if (canHunt) {
                            const victims = [];
                            for (let victimPlayer of state.players) {
                                for (let victimSpecies of victimPlayer.species) {
                                    for (let victimIndividual of victimSpecies.individuals) {
                                        // TODO: does this check really work?
                                        if (individual == victimIndividual) {
                                            // can't eat itself
                                            continue;
                                        }
                                        if (species.canBeEatenBy(victimIndividual, species)) {
                                            victims.push(victimIndividual);
                                        }
                                    }
                                }
                            }
                            if (victims.length > 0) {
                                const victim = victims[Math.floor(Math.random() * victims.length)];
                                possibleActions.push(new HuntAction(individual, victim));
                            }
                        }

                        if (canGather && state.climate.food > 0) {
                            possibleActions.push(new GatherAction(individual));
                        }
                    }
                }
            }

            if (possibleActions.length > 0) {
                const action = possibleActions[Math.floor(Math.random() * possibleActions.length)];

                for (let possibleAction of possibleActions) {
                    if (possibleAction == action) {
                        console.log("DOING -", possibleAction.toString());
                    } else {
                        console.log("NOT -", possibleAction.toString());
                    }
                }

                action.execute();
                activity = true;
            }
        }
    }
    return state;
}

function doExtinction(): State {
    state.extinctions = new Extinctions();

    for (let player of state.players) {
        var hungryIndividuals = 0;
        var eatenIndividuals = 0;
        var extinctSpecies = 0;

        for (let species of player.species) {
            const oldIndividuals = species.individuals.length;
            species.individuals = species.individuals.filter(individual => !individual.eaten);
            eatenIndividuals += oldIndividuals - species.aliveIndividuals();

            const uneatenIndividuals = species.individuals.length;
            species.individuals = species.individuals.filter(individual => individual.hunger <= 0);
            hungryIndividuals = uneatenIndividuals - species.aliveIndividuals();
        }

        const initialSpeciesCount = player.species.length;
        player.species = player.species.filter(species => species.aliveIndividuals() > 0);
        extinctSpecies = initialSpeciesCount - player.species.length;

        // TODO: store and display per player
        state.extinctions.hungryIndividuals += hungryIndividuals;
        state.extinctions.eatenIndividuals += eatenIndividuals;
        state.extinctions.extinctSpecies += extinctSpecies;
    }
    return state;
}
