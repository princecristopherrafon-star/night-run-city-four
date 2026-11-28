
export default class GameController {
  constructor(THREE, view, player, score, saveDAO) {
    this.THREE = THREE;
    this.view = view;
    this.player = player;
    this.score = score;
    this.saveDAO = saveDAO;

    this.playing = false;
    this.paused = false;
    this.gameOver = false;
    this.ready = false;

    this.joystick = { x: 0, y: 0 };
    this.joystickPointer = null;
    this.touchLook = null;
    this.sprintHeld = false;

    this.musicOn = true;
    this.audioContext = null;
    this.masterGain = null;
    this.droneOsc = null;
    this.bgMusic = null;
    this.enemyAudio = [];

    this.toastTimer = null;

    this.clock = null;

    this.$ = id => document.getElementById(id);
  }

  setClock(clock) {
    this.clock = clock;
  }

  setReady(value) {
    this.ready = value;
  }

  toast(message) {
    this.$("toast").textContent = message;
    this.$("toast").style.opacity = 1;

    clearTimeout(this.toastTimer);

    this.toastTimer = setTimeout(() => {
      this.$("toast").style.opacity = 0;
    }, 2600);
  }

  showStartError(error) {
    console.error("NIGHT RUN START ERROR:", error);

    this.$("menu").style.display = "flex";
    this.$("hud").style.display = "none";

    this.toast(
      "START ERROR: " + (error.message || "Unknown problem")
    );
  }

  makeAudio() {
    if (this.bgMusic) return;

    this.bgMusic = new Audio("./assets/BG music.mp3");
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0.42;

    const enemySoundPaths = [
      "./assets/GA BASA BASA PA NOY [BUDOTS BOMB] DJ PAUL BIGATA REMIX MEME REMIX.mp3",
      "./assets/Busing.mp3",
      "./assets/hehe.mp3",
      "./assets/speed.mp3"
    ];

    this.enemyAudio = enemySoundPaths.map(src => {
      const audio = new Audio(src);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0;
      return audio;
    });
  }

  playAudio() {
    this.makeAudio();

    if (this.musicOn && this.bgMusic) {
      this.bgMusic.play().catch(() => {});
    }

    if (
      this.audioContext &&
      this.audioContext.state === "suspended"
    ) {
      this.audioContext.resume();
    }
  }

  pauseAudio() {
    if (this.bgMusic) this.bgMusic.pause();

    this.enemyAudio.forEach(audio => {
      audio.pause();
      audio.volume = 0;
    });
  }

  initAudio() {
    this.makeAudio();

    if (!this.audioContext) {
      try {
        this.audioContext = new (
          window.AudioContext || window.webkitAudioContext
        )();

        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.musicOn ? 0.17 : 0;

        this.masterGain.connect(
          this.audioContext.destination
        );

        this.droneOsc = this.audioContext.createOscillator();
        this.droneOsc.type = "sawtooth";
        this.droneOsc.frequency.value = 43;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 110;

        const gain = this.audioContext.createGain();
        gain.gain.value = 0.12;

        this.droneOsc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        this.droneOsc.start();

      } catch (error) {
        console.warn("Audio unavailable:", error);
      }
    }

    this.playAudio();
  }

  sound(freq = 100, duration = 0.15, volume = 0.1, type = "sine") {
    if (!this.audioContext || !this.musicOn) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      oscillator.type = type;

      oscillator.frequency.setValueAtTime(
        freq,
        this.audioContext.currentTime
      );

      gain.gain.setValueAtTime(
        volume,
        this.audioContext.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + duration
      );

      oscillator.connect(gain);
      gain.connect(this.masterGain);

      oscillator.start();
      oscillator.stop(
        this.audioContext.currentTime + duration
      );

    } catch (error) {
      console.warn("Sound error:", error);
    }
  }

  updateAudio(distance) {
    if (this.audioContext && this.droneOsc && this.masterGain) {
      const danger = this.THREE.MathUtils.clamp(
        1 - distance / 35,
        0,
        1
      );

      this.droneOsc.frequency.setTargetAtTime(
        43 + danger * 35,
        this.audioContext.currentTime,
        0.2
      );

      this.masterGain.gain.setTargetAtTime(
        this.musicOn ? 0.17 : 0,
        this.audioContext.currentTime,
        0.15
      );
    }
  }

  updateEnemySounds() {
    if (!this.enemyAudio.length) return;

    this.view.enemies.forEach((enemy, index) => {
      const distance = Math.hypot(
        this.player.x - enemy.group.position.x,
        this.player.z - enemy.group.position.z
      );

      const audio = this.enemyAudio[index];

      const volume =
        this.musicOn && this.playing && !this.paused
          ? this.THREE.MathUtils.clamp(
              (32 - distance) / 27,
              0,
              0.9
            )
          : 0;

      audio.volume = volume;

      if (volume > 0.015) {
        if (audio.paused) {
          audio.play().catch(() => {});
        }
      } else if (!audio.paused) {
        audio.pause();
      }
    });
  }

  resetGame() {
    if (!this.ready) {
      throw new Error("The 3D city is not ready yet.");
    }

    this.player.reset();

    this.joystick.x = 0;
    this.joystick.y = 0;

    this.sprintHeld = false;
    this.joystickPointer = null;
    this.touchLook = null;

    this.score.reset();

    this.view.resetWorld();

    this.$("stick").style.transform = "translate(0px,0px)";
    this.$("caught").style.display = "none";

    this.enemyAudio.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    this.view.setCamera(this.player);
  }

  setupJoystick() {
    const element = this.$("joystick");
    const stick = this.$("stick");

    const move = event => {
      const rect = element.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radius = rect.width * 0.37;

      let dx = (event.clientX - centerX) / radius;
      let dy = (event.clientY - centerY) / radius;

      const length = Math.hypot(dx, dy);

      if (length > 1) {
        dx /= length;
        dy /= length;
      }

      this.joystick.x = dx;
      this.joystick.y = dy;

      const stickRadius = rect.width * 0.32;

      stick.style.transform =
        `translate(${dx * stickRadius}px,${dy * stickRadius}px)`;
    };

    element.addEventListener("pointerdown", event => {
      event.preventDefault();

      if (!this.playing || this.paused) return;

      this.joystickPointer = event.pointerId;

      element.setPointerCapture(event.pointerId);
      move(event);
    });

    element.addEventListener("pointermove", event => {
      if (event.pointerId !== this.joystickPointer) return;

      event.preventDefault();
      move(event);
    });

    const release = event => {
      if (event.pointerId !== this.joystickPointer) return;

      this.joystickPointer = null;
      this.joystick.x = 0;
      this.joystick.y = 0;

      stick.style.transform = "translate(0px,0px)";
    };

    element.addEventListener("pointerup", release);
    element.addEventListener("pointercancel", release);
  }

  setupCameraControls() {
    const canvas = this.view.renderer.domElement;

    canvas.addEventListener("pointerdown", event => {
      if (!this.playing || this.paused) return;

      this.touchLook = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY
      };

      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", event => {
      if (
        !this.touchLook ||
        event.pointerId !== this.touchLook.id
      ) return;

      const dx = event.clientX - this.touchLook.x;
      const dy = event.clientY - this.touchLook.y;

      this.touchLook.x = event.clientX;
      this.touchLook.y = event.clientY;

      this.player.yaw -= dx * 0.004;

      this.player.pitch = this.THREE.MathUtils.clamp(
        this.player.pitch - dy * 0.003,
        -1.15,
        1.15
      );
    });

    canvas.addEventListener("pointerup", event => {
      if (
        this.touchLook &&
        event.pointerId === this.touchLook.id
      ) {
        this.touchLook = null;
      }
    });

    canvas.addEventListener("pointercancel", () => {
      this.touchLook = null;
    });
  }

  setupActionButtons() {
    this.$("sprint").addEventListener("pointerdown", event => {
      event.preventDefault();

      if (this.playing && !this.paused) {
        this.sprintHeld = true;
      }
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(type => {
      this.$("sprint").addEventListener(type, () => {
        this.sprintHeld = false;
      });
    });

    this.$("jump").addEventListener("pointerdown", event => {
      event.preventDefault();

      if (this.playing && !this.paused) {
        this.player.jump((...args) => this.sound(...args));
      }
    });
  }

  startGame(event) {
    if (event) event.preventDefault();

    try {
      if (!this.ready || !this.view.renderer || !this.clock) {
        throw new Error(
          "3D engine is not ready. Reload the page and try again."
        );
      }

      this.$("start").textContent = "STARTING...";
      this.$("start").disabled = true;

      this.initAudio();
      this.resetGame();

      this.$("menu").style.display = "none";
      this.$("hud").style.display = "block";
      this.$("caught").style.display = "none";
      this.$("pauseLayer").style.display = "none";

      this.paused = false;
      this.gameOver = false;
      this.playing = true;

      this.clock.getDelta();

      this.toast("FOUR SUBJECTS DETECTED");

    } catch (error) {
      this.showStartError(error);

    } finally {
      this.$("start").disabled = false;
      this.$("start").textContent = "ENTER THE CITY";
    }
  }

  pauseGame() {
    if (!this.playing) return;

    this.paused = true;
    this.playing = false;
    this.sprintHeld = false;

    this.pauseAudio();

    this.$("pauseLayer").style.display = "flex";
  }

  resumeGame() {
    if (!this.paused) return;

    this.paused = false;
    this.playing = true;

    this.$("pauseLayer").style.display = "none";

    if (this.clock) this.clock.getDelta();

    this.playAudio();
  }

  restartGame() {
    try {
      this.resetGame();

      this.paused = false;
      this.gameOver = false;
      this.playing = true;

      this.$("pauseLayer").style.display = "none";
      this.$("menu").style.display = "none";
      this.$("hud").style.display = "block";

      if (this.clock) this.clock.getDelta();

      this.initAudio();

    } catch (error) {
      this.showStartError(error);
    }
  }

  toggleMusic() {
    this.musicOn = !this.musicOn;

    this.$("musicToggle").textContent =
      "BACKGROUND MUSIC: " + (this.musicOn ? "ON" : "OFF");

    if (this.musicOn) {
      if (this.playing) this.playAudio();
    } else {
      this.pauseAudio();

      if (this.masterGain && this.audioContext) {
        this.masterGain.gain.setTargetAtTime(
          0,
          this.audioContext.currentTime,
          0.1
        );
      }
    }
  }

  updateMovement(dt) {
    const bob = this.player.update(
      this.THREE,
      dt,
      this.joystick,
      this.sprintHeld,
      this.view.config
    );

    this.view.setCamera(this.player, bob);
  }

  updateEnemies(dt, time) {
    let closest = 999;

    this.view.enemies.forEach((enemy, index) => {
      const distance = enemy.update(
        this.player,
        dt,
        time,
        index,
        this.view.config.enemySpeed
      );

      closest = Math.min(closest, distance);

      if (distance < this.view.config.enemyMinDistance) {
        this.endGame();
      }
    });

    this.$("distance").textContent =
      "THREAT: " +
      (closest > 100 ? "--" : closest.toFixed(1)) +
      " m";

    this.$("warning").style.opacity = closest < 13 ? 1 : 0;

    this.updateAudio(closest);
    this.updateEnemySounds();
  }

  updateObstacles() {
    this.view.obstacles.forEach(obstacle => {
      const distance = Math.hypot(
        this.player.x - obstacle.position.x,
        this.player.z - obstacle.position.z
      );

      if (distance < 1.2 && this.player.y < 2.35) {
        this.player.velocity.x *= 0.15;
        this.player.velocity.z *= 0.15;
      }
    });
  }

  endGame() {
    if (this.gameOver) return;

    this.gameOver = true;
    this.playing = false;
    this.sprintHeld = false;

    this.joystick.x = 0;
    this.joystick.y = 0;

    this.pauseAudio();

    const best = this.score.finish();
    this.saveDAO.saveBest(best);

    this.$("caught").style.display = "flex";

    this.sound(48, 0.7, 0.3, "sawtooth");
  }

  bind() {
    this.setupJoystick();
    this.setupCameraControls();
    this.setupActionButtons();

    this.$("start").addEventListener("click", event => {
      this.startGame(event);
    });

    this.$("pauseBtn").addEventListener("click", () => {
      this.pauseGame();
    });

    this.$("resumeBtn").addEventListener("click", () => {
      this.resumeGame();
    });

    this.$("restartBtn").addEventListener("click", () => {
      this.restartGame();
    });

    this.$("retry").addEventListener("click", () => {
      this.restartGame();
    });

    this.$("musicToggle").addEventListener("click", () => {
      this.toggleMusic();
    });
  }

  update(dt, time) {
    if (!this.playing || this.paused || this.gameOver) return;

    this.score.update(dt);

    this.updateMovement(dt);
    this.updateEnemies(dt, time);
    this.updateObstacles();

    this.$("stamina").textContent =
      "STAMINA " + Math.round(this.player.stamina) + "%";
  }
      }
          
