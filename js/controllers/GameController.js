import Weapon from "../models/Weapon.js";


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

    this.weapons = {};
    this.currentWeapon = null;
    this.pickupObjects = [];
    this.nearbyPickup = null;
    this.shootHeld = false;
    this.fireCooldown = 0;
    this.raycaster = new THREE.Raycaster();
    this.muzzleTimer = 0;

    this.$ = id => document.getElementById(id);
  }

  setClock(clock) {
    this.clock = clock;
  }

  setReady(value) {
    this.ready = value;
    if (value) {
      this.createPickups();
      this.updateWeaponHud();
    }
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
      if (enemy.active === false) {
        const deadAudio = this.enemyAudio[index];
        if (deadAudio) {
          deadAudio.pause();
          deadAudio.volume = 0;
        }
        return;
      }

      const distance = Math.hypot(
        this.player.x - enemy.group.position.x,
        this.player.z - enemy.group.position.z
      );

      const volume = this.THREE.MathUtils.clamp(
        1 - distance / 35,
        0,
        1
      );

      const audio = this.enemyAudio[index];

      if (audio) {
        audio.volume = volume * 0.7;

        if (this.playing && !this.paused && audio.paused) {
          audio.play().catch(() => {});
        }
      }
    });
             }
    updateEnemySounds() {
    if (!this.enemyAudio.length) return;

    this.view.enemies.forEach((enemy, index) => {
      if (enemy.active === false) {
        const deadAudio = this.enemyAudio[index];
        if (deadAudio) {
          deadAudio.pause();
          deadAudio.volume = 0;
        }
        return;
      }
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
  
  createPickups() {
    if (!this.view.scene || this.pickupObjects.length) return;

    const THREE = this.THREE;

    const addPickup = (kind, type, x, z, color, label) => {
      const group = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(
          kind === "weapon" ? 0.95 : 0.8,
          kind === "weapon" ? 0.28 : 0.65,
          kind === "weapon" ? 0.28 : 0.8
        ),
        new THREE.MeshLambertMaterial({ color })
      );

      body.position.y = 0.55;
      group.add(body);

      const glow = new THREE.Mesh(
        new THREE.TorusGeometry(0.78, 0.055, 6, 18),
        new THREE.MeshBasicMaterial({ color })
      );

      glow.rotation.x = Math.PI / 2;
      glow.position.y = 0.08;
      group.add(glow);

      const light = new THREE.PointLight(color, 0.65, 5);
      light.position.y = 1;
      group.add(light);

      group.position.set(x, 0, z);
      group.userData = { kind, type, label, baseY: 0 };

      this.view.scene.add(group);
      this.pickupObjects.push(group);
    };

    // Weapon locations
    addPickup("weapon", "pistol", -23, -8, 0x45f4d0, "PISTOL");
    addPickup("weapon", "rifle", 23, -8, 0xffd84a, "RIFLE");
    addPickup("weapon", "shotgun", -23, 28, 0xff4564, "SHOTGUN");

    // Ammo stations
    addPickup("ammo", "ammo", -58, -35, 0x62ff91, "AMMO");
    addPickup("ammo", "ammo", 0, 22, 0x62ff91, "AMMO");
    addPickup("ammo", "ammo", -28, 58, 0x62ff91, "AMMO");

    this.view.pickups = this.pickupObjects;
  }

  updateWeaponHud() {
    const name = this.$("weaponName");
    const ammo = this.$("weaponAmmo");
    const shoot = this.$("shootBtn");

    if (name) {
      name.textContent = this.currentWeapon
        ? this.currentWeapon.name
        : "NO WEAPON";
    }

    if (ammo) {
      ammo.textContent = this.currentWeapon
        ? "AMMO " + this.currentWeapon.ammo
        : "AMMO --";
    }

    if (shoot) {
      shoot.style.display = this.currentWeapon ? "block" : "none";
    }
  }

  checkPickupRange() {
    let nearest = null;
    let nearestDistance = 2.7;

    for (const pickup of this.pickupObjects) {
      if (!pickup.visible) continue;

      const distance = Math.hypot(
        this.player.x - pickup.position.x,
        this.player.z - pickup.position.z
      );

      if (distance < nearestDistance) {
        nearest = pickup;
        nearestDistance = distance;
      }
    }

    this.nearbyPickup = nearest;

    const button = this.$("pickupBtn");

    if (button) {
      if (nearest && this.playing && !this.paused) {
        button.style.display = "block";
        button.textContent =
          nearest.userData.kind === "weapon"
            ? "PICK UP " + nearest.userData.label
            : "PICK UP AMMO";
      } else {
        button.style.display = "none";
      }
    }
  }

  collectPickup() {
    const pickup = this.nearbyPickup;

    if (!pickup || !pickup.visible) return;

    const data = pickup.userData;

    if (data.kind === "weapon") {
      this.currentWeapon = new Weapon(data.type);
      this.weapons[data.type] = this.currentWeapon;

      this.toast(data.label + " EQUIPPED");
      this.sound(620, 0.12, 0.13, "square");

    } else {
      if (!this.currentWeapon) {
        this.toast("FIND A WEAPON FIRST");
        return;
      }

      const amount =
        this.currentWeapon.type === "rifle" ? 30 :
        this.currentWeapon.type === "shotgun" ? 6 : 12;

      this.currentWeapon.addAmmo(amount);

      this.toast("+" + amount + " AMMO");
      this.sound(780, 0.1, 0.12, "sine");
    }

    pickup.visible = false;
    this.nearbyPickup = null;

    this.updateWeaponHud();
    this.checkPickupRange();
  }

  showMuzzleFlash() {
    const flash = this.$("weaponFlash");
    if (!flash) return;

    flash.style.opacity = "1";
    flash.style.transform = "scale(1)";

    clearTimeout(this.muzzleTimer);

    this.muzzleTimer = setTimeout(() => {
      flash.style.opacity = "0";
      flash.style.transform = "scale(0.45)";
    }, 65);
  }

  fireWeapon() {
    const weapon = this.currentWeapon;

    if (!weapon || !this.playing || this.paused || this.gameOver) {
      return;
    }

    if (!weapon.consume()) {
      this.toast("OUT OF AMMO — FIND AMMO BOXES");
      this.updateWeaponHud();
      this.shootHeld = false;
      return;
    }

    this.fireCooldown = weapon.fireRate;
    this.showMuzzleFlash();

    this.sound(
      weapon.type === "shotgun" ? 82 :
      weapon.type === "rifle" ? 125 : 175,
      weapon.type === "shotgun" ? 0.24 : 0.09,
      weapon.type === "shotgun" ? 0.26 : 0.13,
      "sawtooth"
    );

    const camera = this.view.camera;
    camera.updateMatrixWorld(true);

    const origin = camera.getWorldPosition(
      new this.THREE.Vector3()
    );

    const forward = camera.getWorldDirection(
      new this.THREE.Vector3()
    );

    const right = new this.THREE.Vector3()
      .crossVectors(forward, camera.up)
      .normalize();

    const up = new this.THREE.Vector3()
      .crossVectors(right, forward)
      .normalize();

    const hitCounts = new Map();
    const rayCount = weapon.pellets;

    for (let i = 0; i < rayCount; i++) {
      const direction = forward.clone();

      if (rayCount > 1) {
        direction.addScaledVector(
          right,
          (Math.random() - 0.5) * weapon.spread
        );

        direction.addScaledVector(
          up,
          (Math.random() - 0.5) * weapon.spread
        );

        direction.normalize();
      }

      this.raycaster.set(origin, direction);
      this.raycaster.far = weapon.range;

      let nearestEnemy = null;
      let nearestDistance = Infinity;

      for (const enemy of this.view.enemies) {
        if (enemy.active === false || !enemy.group.visible) continue;

        const box = new this.THREE.Box3()
          .setFromObject(enemy.group);

        const point = new this.THREE.Vector3();

        const intersection =
          this.raycaster.ray.intersectBox(box, point);

        if (intersection) {
          const distance = origin.distanceTo(point);

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestEnemy = enemy;
          }
        }
      }

      if (nearestEnemy) {
        hitCounts.set(
          nearestEnemy,
          (hitCounts.get(nearestEnemy) || 0) + 1
        );
      }
    }

    for (const [enemy, pelletHits] of hitCounts) {
      const damage =
        weapon.damage *
        (weapon.type === "shotgun" ? pelletHits : 1);

      enemy.health = Math.max(
        0,
        (enemy.health ?? 100) - damage
      );

      enemy.group.userData.hitFlash = 0.18;

      if (enemy.health <= 0) {
        enemy.active = false;
        enemy.deadUntil = performance.now() + 4500;
        enemy.group.visible = false;
        this.toast("TARGET ELIMINATED");
      }
    }

    this.updateWeaponHud();
  }

  updateWeapon(dt) {
    this.fireCooldown = Math.max(
      0,
      this.fireCooldown - dt
    );

    if (
      this.shootHeld &&
      this.currentWeapon &&
      this.fireCooldown <= 0
    ) {
      this.fireWeapon();
    }

    this.checkPickupRange();

    for (const pickup of this.pickupObjects) {
      if (pickup.visible) {
        pickup.rotation.y += dt * 1.1;

        pickup.position.y =
          0.08 +
          Math.sin(
            performance.now() * 0.003 + pickup.position.x
          ) * 0.08;
      }
    }
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

    this.currentWeapon = null;
    this.weapons = {};
    this.shootHeld = false;
    this.fireCooldown = 0;

    this.pickupObjects.forEach(pickup => {
      pickup.visible = true;
    });

    this.view.enemies.forEach(enemy => {
      enemy.health = 100;
      enemy.active = true;
      enemy.deadUntil = 0;
      enemy.group.visible = true;
    });

    this.updateWeaponHud();

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

    this.$("pickupBtn").addEventListener("pointerdown", event => {
      event.preventDefault();

      if (this.playing && !this.paused) {
        this.collectPickup();
      }
    });

    const shootButton = this.$("shootBtn");

    shootButton.addEventListener("pointerdown", event => {
      event.preventDefault();

      if (!this.playing || this.paused) return;

      this.shootHeld = true;

      if (this.fireCooldown <= 0) {
        this.fireWeapon();
      }
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(type => {
      shootButton.addEventListener(type, () => {
        this.shootHeld = false;
      });
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
    this.shootHeld = false;

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
  const previousX = this.player.x;
  const previousZ = this.player.z;

  const bob = this.player.update(
    this.THREE,
    dt,
    this.joystick,
    this.sprintHeld,
    this.view.config
  );

  this.resolveBuildingCollisions(previousX, previousZ);

  this.view.setCamera(this.player, bob);
}
  
resolveBuildingCollisions(previousX, previousZ) {
  const radius = 0.55;

  const currentX = this.player.x;
  const currentZ = this.player.z;

  const buildings = this.view.buildings || [];

  for (const building of buildings) {
    const data = building.userData;

    if (!data || !data.enterable) continue;

    const centerX = building.position.x;
    const centerZ = building.position.z;

    const minX = centerX - data.width / 2 + radius;
    const maxX = centerX + data.width / 2 - radius;
    const minZ = centerZ - data.depth / 2 + radius;
    const maxZ = centerZ + data.depth / 2 - radius;

    const wasInside =
      previousX > minX &&
      previousX < maxX &&
      previousZ > minZ &&
      previousZ < maxZ;

    const isInside =
      currentX > minX &&
      currentX < maxX &&
      currentZ > minZ &&
      currentZ < maxZ;

    const doorHalf =
      (data.doorWidth || 4) / 2 - radius;

    const crossingX = (previousX + currentX) / 2;

    const nearDoor =
      Math.abs(crossingX - centerX) < doorHalf;

    const frontZ = centerZ + data.depth / 2 - radius;

    const entering =
      !wasInside &&
      isInside &&
      previousZ >= frontZ &&
      currentZ < frontZ &&
      nearDoor;

    const exiting =
      wasInside &&
      !isInside &&
      previousZ < frontZ &&
      currentZ >= frontZ &&
      nearDoor;

    if (entering || exiting) {
      data.occupied = entering;
      continue;
    }

    if (!wasInside && isInside) {
      this.player.x = previousX;
      this.player.z = previousZ;

      this.player.velocity.x = 0;
      this.player.velocity.z = 0;
      break;
    }

    if (wasInside && !isInside) {
      this.player.x = previousX;
      this.player.z = previousZ;

      this.player.velocity.x = 0;
      this.player.velocity.z = 0;
      break;
    }
  }
}
  
  
  updateEnemies(dt, time) {
    let closest = 999;

    this.view.enemies.forEach((enemy, index) => {
      if (enemy.active === false) {
        if (performance.now() >= (enemy.deadUntil || 0)) {
          enemy.active = true;
          enemy.health = 100;
          enemy.group.visible = true;
          enemy.reset(index);
        } else {
          return;
        }
      }

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
    this.shootHeld = false;

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
    this.updateWeapon(dt);

    this.$("stamina").textContent =
      "STAMINA " + Math.round(this.player.stamina) + "%";
  }
      }
      
