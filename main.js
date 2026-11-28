
import * as THREE from
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

import Player from "./models/Player.js";
import Enemy from "./models/Enemy.js";
import Score from "./models/Score.js";
import SaveDAO from "./dao/SaveDAO.js";
import GameView from "./views/GameView.js";
import GameController from "./controllers/GameController.js";

const player = new Player();
const score = new Score();
const saveDAO = new SaveDAO();

score.best = saveDAO.getBest();

const view = new GameView(THREE);

const controller = new GameController(
  THREE,
  view,
  player,
  score,
  saveDAO
);

const clock = new THREE.Clock();

controller.setClock(clock);

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.04);
  const time = clock.elapsedTime;

  controller.update(dt, time);
  view.render();
}

try {
  view.init();
  if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js")
    .catch(error => console.warn("SW error:", error));
  }

  controller.setReady(true);
  controller.bind();

  animate();

  console.log("NIGHT RUN: CITY OF FOUR READY");

} catch (error) {
  console.error("NIGHT RUN INITIALIZATION FAILED:", error);

  controller.setReady(false);
  controller.toast(
    "3D ENGINE ERROR - CHECK INTERNET OR WEBGL"
  );

  document.getElementById("start").textContent = "RELOAD GAME";
}
