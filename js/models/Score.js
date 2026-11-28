
export default class Score {
  constructor() {
    this.reset();
    this.best = 0;
  }

  reset() {
    this.elapsed = 0;
    this.finished = false;
  }

  update(dt) {
    if (!this.finished) {
      this.elapsed += dt;
    }
  }

  finish() {
    this.finished = true;
    this.best = Math.max(this.best, this.elapsed);
    return this.best;
  }

  get seconds() {
    return Math.floor(this.elapsed);
  }
}
