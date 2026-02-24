class State {
    day = 0;

    individuals: { [id: string]: Individual } = {};

    individualIdCounter = -1;

    environment = new Environment(this);

    get individualsArray(): Individual[] {
        return Object.values(this.individuals);
    }

    nextIndividualId(): string {
        this.individualIdCounter++;

        // CVC pattern
        // 0 Bab, 1 Cab, ..., 19 Yab, 20 Zab
        // 21 Beb, ..., 41 Zeb
        // ...
        // 84 Bub, ..., 104 Zub
        // 105 Bac, ..., 125 Zac
        // ...
        // 189 Buc, ..., 209 Zuc
        // ...
        // 2100 Baz, ..., 2120 Zaz
        // ...
        // 2184 Buz, ..., 2204 Zuz
        // 2205 Bab, starting over
        function translate(num: number): string {
            const consonants = 'bcdfghjklmnpqrstvwxyz';
            const vowels = 'aeiou';

            const c = consonants.length; // 21
            const v = vowels.length;     // 5

            const firstIdx = num % c;
            const vowelIdx = Math.floor(num / c) % v;
            const lastIdx = Math.floor(num / (c * v)) % c;

            const name = consonants[firstIdx].toUpperCase() + vowels[vowelIdx] + consonants[lastIdx];
            return name;
        }

        return translate(this.individualIdCounter);
    }

    addIndividual(individual: Individual) {
        individual.id = this.nextIndividualId();
        this.individuals[individual.id] = individual;
    }

    dieIndividual(individualId: string) {
        this.individuals[individualId].dead = true;
        const parent = this.individuals[individualId].parent;
        if (parent) {
            parent.children = parent.children.filter(child => child.id !== individualId);
        }
        this.environment.bodies.push(individualId);
    }

    livingIndividualCount(): number {
        return Object.values(this.individuals).filter(individual => !individual.dead).length;
    }
}

class Environment {
    initialFood: number;
    food: number;
    initialShelter: number;
    shelter: number;
    bodies: string[];

    constructor(state: State) {
        const livingCount = state.livingIndividualCount();
        this.initialFood = Math.round((0.1 + Math.random()) * livingCount);
        this.food = this.initialFood;
        this.initialShelter = Math.ceil(Math.random() * 6);
        this.shelter = this.initialShelter;
        this.bodies = [];
    }
}

var state = new State();
