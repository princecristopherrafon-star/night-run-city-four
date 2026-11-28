
function rand(a, b) {
  return a + Math.random() * (b - a);
}

export default class Enemy {
  constructor(THREE, scene, textureLoader, seed, portraitPaths) {
    this.THREE = THREE;
    this.seed = seed;
    this.scene = scene;

    this.group = this.createFrame(textureLoader, portraitPaths);
    this.reset(seed);

    scene.add(this.group);
  }

  createPortrait() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 384;

    const context = canvas.getContext("2d");
    context.fillStyle = "#080d13";
    context.fillRect(0, 0, 256, 384);

    context.fillStyle = "#a8f7ff";
    context.globalAlpha = 0.15;
    context.fillRect(0, 0, 256, 384);
    context.globalAlpha = 1;

    context.fillStyle = "#ff365d";
    context.font = "bold 18px Arial";
    context.textAlign = "center";
    context.fillText("IMAGE UNAVAILABLE", 128, 190);

    return new this.THREE.CanvasTexture(canvas);
  }

  createFrame(textureLoader, portraitPaths) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const wood = new THREE.MeshStandardMaterial({
      color: [
        0x302116,
        0x252c35,
        0x3c1c24,
        0x252018
      ][this.seed],
      metalness: 0.65,
      roughness: 0.35
    });

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2.15, 0.15),
      wood
    );

    group.add(frame);

    const portraitMaterial = new THREE.MeshBasicMaterial({
      map: this.createPortrait(),
      side: THREE.DoubleSide
    });

    const portrait = new THREE.Mesh(
      new THREE.PlaneGeometry(1.22, 1.84),
      portraitMaterial
    );

    portrait.position.z = 0.085;
    group.add(portrait);

    const path = portraitPaths[this.seed];

    textureLoader.load(
      path,
      texture => {
        texture.colorSpace = THREE.SRGBColorSpace;
        portraitMaterial.map = texture;
        portraitMaterial.needsUpdate = true;
      },
      undefined,
      () => console.warn("Portrait not found:", path)
    );

    const borderMaterial = new THREE.MeshBasicMaterial({
      color: this.seed % 2 ? 0xff365d : 0x76eaff
    });

    const edges = [
      [1.55, 0.055, 0.19, 0, 0.1],
      [1.55, 0.055, 0.19, 0, -1.05],
      [0.055, 2.15, 0.19, -0.75, -0.47],
      [0.055, 2.15, 0.19, 0.75, -0.47]
    ];

    for (const [w, h, d, x, y] of edges) {
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        borderMaterial
      );

      edge.position.set(x, y, 0);
      group.add(edge);
    }

    const light = new THREE.PointLight(
      this.seed % 2 ? 0xff3155 : 0x55dfff,
      1.2,
      7
    );

    light.position.z = 1;
    group.add(light);

    group.userData = {
      seed: this.seed,
      phase: rand(0, 6),
      speed: rand(0.85, 1.15)
    };

    return group;
  }

  reset(index) {
    this.group.position.set(
      (index % 2 === 0 ? -1 : 1) * rand(3, 8),
      1.55,
      -24 - index * 10
    );
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

    enemy.position.y =
      1.55 +
      Math.sin(time * 1.6 + enemy.userData.phase) * 0.12;

    enemy.lookAt(player.x, 1.7, player.z);

    enemy.rotation.z =
      Math.sin(time * 1.2 + index) * 0.035;

    return distance;
  }
      }
