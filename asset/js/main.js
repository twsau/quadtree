const Application = PIXI.Application;
const Graphics = PIXI.Graphics;
const loader = PIXI.Loader.shared;

const F = {
	intBetween: function(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
}

class Game {
	static n = 100;
	constructor() {
		PIXI.utils.skipHello();
		this.app = new Application({antialias: true, width: 300, height: 300});

		this.bounds = new Rect(0, 0, this.app.renderer.view.width, this.app.renderer.view.height);

		this.reset();

		this.ctx = new Graphics();
		this.app.stage.addChild(this.ctx);

		this.uiEvents();

		$('#loading').remove();
		document.body.appendChild(this.app.view);
		this.app.ticker.add(delta => this.update(delta));
	}
	drawPoints() {
		for (let i = 0; i < this.points.length; i++) {
			let p = this.points[i];
			this.ctx.lineStyle(0).beginFill(0xff0fff, 0.5).arc(p.x, p.y, 1, 0, Math.PI * 2).endFill();
		}
	}
	update() {
		this.ctx.clear();
		this.quadTree.draw(this.ctx);
		this.drawPoints();
	}
	reset() {
		this.points = [];
		this.quadTree = new QuadTree(this.bounds);

		for (let i = 0; i < Game.n; i++) {
			this.points.push(Point.random(this.bounds));
			this.quadTree.insert(Point.random(this.bounds));
		}
	}
	uiEvents() {
		$(document).on('click', '#reset', e => {
			this.reset();
		});
	}
}

class Point {
	static random(bounds) { // returns a point at a random position within a given bounds
		return new Point(F.intBetween(bounds.x, bounds.w), F.intBetween(bounds.y, bounds.h));
	}
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}

class Rect {
	constructor(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}
	contain(x, y) {
		return this.x <= x && x <= this.x + this.w && this.y <= y && y <= this.y + this.h;
	}
}

class QuadTree {
	constructor(rect) {
		this.bounds = rect;
		this.div = [];
		this.split = false;
		this.obj = [];
		this.capacity = 4;
	}
	draw(ctx) {
		ctx.lineStyle(1, 0xffffff, 0.2).drawRect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h);
		this.div.forEach(div => div.draw(ctx));
	}
	subdivide() {
		let x = this.bounds.x;
		let y = this.bounds.y;
		let w = this.bounds.w / 2;
		let h = this.bounds.h / 2;
		let tl = new Rect(x, y, w, h);
		let tr = new Rect(x + w, y, w, h);
		let bl = new Rect(x, y + h, w, h );
		let br = new Rect(x + w, y + h, w, h);
		this.div.push(new QuadTree(tl), new QuadTree(tr), new QuadTree(bl), new QuadTree(br));
		this.split = true;
	}
	insert(obj) {
		if (!this.bounds.contain(obj.x, obj.y)) {
			return false;
		}
		if (this.obj.length < this.capacity) {
			this.obj.push(obj);
			return true;
		} else if (!this.split) {
			this.subdivide();
		}
		this.div.forEach(div => {
			if (div.insert(obj)) {
				return true;
			}
		});
	}
}

loader
	// .add('sprite alias', 'filepath')
	.load(function(){$(document).ready(function() {game = new Game();});});