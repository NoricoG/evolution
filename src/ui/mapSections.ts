import { Space } from "@simulation/space.js";
import { colorMapping, SimulationMap } from "@ui/map.js";

type MapConfig = { label: string; colorMapping: colorMapping };

function densityColor(space: Space, x: number, y: number, minMeat: number, maxMeat: number, highDenisty: number) {
    const animalCount = space.animals[x][y].filter(individual => individual.diet.meat.value >= minMeat && individual.diet.meat.value <= maxMeat).length;
    if (animalCount === 0) return { r: 255, g: 255, b: 255 };
    const density = Math.min(animalCount / highDenisty, 1);
    const brightness = Math.floor(255 - density * 200);
    return { r: brightness, g: brightness, b: 255 };
}

function meatColor(space: Space, x: number, y: number, max: boolean) {
    const animals = space.animals[x][y];
    if (animals.length === 0) return { r: 255, g: 255, b: 255 };
    let meat = max ? 0 : 1;
    for (const individual of animals) {
        if (max) {
            if (individual.diet.meat.value > meat) {
                meat = individual.diet.meat.value;
            }
        } else {
            if (individual.diet.meat.value < meat) {
                meat = individual.diet.meat.value;
            }
        }
    }
    const plant = 1 - meat;
    return { r: Math.floor(meat * 255), g: Math.floor(plant * 255), b: 0 };
}

function plantsColor(space: Space, x: number, y: number) {
    const brightness = Math.floor(255 - space.plants[x][y] * 150);
    return { r: brightness, g: 255, b: brightness };
}

const MAP_CONFIGS: MapConfig[] = [
    { label: "Plants", colorMapping: plantsColor },
    { label: "Density", colorMapping: (space, x, y) => densityColor(space, x, y, 0, 1, 3) },
    { label: "Herbivore density", colorMapping: (space, x, y) => densityColor(space, x, y, 0, 1 / 3, 2) },
    { label: "Omnivore density", colorMapping: (space, x, y) => densityColor(space, x, y, 1 / 3, 2 / 3, 2) },
    { label: "Carnivore density", colorMapping: (space, x, y) => densityColor(space, x, y, 2 / 3, 1, 2) },
    { label: "Maximum carni omni herbi-vore (red brown green)", colorMapping: (space, x, y) => meatColor(space, x, y, true) },
];

export class MapSections {
    private readonly maps: SimulationMap[];

    constructor() {
        this.maps = [];
        this.buildDOM();
    }

    private buildDOM() {
        const container = document.getElementById("maps")!;
        for (const config of MAP_CONFIGS) {
            const mapContainer = document.createElement("div");
            mapContainer.className = "map-container";

            const label = document.createElement("p");
            label.textContent = config.label;
            mapContainer.appendChild(label);

            container.appendChild(mapContainer);
            this.maps.push(new SimulationMap(mapContainer, config.colorMapping));
        }
    }

    update(space: Space) {
        for (const map of this.maps) {
            map.update(space);
        }
    }
}
