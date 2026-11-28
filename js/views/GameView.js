
import Enemy from "../models/Enemy.js";

function rand(a, b) {
  return a + Math.random() * (b - a);
}

export default class GameView {
  constructor(THREE) {
    this.THREE = THREE;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = null;
    this.textureLoader = null;

    this.enemies = [];
    this.obstacles = [];
    this.buildings = [];
    this.lamps = [];

    this.portraitPaths = [
      "./assets/63.jpg",
      "./assets/boseng.jpg",
      "./assets/Michael.jpg",
      "./assets/speed.jpg"
    ];

    this.config = {
      height: 480,
      walkSpeed: 5.2,
      sprintSpeed: 8.5,
      acceleration: 12,
      friction: 9,
      enemySpeed: 2.15,
      enemyMinDistance: 2,
      fogDistance: 75
    };
  }

  init() {
    const THREE = this.THREE;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05090e);
    this.scene.fog = new THREE.FogExp2(0x080f18, 0.022);

    this.camera = new THREE.PerspectiveCamera(
      76,
      innerWidth / innerHeight,
      0.08,
      180
    );

    this.camera.position.set(0, 1.7, 0);
    this.camera.rotation.order = "YXZ";

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
      alpha: false
    });

    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    document.getElementById("game").appendChild(
      this.renderer.domElement
    );

    this.textureLoader = new THREE.TextureLoader();

    this.resizeRenderer();

    this.clock = new THREE.Clock();

    this.scene.add(
      new THREE.HemisphereLight(0x7894a9, 0x101018, 1.05)
    );

    const moon = new THREE.DirectionalLight(0x83c9ed, 1.1);
    moon.position.set(-15, 35, -20);
    this.scene.add(moon);

    this.createCity();
    this.createEnemies();
    this.createObstacles();

    addEventListener("resize", () => this.resizeRenderer());
  }

  resizeRenderer() {
    if (!this.renderer || !this.camera) return;

    const width = innerWidth;
    const height = innerHeight;
    const scale = this.config.height / height;

    this.renderer.setSize(
      Math.max(320, Math.round(width * scale)),
      this.config.height,
      false
    );

    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  mat(color, roughness = 0.9) {
    return new this.THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0.08
    });
  }

  createBuilding(x, z, width, height, depth) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const building = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      this.mat(0x101d29)
    );

    building.position.y = height / 2;
    group.add(building);

    const windowMaterial = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.5 ? 0x235c70 : 0x382b38
    });

    for (let y = 3; y < height - 1; y += 3) {
      for (
        let xx = -width / 2 + 1;
        xx < width / 2 - 1;
        xx += 2.5
      ) {
        if (Math.random() < 0.3) continue;

        const windowMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(1.05, 1.4),
          windowMaterial
        );

        windowMesh.position.set(xx, y, depth / 2 + 0.012);
        group.add(windowMesh);
      }
    }

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.buildings.push(group);
  }

  createCity() {
    const THREE = this.THREE;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 1000),
      new THREE.MeshStandardMaterial({
        color: 0x080d13,
        roughness: 0.45,
        metalness: 0.25
      })
    );

    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 1000),
      this.mat(0x10171e, 0.4)
    );

    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.015;
    this.scene.add(road);

    for (let z = -500; z < 500; z += 12) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.16, 5),
        new THREE.MeshBasicMaterial({ color: 0x6b929d })
      );

      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.03, z);
      this.scene.add(line);
    }

    for (const x of [-11, 11]) {
      const sidewalk = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.3, 1000),
        this.mat(0x202a32)
      );

      sidewalk.position.set(x, 0.15, 0);
      this.scene.add(sidewalk);
    }

    for (let z = -480; z < 100; z += 25) {
      this.createBuilding(
        -20 + rand(-2, 3),
        z,
        rand(10, 16),
        rand(15, 55),
        rand(12, 18)
      );

      this.createBuilding(
        20 + rand(-3, 2),
        z,
        rand(10, 16),
        rand(15, 60),
        rand(12, 18)
      );
    }

    for (let z = -160; z < 30; z += 22) {
      for (const side of [-1, 1]) {
        const group = new THREE.Group();

        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.13, 6, 8),
          this.mat(0x35414b)
        );

        pole.position.y = 3;
        group.add(pole);

        const bulb = new THREE.PointLight(0x65dfff, 2.2, 17);
        bulb.position.set(0, 5.8, 0);
        group.add(bulb);

        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0x8ceeff })
        );

        glow.position.y = 5.8;
        group.add(glow);

        group.position.set(side * 9, 0, z);
        this.scene.add(group);
        this.lamps.push(group);
      }
    }

    for (let i = 0; i < 40; i++) {
      const height = rand(25, 90);

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(rand(8, 18), height, rand(8, 18)),
        this.mat(0x0a1520)
      );

      building.position.set(
        rand(-100, 100),
        height / 2,
        rand(-250, -100)
      );

      this.scene.add(building);
    }
  }

  createEnemies() {
    this.enemies = [];

    for (let i = 0; i < 4; i++) {
      this.enemies.push(
        new Enemy(
          this.THREE,
          this.scene,
          this.textureLoader,
          i,
          this.portraitPaths
        )
      );
    }
  }

  createObstacles() {
    const THREE = this.THREE;

    this.obstacles = [];

    for (let i = 0; i < 14; i++) {
      const obstacle = new THREE.Mesh(
        new THREE.BoxGeometry(
          rand(1.3, 2.5),
          rand(0.8, 1.5),
          1.2
        ),
        this.mat(0x283943)
      );

      obstacle.position.set(rand(-6, 6), 0.6, -20 - i * 13);

      this.scene.add(obstacle);
      this.obstacles.push(obstacle);
    }
  }

  resetWorld() {
    this.enemies.forEach((enemy, index) => {
      enemy.reset(index);
    });

    this.obstacles.forEach((obstacle, index) => {
      obstacle.position.set(
        rand(-6, 6),
        0.6,
        -20 - index * 13
      );
    });
  }

  setCamera(player, bob = 0) {
    this.camera.position.set(
      player.x,
      player.y + bob,
      player.z
    );

    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = player.yaw;
    this.camera.rotation.x = player.pitch;
  }

  render() {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
  }
        }
