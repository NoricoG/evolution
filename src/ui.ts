window.onload = function () {
    initUi();
    nextPhase();
    nextPhase();
};


function columnContainer(columns: HTMLElement[][]): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "column-wrapper";

    for (let column of columns) {
        const columnDiv = document.createElement("div");
        columnDiv.className = "column";
        for (let element of column) {
            columnDiv.appendChild(element);
        }
        wrapper.appendChild(columnDiv);
    }

    return wrapper;
}

function initUi() {
    const nextPhaseButton = document.createElement("button");
    nextPhaseButton.id = "nextPhase";
    nextPhaseButton.innerText = "Next phase";
    nextPhaseButton.onclick = nextPhase;
    document.getElementById("interaction").appendChild(columnContainer([[], [nextPhaseButton], []]));
}

function display(state: State) {
    console.log(state);

    if (state.initial) {
        state.initial = false;
        return;
    }

    var playerElements: HTMLElement[][] = [];
    for (var i = 0; i < state.players.length; i++) {
        var text = '';
        for (let species of state.players[i].species) {
            text += species.toString() + "\n";
        }
        const playerLabel = document.createElement("p");
        playerLabel.innerText = text;
        playerElements.push([playerLabel]);
    }

    var climateLabel = document.createElement("p");
    var climateIndicator = "";
    if (state.phase == Phase.Development) {
        climateIndicator = "available";
    } else if (state.phase == Phase.Feeding) {
        climateIndicator = "remaining";
    }
    if (climateIndicator) {
        climateLabel.innerText = `${state.climate!.food} food ${climateIndicator} \n ${state.climate!.shelter} shelter ${climateIndicator}\n\n`;
        playerElements.push([climateLabel]);
    }

    if (state.phase == Phase.Extinction) {
        var extinctionLabel = document.createElement("p");
        extinctionLabel.innerText = `${state.extinctions.hungryIndividuals} individuals died of hunger\n${state.extinctions.eatenIndividuals} individuals were eaten\n${state.extinctions.extinctSpecies} species got extinct\n\n`;
        playerElements.push([extinctionLabel]);
    }

    // make sure the number of columns is constant
    if (playerElements.length === state.players.length) {
        playerElements.push([]);
    }

    document.getElementById("phases").prepend(columnContainer(playerElements));

    var infoElements: HTMLElement[] = [];
    const phaseLabel = document.createElement("p");
    phaseLabel.innerText = `Phase: ${Phase[state.phase]}`;
    infoElements.push(phaseLabel);

    document.getElementById("phases").prepend(columnContainer([[], infoElements, []]));
}
