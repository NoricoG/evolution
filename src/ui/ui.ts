import { IterationLoop } from "@simulation/iterationLoop.js";
import { Iterations } from "@simulation/iterations.js";
import { State } from "@simulation/state.js";
import { ChartSections } from "@ui/chartSections.js";
import { MapSections } from "@ui/mapSections.js";

window.onload = () => new UI();

export class UI {
    private readonly state: State;
    private readonly iterations: Iterations;
    private readonly loop: IterationLoop;
    private readonly charts: ChartSections;
    private readonly maps: MapSections;

    constructor() {
        this.state = new State();
        this.iterations = new Iterations(this.state);
        this.loop = new IterationLoop(this.iterations, this);
        this.loop.onUpdate = () => this.updateUI();

        this.charts = new ChartSections();
        this.maps = new MapSections();


        this.initSliders();
        this.initButtons();
        this.updateUI();
    }

    private initSliders() {
        this.initJumpsPerSecSlider();
        this.initIterationsPerJumpSlider();
    }

    private initJumpsPerSecSlider() {
        const min = 5;
        const max = 40;
        const step = 5;

        const slider = document.getElementById("jumps-per-sec") as HTMLInputElement;
        slider.min = String(min);
        slider.max = String(max);
        slider.step = String(step);
        slider.value = String(this.loop.jumpsPerSecond);

        document.getElementById("jumps-per-sec-value")!.textContent = String(this.loop.jumpsPerSecond);
        slider.addEventListener("input", () => {
            this.loop.jumpsPerSecond = parseInt(slider.value);
            document.getElementById("jumps-per-sec-value")!.textContent = slider.value;
            if (this.loop.isPlaying) this.loop.play();
        });
    }

    private initIterationsPerJumpSlider() {
        const options = [1, 2, 5, 10, 25, 50];
        const defaultIndex = options.indexOf(this.loop.iterationsPerJump);

        const min = 0;
        const max = options.length - 1;

        const slider = document.getElementById("iterations-per-jump") as HTMLInputElement;
        slider.min = String(min);
        slider.max = String(max);
        slider.step = "1";
        slider.value = String(defaultIndex);

        this.loop.iterationsPerJump = options[defaultIndex];

        document.getElementById("iterations-per-jump-value")!.textContent = String(this.loop.iterationsPerJump);
        slider.addEventListener("input", () => {
            this.loop.iterationsPerJump = options[parseInt(slider.value)];
            document.getElementById("iterations-per-jump-value")!.textContent = String(this.loop.iterationsPerJump);
        });
    }

    private initButtons() {
        document.getElementById("jump-1-btn")!.addEventListener("click", () =>
            this.jump(this.loop.iterationsPerJump)
        );
        document.getElementById("jump-1s-btn")!.addEventListener("click", () =>
            this.jump(this.loop.jumpsPerSecond * this.loop.iterationsPerJump)
        );
        document.getElementById("jump-10s-btn")!.addEventListener("click", () =>
            this.jump(this.loop.jumpsPerSecond * this.loop.iterationsPerJump * 10)
        );
        document.getElementById("play-btn")!.addEventListener("click", () => this.togglePlay());
    }

    private jump(iterations: number) {
        const continueLoop = this.iterations.execute(iterations);
        if (!continueLoop) {
            this.handleSimulationEnd();
        }
        this.updateUI();
    }

    showedSimulationEndAlert = false;

    public handleSimulationEnd() {
        if (this.loop.isPlaying) {
            this.togglePlay();
        }
        if (!this.showedSimulationEndAlert) {
            alert("All individuals have died. Reload the page for a new simulation.");
            this.showedSimulationEndAlert = true;
        }
    }

    private togglePlay() {
        this.loop.toggle();
        this.updateUI();
    }

    private updateUI() {
        document.getElementById("iteration-title")!.innerText = `Iteration ${this.state.day}`;
        (document.getElementById("play-btn") as HTMLButtonElement).textContent =
            this.loop.isPlaying ? "⏸ Pause" : "▶ Play";
        this.maps.update(this.state.space);
        this.charts.update(this.state.metrics.flush());
    }
}
