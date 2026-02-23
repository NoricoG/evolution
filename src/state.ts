class Player {
    species: Species[] = [];
    maxSpeciesId: string;

    constructor(maxSpeciesId: string) {
        this.maxSpeciesId = maxSpeciesId;
    }
}

enum Phase {
    Development,
    Feeding,
    Extinction,
}

class Climate {
    food: number;
    shelter: number;

    constructor() {
        this.food = 2 + Math.ceil(Math.random() * 6) + Math.ceil(Math.random() * 6);
        this.shelter = Math.ceil(Math.random() * 6);
    }
}

class Extinctions {
    eatenIndividuals = 0;
    hungryIndividuals = 0;
    extinctSpecies = 0;
}

class State {
    initial: boolean = true;

    phase = Phase.Extinction;
    players = [
        new Player("A"),
        new Player("A"),
    ]

    climate = new Climate();
    extinctions = new Extinctions();
}

var state = new State();
