// MODEL - Data lang ni Player, walang design, walang 3D
class Player {
  constructor() {
    this.name = "Runner";
    this.health = 100;
    this.speed = 5;
    this.score = 0;
    this.position = { x: 0, y: 0, z: 0 };
    this.isAlive = true;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.isAlive = false;
    }
  }

  addScore(points) {
    this.score += points;
  }

  reset() {
    this.health = 100;
    this.score = 0;
    this.isAlive = true;
  }
}
