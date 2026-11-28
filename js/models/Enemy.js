
function rand(a, b) {
  return a + Math.random() * (b - a);
}

export default class Enemy {
  constructor(THREE, scene, textureLoader, seed, portraitPaths) {
    this.THREE = THREE;
    this.seed = seed;
    this.scene = scene;

    this.group = this.createFrame();
    this.health = 100;
    this.active = true;
    this.deadUntil = 0;

    this.reset(seed);
    scene.add(this.group);
  }

  createFrame() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const skins = [0xe0a77c, 0xb97855, 0xf0c49a, 0x9b684c];
    const outfits = [0x242d48, 0x401d32, 0x173c43, 0x39302a];
    const accents = [0xff365d, 0x55dfff, 0xffb52e, 0xa77aff];

    const skin = new THREE.MeshStandardMaterial({
      color: skins[this.seed % skins.length],
      roughness: 0.8
    });

    const clothes = new THREE.MeshStandardMaterial({
      color: outfits[this.seed % outfits.length],
      roughness: 0.7
    });

    const accent = new THREE.MeshStandardMaterial({
      color: accents[this.seed % accents.length],
      emissive: accents[this.seed % accents.length],
      emissiveIntensity: 0.25
    });

    const dark = new THREE.MeshStandardMaterial({
      color: 0x171923,
      roughness: 0.9
    });

    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xff334f
    });

    const addPart = (parent, geometry, material, x, y, z) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // BODY
    addPart(
      group,
      new THREE.BoxGeometry(0.9, 1.05, 0.48),
      clothes,
      0, 1.65, 0
    );

    // Chest accent
    addPart(
      group,
      new THREE.BoxGeometry(0.42, 0.12, 0.035),
      accent,
      0, 1.75, 0.255
    );

    // Belt
    addPart(
      group,
      new THREE.BoxGeometry(0.88, 0.12, 0.49),
      dark,
      0, 1.12, 0
    );

    // HEAD
    addPart(
      group,
      new THREE.BoxGeometry(0.67, 0.72, 0.62),
      skin,
      0, 2.55, 0
    );

    // Hair
    addPart(
      group,
      new THREE.BoxGeometry(0.72, 0.2, 0.66),
      dark,
      0, 2.94, 0
    );

    // Eyes - front faces +Z
    addPart(
      group,
      new THREE.BoxGeometry(0.09, 0.075, 0.025),
      eyeMaterial,
      -0.16, 2.62, 0.318
    );

    addPart(
      group,
      new THREE.BoxGeometry(0.09, 0.075, 0.025),
      eyeMaterial,
      0.16, 2.62, 0.318
    );

    // ARMS
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.55, 2.05, 0);
    group.add(leftArm);

    addPart(
      leftArm,
      new THREE.BoxGeometry(0.27, 0.82, 0.3),
      clothes,
      0, -0.4, 0
    );

    addPart(
      leftArm,
      new THREE.BoxGeometry(0.25, 0.25, 0.28),
      skin,
      0, -0.92, 0
    );

    const rightArm = new THREE.Group();
    rightArm.position.set(0.55, 2.05, 0);
    group.add(rightArm);

    addPart(
      rightArm,
      new THREE.BoxGeometry(0.27, 0.82, 0.3),
      clothes,
      0, -0.4, 0
    );

    addPart(
      rightArm,
      new THREE.BoxGeometry(0.25, 0.25, 0.28),
      skin,
      0, -0.92, 0
    );

    // LEGS
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.23, 1.12, 0);
    group.add(leftLeg);

    addPart(
      leftLeg,
      new THREE.BoxGeometry(0.34, 0.88, 0.38),
      dark,
      0, -0.43, 0
    );

    addPart(
      leftLeg,
      new THREE.BoxGeometry(0.38, 0.2, 0.55),
      dark,
      0, -0.88, 0.08
    );

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.23, 1.12, 0);
    group.add(rightLeg);

    addPart(
      rightLeg,
      new THREE.BoxGeometry(0.34, 0.88, 0.38),
      dark,
      0, -0.43, 0
    );

    addPart(
      rightLeg,
      new THREE.BoxGeometry(0.38, 0.2, 0.55),
      dark,
      0, -0.88, 0.08
    );

    // Small glowing shoulder details
    addPart(
      group,
      new THREE.BoxGeometry(0.12, 0.16, 0.34),
      accent,
      -0.52, 2.02, 0
    );

    addPart(
      group,
      new THREE.BoxGeometry(0.12, 0.16, 0.34),
      accent,
      0.52, 2.02, 0
    );

    const light = new THREE.PointLight(
      accents[this.seed % accents.length],
      0.7,
      5
    );

    light.position.set(0, 2.2, 0);
    group.add(light);

    group.userData = {
      seed: this.seed,
      phase: rand(0, 6),
      speed: rand(0.85, 1.15),
      leftArm,
      rightArm,
      leftLeg,
      rightLeg
    };

    return group;
  }

  reset(index) {
    this.health = 100;
    this.active = true;
    this.deadUntil = 0;
    this.group.visible = true;

    this.group.position.set(
      (index % 2 === 0 ? -1 : 1) * rand(3, 8),
      0,
      -24 - index * 10
    );

    this.group.userData.leftArm.rotation.x = 0;
    this.group.userData.rightArm.rotation.x = 0;
    this.group.userData.leftLeg.rotation.x = 0;
    this.group.userData.rightLeg.rotation.x = 0;
  }

  update(player, dt, time, index, enemySpeed) {
    const enemy = this.group;

    const dx = player.x - enemy.position.x;
    const dz = player.z - enemy.position.z;
    const distance = Math.hypot(dx, dz);

    const side =
      (index % 2 === 0 ? -1 : 1) * (2.3 + index * 0.2);

    const targetX = player.x + side;
    const targetZ = player.z - 2.8 - index * 0.7;

    const cx = targetX - enemy.position.x;
    const cz = targetZ - enemy.position.z;
    const length = Math.max(0.001, Math.hypot(cx, cz));

    const speed =
      enemySpeed *
      enemy.userData.speed *
      (1 + Math.max(0, 25 - distance) * 0.035);

    enemy.position.x += (cx / length) * speed * dt;
    enemy.position.z += (cz / length) * speed * dt;

    const moving = distance > 2.5;
    const swing = moving
      ? Math.sin(time * 8 * enemy.userData.speed)
      : 0;

    enemy.position.y = Math.abs(swing) * 0.035;

    enemy.userData.leftArm.rotation.x = swing * 0.65;
    enemy.userData.rightArm.rotation.x = -swing * 0.65;

    enemy.userData.leftLeg.rotation.x = -swing * 0.55;
    enemy.userData.rightLeg.rotation.x = swing * 0.55;

    enemy.lookAt(player.x, 1.7, player.z);

    enemy.rotation.z =
      Math.sin(time * 1.2 + index) * 0.025;

    return distance;
  }
  }

    
