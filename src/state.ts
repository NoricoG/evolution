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
class State {
    initial: boolean = true;

    phase = Phase.Development;
    species: Species[] = [];
    speciesId: string = " @"; // will be incremented to " A"

    climate = new Climate();

    nextSpeciesId(): string {
        // increment last character
        this.speciesId = this.speciesId[0] + String.fromCharCode(this.speciesId.charCodeAt(1) + 1);

        // prevent collisions
        if (this.species.some(species => species.id == this.speciesId)) {
            return this.nextSpeciesId();
        }

        // handle overflow of last character
        if (this.speciesId[1] > "Z") {
            if (this.speciesId[0] == " ") {
                this.speciesId = "AA";
            } else {
                if (this.speciesId[0] < "Z") {
                    // increment first character and reset last character to A
                    this.speciesId = String.fromCharCode(this.speciesId.charCodeAt(0) + 1) + "A";
                } else {
                    console.log("Ran out of two character ids, cycling back to A");
                    this.speciesId = " A";
                }
            }
        }

        return this.speciesId;
    }
}

var state = new State();

function nextPhase() {
    setPhaseTitle();
    setBackground();
    clearLog();

    var speciesBefore: { [key: string]: { individuals: number, traits: string } };

    switch (state.phase) {
        case Phase.Development:
            speciesBefore = getSpeciesBefore();
            doDevelopment();

            logAfterDevelopment(speciesBefore);
            state.phase = Phase.Feeding;
            break;

        case Phase.Feeding:
            speciesBefore = getSpeciesBefore();
            const deaths = doFeeding();

            logAfterFeeding(speciesBefore, deaths);
            state.phase = Phase.Development;
            break;
    }
}

function getSpeciesBefore(): { [key: string]: { individuals: number, traits: string } } {
    const speciesBefore = {};
    for (let species of state.species) {
        speciesBefore[species.id] = { individuals: species.individuals.length, traits: species.getTraitsString() };
    }
    return speciesBefore;
}

function logAfterDevelopment(speciesBefore: { [key: string]: { individuals: number, traits: string } }) {
    const speciesAfter = {};
    for (let species of state.species) {
        speciesAfter[species.id] = { individuals: species.individuals.length, traits: species.getTraitsString() };
    }
    const allSpeciesIds = new Set([...Object.keys(speciesBefore), ...Object.keys(speciesAfter)]);

    resetSpecies();
    for (let speciesId of allSpeciesIds) {
        const before = speciesBefore[speciesId] || { individuals: 0, traits: "" };
        const after = speciesAfter[speciesId] || { individuals: 0, traits: "" };

        let message = `${speciesId}: `;
        const sameCount = before.individuals === after.individuals;
        const sameTraits = before.traits === after.traits;

        if (sameCount && sameTraits) {
            message += `${before.individuals} ${before.traits}`;
            if (before.individuals != 1) {
                message += "s";
            }
            addToSpecies(message);
            continue;
        }

        message += before.individuals;
        if (!sameTraits && before.traits !== "") {
            message += ` ${before.traits}`;
            if (before.individuals != 1) {
                message += "s";
            }
        }

        message += " -> ";
        if (!sameCount) {
            message += after.individuals;
        }
        message += ` ${after.traits}`;
        if (after.individuals != 1) {
            message += "s";
        }

        addToSpecies(message);
    }
}


function logAfterFeeding(before: { [key: string]: { individuals: number, traits: string } }, deaths: [Individual[], Individual[]]) {
    const individualsAfter: { [key: string]: number } = {};
    for (let species of state.species) {
        individualsAfter[species.id] = species.individuals.length;
    }
    const allSpeciesIds = new Set([...Object.keys(before), ...Object.keys(individualsAfter)]);

    const speciesEaten: { [key: string]: number } = {};
    const speciesStarved: { [key: string]: number } = {};
    for (const eaten of deaths[0]) {
        const speciesId = eaten.species.id;
        speciesEaten[speciesId] = (speciesEaten[speciesId] || 0) + 1;
    }
    for (const starved of deaths[1]) {
        const speciesId = starved.species.id;
        speciesStarved[speciesId] = (speciesStarved[speciesId] || 0) + 1;
    }

    resetSpecies();
    for (let speciesId of allSpeciesIds) {
        const traits = before[speciesId]?.traits || "";
        const beforeCount = before[speciesId]?.individuals || 0;
        const afterCount = individualsAfter[speciesId] || 0;

        let message = `${speciesId}: `;
        message += beforeCount == afterCount
            ? `${beforeCount} `
            : `${beforeCount} -> ${afterCount} `;

        message += `${traits}`;
        if (beforeCount != 1 || afterCount != 1) {
            message += "s";
        }

        const eatenCount = speciesEaten[speciesId] || 0;
        const starvedCount = speciesStarved[speciesId] || 0;
        if (eatenCount || starvedCount) {
            const parts: string[] = [];
            if (eatenCount) {
                parts.push(`${eatenCount} eaten`);
            }
            if (starvedCount) {
                parts.push(`${starvedCount} starved`);
            }
            message += ` (${parts.join(", ")})`;
        }

        addToSpecies(message);
    }
}
