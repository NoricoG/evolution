import { Chromosome } from "./chromosome.js";
import { Gene } from "./gene.js";


function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h * 12) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export enum DietGenes {
    Herbivore = "Herbivore",
    Scavenger = "Scavenger",
    Carnivore = "Carnivore",
}

export class Diet extends Chromosome {
    static geneKeys = Object.values(DietGenes);
    static geneLabels = "🥕🍖🥩"


    constructor(genes: { [key: string]: Gene }) {
        super(genes);
        this.scaleDown();
    }


    scaleDown() {
        // limit the total diet to force specialization
        const dietTotal = Object.values(DietGenes).reduce((sum, action) => sum + (this.genes[action]?.value || 0), 0);
        if (dietTotal > 1) {
            for (const diet of Object.values(DietGenes)) {
                this.genes[diet].value = this.genes[diet].value! / dietTotal;
            }
        }
    }

    mutatedCopy(): Diet {
        const newGenes: { [key: string]: Gene } = {};
        for (const key of Object.keys(this.genes)) {
            newGenes[key] = this.genes[key].mutate();
        }
        return new Diet(newGenes);
    }

    toColor(): string {
        const herbivoreValue = this.genes[DietGenes.Herbivore].value;
        const carnivoreValue = this.genes[DietGenes.Carnivore].value;

        const mostlyHerbivore = herbivoreValue > carnivoreValue;

        // green for herbivores, red for carnivores
        const hue = mostlyHerbivore ? 120 : 0;
        const saturation = 0.75;
        const lightness = 0.5;

        const [r, g, b] = hslToRgb(hue / 360, saturation, lightness);
        return `rgb(${r}, ${g}, ${b})`;
    }

    mostlyHerbivore(): boolean {
        const herbivoreValue = this.genes[DietGenes.Herbivore].value;
        const carnivoreValue = this.genes[DietGenes.Carnivore].value;
        return herbivoreValue > carnivoreValue;
    }

    mostlyCarnivore(): boolean {
        const herbivoreValue = this.genes[DietGenes.Herbivore].value;
        const carnivoreValue = this.genes[DietGenes.Carnivore].value;
        return carnivoreValue > herbivoreValue;
    }

    static random(): Diet {
        return new Diet(Chromosome.randomGenes(Object.values(DietGenes)));
    }

    static randomHerbivore(): Diet {
        const genes: { [key: string]: Gene } = {};
        genes[DietGenes.Herbivore] = Gene.random();
        genes[DietGenes.Scavenger] = new Gene(0);
        genes[DietGenes.Carnivore] = new Gene(0);
        return new Diet(genes);
    }

    static randomCarnivore(): Diet {
        const genes: { [key: string]: Gene } = {};
        genes[DietGenes.Herbivore] = new Gene(0);
        genes[DietGenes.Scavenger] = new Gene(0);
        genes[DietGenes.Carnivore] = Gene.random();
        return new Diet(genes);
    }
}
