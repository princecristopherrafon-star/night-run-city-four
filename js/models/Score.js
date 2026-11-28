// MODEL - Data lang ng Score
class Score {
  constructor() {
    this.current = 0;
    this.high = SaveDAO.getHighScore();
  }

  add(points) {
    this.current += points;
    if (this.current > this.high) {
      this.high = this.current;
      SaveDAO.saveHighScore(this.high);
    }
  }
}
