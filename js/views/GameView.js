
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
    this.scene.background = new THREE.Color(0x171b46);
    this.scene.fog = new THREE.Fog(0x25245c, 100, 230);

    this.camera = new THREE.PerspectiveCamera(
      76,
      innerWidth / innerHeight,
      0.08,
      250
    );

    this.camera.position.set(0, 1.7, 0);
    this.camera.rotation.order = "YXZ";

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false
    });

    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.5)
    );

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
      new THREE.HemisphereLight(0xc4d9ff, 0x47336e, 1.8)
    );

    const sun = new THREE.DirectionalLight(0xffd6a1, 1.7);
    sun.position.set(-35, 55, 25);
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x53cfff, 0.75);
    fill.position.set(35, 25, -35);
    this.scene.add(fill);

    this.createCity();
    this.createEnemies();
    this.createObstacles();

    addEventListener("resize", () => this.resizeRenderer());
  }

  resizeRenderer() {
    if (!this.renderer || !this.camera) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height, false);

    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
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

  getGroundHeight(x, z, currentHeight = 0) {
    let bestHeight = 0;
    let bestDifference = Infinity;

    for (const floor of this.floorZones) {
      if (
        x < floor.minX ||
        x > floor.maxX ||
        z < floor.minZ ||
        z > floor.maxZ
      ) {
        continue;
      }

      if (floor.type === "ramp") {
        const start = floor.startZ;
        const end = floor.endZ;

        const t = Math.max(
          0,
          Math.min(1, (z - start) / (end - start))
        );

        return (
          floor.startHeight +
          (floor.endHeight - floor.startHeight) * t
        );
      }

      const difference = Math.abs(
        floor.height - currentHeight
      );

      if (
        difference < bestDifference &&
        difference < 1.25
      ) {
        bestDifference = difference;
        bestHeight = floor.height;
      }
    }

    return bestHeight;
  }

  mat(color) {
    return new this.THREE.MeshLambertMaterial({ color });
  }

  basic(color) {
    return new this.THREE.MeshBasicMaterial({ color });
  }

  addBox(parent, x, y, z, w, h, d, material) {
    const mesh = new this.THREE.Mesh(
      new this.THREE.BoxGeometry(w, h, d),
      material
    );

    mesh.position.set(x, y, z);
    parent.add(mesh);

    return mesh;
  }

  addNeon(parent, x, y, z, w, h, d, color) {
    return this.addBox(
      parent,
      x,
      y,
      z,
      w,
      h,
      d,
      this.basic(color)
    );
        }
  
  createBuilding(x, z, width, height, depth) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const wallMat = this.mat(0x303d75);
    const darkMat = this.mat(0x20264d);
    const glassMat = new THREE.MeshBasicMaterial({
      color: 0x56eaff,
      transparent: true,
      opacity: 0.72
    });

    this.addBox(
      group, 0, height / 2, 0,
      width, height, depth,
      wallMat
    );

    // FRONT GLASS WINDOWS
    for (let xx = -width / 2 + 1.5; xx < width / 2 - 1; xx += 3) {
      for (let yy = 2; yy < height - 1; yy += 3) {
        this.addBox(
          group, xx, yy, depth / 2 + 0.04,
          1.7, 1.8, 0.08,
          glassMat
        );

        this.addBox(
          group, xx, yy + 0.95, depth / 2 + 0.1,
          1.9, 0.08, 0.12,
          this.basic(0xff55d9)
        );
      }
    }

    // CYAN ROOF TRIM
    this.addNeon(
      group, 0, height + 0.12, 0,
      width + 0.6, 0.22, depth + 0.6,
      0x35eaff
    );

    // PINK SIDE ACCENTS
    for (const side of [-1, 1]) {
      this.addNeon(
        group,
        side * (width / 2 + 0.08),
        height / 2,
        0,
        0.16,
        height,
        0.18,
        0xff48d5
      );
    }

    // ROOFTOP DETAILS
    this.addBox(
      group, 0, height + 0.8, 0,
      width * 0.45, 1.2, depth * 0.35,
      darkMat
    );

    this.addNeon(
      group, 0, height + 1.45, 0,
      width * 0.48, 0.12, 0.12,
      0xffa23d
    );

    group.position.set(x, 0, z);

    group.userData = {
      width,
      height,
      depth,
      solid: true
    };

    this.scene.add(group);
    this.buildings.push(group);

    return group;
  }

  createEnterableBuilding(name, x, z, color, accent, type) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const w = 24;
    const h = 9;
    const d = 20;
    const t = 0.5;
    const upperY = 4.5;

    const wall = this.mat(color);
    const floorMat = this.mat(0x424a78);
    const upperMat = this.mat(0x59618e);
    const darkMat = this.mat(0x252b50);

    // GROUND FLOOR
    this.addBox(
      group, 0, -0.12, 0,
      w, 0.24, d, floorMat
    );

    // REAR WALL
    this.addBox(
      group, 0, h / 2, -d / 2,
      w, h, t, wall
    );

    // SIDE WALLS
    this.addBox(
      group, -w / 2, h / 2, 0,
      t, h, d, wall
    );

    this.addBox(
      group, w / 2, h / 2, 0,
      t, h, d, wall
    );

    // FRONT WALL WITH LARGE OPEN ENTRANCE
    this.addBox(
      group, -8.5, h / 2, d / 2,
      7, h, t, wall
    );

    this.addBox(
      group, 8.5, h / 2, d / 2,
      7, h, t, wall
    );

    this.addBox(
      group, 0, h - 0.4, d / 2,
      10, 0.8, t, wall
    );

    // SECOND FLOOR PLATFORMS
    this.addBox(
      group, -4.5, upperY, 0,
      5, 0.3, 12, upperMat
    );

    this.addBox(
      group, 4.5, upperY, 0,
      5, 0.3, 12, upperMat
    );

    this.addBox(
      group, 0, upperY, -8,
      4, 0.3, 4, upperMat
    );

    // CENTRAL WALKWAY RAMP
    const rampLength = 9;
    const rampRise = upperY;

    const ramp = this.addBox(
      group, 0, upperY / 2, 0.5,
      3, 0.3, rampLength,
      this.mat(0x9b91ad)
    );

    ramp.rotation.x = Math.atan2(rampRise, rampLength);

    // RAMP RAILINGS
    for (const side of [-1, 1]) {
      const rail = this.addBox(
        group,
        side * 1.65,
        upperY / 2 + 0.45,
        0.5,
        0.15,
        0.9,
        rampLength,
        darkMat
      );

      rail.rotation.x = Math.atan2(rampRise, rampLength);
    }

    // COLORFUL BUILDING TRIMS
    this.addNeon(
      group, 0, h - 0.2, d / 2 + 0.32,
      10, 0.18, 0.15,
      accent
    );

    this.addNeon(
      group, 0, 1.1, d / 2 + 0.35,
      9, 0.16, 0.16,
      0xffb347
    );

    // ROOF
    this.addBox(
      group, 0, h + 0.15, 0,
      w + 0.7, 0.3, d + 0.7,
      darkMat
    );

    this.addNeon(
      group, 0, h + 0.35, 0,
      w + 0.9, 0.12, d + 0.9,
      accent
    );

    // ROOFTOP CENTER STRUCTURE
    this.addBox(
      group, 0, h + 1.1, -2,
      8, 1.6, 5,
      wall
    );

    this.addNeon(
      group, 0, h + 1.95, -2,
      8.2, 0.12, 0.15,
      0x44eaff
    );

    // INTERIOR COVER
    for (const side of [-1, 1]) {
      this.addBox(
        group, side * 4.5, 0.8, -4,
        1.8, 1.6, 1.8,
        darkMat
      );

      this.addBox(
        group, side * 4.5, upperY + 0.8, 1,
        1.8, 1.6, 1.8,
        darkMat
      );
    }

    // FLOOR HEIGHT ZONES
    this.floorZones.push(
      {
        minX: x - 7,
        maxX: x - 1.5,
        minZ: z - 6,
        maxZ: z + 6,
        height: upperY
      },
      {
        minX: x + 1.5,
        maxX: x + 7,
        minZ: z - 6,
        maxZ: z + 6,
        height: upperY
      },
      {
        minX: x - 2,
        maxX: x + 2,
        minZ: z - 9,
        maxZ: z - 6,
        height: upperY
      },
      {
        type: "ramp",
        minX: x - 1.7,
        maxX: x + 1.7,
        minZ: z - 4,
        maxZ: z + 5,
        startZ: z + 5,
        endZ: z - 4,
        startHeight: 0,
        endHeight: upperY
      }
    );

    // BUILDING LIGHT
    const light = new THREE.PointLight(accent, 2, 32);
    light.position.set(0, 5, 0);
    group.add(light);

    group.position.set(x, 0, z);

    // WALL COLLIDERS
    const addWallCollider = (localX, localZ, width, depth) => {
      this.buildings.push({
        position: {
          x: x + localX,
          z: z + localZ
        },
        userData: {
          width,
          depth,
          solid: true
        },
        visible: true
      });
    };

    addWallCollider(0, -d / 2, w, t);
    addWallCollider(-w / 2, 0, t, d);
    addWallCollider(w / 2, 0, t, d);
    addWallCollider(-8.5, d / 2, 7, t);
addWallCollider(8.5, d / 2, 7, t);

    group.userData = {
      name,
      enterable: true,
      width: w,
      height: h,
      depth: d,
      doorWidth: 10,
      entrance: {
        x: 0,
        z: d / 2,
        width: 10
      },
      bounds: {
        minX: -w / 2,
        maxX: w / 2,
        minZ: -d / 2,
        maxZ: d / 2
      },
      worldX: x,
      worldZ: z,
      occupied: false
    };

    this.scene.add(group);
    this.buildings.push(group);

    this.landmarks.push({
      name,
      x,
      z,
      group
    });

    return group;
      }
  
  createArenaFloor() {
    const THREE = this.THREE;

    const groundMat = this.mat(0x343b70);
    const laneMat = this.mat(0x252b58);

    // LARGE ARENA GROUND
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      groundMat
    );

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    this.scene.add(ground);

    // MAIN COMBAT LANES
    for (const z of [-35, 0, 35]) {
      this.addBox(
        this.scene, 0, 0.015, z,
        110, 0.08, 12,
        laneMat
      );

      this.addNeon(
        this.scene, 0, 0.08, z - 6,
        110, 0.12, 0.22,
        0x35eaff
      );

      this.addNeon(
        this.scene, 0, 0.08, z + 6,
        110, 0.12, 0.22,
        0xff4bd8
      );
    }

    // CENTRAL COMBAT PLATFORM
    this.addBox(
      this.scene, 0, 0.35, 8,
      28, 0.7, 28,
      this.mat(0x50578e)
    );

    this.addNeon(
      this.scene, 0, 0.75, 8,
      28.5, 0.16, 28.5,
      0xffa13d
    );

    // CENTER PLATFORM DETAILS
    this.addBox(
      this.scene, 0, 1.05, 8,
      10, 0.6, 10,
      this.mat(0x343d78)
    );

    this.addNeon(
      this.scene, 0, 1.38, 8,
      10.3, 0.12, 10.3,
      0x46f5ff
    );

    // SIDE WALKWAYS
    for (const side of [-1, 1]) {
      this.addBox(
        this.scene, side * 30, 0.45, 0,
        10, 0.9, 72,
        this.mat(0x424c83)
      );

      this.addNeon(
        this.scene, side * 30, 0.95, 0,
        10.2, 0.12, 72.2,
        side < 0 ? 0x40eaff : 0xff51d9
      );
    }

    // OUTER ARENA BOUNDARIES
    
for (const x of [-75, 75]) {
  const wall = this.addBox(
    this.scene, x, 3, 0,
    1.2, 6, 150,
    this.mat(0x22284f)
  );

  this.obstacles.push(wall);

  this.addNeon(
    this.scene, x, 6.1, 0,
    1.5, 0.18, 150,
    0x45eaff
  );
}
    

      this.addNeon(
        this.scene, x, 6.1, 0,
        1.5, 0.18, 150,
        0x45eaff
      );
    }

    
for (const z of [-75, 75]) {
  const wall = this.addBox(
    this.scene, 0, 3, z,
    150, 6, 1.2,
    this.mat(0x22284f)
  );

  this.obstacles.push(wall);

  this.addNeon(
    this.scene, 0, 6.1, z,
    150, 0.18, 1.5,
    0xff4bd8
  );
}
  
      this.addNeon(
        this.scene, 0, 6.1, z,
        150, 0.18, 1.5,
        0xff4bd8
      );
    }

    // DECORATIVE FLOOR LIGHTS
    for (const x of [-48, -24, 24, 48]) {
      for (const z of [-48, 48]) {
        this.addNeon(
          this.scene, x, 0.08, z,
          5, 0.12, 0.35,
          0xffc14a
        );
      }
    }
  }

  createArenaCover() {
    const THREE = this.THREE;

    const coverMat = this.mat(0x56628e);
    const darkMat = this.mat(0x292f60);

    // COLORFUL TACTICAL COVER
    const positions = [
      [-43, -25, 7, 2, 3],
      [-25, -15, 5, 2, 5],
      [25, -15, 5, 2, 5],
      [43, -25, 7, 2, 3],
      [-43, 25, 7, 2, 3],
      [-25, 15, 5, 2, 5],
      [25, 15, 5, 2, 5],
      [43, 25, 7, 2, 3],
      [-12, -42, 6, 2, 3],
      [12, -42, 6, 2, 3],
      [-12, 42, 6, 2, 3],
      [12, 42, 6, 2, 3]
    ];

    for (const [x, z, w, h, d] of positions) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        coverMat
      );

      box.position.set(x, h / 2, z);
      this.scene.add(box);
      this.obstacles.push(box);

      this.addNeon(
        this.scene, x, h + 0.08, z,
        w + 0.1, 0.12, d + 0.1,
        0x42eaff
      );
    }

    // SMALL COLORFUL PILLARS
    for (const x of [-55, -18, 18, 55]) {
      for (const z of [-55, 55]) {
        this.addBox(
          this.scene, x, 2, z,
          2, 4, 2,
          darkMat
        );

        this.addNeon(
          this.scene, x, 4.1, z,
          2.2, 0.18, 2.2,
          0xff51d9
        );
      }
    }
  }
  
  createAnimeDecorations() {
    const THREE = this.THREE;

    const colors = [
      0x36eaff,
      0xff4fd8,
      0xffb13b,
      0x8d68ff,
      0x70ffad
    ];

    // FUTURISTIC ENERGY TOWERS
    const towerPositions = [
      [-58, -35],
      [58, -35],
      [-58, 35],
      [58, 35]
    ];

    towerPositions.forEach(([x, z], i) => {
      const color = colors[i % colors.length];
      const tower = new THREE.Group();

      this.addBox(
        tower, 0, 5, 0,
        4, 10, 4,
        this.mat(0x29345f)
      );

      this.addNeon(
        tower, 0, 10.1, 0,
        4.5, 0.35, 4.5,
        color
      );

      this.addNeon(
        tower, 0, 5, 2.08,
        3.5, 0.3, 0.12,
        color
      );

      this.addNeon(
        tower, 0, 5, -2.08,
        3.5, 0.3, 0.12,
        color
      );

      const light = new THREE.PointLight(color, 2.5, 28);
      light.position.set(0, 7, 0);
      tower.add(light);

      tower.position.set(x, 0, z);
      this.scene.add(tower);
    });

    // HOLOGRAM ARCHES
    for (const z of [-24, 24]) {
      this.addBox(
        this.scene, -32, 6, z,
        0.35, 12, 0.35,
        this.basic(0x3beaff)
      );

      this.addBox(
        this.scene, 32, 6, z,
        0.35, 12, 0.35,
        this.basic(0xff4fd8)
      );

      this.addBox(
        this.scene, 0, 12, z,
        64, 0.35, 0.35,
        this.basic(0x8d68ff)
      );
    }

    // FLOATING DECORATIVE PLATFORMS
    const platforms = [
      [-43, -8, 8],
      [43, -8, 8],
      [-43, 8, 8],
      [43, 8, 8]
    ];

    for (const [x, z, size] of platforms) {
      this.addBox(
        this.scene, x, 3, z,
        size, 0.6, size,
        this.mat(0x424d83)
      );

      this.addNeon(
        this.scene, x, 3.35, z,
        size + 0.2, 0.12, size + 0.2,
        0x48eaff
      );
    }

    // COLORFUL ENERGY PILLARS
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 65;
      const z = Math.sin(angle) * 65;

      this.addNeon(
        this.scene, x, 4, z,
        0.5, 8, 0.5,
        colors[i % colors.length]
      );
    }

    // CENTRAL HOLOGRAM MARKER
    const holo = new THREE.Group();

    this.addNeon(
      holo, 0, 0, 0,
      7, 0.12, 7,
      0x40efff
    );

    this.addNeon(
      holo, 0, 2.5, 0,
      0.2, 5, 0.2,
      0xff50da
    );

    const holoLight = new THREE.PointLight(
      0x42eaff,
      3,
      30
    );

    holoLight.position.set(0, 3, 0);
    holo.add(holoLight);

    holo.position.set(0, 1.8, 8);
    this.scene.add(holo);

    // DECORATIVE BRIDGE LIGHTS
    for (const side of [-1, 1]) {
      for (let z = -25; z <= 25; z += 10) {
        this.addNeon(
          this.scene,
          side * 30,
          1.1,
          z,
          0.25,
          1.5,
          2,
          side < 0 ? 0x38eaff : 0xff4fd8
        );
      }
    }
  }

  createArenaLights() {
    const THREE = this.THREE;

    const lights = [
      [-35, 12, -35, 0x35eaff],
      [35, 12, -35, 0xff4fd8],
      [-35, 12, 35, 0xffb13b],
      [35, 12, 35, 0x8d68ff],
      [0, 16, 8, 0x4affed]
    ];

    for (const [x, y, z, color] of lights) {
      const light = new THREE.PointLight(
        color,
        2.2,
        48
      );

      light.position.set(x, y, z);
      this.scene.add(light);
    }
  }
  
  
  createCity() {
    // Reset map collections before building the world
    this.obstacles = [];
    this.buildings = [];
    this.lamps = [];
    this.pickups = [];
    this.landmarks = [];
    this.floorZones = [];

    // Main arena floor and combat lanes
    this.createArenaFloor();

    // TWO SIDE-BY-SIDE ENTERABLE BUILDINGS
    this.createEnterableBuilding(
      "NEON RESIDENCE",
      -13,
      -28,
      0x35477f,
      0x35eaff,
      "cyan"
    );

    this.createEnterableBuilding(
      "VIOLET COMPLEX",
      13,
      -28,
      0x49356f,
      0xff4bd8,
      "pink"
    );

    // Arena structures and visual effects
    this.createArenaCover();
    this.createAnimeDecorations();
    this.createArenaLights();

    // Spawn landmarks for map reference
    this.landmarks.push({
      name: "CENTRAL ARENA",
      x: 0,
      z: 8,
      group: null
    });
  }

  createObstacles() {
    // Keep this method for GameController compatibility.
    // Tactical cover is created and registered in createArenaCover().
    if (!this.obstacles) {
      this.obstacles = [];
    }
  }

  resetWorld() {
    // Reset enemies
    
this.enemies.forEach((enemy, index) => {
  if (enemy && typeof enemy.reset === "function") {
    enemy.reset(index);
  }
});
    
    // Reset player-related world objects
    for (const pickup of this.pickups) {
      if (pickup && pickup.parent) {
        pickup.parent.remove(pickup);
      }
    }

    this.pickups = [];
  }
  
  setCamera(player, bob = 0) {
    if (!this.camera || !player) return;

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
    if (
      !this.renderer ||
      !this.scene ||
      !this.camera
    ) {
      return;
    }

    this.renderer.render(
      this.scene,
      this.camera
    );
  }
}

  
