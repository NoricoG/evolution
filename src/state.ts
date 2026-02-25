const targetIndividuals = 30;

class State {
    day = 0;

    individuals: { [id: string]: Individual } = {};

    individualIdCounter = -1;

    environment = new Environment(this, []);

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

    livingIndividualCount(): number {
        return Object.values(this.individuals).filter(individual => !individual.dead).length;
    }
}

class Environment {
    initialFood: number;
    food: number;
    initialShelter: number;
    shelter: number;
    freshBodies: string[];
    oldBodies: string[];
    allBodies: string[];

    minFoodFactor = 0.3;
    maxFoodFactor = 0.7;

    minShelterFactor = 0.1;
    maxShelterFactor = 0.2;

    constructor(state: State, oldBodies: string[]) {
        const foodFactor = this.minFoodFactor + Math.random() * (this.maxFoodFactor - this.minFoodFactor);
        const shelterFactor = this.minShelterFactor + Math.random() * (this.maxShelterFactor - this.minShelterFactor);

        this.initialFood = Math.round(foodFactor * targetIndividuals);
        this.initialShelter = Math.round(shelterFactor * targetIndividuals);
        const shelteredIndividuals = state.individualsArray.filter(individual => individual.shelter && !individual.traits.includes(Trait.BURROW)).length;
        this.initialShelter -= shelteredIndividuals;
        if (this.initialShelter < 0) {
            this.initialShelter = 0;
        }

        this.food = this.initialFood;
        this.shelter = this.initialShelter;

        this.oldBodies = oldBodies;
        this.freshBodies = [];
        this.allBodies = [...this.oldBodies, ...this.freshBodies];
    }

    removeBody(bodyId: string) {
        this.freshBodies = this.freshBodies.filter(id => id !== bodyId);
        this.oldBodies = this.oldBodies.filter(id => id !== bodyId);
        this.allBodies = this.allBodies.filter(id => id !== bodyId);
    }
}

let state = new State();
