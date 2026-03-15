import { Iterations } from "@simulation/iterations.js";
import { UI } from "@ui/ui.js";

export class IterationLoop {
    readonly iterations: Iterations;
    readonly ui: UI

    jumpsPerSecond = 20;
    iterationsPerJump = 30;

    private playInterval: ReturnType<typeof setInterval> | undefined = undefined;

    public onUpdate: () => void = () => { };

    constructor(iterations: Iterations, ui: UI) {
        this.iterations = iterations;
        this.ui = ui;
    }

    get isPlaying(): boolean {
        return this.playInterval !== undefined;
    }

    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.pause();
        const wait = Math.round(1000 / this.jumpsPerSecond);
        this.playInterval = setInterval(() => {
            const continueLoop = this.iterations.execute(this.iterationsPerJump);
            this.onUpdate();
            if (!continueLoop) {
                this.ui.handleSimulationEnd();
            }
        }, wait);
    }

    pause() {
        clearInterval(this.playInterval);
        this.playInterval = undefined;
    }
}
