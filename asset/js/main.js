// aliases ==================================================

const Application = PIXI.Application;
const Container = PIXI.Container;
const Graphics = PIXI.Graphics;
const loader = PIXI.Loader.shared;

// object classes ==================================================

class Game {
	constructor() {
		PIXI.utils.skipHello();
		this.app = new Application({antialias: true, width: 400, height: 400});
		this.bounds = Rect.init(0, 0, this.app.renderer.view.width, this.app.renderer.view.height);

		this.qt = new QuadTree(this.bounds);
		this.canvas = new Graphics();
		this.app.stage.addChild(this.canvas);

		this.bubbles = [];
		for (let i = 0; i < CONFIG.maxBubbles; i++) {
			let bubble = new Bubble(
				RANDOM.intBetween(this.bounds.x, this.bounds.w),
				RANDOM.intBetween(this.bounds.y, this.bounds.h),
				RANDOM.intBetween(2, 2)
			);
			this.bubbles.push(bubble);
			this.app.stage.addChild(bubble);
		}

		$('#loading').remove();
		document.body.appendChild(this.app.view);
		this.app.ticker.add(delta => this.update(delta));
	}
	update() {
		this.canvas.clear();
		const {bubbles, bounds, qt} = this;
		qt.update(bubbles, this.canvas);
		bubbles.forEach(a => {
			let arr = qt.query(bubbles, new Rect(
				a.x - a.r,
				a.y - a.r,
				a.x + a.r,
				a.y + a.r
			));
			arr.forEach(b => {
				if (a != b) {
					if (Circle.intersects(a, b)) {
						const angle = Math.atan2(a.y - b.y, a.x - b.x);
						const {x: ax, y: ay, vx: avx, vy: avy} = a;
						const {x: bx, y: by, vx: bvx, vy: bvy} = b;
						a.x = bx + (a.r + b.r) * Math.cos(angle);
						a.y = by + (a.r + b.r) * Math.sin(angle);
						a.vx = bvx;
						a.vy = bvy;
						b.vx = avx;
						b.vy = avy;
					}
				}
			});
			a.update(bounds);
		});
	}
}

class Bubble extends Container {
	constructor(x, y, r) {
		super();
		Object.assign(this, Circle.init(x, y, r), {vx: RANDOM.coinToss() ? 0.3 : -0.3, vy: RANDOM.coinToss() ? 0.3 : -0.3});
		this.sprite = Bubble.#init.sprite(r);
		this.addChild(this.sprite);
	}
	update(bounds) {
		this.#move();
		this.#handleEdges(bounds);
	}
	#handleEdges(bounds) {
		if (this.x - this.r < bounds.x) {
			this.x = bounds.x + this.r;
			this.vx = -this.vx;
		} else if (this.x + this.r > bounds.x + bounds.h) {
			this.x = bounds.x + bounds.h - this.r;
			this.vx = -this.vx;
		}
		if (this.y - this.r < bounds.y) {
			this.y = bounds.y + this.r;
			this.vy = -this.vy;
		} else if (this.y + this.r > bounds.y + bounds.h) {
			this.y = bounds.y + bounds.h - this.r;
			this.vy = -this.vy;
		}
	}
	#move() {
		// this.vy += 0.9;
		// this.vy *= 0.99;
		this.x += this.vx;
		this.y += this.vy;
	}
	static #init = {
		sprite: r => {
			let sprite = new Graphics();
			sprite.beginFill(0xff00ff, 1).arc(0, 0, r, 0, Math.PI * 2).endFill();
			return sprite;
		}
	}
}


// abstract physics classes ==================================================

class Circle {
	static init(x, y, r) {
		return {x: x, y: y, r: r};
	}
	static contains(point) {

	}
	static intersects(circleA, circleB) {
		return (Math.hypot(circleA.x - circleB.x, circleA.y - circleB.y) < circleA.r + circleB.r);
	}
}

class Rect {
	constructor(x, y, w, h) {
		Object.assign(this, {x: x, y: y, w: w, h: h});
	}
	static init(x, y, w, h) {
		return {x: x, y: y, w: w, h: h};
	}
	static contains(point, rect) {
		return (rect.x <= point.x && point.x <= rect.x + rect.w && rect.y <= point.y && point.y <= rect.y + rect.h);
	}
	static intersects(rectA, rectB) {
		return (rectA.x + rectA.w < rectB.x || rectA.x > rectB.x + rectB.w || rectA.y + rectA.h < rectB.y || rectA.y > rectB.y + rectB.h) ? false : true;
	}
}

class Vector {
	constructor(x, y) {
		Object.assign(this, {x: x, y: y});
	}
	static init(x, y) {
		return {x: x, y: y};
	}
}

class QuadTree {
	constructor(rect) {
		Object.assign(this, rect, {div: [], split: false, children: [], capacity: CONFIG.qt.capacity, visible: CONFIG.qt.visible});
	}
	update(objects, ctx) {
		this.div = [];
		this.children = [];
		this.split = false;
		objects.forEach(object => {this.insert(object);});
		if (this.visible) {
			this.draw(ctx);
		}
	}
	draw(ctx) {
		const {x, y, w, h} = this;
		ctx.lineStyle(1, 0x00ffff, 0.1).drawRect(x, y, w, h).endFill();
		this.div.forEach(div => div.draw(ctx));
	}
	insert(object) {
		const {x, y, w, h, div, split, children, capacity} = this;
		if (!Rect.contains(new Vector(object.x, object.y), new Rect(x, y, w, h))) {
			return false;
		}
		if (children.length < capacity) {
			children.push(object);
			return true;
		} else if (!split) {
			this.subdivide();
		}
		div.forEach(d => {
			if (d.insert(object)) {
				return true;
			}
		});
	}
	subdivide() {
		const {x, y} = this;
		const w = this.w / 2;
		const h = this.h / 2;
		this.div.push(
			new QuadTree(Rect.init(x, y, w, h)),
			new QuadTree(Rect.init(x + w, y, w, h)),
			new QuadTree(Rect.init(x, y + h, w, h)),
			new QuadTree(Rect.init(x + w, y + h, w, h))
		);
		this.split = true;
	}
	query(objects, range) {
		const {x, y, w, h} = this;
		let arr = [];
		if (!Rect.intersects(range, new Rect(x, y, w, h))) {
			return arr;
		}
		for (let i = 0; i < objects.length; i++) {
			let o = objects[i];
			if (Rect.contains(new Vector(o.x, o.y), range)) {
				arr.push(o);
			}
		}
		if (this.div.length < 1) {
			return arr;
		}
		this.div.forEach(d => {
			arr.concat(d.query(objects, range));
		});
		return arr;
	}
}

// reference objects ==================================================

const CONFIG = {
	maxBubbles: 80,
	qt: {
		capacity: 2,
		visible: true
	}
};

const RANDOM = {
	coinToss: function() {
		return Math.random() < 0.5;
	},
	color: function() {
		var letters = '0123456789ABCDEF';
		  var color = '0x';
		  for (var i = 0; i < 6; i++) {
		    color += letters[Math.floor(Math.random() * 16)];
		  }
		  return color;
	},
	intBetween: function(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	},
	floatBetween: function(min, max, places = 2) {
		return (Math.random() * (min - max) + max).toFixed(places)
	}
}

// loader ==================================================

loader
	// .add('sprite alias', 'filepath')
	.load(function(){$(document).ready(function() {game = new Game();});});