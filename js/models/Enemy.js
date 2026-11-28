
function rand(min, max) {
  return min + Math.random() * (max - min);
}

export default class Enemy {
  constructor(THREE, scene, textureLoader, seed, portraitPaths) {
    this.THREE = THREE;
    this.scene = scene;
    this.seed = seed;
    this.textureLoader = textureLoader;
    this.portraitPaths = portraitPaths || [];

    this.health = 100;
    this.active = true;
    this.deadUntil = 0;

    this.group = new THREE.Group();
    this.group.userData = {
      seed,
      hitFlash: 0,
      mode: "roam"
    };

    this.createPicture();
    this.reset(seed);

    scene.add(this.group);
  }

  createPicture() {
    const THREE = this.THREE;
    const path =
      this.portraitPaths[this.seed % this.portraitPaths.length];

    if (!path) {
      console.error("Enemy portrait path is missing:", this.seed);
      return;
    }

    const texture = this.textureLoader.load(
      path,
      loadedTexture => {
        const image = loadedTexture.image;

        if (image && image.width && image.height) {
          const aspect = image.width / image.height;

          const height = 3.2;
          const width = Math.max(
            1.2,
            Math.min(3.2, height * aspect)
          );

          this.picture.scale.set(width, height, 1);
        }
      },
      undefined,
      error => {
        console.error("Enemy image failed to load:", path, error);
      }
    );

    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.03,
      depthWrite: false
    });

    this.picture = new THREE.Sprite(material);

    // Bottom of picture touches the ground.
    this.picture.center.set(0.5, 0);

    // No frame, no border, no 3D body.
    this.picture.scale.set(2.4, 3.2, 1);
    this.picture.position.set(0, 0, 0);

    this.picture.renderOrder = 2;

    this.group.add(this.picture);
  }

  reset(index) {
    this.health = 100;
    this.active = true;
    this.deadUntil = 0;

    this.group.visible = true;

    const x = (index % 2 === 0 ? -1 : 1) * rand(3, 8);
    const z = -24 - index * 10;

    this.group.position.set(x, 0, z);

    const data = this.group.userData;

    data.mode = "roam";

    data.roamCenterX = x;
    data.roamCenterZ = z;

    data.targetX = x + rand(-8, 8);
    data.targetZ = z + rand(-8, 8);

    data.nextDecision = 0;
    data.pauseUntil = 0;

    data.lastKnownX = x;
    data.lastKnownZ = z;

    data.phase = rand(0, Math.PI * 2);
    data.speed = rand(0.85, 1.15);
    data.searchDirection = index % 2 === 0 ? 1 : -1;

    data.hitFlash = 0;
  }

  chooseRoamTarget(time) {
    const data = this.group.userData;

    // Random destination around the enemy's roaming area.
    data.targetX =
      data.roamCenterX + rand(-13, 13);

    data.targetZ =
      data.roamCenterZ + rand(-13, 13);

    data.nextDecision = time + rand(3, 7);

    // Sometimes stop and look around.
    if (Math.random() < 0.3) {
      data.pauseUntil = time + rand(0.8, 2.2);
    }
  }

  getObstacleBounds(object, isBuilding = false) {
    if (!object || object.visible === false) {
      return null;
    }

    let width;
    let depth;

    if (isBuilding && object.userData) {
      width = object.userData.width;
      depth = object.userData.depth;
    } else {
      const params = object.geometry?.parameters;

      width = params?.width;
      depth = params?.depth;

      if (width == null || depth == null) {
        return null;
      }

      width *= object.scale?.x || 1;
      depth *= object.scale?.z || 1;
    }

    if (!width || !depth) return null;

    return {
      x: object.position.x,
      z: object.position.z,
      halfW: width / 2,
      halfD: depth / 2
    };
  }

  getSafeDirection(directionX, directionZ, obstacles) {
    if (!obstacles.length) {
      return { x: directionX, z: directionZ };
    }

    const angles = [
      0,
      -0.5,
      0.5,
      -1,
      1,
      -1.5,
      1.5,
      -2,
      2
    ];

    let bestScore = -Infinity;
    let bestX = directionX;
    let bestZ = directionZ;

    for (const angle of angles) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const x = directionX * cos - directionZ * sin;
      const z = directionX * sin + directionZ * cos;

      let score = x * directionX + z * directionZ;

      for (const distance of [1, 2, 3, 4]) {
        const checkX = this.group.position.x + x * distance;
        const checkZ = this.group.position.z + z * distance;

        for (const obstacle of obstacles) {
          const closestX = Math.max(
            obstacle.x - obstacle.halfW,
            Math.min(checkX, obstacle.x + obstacle.halfW)
          );

          const closestZ = Math.max(
            obstacle.z - obstacle.halfD,
            Math.min(checkZ, obstacle.z + obstacle.halfD)
          );

          const gap = Math.hypot(
            checkX - closestX,
            checkZ - closestZ
          );

          if (gap < 0.9) {
            score -= 5;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestX = x;
        bestZ = z;
      }
    }

    return { x: bestX, z: bestZ };
  }

  update(
    player,
    dt,
    time,
    index,
    enemySpeed,
    obstacles = [],
    buildings = []
  ) {
    if (!this.active) return Infinity;

    const enemy = this.group;
    const data = enemy.userData;

    const dx = player.x - enemy.position.x;
    const dz = player.z - enemy.position.z;

    const distance = Math.hypot(dx, dz);

    let targetX;
    let targetZ;
    let speed;

    // CHASE MODE
    if (distance < 38) {
      data.mode = "chase";

      data.lastKnownX = player.x;
      data.lastKnownZ = player.z;

      targetX = player.x;
      targetZ = player.z;

      const velocityX = player.velocity?.x || 0;
      const velocityZ = player.velocity?.z || 0;

      const prediction = Math.min(0.45, distance / 20);

      targetX += velocityX * prediction;
      targetZ += velocityZ * prediction;

      speed = enemySpeed * data.speed;

    } else {
      // INDEPENDENT ROAMING MODE
      data.mode = "roam";

      if (time >= data.nextDecision) {
        this.chooseRoamTarget(time);
      }

      targetX = data.targetX;
      targetZ = data.targetZ;

      speed = 1.5 * data.speed;

      // Stop briefly before choosing another direction.
      if (time < data.pauseUntil) {
        speed = 0;
      }

      const targetDistance = Math.hypot(
        targetX - enemy.position.x,
        targetZ - enemy.position.z
      );

      if (targetDistance < 1.2) {
        this.chooseRoamTarget(time);
      }
    }

    // MOVEMENT DIRECTION
    const moveX = targetX - enemy.position.x;
    const moveZ = targetZ - enemy.position.z;

    const targetDistance = Math.hypot(moveX, moveZ);

    if (targetDistance > 0.05 && speed > 0) {
      let directionX = moveX / targetDistance;
      let directionZ = moveZ / targetDistance;

      // OBSTACLE AVOIDANCE
      const nearbyObjects = [];

      obstacles.forEach(object => {
        const bounds = this.getObstacleBounds(object);
        if (bounds) nearbyObjects.push(bounds);
      });

      buildings.forEach(object => {
        const bounds = this.getObstacleBounds(object, true);
        if (bounds) nearbyObjects.push(bounds);
      });

      const safeDirection = this.getSafeDirection(
        directionX,
        directionZ,
        nearbyObjects
      );

      directionX = safeDirection.x;
      directionZ = safeDirection.z;

      const step = Math.min(speed * dt, targetDistance);

      enemy.position.x += directionX * step;
      enemy.position.z += directionZ * step;
    }

    // KEEP THE PICTURE ON THE GROUND.
    // Do not animate group.position.y.
    enemy.position.y = 0;

    if (this.picture) {
      this.picture.position.y = 0;
    }

    return distance;
  }
    }
