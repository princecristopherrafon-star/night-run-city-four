
import Enemy from "../models/Enemy.js";

function rand(min, max) {
  return min + Math.random() * (max - min);
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
    this.pickups = [];
    this.landmarks = [];
    this.floorZones = [];

    this.portraitPaths = [
      "./assets/63.jpg",
      "./assets/boseng.jpg",
      "./assets/Michael.jpg",
      "./assets/speed.jpg"
    ];

    this.config = {
      height: 900,
      walkSpeed: 10,
      sprintSpeed: 19,
      acceleration: 22,
      friction: 11,
      enemySpeed: 6.5,
      enemyMinDistance: 2,
      fogDistance: 220
    };
  }

  init() {
    const THREE = this.THREE;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x89949b);
    this.scene.fog = new THREE.Fog(0x89949b, 85, this.config.fogDistance);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      700
    );

    this.camera.position.set(0, 5, 12);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    const container =
      document.getElementById("game-container") || document.body;

    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.textureLoader = new THREE.TextureLoader();

    const hemisphere = new THREE.HemisphereLight(
      0xdce8ed,
      0x343b40,
      2.0
    );
    this.scene.add(hemisphere);

    const sunlight = new THREE.DirectionalLight(0xffedcf, 2.4);
    sunlight.position.set(-35, 65, 25);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(2048, 2048);
    sunlight.shadow.camera.left = -100;
    sunlight.shadow.camera.right = 100;
    sunlight.shadow.camera.top = 100;
    sunlight.shadow.camera.bottom = -100;
    this.scene.add(sunlight);

    this.createCity();
    this.createEnemies();
    this.createObstacles();

    window.addEventListener("resize", () => this.resizeRenderer());

    return this;
  }

  resizeRenderer() {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  
  getGroundHeight(x, z, currentHeight = 0) {
    let bestHeight = 0;

    for (const floor of this.floorZones) {
      if (
        x < floor.minX ||
        x > floor.maxX ||
        z < floor.minZ ||
        z > floor.maxZ
      ) {
        continue;
      }

      let height = floor.height || 0;

      if (floor.ramp) {
        const range = floor.startZ - floor.endZ;

        const progress = range === 0
          ? 0
          : (floor.startZ - z) / range;

        const clamped = Math.max(0, Math.min(1, progress));

        height =
          floor.startHeight +
          (floor.endHeight - floor.startHeight) * clamped;
      }

      // Only select surfaces reachable from current elevation.
      if (height > currentHeight + 0.65) continue;

      if (height > bestHeight) {
        bestHeight = height;
      }
    }

    return bestHeight;
  }
  

  mat(color, roughness = 0.82, metalness = 0.12) {
    return new this.THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness
    });
  }

  basic(color, opacity = 1) {
    return new this.THREE.MeshBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity
    });
  }

  
  addBox(
    parent,
    x,
    y,
    z,
    width,
    height,
    depth,
    material,
    solid = true
  ) {
    const THREE = this.THREE;

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      material
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);

    if (solid) {
      // Collision copy uses world coordinates.
      const collider = mesh.clone();

      collider.position.set(
        x + (parent.position?.x || 0),
        y + (parent.position?.y || 0),
        z + (parent.position?.z || 0)
      );

      this.obstacles.push(collider);
    }

    return mesh;
  }
  

  addTrim(parent, x, y, z, width, height, depth, color = 0xffa52b) {
    return this.addBox(
      parent,
      x,
      y,
      z,
      width,
      height,
      depth,
      this.mat(color, 0.45, 0.35),
      false
    );
  }

  createEnemies() {
    this.enemies = [];

    for (let i = 0; i < 4; i++) {
      const enemy = new Enemy(
        this.THREE,
        this.scene,
        this.textureLoader,
        i,
        this.portraitPaths
      );

      this.enemies.push(enemy);
    }
  }

  addBuildingWall(x, y, z, width, height, depth, material) {
    const wall = this.addBox(
      this.scene,
      x,
      y,
      z,
      width,
      height,
      depth,
      material,
      false
    );

    this.buildings.push({
      position: wall.position,
      userData: {
        width,
        depth,
        solid: true
      }
    });

    return wall;
  }

  createEnterableBuilding(name, x, z, accent = 0xe99a32) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    this.scene.add(group);

    const concrete = this.mat(0x626b70);
    const darkConcrete = this.mat(0x343c41);
    const steel = this.mat(0x30383d, 0.48, 0.62);
    const floorMat = this.mat(0x777d7c);
    const accentMat = this.mat(accent, 0.5, 0.35);

    const width = 24;
    const depth = 20;
    const wallHeight = 9;
    const thickness = 0.65;
    const doorway = 8;

    // Ground floor: entrance remains open.
    this.addBox(
      group, 0, 0.15, 0,
      width, 0.3, depth,
      floorMat, false
    );

    this.addBuildingWall(
      x, wallHeight / 2, z - depth / 2,
      width, wallHeight, thickness, concrete
    );

    this.addBuildingWall(
      x - width / 2, wallHeight / 2, z,
      thickness, wallHeight, depth, concrete
    );

    this.addBuildingWall(
      x + width / 2, wallHeight / 2, z,
      thickness, wallHeight, depth, concrete
    );

    const sideWidth = (width - doorway) / 2;

    this.addBuildingWall(
      x - doorway / 2 - sideWidth / 2,
      wallHeight / 2,
      z + depth / 2,
      sideWidth, wallHeight, thickness, concrete
    );

    this.addBuildingWall(
      x + doorway / 2 + sideWidth / 2,
      wallHeight / 2,
      z + depth / 2,
      sideWidth, wallHeight, thickness, concrete
    );

    // Second-floor deck and interior floor.
    this.addBox(
      group, 0, 4.55, 0,
      width, 0.5, depth,
      darkConcrete, false
    );

    this.addBox(
      group, 0, 4.84, 0,
      width - 1, 0.12, depth - 1,
      floorMat, false
    );

    // Upper-floor rear and side walls.
    this.addBuildingWall(
      x, 6.8, z - depth / 2,
      width, 4.2, thickness, darkConcrete
    );

    this.addBuildingWall(
      x - width / 2, 6.8, z,
      thickness, 4.2, depth, darkConcrete
    );

    this.addBuildingWall(
      x + width / 2, 6.8, z,
      thickness, 4.2, depth, darkConcrete
    );

    // Upper front wall sections leave a wide firing opening.
    this.addBuildingWall(
      x - 8.5, 6.8, z + depth / 2,
      7, 4.2, thickness, darkConcrete
    );

    this.addBuildingWall(
      x + 8.5, 6.8, z + depth / 2,
      7, 4.2, thickness, darkConcrete
    );

    // Roof.
    this.addBox(
      group, 0, 9.15, 0,
      width + 1.2, 0.55, depth + 1.2,
      steel, false
    );

    // Roof edge markings.
    this.addTrim(group, 0, 9.48, -depth / 2, width, 0.12, 0.25, accent);
    this.addTrim(group, 0, 9.48, depth / 2, width, 0.12, 0.25, accent);

    // Upper-floor cover blocks.
    this.addBox(
      group, -7, 5.55, 1,
      3, 1.4, 2.2, steel, true
    );

    this.addBox(
      group, 7, 5.55, -2,
      3, 1.4, 2.2, steel, true
    );

    // Interior support columns.
    for (const columnX of [-10, 10]) {
      this.addBox(
        group, columnX, 4.5, 0,
        0.8, 9, 0.8, steel, true
      );
    }

    // Building name plate.
    this.addBox(
      group, 0, 8.35, depth / 2 + 0.42,
      8, 0.8, 0.18, steel, false
    );

    this.addTrim(
      group, 0, 8.35, depth / 2 + 0.54,
      5.8, 0.08, 0.04, accent
    );

    // Upper-floor walkable zone.
    this.floorZones.push({
      minX: x - width / 2 + 0.7,
      maxX: x + width / 2 - 0.7,
      minZ: z - depth / 2 + 0.7,
      maxZ: z + depth / 2 - 0.7,
      height: 4.9
    });

    // Building identity landmark.
    this.landmarks.push({
      name,
      x,
      z
    });

    return group;
    }
  
  createBuildingRamps() {
    const deck = this.mat(0x747d7e);
    const steel = this.mat(0x343d42, 0.45, 0.6);
    const yellow = this.mat(0xe6a52c);

    for (const buildingX of [-13, 13]) {
      const startZ = -14;
      const endZ = -27;
      const height = 4.9;
      const length = startZ - endZ;
      const centerZ = (startZ + endZ) / 2;
      const angle = Math.atan2(height, length);

      const ramp = this.addBox(
        this.scene,
        buildingX,
        height / 2,
        centerZ,
        6,
        0.45,
        length,
        deck,
        false
      );

      ramp.rotation.x = angle;

      // Ramp walking surface.
      this.floorZones.push({
        minX: buildingX - 2.7,
        maxX: buildingX + 2.7,
        minZ: endZ,
        maxZ: startZ,
        startZ,
        endZ,
        startHeight: 0,
        endHeight: height,
        ramp: true
      });

      // Protective side rails.
      for (const side of [-1, 1]) {
        const rail = this.addBox(
          this.scene,
          buildingX + side * 3.1,
          height / 2 + 0.55,
          centerZ,
          0.25,
          1.1,
          length,
          steel,
          true
        );

        rail.rotation.x = angle;

        this.addTrim(
          this.scene,
          buildingX + side * 3.1,
          height / 2 + 1.12,
          centerZ,
          0.12,
          0.08,
          length,
          0xe6a52c
        );
      }
    }
      }
  
  createArenaFloor() {
    const THREE = this.THREE;

    const groundMat = this.mat(0x555e61);
    const roadMat = this.mat(0x343b3e);
    const concrete = this.mat(0x707879);
    const steel = this.mat(0x343c40, 0.48, 0.62);
    const yellow = this.mat(0xe6a52c, 0.55, 0.3);
    const white = this.mat(0xd9dedb, 0.65, 0.15);

    // Main battlefield ground.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      groundMat
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.12;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Three wide combat lanes.
    for (const z of [-38, 0, 38]) {
      this.addBox(
        this.scene, 0, 0.015, z,
        150, 0.08, 13,
        roadMat, false
      );

      for (const side of [-1, 1]) {
        this.addBox(
          this.scene, side * 73, 0.08, z,
          0.28, 0.12, 13,
          yellow, false
        );
      }

      // Broken lane markings.
      for (let x = -62; x <= 62; x += 16) {
        this.addBox(
          this.scene, x, 0.075, z,
          6, 0.035, 0.22,
          white, false
        );
      }
    }

    // Outer battlefield barriers.
    for (const x of [-76, 76]) {
      this.addBox(
        this.scene, x, 2.2, 0,
        2, 4.4, 154,
        concrete, true
      );
    }

    for (const z of [-76, 76]) {
      this.addBox(
        this.scene, 0, 2.2, z,
        154, 4.4, 2,
        concrete, true
      );
    }

    // Low perimeter safety blocks.
    for (const x of [-58, -30, 30, 58]) {
      this.addBox(
        this.scene, x, 0.65, -69,
        5, 1.3, 1.5,
        steel, true
      );

      this.addBox(
        this.scene, x, 0.65, 69,
        5, 1.3, 1.5,
        steel, true
      );
    }

    // Central concrete combat pad.
    this.addBox(
      this.scene, 0, 0.2, 0,
      28, 0.4, 28,
      concrete, false
    );

    // Painted tactical markings.
    this.addBox(
      this.scene, 0, 0.415, -12,
      18, 0.035, 0.28,
      yellow, false
    );

    this.addBox(
      this.scene, 0, 0.415, 12,
      18, 0.035, 0.28,
      yellow, false
    );

    // Side ground pads.
    for (const x of [-34, 34]) {
      this.addBox(
        this.scene, x, 0.12, 0,
        12, 0.24, 46,
        roadMat, false
      );
    }
  }

  createFloatingPlatforms() {
    const steel = this.mat(0x343d42, 0.42, 0.65);
    const deckMat = this.mat(0x737c7d);
    const undersideMat = this.mat(0x252d31);
    const yellow = this.mat(0xe7a52d, 0.5, 0.3);
    const supportMat = this.mat(0x4a5357);

    const makePlatform = (x, y, z, width, depth) => {
      // Walkable deck. Ground height is handled by floorZones.
      this.addBox(
        this.scene, x, y, z,
        width, 0.65, depth,
        deckMat, false
      );

      // Dark underside makes the platform visibly elevated.
      this.addBox(
        this.scene, x, y - 0.43, z,
        width - 0.5, 0.25, depth - 0.5,
        undersideMat, false
      );

      // Heavy steel edge beams.
      for (const side of [-1, 1]) {
        this.addBox(
          this.scene,
          x + side * (width / 2 - 0.22),
          y + 0.08,
          z,
          0.38, 0.9, depth,
          steel, true
        );

        this.addBox(
          this.scene,
          x,
          y + 0.08,
          z + side * (depth / 2 - 0.22),
          width, 0.9, 0.38,
          steel, true
        );

        this.addBox(
          this.scene,
          x + side * (width / 2 - 0.45),
          y + 0.56,
          z,
          0.12, 0.08, depth - 1,
          yellow, false
        );
      }

      // Walkable surface height.
      this.floorZones.push({
        minX: x - width / 2 + 0.55,
        maxX: x + width / 2 - 0.55,
        minZ: z - depth / 2 + 0.55,
        maxZ: z + depth / 2 - 0.55,
        height: y + 0.325
      });

      // Support columns.
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          this.addBox(
            this.scene,
            x + sx * (width / 2 - 1),
            y / 2,
            z + sz * (depth / 2 - 1),
            0.9, y, 0.9,
            supportMat, true
          );
        }
      }
    };

    // Large elevated platforms.
    makePlatform(-30, 5, -2, 22, 18);
    makePlatform(30, 5, -2, 22, 18);
    makePlatform(0, 8, 34, 26, 18);
    makePlatform(0, 6, -47, 30, 16);

    // Elevated connecting bridge decks.
    this.addBox(
      this.scene, 0, 5.15, -2,
      18, 0.55, 7,
      steel, false
    );

    this.floorZones.push({
      minX: -8.5,
      maxX: 8.5,
      minZ: -5.2,
      maxZ: 1.2,
      height: 5.425
    });

    this.addBox(
      this.scene, 0, 8.15, 23,
      8, 0.55, 12,
      steel, false
    );

    this.floorZones.push({
      minX: -3.7,
      maxX: 3.7,
      minZ: 17.5,
      maxZ: 28.5,
      height: 8.425
    });

    // Sloped ramps to the side platforms.
    const makeRamp = (x, lowZ, highZ, height, width) => {
      const length = Math.abs(lowZ - highZ);
      const angle = Math.atan2(height, length);

      const ramp = this.addBox(
        this.scene,
        x,
        height / 2,
        (lowZ + highZ) / 2,
        width,
        0.45,
        length,
        deckMat,
        false
      );

      ramp.rotation.x = angle;

      // Ramp surface height interpolates from ground to platform.
      this.floorZones.push({
        minX: x - width / 2 + 0.3,
        maxX: x + width / 2 - 0.3,
        minZ: Math.min(lowZ, highZ),
        maxZ: Math.max(lowZ, highZ),
        startZ: lowZ,
        endZ: highZ,
        startHeight: 0,
        endHeight: height,
        ramp: true
      });

      // Ramp side rails.
      for (const side of [-1, 1]) {
        const rail = this.addBox(
          this.scene,
          x + side * (width / 2),
          height / 2 + 0.65,
          (lowZ + highZ) / 2,
          0.28,
          1.3,
          length,
          steel,
          true
        );

        rail.rotation.x = angle;
      }
    };

    makeRamp(-30, 22, -11, 4.675, 6);
    makeRamp(30, 22, -11, 4.675, 6);
    makeRamp(0, 52, 25, 8.1, 6);
    makeRamp(0, -31, -39, 5.1, 7);

    // Extra overhead platforms for vertical combat routes.
    this.addBox(
      this.scene, -52, 10, 12,
      14, 0.7, 12,
      steel, false
    );

    this.floorZones.push({
      minX: -58.5,
      maxX: -45.5,
      minZ: 6.5,
      maxZ: 17.5,
      height: 10.35
    });

    this.addBox(
      this.scene, 52, 10, 12,
      14, 0.7, 12,
      steel, false
    );

    this.floorZones.push({
      minX: 45.5,
      maxX: 58.5,
      minZ: 6.5,
      maxZ: 17.5,
      height: 10.35
    });
  }

  createArenaCover() {
    const concrete = this.mat(0x697275);
    const steel = this.mat(0x3c464a, 0.48, 0.6);
    const sandbag = this.mat(0x8b8065);
    const yellow = this.mat(0xe3a32c);

    // Waist-high concrete firing cover.
    const coverPositions = [
      [-18, 0, -8, 7, 2.2, 2],
      [18, 0, -8, 7, 2.2, 2],
      [-18, 0, 15, 7, 2.2, 2],
      [18, 0, 15, 7, 2.2, 2],
      [-43, 0, -30, 8, 2.4, 2.5],
      [43, 0, -30, 8, 2.4, 2.5],
      [-43, 0, 34, 8, 2.4, 2.5],
      [43, 0, 34, 8, 2.4, 2.5],
      [-12, 0, 49, 8, 2.2, 2],
      [12, 0, 49, 8, 2.2, 2]
    ];

    for (const [x, y, z, w, h, d] of coverPositions) {
      this.addBox(
        this.scene, x, y + h / 2, z,
        w, h, d, concrete, true
      );

      this.addBox(
        this.scene, x, y + h + 0.04, z,
        w, 0.08, d + 0.12,
        yellow, false
      );
    }

    // Sandbag firing positions.
    for (const x of [-27, 27]) {
      this.addBox(
        this.scene, x, 0.7, 40,
        7, 1.4, 2.4,
        sandbag, true
      );
    }

    // Steel barricades near the central lanes.
    for (const x of [-9, 9]) {
      this.addBox(
        this.scene, x, 1.05, 29,
        3.2, 2.1, 1.1,
        steel, true
      );
    }

    // Small concrete blocks.
    for (const x of [-58, 58]) {
      for (const z of [-12, 12, 48]) {
        this.addBox(
          this.scene, x, 0.8, z,
          3, 1.6, 3,
          concrete, true
        );
      }
    }
  }

  createArenaLights() {
    const THREE = this.THREE;

    const warm = new THREE.PointLight(0xffc477, 1.1, 38);
    warm.position.set(0, 13, 0);
    this.scene.add(warm);
    this.lamps.push(warm);

    for (const x of [-58, 58]) {
      for (const z of [-48, 48]) {
        const poleMat = this.mat(0x343d42, 0.5, 0.6);

        this.addBox(
          this.scene, x, 8, z,
          0.7, 16, 0.7,
          poleMat, true
        );

        const lamp = new THREE.PointLight(0xffd49a, 1.4, 42);
        lamp.position.set(x, 15.5, z);
        this.scene.add(lamp);
        this.lamps.push(lamp);
      }
    }
  }

  createCity() {
    this.obstacles = [];
    this.buildings = [];
    this.landmarks = [];
    this.floorZones = [];
    this.lamps = [];

    this.createArenaFloor();

    // Two enterable combat buildings near one another.
    this.createEnterableBuilding(
      "NORTH CHECKPOINT",
      -13,
      -28,
      0xe6a52c
    );

    this.createEnterableBuilding(
      "SOUTH CHECKPOINT",
      13,
      -28,
      0xd7d9d5
    );
        this.createBuildingRamps();

    this.createFloatingPlatforms();
    this.createArenaCover();
    this.createArenaLights();

    // Spawn-area ground floor.
    this.floorZones.push({
      minX: -75,
      maxX: 75,
      minZ: -75,
      maxZ: 75,
      height: 0
    });
  }

  createObstacles() {
    if (!this.obstacles) {
      this.obstacles = [];
    }
  }

  resetWorld() {
    this.enemies.forEach((enemy, index) => {
      enemy.reset(index);
    });

    for (const pickup of this.pickups) {
      if (pickup.parent) {
        pickup.parent.remove(pickup);
      }
    }

    this.pickups = [];
  }

  setCamera(x, y, z, yaw, pitch) {
    if (!this.camera) return;

    this.camera.position.set(x, y, z);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = yaw;
    this.camera.rotation.x = pitch;
  }

  render() {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.renderer.render(this.scene, this.camera);
  }
      }
    
  
