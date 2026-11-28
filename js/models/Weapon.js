
export default class Weapon {
  constructor(type) {
    const definitions = {
      pistol: {
        name: "PISTOL",
        magazine: 12,
        damage: 42,
        fireRate: 0.32,
        range: 48,
        pellets: 1,
        spread: 0
      },
      rifle: {
        name: "RIFLE",
        magazine: 30,
        damage: 24,
        fireRate: 0.12,
        range: 65,
        pellets: 1,
        spread: 0
      },
      shotgun: {
        name: "SHOTGUN",
        magazine: 6,
        damage: 19,
        fireRate: 0.78,
        range: 32,
        pellets: 6,
        spread: 0.075
      }
    };

    const definition = definitions[type];
    if (!definition) throw new Error("Unknown weapon: " + type);

    this.type = type;
    this.name = definition.name;
    this.ammo = definition.magazine;
    this.damage = definition.damage;
    this.fireRate = definition.fireRate;
    this.range = definition.range;
    this.pellets = definition.pellets;
    this.spread = definition.spread;
  }

  consume() {
    if (this.ammo <= 0) return false;
    this.ammo -= 1;
    return true;
  }

  addAmmo(amount) {
    this.ammo += amount;
    return this.ammo;
  }
  }
