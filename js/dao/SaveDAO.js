
export default class SaveDAO {
  constructor() {
    this.key = "night-run-best-time";
  }

  getBest() {
    try {
      return Number(localStorage.getItem(this.key)) || 0;
    } catch (error) {
      console.warn("Save unavailable:", error);
      return 0;
    }
  }

  saveBest(seconds) {
    try {
      const current = this.getBest();
      const best = Math.max(current, Number(seconds) || 0);

      localStorage.setItem(this.key, String(best));

      return best;
    } catch (error) {
      console.warn("Save failed:", error);
      return 0;
    }
  }

  clear() {
    try {
      localStorage.removeItem(this.key);
    } catch (error) {
      console.warn("Could not clear save:", error);
    }
  }
}
