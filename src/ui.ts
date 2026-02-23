window.onload = function () {
    nextPhase();
};

function clearLog() {
    document.getElementById("log").innerHTML = "";
}

function log(message: string = "") {
    const p = document.createElement("p");
    p.innerText = message;
    document.getElementById("log").appendChild(p);
}

function setPhaseTitle() {
    const title = document.getElementById("phase-title");
    switch (state.phase) {
        case Phase.Development:
            title.innerText = "Development Phase";
            break;
        case Phase.Feeding:
            title.innerText = "Feeding Phase";
            break;
    }
}

function setBackground() {
    switch (state.phase) {
        case Phase.Development:
            document.body.style.backgroundColor = "#f0f7f6";
            break;
        case Phase.Feeding:
            document.body.style.backgroundColor = "#fffef2";
            break;
    }
}

function resetSpecies() {
    document.getElementById("species").innerHTML = "";
}

function addToSpecies(line: string) {
    const speciesDiv = document.getElementById("species");
    const p = document.createElement("p");
    p.innerText = line;
    speciesDiv.appendChild(p);
}

function showHideLog() {
    const logDiv = document.getElementById("log");
    const logTitle = document.getElementById("log-title");

    if (logDiv.classList.contains("hide")) {
        logDiv.classList.remove("hide");
        logTitle.innerText = "Log -";
    } else {
        logDiv.classList.add("hide");
        logTitle.innerText = "Log +";
    }
}
