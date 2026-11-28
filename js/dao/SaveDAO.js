// DAO - Siya lang pwede mag-save at mag-load
class SaveDAO {
  static saveHighScore(score) {
    const oldScore = this.getHighScore();
    if (score > oldScore) {
      localStorage.setItem("nightrun_highscore", score);
      return true;
    }
    return false;
  }

  static getHighScore() {
    return parseInt(localStorage.getItem("nightrun_highscore") || "0");
  }
}
