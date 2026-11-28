
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

getGroundHeight(x, z, currentHeight = 0) {
  let bestHeight = 0;
  let bestDifference = Math.abs(currentHeight);

  for (const floor of this.floorZones) {
    if (
      x >= floor.minX &&
      x <= floor.maxX &&
      z >= floor.minZ &&
      z <= floor.maxZ
    ) {
      const difference = Math.abs(
        floor.height - currentHeight
      );

      if (difference < bestDifference) {
        bestDifference = difference;
        bestHeight = floor.height;
      }
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
   
    const w = 14, h = 7, d = 12, t = 0.45;
    const wall = this.mat(color);

    const furniture = this.mat(
      type === "hospital" ? 0xe7edfa :
      type === "school" ? 0xe5b84e :
      type === "arcade" ? 0x49316d :
      type === "mart" ? 0x4c987d : 0x986b4e
    );

    // Floor and walls with an open entrance.
    this.addBox(group, 0, -0.12, 0, w, 0.24, d, this.mat(0x55516d));
    this.addBox(group, 0, h / 2, -d / 2, w, h, t, wall);
    this.addBox(group, -w / 2, h / 2, 0, t, h, d, wall);
    this.addBox(group, w / 2, h / 2, 0, t, h, d, wall);

    this.addBox(group, -4.5, h / 2, d / 2, 5, h, t, wall);
    this.addBox(group, 4.5, h / 2, d / 2, 5, h, t, wall);
    this.addBox(group, 0, h - 0.35, d / 2, 4, 0.7, t, wall);

    this.addBox(
      group, 0, h + 0.12, 0,
      w + 0.5, 0.25, d + 0.5,
      this.basic(accent)
    );

    this.addBox(
      group, 0, 5.9, d / 2 + 0.28,
      7.2, 0.9, 0.18,
      this.basic(accent)
    );

    if (type === "mart") {
      for (const xx of [-3.5, 0, 3.5]) {
        this.addBox(group, xx, 1.0, -1.4, 1.0, 2.0, 5.5, furniture);

        for (let shelf = 0; shelf < 3; shelf++) {
          this.addBox(
            group,
            xx,
            0.65 + shelf * 0.55,
            -1.4,
            1.08,
            0.08,
            5.6,
            this.basic([0xffd84a, 0x5cecff, 0xff79d8][shelf])
          );
        }
      }

      this.addBox(group, 0, 0.65, 4.0, 5.2, 1.3, 0.9, furniture);

    } else if (type === "school") {
      for (let row = 0; row < 2; row++) {
        for (const xx of [-3.2, 0, 3.2]) {
          this.addBox(
            group, xx, 0.65, row * -2.6,
            1.5, 0.35, 1.0, furniture
          );

          this.addBox(
            group, xx, 1.15, row * -2.6 - 0.1,
            1.5, 0.7, 0.12, furniture
          );
        }
      }

      this.addBox(
        group, 0, 1.8, -4.4,
        5.5, 0.25, 0.25,
        this.basic(accent)
      );

    } else if (type === "hospital") {
      for (const xx of [-3.5, 3.5]) {
        this.addBox(
          group, xx, 0.65, -1.5,
          2.7, 0.55, 4, furniture
        );

        this.addBox(
          group, xx, 1.1, -3,
          2.7, 0.65, 0.18,
          this.basic(0xffffff)
        );
      }

      this.addBox(group, 0, 0.55, 3.5, 3, 1, 1, furniture);

      this.addNeon(
        group, 0, 3.4, -d / 2 - 0.32,
        2.1, 0.35, 0.12, 0xff334f
      );

      this.addNeon(
        group, 0, 3.4, -d / 2 - 0.32,
        0.35, 2.1, 0.12, 0xff334f
      );

    } else if (type === "arcade") {
      for (let i = -1; i <= 1; i++) {
        this.addBox(
          group, i * 3.5, 1.25, -3,
          1.7, 2.5, 1.1, furniture
        );

        this.addNeon(
          group, i * 3.5, 1.7, -2.38,
          1.25, 0.8, 0.08,
          [0xff4fd8, 0x42eaff, 0xffd84a][i + 1]
        );
      }

      this.addBox(group, 0, 0.65, 3.4, 5, 1.2, 1.1, furniture);

    } else {
      for (const xx of [-3, 0, 3]) {
        this.addBox(
          group, xx, 0.55, -1,
          1.2, 0.15, 1.2, furniture
        );

        this.addBox(
          group, xx, 1, -1,
          0.12, 0.9, 0.12, furniture
        );
      }
    }

    const light = new THREE.PointLight(accent, 1.15, 19);
    light.position.set(0, 4.2, 0);
    group.add(light);

    group.position.set(x, 0, z);
    // INVISIBLE WALL COLLIDERS
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

// Back wall
addWallCollider(0, -d / 2, w, t);

// Left wall
addWallCollider(-w / 2, 0, t, d);

// Right wall
addWallCollider(w / 2, 0, t, d);

// Front wall - left side
addWallCollider(-4.5, d / 2, 5, t);

// Front wall - right side
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
    this.landmarks.push({ name, x, z, group });

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

      obstacle.position.set(
        rand(-6, 6),
        0.6,
        -20 - i * 13
      );

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
      

        
