
export default class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.z = 0;

    // Camera height above the current floor
    this.y = 1.7;
    this.groundY = 0;

    this.velocityY = 0;

    this.velocity = {
      x: 0,
      z: 0
    };

    this.yaw = 0;
    this.pitch = 0;

    this.stamina = 100;
    this.jumpActive = false;
    this.walkTime = 0;
  }

  jump(sound) {
    const feet = this.y - 1.7;

    if (
      feet <= this.groundY + 0.06 &&
      !this.jumpActive
    ) {
      this.velocityY = 7.3;
      this.jumpActive = true;

      if (sound) {
        sound(115, 0.13, 0.12);
      }

      return true;
    }

    return false;
  }

  update(
    THREE,
    dt,
    joystick,
    sprintHeld,
    config,
    getGroundHeight = null
  ) {
    const moving =
      Math.abs(joystick.x) +
      Math.abs(joystick.y) > 0.1;

    const sprinting =
      sprintHeld &&
      this.stamina > 0 &&
      moving;

    const speed = sprinting
      ? config.sprintSpeed
      : config.walkSpeed;

    // STAMINA
    if (sprinting) {
      this.stamina = Math.max(
        0,
        this.stamina - 24 * dt
      );
    } else {
      this.stamina = Math.min(
        100,
        this.stamina + 13 * dt
      );
    }

    // CAMERA-RELATIVE MOVEMENT
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);

    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);

    let desiredX =
      forwardX * -joystick.y +
      rightX * joystick.x;

    let desiredZ =
      forwardZ * -joystick.y +
      rightZ * joystick.x;

    const length = Math.hypot(
      desiredX,
      desiredZ
    );

    if (length > 1) {
      desiredX /= length;
      desiredZ /= length;
    }

    desiredX *= speed;
    desiredZ *= speed;

    // SMOOTH ACCELERATION
    const acceleration =
      Math.hypot(desiredX, desiredZ) > 0
        ? config.acceleration
        : config.friction;

    const blend =
      1 - Math.exp(-acceleration * dt);

    this.velocity.x +=
      (desiredX - this.velocity.x) * blend;

    this.velocity.z +=
      (desiredZ - this.velocity.z) * blend;

    // WORLD MOVEMENT
    this.x += this.velocity.x * dt;
    this.z += this.velocity.z * dt;

    // MAP BOUNDARIES
    const previousX = this.x;
    const previousZ = this.z;

    this.x = THREE.MathUtils.clamp(
      this.x,
      -55,
      55
    );

    this.z = THREE.MathUtils.clamp(
      this.z,
      -65,
      65
    );

    if (this.x !== previousX) {
      this.velocity.x = 0;
    }

    if (this.z !== previousZ) {
      this.velocity.z = 0;
    }

    // DETECT CURRENT FLOOR OR RAMP HEIGHT
    let targetGroundY = 0;

    if (typeof getGroundHeight === "function") {
      const detectedHeight = getGroundHeight(
        this.x,
        this.z
      );

      if (Number.isFinite(detectedHeight)) {
        targetGroundY = detectedHeight;
      }
    }

    this.groundY = targetGroundY;

    // JUMP AND GRAVITY
    this.velocityY -= 19 * dt;
    this.y += this.velocityY * dt;

    const playerFeet = this.y - 1.7;

    // LAND ON THE CURRENT FLOOR
    if (
      this.velocityY <= 0 &&
      playerFeet <= targetGroundY
    ) {
      this.y = targetGroundY + 1.7;
      this.velocityY = 0;
      this.jumpActive = false;
    }

    // WALK CAMERA BOB
    this.walkTime +=
      dt *
      (
        Math.hypot(
          this.velocity.x,
          this.velocity.z
        ) > 0.2
          ? speed * 0.8
          : 0
      );

    return Math.hypot(
      this.velocity.x,
      this.velocity.z
    ) > 0.15
      ? Math.sin(this.walkTime * 2.2) * 0.045
      : 0;
  }
}
