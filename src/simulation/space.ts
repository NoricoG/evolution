import { Constants, EnvironmentConstants } from "./constants";
import { Individual } from "./individual";

export class XY {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

export class Space {
    width: number;
    height: number;

    plants: number[][] = [];
    animals: Individual[][][] = [];

    huntingRange: XY[][][] = [];

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;

        for (let x = 0; x < width; x++) {
            this.plants[x] = [];
            this.animals[x] = [];
            this.huntingRange[x] = [];
            for (let y = 0; y < height; y++) {
                const xy = new XY(x, y);
                this.plants[x][y] = EnvironmentConstants.initialPlantAmount;
                this.animals[x][y] = [];
                this.huntingRange[x][y] = this.getHuntingRange(xy);
            }
        }
    }

    randomEmptyLocation(): XY {
        const maxAttempts = 10 * this.width * this.height * 10;

        let x: number, y: number;
        let attempts = 0;
        do {
            x = Math.floor(Math.random() * this.width);
            y = Math.floor(Math.random() * this.height);
            attempts++;
        } while (this.animals[x][y].length > 0 && attempts < maxAttempts);
        return new XY(x, y);
    }

    randomNeighbourLocation(xy: XY, maxDistance: number): XY {
        const next = new XY(
            xy.x + Math.round(Math.random() * 2 * maxDistance - maxDistance),
            xy.y + Math.round(Math.random() * 2 * maxDistance - maxDistance)
        );
        return this.wrapAround(next);
    }

    wrapAround(xy: XY): XY {
        const wrappedX = this.wrap(xy.x, this.width);
        const wrappedY = this.wrap(xy.y, this.height);
        return new XY(wrappedX, wrappedY);
    }

    private wrap(value: number, max: number): number {
        if (value < 0) return max - 1;
        if (value >= max) return 0;
        return value;
    }

    removeAnimal(individual: Individual) {
        const x = individual.location.x;
        const y = individual.location.y;

        if (this.animals[x] && this.animals[x][y]) {
            const index = this.animals[x][y].indexOf(individual);
            if (index !== -1) {
                this.animals[x][y].splice(index, 1);
            }
        }
    }

    addAnimal(individual: Individual) {
        const x = individual.location.x;
        const y = individual.location.y;

        if (this.animals[x] == undefined) {
            this.animals[x] = [];
        }
        if (this.animals[x][y] == undefined) {
            this.animals[x][y] = [];
        }
        this.animals[x][y].push(individual);
    }

    moveIndividual(individual: Individual, next: XY) {
        const current = individual.location;

        const index = this.animals[current.x][current.y].indexOf(individual);
        if (index !== -1) {
            this.animals[current.x][current.y].splice(index, 1);
            if (this.animals[current.x][current.y] == undefined) {
                this.animals[current.x][current.y] = [];
            }
            const wrapped = this.wrapAround(next);
            if (this.animals[wrapped.x][wrapped.y] == undefined) {
                this.animals[wrapped.x][wrapped.y] = [];
            }
            this.animals[wrapped.x][wrapped.y].push(individual);
        }

        individual.location = this.wrapAround(next);
    }

    private getHuntingRange(xy: XY): XY[] {
        const distance = Constants.huntingDistance;
        const x = xy.x;
        const y = xy.y;

        const tiles: XY[] = [];
        for (let dx = -distance; dx <= distance; dx++) {
            const nx = this.wrap(x + dx, this.width);
            for (let dy = -distance; dy <= distance; dy++) {
                const ny = this.wrap(y + dy, this.height);
                tiles.push(new XY(nx, ny));
            }
        }
        return tiles;
    }
}
