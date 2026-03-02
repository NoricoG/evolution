import { IndividualsDetails } from "./individualsDetails.js";
import { logMetrics } from "./log.js";

import { Individual } from "../individual.js";
import { Iterations } from "../iterations.js";
import { State } from "../state.js";
import { Brain } from "../genetics/brain.js";
import { Diet, DietGenes } from "../genetics/diet.js";


window.onload = () => new UI();

class UI {
    private readonly state: State;
    private readonly iterations: Iterations;

    private playInterval: ReturnType<typeof setInterval> | undefined = undefined;
    private playFast = false;

    constructor() {
        this.state = new State();
        this.iterations = new Iterations(this.state);

        this.updateUI();
        this.addButtonListeners();
    }

    private addButtonListeners() {
        document.getElementById("next-1-btn")!.addEventListener("click", () => this.nextIteration(1));
        document.getElementById("next-10-btn")!.addEventListener("click", () => this.nextIteration(10));
        document.getElementById("next-100-btn")!.addEventListener("click", () => this.nextIteration(100));
        document.getElementById("next-1000-btn")!.addEventListener("click", () => this.nextIteration(1000));
        document.getElementById("play-pause-btn")!.addEventListener("click", () => this.togglePlay());
        document.getElementById("speed-btn")!.addEventListener("click", () => this.toggleSpeed());
    }

    private togglePlay() {
        console.log("Toggling play");
        const btn = document.getElementById("play-pause-btn") as HTMLButtonElement;
        if (this.playInterval !== undefined) {
            this.pause();
            btn.textContent = "▶ Play";
            console.log("button should say play");
        } else {
            this.play(this.playFast);
            btn.textContent = "⏸ Pause";
            console.log("button should say pause");
        }
    }

    private toggleSpeed() {
        const btn = document.getElementById("speed-btn") as HTMLButtonElement;
        if (this.playInterval !== undefined) {
            this.pause();
        }
        this.playFast = !this.playFast;
        this.play(this.playFast);
        document.getElementById("play-pause-btn")!.textContent = "⏸ Pause";

        btn.textContent = this.playFast ? "Slower" : "Faster";
    }

    private play(fast: boolean) {
        const wait = fast ? 500 : 1000;
        this.playInterval = setInterval(() => this.nextIteration(1), wait);
    }

    private pause() {
        clearInterval(this.playInterval);
        this.playInterval = undefined;
    }

    private nextIteration(amount: number) {
        this.iterations.execute(amount);
        this.updateUI();
    }

    private updateUI() {
        this.updateTitles();
        this.showEnvironment();
        new IndividualsDetails(this.state.individuals, this.state.day).showIndividuals();

        logMetrics(this.state.metrics, this.state.day);
    }

    private updateTitles() {
        document.getElementById("iteration-title")!.innerText = `Iteration ${this.state.day}`;
        document.getElementById("individuals-title")!.innerText = `Individuals (${this.state.individuals.length})`;
    }

    private showEnvironment() {
        const environmentDiv = document.getElementById("environment")!;
        environmentDiv.innerHTML = "";

        const food = document.createElement("p");
        food.innerText = this.state.environment.toFoodString();
        environmentDiv.appendChild(food);
    }


}
