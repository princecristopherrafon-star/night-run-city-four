
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
  fogDistance: 180
};
    
  }

  init() {
    const THREE = this.THREE;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x171638);
    this.scene.fog = new THREE.FogExp2(0x242044, 0.0045);

    this.camera = new THREE.PerspectiveCamera(
      76,
      innerWidth / innerHeight,
      0.08,
      180
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
this.renderer.toneMappingExposure = 1.0;

    document.getElementById("game").appendChild(
      this.renderer.domElement
    );

    this.textureLoader = new THREE.TextureLoader();

    this.resizeRenderer();

    this.clock = new THREE.Clock();

    this.scene.add(
      new THREE.HemisphereLight(0x9da8ff, 0x34304f, 1.45)
    );

    const moon = new THREE.DirectionalLight(0xb9baff, 0.75);
    moon.position.set(-15, 35, -20);
    this.scene.add(moon);

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
  // Default ground level
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

    // Sloped ramp
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

    // Upper floor: only select when player is
    // already close to that floor's height.
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

    const shells = [
      0x29275a,
      0x263c65,
      0x512d67,
      0x24566a,
      0x65405c
    ];

    const windows = [
      0xffd85c,
      0x5cecff,
      0xff75d8,
      0xb5ff75
    ];

    this.addBox(
      group,
      0,
      height / 2,
      0,
      width,
      height,
      depth,
      this.mat(shells[Math.floor(Math.random() * shells.length)])
    );

    for (let y = 2.2; y < height - 1; y += 3.2) {
      for (
        let xx = -width / 2 + 1;
        xx < width / 2 - 1;
        xx += 2.4
      ) {
        if (Math.random() < 0.24) continue;

        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(1.05, 1.35),
          this.basic(
            windows[Math.floor(Math.random() * windows.length)]
          )
        );

        win.position.set(xx, y, depth / 2 + 0.012);
        group.add(win);
      }
    }

    this.addNeon(
      group,
      0,
      height - 0.25,
      depth / 2 + 0.04,
      width * 0.82,
      0.18,
      0.12,
      0x43eaff
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
const w = 22;
const h = 8;
const d = 18;
const t = 0.45;
const upperY = 4;

  const wall = this.mat(color);
  const floorMat = this.mat(0x55516d);
  const upperMat = this.mat(0x686477);
  const coverMat = this.mat(0x77716b);

  // GROUND FLOOR
  this.addBox(
    group, 0, -0.12, 0,
    w, 0.24, d, floorMat
  );

  // OUTER WALLS
  this.addBox(
    group, 0, h / 2, -d / 2,
    w, h, t, wall
  );

  this.addBox(
    group, -w / 2, h / 2, 0,
    t, h, d, wall
  );

  this.addBox(
    group, w / 2, h / 2, 0,
    t, h, d, wall
  );

  // FRONT WALL - OPEN ENTRANCE
  this.addBox(
    group, -4.5, h / 2, d / 2,
    5, h, t, wall
  );

  this.addBox(
    group, 4.5, h / 2, d / 2,
    5, h, t, wall
  );

  this.addBox(
    group, 0, h - 0.35, d / 2,
    4, 0.7, t, wall
  );

  // SECOND FLOOR - LEFT PLATFORM
  this.addBox(
    group, -4.25, upperY, 0,
    5.5, 0.25, 11,
    upperMat
  );

  // SECOND FLOOR - RIGHT PLATFORM
  this.addBox(
    group, 4.25, upperY, 0,
    5.5, 0.25, 11,
    upperMat
  );

  // SECOND FLOOR - REAR LANDING
  this.addBox(
    group, 0, upperY, -4.85,
    3, 0.25, 1.8,
    upperMat
  );

  // WALKABLE RAMP
  const rampLength = 8.6;
  const rampRise = 3.5;
  const rampAngle = Math.atan2(
    rampRise,
    rampLength
  );

  const ramp = this.addBox(
    group,
    0,
    upperY / 2,
    0.5,
    2.8,
    0.3,
    rampLength,
    this.mat(0x8b8175)
  );

  ramp.rotation.x = rampAngle;

  // RAMP SIDE RAILS
  for (const side of [-1, 1]) {
    const rail = this.addBox(
      group,
      side * 1.45,
      upperY / 2 + 0.45,
      0.5,
      0.15,
      0.9,
      rampLength,
      wall
    );

    rail.rotation.x = rampAngle;
  }

  // UPPER FLOOR COVER
  this.addBox(
    group, -4.5, upperY + 0.8, 0.5,
    1.5, 1.6, 1.5, coverMat
  );

  this.addBox(
    group, 4.5, upperY + 0.8, 0.5,
    1.5, 1.6, 1.5, coverMat
  );

  // GROUND FLOOR COVER
  this.addBox(
    group, -4.5, 0.7, -3.5,
    1.5, 1.4, 1.5, coverMat
  );

  this.addBox(
    group, 4.5, 0.7, -3.5,
    1.5, 1.4, 1.5, coverMat
  );

  // ROOF
  this.addBox(
    group, 0, h + 0.12, 0,
    w + 0.5, 0.25, d + 0.5,
    this.basic(accent)
  );

  // BUILDING SIGN
  this.addBox(
    group, 0, 5.9, d / 2 + 0.28,
    7.2, 0.9, 0.18,
    this.basic(accent)
  );

  // SECOND FLOOR COLLISION / HEIGHT ZONES
  this.floorZones.push(
    {
      minX: x - 6.9,
      maxX: x - 1.5,
      minZ: z - 5.5,
      maxZ: z + 5.5,
      height: upperY
    },
    {
      minX: x + 1.5,
      maxX: x + 6.9,
      minZ: z - 5.5,
      maxZ: z + 5.5,
      height: upperY
    },
    {
      minX: x - 1.5,
      maxX: x + 1.5,
      minZ: z - 5.8,
      maxZ: z - 3.8,
      height: upperY
    },
    {
      type: "ramp",
      minX: x - 1.5,
      maxX: x + 1.5,
      minZ: z - 3.8,
      maxZ: z + 4.8,
      startZ: z + 4.8,
      endZ: z - 3.8,
      startHeight: 0,
      endHeight: upperY
    }
  );

  // LIGHT
  const light = new THREE.PointLight(
    accent,
    1.15,
    19
  );

  light.position.set(0, 4.2, 0);
  group.add(light);

  // POSITION BUILDING
  group.position.set(x, 0, z);

  // INVISIBLE WALL COLLIDERS
  const addWallCollider = (
    localX,
    localZ,
    width,
    depth
  ) => {
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
  addWallCollider(-4.5, d / 2, 5, t);
  addWallCollider(4.5, d / 2, 5, t);

  group.userData = {
    name,
    enterable: true,
    width: w,
    height: h,
    depth: d,
    doorWidth: 4,

    entrance: {
      x: 0,
      z: d / 2,
      width: 4
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
  

  createLamp(x, z, color) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    this.addBox(
      group, 0, 2.6, 0,
      0.18, 5.2, 0.18,
      this.mat(0x45456c)
    );

    this.addBox(
      group, 0, 5.25, 0,
      1.2, 0.18, 0.5,
      this.mat(0x45456c)
    );

    this.addBox(
      group, 0, 5.42, 0,
      0.72, 0.18, 0.36,
      this.basic(color)
    );

    group.position.set(x, 0, z);

    const light = new THREE.PointLight(color, 1.0, 13);
    light.position.set(0, 5.3, 0);
    group.add(light);

    this.scene.add(group);
    this.lamps.push(group);
  }

  createTree(x, z) {
    const group = new this.THREE.Group();

    this.addBox(
      group, 0, 1.1, 0,
      0.65, 2.2, 0.65,
      this.mat(0x80502f)
    );

    this.addBox(
      group, 0, 3, 0,
      2.8, 2, 2.8,
      this.mat(0x37b96c)
    );

    this.addBox(
      group, 0, 4.25, 0,
      2, 1.2, 2,
      this.mat(0x55df83)
    );

    group.position.set(x, 0, z);
    this.scene.add(group);
                }
      
  

  createCity() {
    const THREE = this.THREE;

    this.pickups = [];
    this.landmarks = [];
    this.buildings = [];
    this.obstacles = [];
    this.lamps = [];
    this.floorZones = [];

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      this.mat(0x292b35)
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 12),
      this.mat(0x171a24)
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.025, 14);
    this.scene.add(road);

    for (let x = -40; x <= 40; x += 10) {
      this.addBox(
        this.scene, x, 0.055, 14,
        4, 0.025, 0.16,
        this.basic(0xd5c878)
      );
    }

    this.createEnterableBuilding(
      "ABANDONED WAREHOUSE",
      -18, -8,
      0x454b55, 0xff8b35, "mart"
    );

    this.createEnterableBuilding(
      "MILITARY CONTROL BASE",
      18, -8,
      0x394b5b, 0x42dfff, "office"
    );

    const arenaLight = new THREE.PointLight(
      0x48cfff, 1.2, 65
    );
    arenaLight.position.set(0, 12, 12);
    this.scene.add(arenaLight);
  }
    
    
  
  createObstacles() {
  this.obstacles = [];
  }

  
  resetWorld() {
  this.enemies.forEach((enemy, index) => {
    enemy.reset(index);
  });

  this.obstacles = [];
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

        
