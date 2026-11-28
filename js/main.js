
import * as THREE from
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

import Player from "./models/Player.js";
import Score from "./models/Score.js";
import SaveDAO from "./dao/SaveDAO.js";
import GameView from "./views/GameView.js";
import GameController from "./controllers/GameController.js";

/* =================================
   GAME INITIALIZATION
================================= */

const player = new Player();
const score = new Score();
const saveDAO = new SaveDAO();

score.best = saveDAO.getBest();

/* =================================
   GAME VIEW
================================= */

const view = new GameView(THREE);

/* =================================
   GAME CONTROLLER
================================= */

const controller = new GameController(
  THREE,
  view,
  player,
  score,
  saveDAO
);

/* =================================
   GAME CLOCK
================================= */

const clock = new THREE.Clock();

controller.setClock(clock);

/* =================================
   MAIN GAME LOOP
================================= */

let animationStarted = false;

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.04);
  const time = clock.elapsedTime;

  controller.update(dt, time);
  view.render();
}

/* =================================
   START GAME
================================= */

function startGame() {
  try {
    view.init();

    // Register offline service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./sw.js")
        .catch(error => {
          console.warn("Service Worker Error:", error);
        });
    }

    // Enable game controller
    controller.setReady(true);
    controller.bind();

    // Start animation only once
    if (!animationStarted) {
      animationStarted = true;
      animate();
    }

    console.log(
      "NIGHT RUN: CITY OF FOUR READY"
    );

  } catch (error) {
    console.error(
      "NIGHT RUN INITIALIZATION FAILED:",
      error
    );

    controller.setReady(false);

    controller.toast(
      "3D ENGINE ERROR - CHECK INTERNET OR WEBGL"
    );

    const startButton =
      document.getElementById("start");

    if (startButton) {
      startButton.textContent = "RELOAD GAME";
      startButton.onclick = () => {
        window.location.reload();
      };
    }
  }
}

/* =================================
   INITIALIZE
================================= */

startGame();

