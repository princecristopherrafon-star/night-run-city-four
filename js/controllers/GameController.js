// CONTROLLER - UTAK ng game
class GameController {
  constructor() {
    this.player = new Player();
    this.enemy = new Enemy();
    this.score = new Score();
    this.isPlaying = false;
  }

  startGame() {
    this.isPlaying = true;
    this.player.reset();
    console.log("Game Started!");
  }

  gameOver() {
    this.isPlaying = false;
    console.log("Game Over! Score: " + this.score.current);
  }
}
