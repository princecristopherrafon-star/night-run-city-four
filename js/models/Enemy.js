// MODEL - Data lang ni Enemy
class Enemy {
  constructor() {
    this.name = "Hunter";
    this.speed = 4;
    this.damage = 20;
    this.position = { x: 10, y: 0, z: 10 };
    this.isChasing = false;
  }

  chase(targetPosition) {
    this.isChasing = true;
    // Dito papasok yung logic ng paghabol
  }

  reset() {
    this.isChasing = false;
    this.position = { x: 10, y: 0, z: 10 };
  }
}
