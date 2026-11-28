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
    const element = this.$("toast");
    if (!element) return;

    element.textContent = message;
    element.style.opacity = 1;

    clearTimeout(this.toastTimer);

    this.toastTimer = setTimeout(() => {
      element.style.opacity = 0;
    }, 2600);
  }

  showStartError(error) {
    console.error("NIGHT RUN START ERROR:", error);

    const menu = this.$("menu");
    const hud = this.$("hud");

    if (menu) menu.style.display = "flex";
    if (hud) hud.style.display = "none";

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
    if (this.bgMusic) {
      this.bgMusic.pause();
    }

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
          window.AudioContext ||
          window.webkitAudioContext
        )();

        this.masterGain =
          this.audioContext.createGain();

        this.masterGain.gain.value =
          this.musicOn ? 0.17 : 0;

        this.masterGain.connect(
          this.audioContext.destination
        );

        this.droneOsc =
          this.audioContext.createOscillator();

        this.droneOsc.type = "sawtooth";
        this.droneOsc.frequency.value = 43;

        const filter =
          this.audioContext.createBiquadFilter();

        filter.type = "lowpass";
        filter.frequency.value = 110;

        const gain =
          this.audioContext.createGain();

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

  sound(
    freq = 100,
    duration = 0.15,
    volume = 0.1,
    type = "sine"
  ) {
    if (!this.audioContext || !this.musicOn) return;

    try {
      const oscillator =
        this.audioContext.createOscillator();

      const gain =
        this.audioContext.createGain();

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
    if (
      !this.audioContext ||
      !this.droneOsc ||
      !this.masterGain
    ) return;

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

  updateEnemySounds() {
    if (!this.enemyAudio.length) return;

    this.view.enemies.forEach((enemy, index) => {
      const audio = this.enemyAudio[index];
      if (!audio) return;

      if (enemy.active === false) {
        audio.pause();
        audio.volume = 0;
        return;
      }

      const distance = Math.hypot(
        this.player.x - enemy.group.position.x,
        this.player.z - enemy.group.position.z
      );

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
    makePickupPart(group, geometry, color, x, y, z, rx = 0, ry = 0, rz = 0) {
    const mesh = new this.THREE.Mesh(
      geometry,
      new this.THREE.MeshLambertMaterial({
        color,
        flatShading: true
      })
    );

    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    group.add(mesh);
    return mesh;
  }

  createPickupWeaponModel(group, type, color) {
    const THREE = this.THREE;

    const dark = 0x202a35;
    const metal = 0x71818e;
    const grip = 0x30343b;

    if (type === "pistol") {
      // Pistol slide
      this.makePickupPart(
        group,
        new THREE.BoxGeometry(0.82, 0.19, 0.24),
        color,
        0.02, 0.72, 0
      );

      // Pistol grip
      this.makePickupPart(
        group,
        new THREE.BoxGeometry(0.24, 0.43, 0.22),
        grip,
        -0.17, 0.43, 0,
        0, 0, -0.22
      );

      // Barrel
      this.makePickupPart(
        group,
        new THREE.CylinderGeometry(0.055, 0.055, 0.24, 8),
        metal,
        0.51, 0.72, 0,
        0, 0, Math.PI / 2
      );

      // Handle detail
      this.makePickupPart(
        group,
        new THREE.BoxGeometry(0.12, 0.22, 0.235),
        dark,
        -0.19, 0.42, 0
      );

      // Sight
      this.makePickupPart(
        group,
        new THREE.BoxGeometry(0.12, 0.07, 0.12),
        metal,
        0.12, 0.85, 0
      );
    }

    if (type === "rifle") {
      // Main receiver
      this.makePickupPart(
        group,
        new THREE.BoxGeometry(0.85, 0.23, 0.27),
        color,
        0, 0.72, 0
      );

      // Long barrel
      this.makePickupPart(
        group,
        new THREE.CylinderGeometry(0.055, 0.055, 0.95, 8),
        metal,
        0.83, 0.75, 0,
        0, 0, Math.PI / 2
      );

      // Stock
      this.makePickupPart(
        group,
        new THREE.BoxGeometry(0.48, 0.22, 0.25),
        dark,
        -0.65, 0.69, 0
      );

      // Magazine
      this.makePickupPart(
        group,
        new THREE.BoxGeometry(0.22, 0.48, 0.22),
        grip,
        0.02, 0.39, 0,
        0, 0, -0.12
      );

      // Top rail
      this.makePickupPart(
        group,
        new THREE.BoxGeometry(0.48, 0.07, 0.17),
        metal,
        0.05, 0.88, 0
      );

      // Scope
      this.makePickupPart(
        group,
        new THREE.CylinderGeometry(0.09, 0.09, 0.27, 8),
        dark,
        0.02, 1.02, 0,
        Math.PI / 2, 0, 0
      );

      // Front grip
      this.makePickupPart(
        group,
        new THREE.BoxGeometry(0.16, 0.3, 0.2),
        grip,
        0.42, 0.49, 0
      );
    }

    if (type === "shotgun") {
      // Main body
      this.makePickupPart(
        group,
        new THREE.BoxGeometry(0.8, 0.23, 0.28),
        color,
        0, 0.72, 0
      );

      // Long barrel
      this.makePickupPart(
        group,
        new THREE.CylinderGeometry(0.065, 0.065, 1.05, 8),
        metal,
        0.82, 0.76, 0,
        0, 0, Math.PI / 2
      );

      // Wooden stock
      this.makePickupPart(
        group,
        new THREE.BoxGeometry(0.52, 0.24, 0.27),
        0x9b6336,
        -0.65, 0.69, 0
      );

      // Pump grip
      this.makePickupPart(
        group,
        new THREE.BoxGeometry(0.32, 0.19, 0.32),
        0xb8793d,
        0.43, 0.55, 0
      );

      // Trigger grip
      this.makePickupPart(
        group,
        new THREE.BoxGeometry(0.2, 0.36, 0.22),
        dark,
        -0.12, 0.43, 0
      );

      // Barrel tip
      this.makePickupPart(
        group,
        new THREE.CylinderGeometry(0.085, 0.085, 0.1, 8),
        dark,
        1.36, 0.76, 0,
        0, 0, Math.PI / 2
      );
    }
  }

  createPickups() {
    if (!this.view.scene || this.pickupObjects.length) return;

    const THREE = this.THREE;

    const addPickup = (kind, type, x, z, color, label) => {
      const group = new THREE.Group();

      if (kind === "weapon") {
        this.createPickupWeaponModel(group, type, color);
      } else {
        // Ammo crate
        this.makePickupPart(
          group,
          new THREE.BoxGeometry(0.85, 0.65, 0.75),
          0x287c45,
          0, 0.43, 0
        );

        // Yellow crate stripe
        this.makePickupPart(
          group,
          new THREE.BoxGeometry(0.88, 0.13, 0.78),
          0xffd84a,
          0, 0.48, 0
        );

        // Ammo rounds
        for (let i = 0; i < 3; i++) {
          this.makePickupPart(
            group,
            new THREE.CylinderGeometry(0.065, 0.065, 0.32, 8),
            0xd5dce4,
            -0.22 + i * 0.22,
            0.88,
            0,
            0, 0, 0
          );
        }
      }

      // Neon pickup ring
      const glow = new THREE.Mesh(
        new THREE.TorusGeometry(0.82, 0.055, 6, 20),
        new THREE.MeshBasicMaterial({ color })
      );

      glow.rotation.x = Math.PI / 2;
      glow.position.y = 0.08;
      group.add(glow);

      // Glow light
      const light = new THREE.PointLight(color, 0.8, 6);
      light.position.y = 1.1;
      group.add(light);

      group.position.set(x, 0, z);
      group.userData = {
        kind,
        type,
        label,
        baseY: 0
      };

      this.view.scene.add(group);
      this.pickupObjects.push(group);
    };

    // Weapons placed outside building entrances
    addPickup("weapon", "pistol", -23, -23, 0x45f4d0, "PISTOL");
    addPickup("weapon", "rifle", 23, -23, 0xffd84a, "RIFLE");
    addPickup("weapon", "shotgun", -23, 40, 0xff4564, "SHOTGUN");

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
      shoot.style.display =
        this.currentWeapon ? "block" : "none";
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

    if (!button) return;

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

    if (
      !weapon ||
      !this.playing ||
      this.paused ||
      this.gameOver
    ) {
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
        if (
          enemy.active === false ||
          !enemy.group.visible
        ) {
          continue;
        }

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
      if (!pickup.visible) continue;

      pickup.rotation.y += dt * 1.1;

      pickup.position.y =
        0.08 +
        Math.sin(
          performance.now() * 0.003 +
          pickup.position.x
        ) * 0.08;
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

    const stick = this.$("stick");
    const caught = this.$("caught");

    if (stick) {
      stick.style.transform = "translate(0px,0px)";
    }

    if (caught) {
      caught.style.display = "none";
    }

    this.enemyAudio.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    this.view.setCamera(this.player);
  }

  setupJoystick() {
    const element = this.$("joystick");
    const stick = this.$("stick");

    if (!element || !stick) {
      console.warn("Joystick elements not found.");
      return;
    }

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
      ) {
        return;
      }

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
    const sprint = this.$("sprint");
    const jump = this.$("jump");
    const pickup = this.$("pickupBtn");
    const shootButton = this.$("shootBtn");

    if (sprint) {
      sprint.addEventListener("pointerdown", event => {
        event.preventDefault();

        if (this.playing && !this.paused) {
          this.sprintHeld = true;
        }
      });

      ["pointerup", "pointercancel", "pointerleave"].forEach(type => {
        sprint.addEventListener(type, () => {
          this.sprintHeld = false;
        });
      });
    }

    if (jump) {
      jump.addEventListener("pointerdown", event => {
        event.preventDefault();

        if (this.playing && !this.paused) {
          this.player.jump((...args) => this.sound(...args));
        }
      });
    }

    if (pickup) {
      pickup.addEventListener("pointerdown", event => {
        event.preventDefault();

        if (this.playing && !this.paused) {
          this.collectPickup();
        }
      });
    }

    if (shootButton) {
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
  }

  startGame(event) {
    if (event) event.preventDefault();

    try {
      const startButton = this.$("start");

      if (!this.ready || !this.view.renderer || !this.clock) {
        throw new Error(
          "3D engine is not ready. Reload the page and try again."
        );
      }

      if (startButton) {
        startButton.textContent = "STARTING...";
        startButton.disabled = true;
      }

      this.initAudio();
      this.resetGame();

      const menu = this.$("menu");
      const hud = this.$("hud");
      const caught = this.$("caught");
      const pauseLayer = this.$("pauseLayer");

      if (menu) menu.style.display = "none";
      if (hud) hud.style.display = "block";
      if (caught) caught.style.display = "none";
      if (pauseLayer) pauseLayer.style.display = "none";

      this.paused = false;
      this.gameOver = false;
      this.playing = true;

      this.clock.getDelta();

      this.toast("FOUR SUBJECTS DETECTED");

    } catch (error) {
      this.showStartError(error);

    } finally {
      const startButton = this.$("start");

      if (startButton) {
        startButton.disabled = false;
        startButton.textContent = "ENTER THE CITY";
      }
    }
  }

  pauseGame() {
    if (!this.playing) return;

    this.paused = true;
    this.playing = false;
    this.sprintHeld = false;
    this.shootHeld = false;

    this.pauseAudio();

    const pauseLayer = this.$("pauseLayer");

    if (pauseLayer) {
      pauseLayer.style.display = "flex";
    }
  }

  resumeGame() {
    if (!this.paused) return;

    this.paused = false;
    this.playing = true;

    const pauseLayer = this.$("pauseLayer");

    if (pauseLayer) {
      pauseLayer.style.display = "none";
    }

    if (this.clock) {
      this.clock.getDelta();
    }

    this.playAudio();
  }

  restartGame() {
    try {
      this.resetGame();

      this.paused = false;
      this.gameOver = false;
      this.playing = true;

      const pauseLayer = this.$("pauseLayer");
      const menu = this.$("menu");
      const hud = this.$("hud");

      if (pauseLayer) pauseLayer.style.display = "none";
      if (menu) menu.style.display = "none";
      if (hud) hud.style.display = "block";

      if (this.clock) {
        this.clock.getDelta();
      }

      this.initAudio();

    } catch (error) {
      this.showStartError(error);
    }
  }

  toggleMusic() {
    this.musicOn = !this.musicOn;

    const button = this.$("musicToggle");

    if (button) {
      button.textContent =
        "BACKGROUND MUSIC: " + (this.musicOn ? "ON" : "OFF");
    }

    if (this.musicOn) {
      if (this.playing) {
        this.playAudio();
      }
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
    const getGroundHeight = (x, z, currentHeight = 0) => {
  if (
    typeof this.view.getGroundHeight === "function"
  ) {
    return this.view.getGroundHeight(
      x,
      z,
      currentHeight
    );
  }

  return 0;
};

    const bob = this.player.update(
      this.THREE,
      dt,
      this.joystick,
      this.sprintHeld,
      this.view.config,
      getGroundHeight
    );

    this.view.setCamera(this.player, bob);
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
        this.view.config.enemySpeed,
        this.view.obstacles,
        this.view.buildings
      );

      closest = Math.min(closest, distance);

      if (distance < this.view.config.enemyMinDistance) {
        this.endGame();
      }
    });

    const distanceLabel = this.$("distance");
    const warning = this.$("warning");

    if (distanceLabel) {
      distanceLabel.textContent =
        "THREAT: " +
        (closest > 100 ? "--" : closest.toFixed(1)) +
        " m";
    }

    if (warning) {
      warning.style.opacity = closest < 13 ? 1 : 0;
    }

    this.updateAudio(closest);
    this.updateEnemySounds();
  }

  
  
  updateObstacles() {
    const playerFeet = this.player.y - 1.7;

    const resolveCollision = (
      x,
      z,
      halfWidth,
      halfDepth,
      top = Infinity
    ) => {
      // Allow the player to move above an obstacle.
      if (playerFeet >= top) return;

      const dx = this.player.x - x;
      const dz = this.player.z - z;

      if (
        Math.abs(dx) >= halfWidth ||
        Math.abs(dz) >= halfDepth
      ) {
        return;
      }

      const overlapX = halfWidth - Math.abs(dx);
      const overlapZ = halfDepth - Math.abs(dz);

      if (overlapX < overlapZ) {
        this.player.x +=
          Math.sign(dx || 1) * overlapX;

        this.player.velocity.x = 0;
      } else {
        this.player.z +=
          Math.sign(dz || 1) * overlapZ;

        this.player.velocity.z = 0;
      }
    };

    // Arena obstacles.
    for (const obstacle of this.view.obstacles || []) {
      if (!obstacle || !obstacle.geometry) continue;

      const params = obstacle.geometry.parameters;

      if (!params) continue;

      const width = params.width * (obstacle.scale?.x || 1);
      const depth = params.depth * (obstacle.scale?.z || 1);
      const height = params.height * (obstacle.scale?.y || 1);

      resolveCollision(
        obstacle.position.x,
        obstacle.position.z,
        width / 2 + 0.35,
        depth / 2 + 0.35,
        obstacle.position.y + height / 2
      );
    }

    // Building wall colliders.
    for (const building of this.view.buildings || []) {
      const data = building.userData;

      if (!data || !data.solid) continue;

      resolveCollision(
        building.position.x,
        building.position.z,
        data.width / 2 + 0.35,
        data.depth / 2 + 0.35
      );
    }
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

    const caught = this.$("caught");

    if (caught) {
      caught.style.display = "flex";
    }

    this.sound(48, 0.7, 0.3, "sawtooth");
  }

  bind() {
    this.setupJoystick();
    this.setupCameraControls();
    this.setupActionButtons();

    const start = this.$("start");
    const pause = this.$("pauseBtn");
    const resume = this.$("resumeBtn");
    const restart = this.$("restartBtn");
    const retry = this.$("retry");
    const music = this.$("musicToggle");

    if (start) {
      start.addEventListener("click", event => {
        this.startGame(event);
      });
    }

    if (pause) {
      pause.addEventListener("click", () => {
        this.pauseGame();
      });
    }

    if (resume) {
      resume.addEventListener("click", () => {
        this.resumeGame();
      });
    }

    if (restart) {
      restart.addEventListener("click", () => {
        this.restartGame();
      });
    }

    if (retry) {
      retry.addEventListener("click", () => {
        this.restartGame();
      });
    }

    if (music) {
      music.addEventListener("click", () => {
        this.toggleMusic();
      });
    }
  }

  update(dt, time) {
    if (!this.playing || this.paused || this.gameOver) return;

    this.score.update(dt);

    this.updateMovement(dt);
    this.updateEnemies(dt, time);
    this.updateObstacles();
    this.updateWeapon(dt);

    const stamina = this.$("stamina");

    if (stamina) {
      stamina.textContent =
        "STAMINA " + Math.round(this.player.stamina) + "%";
    }
  }
                              }
  
  
  
