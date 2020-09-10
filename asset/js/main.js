const Application = PIXI.Application;
const Graphics = PIXI.Graphics;
const loader = PIXI.Loader.shared;

const F = {
	intBetween: function(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
}

class Game {
	static n = 300;
	static mouseRectSize = 80;
	constructor() {
		PIXI.utils.skipHello();
		this.app = new Application({antialias: true, width: 300, height: 300});
		this.mouse = new Rect(this.app.renderer.view.width / 2 - Game.mouseRectSize / 2, this.app.renderer.view.height / 2 - Game.mouseRectSize / 2, Game.mouseRectSize, Game.mouseRectSize);
		this.bounds = new Rect(0, 0, this.app.renderer.view.width, this.app.renderer.view.height);
		this.reset();
		this.state = {
			drawQuadTree: false,
		};
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
			let col = p.inRange ? 0x00ffff : 0xff0fff;
			this.ctx.lineStyle(0).beginFill(col, 0.5).arc(p.x, p.y, 1, 0, Math.PI * 2).endFill();
		}
	}
	drawMouseRect() {
		this.ctx.beginFill(0xffff00, 0.05).drawRect(this.mouse.x, this.mouse.y, Game.mouseRectSize, Game.mouseRectSize).endFill();
	}
	update() {
		// move
		this.points.forEach(p => p.update(this.bounds));
		this.quadTree.update(this.points);
		// pointsInRange
		this.quadTree.query(this.points, this.mouse).forEach(p => {
			p.inRange = true;
		});
		// draw
		this.ctx.clear();
		if (this.state.drawQuadTree) {
			this.quadTree.draw(this.ctx);
		}
		this.drawPoints();
		this.drawMouseRect();
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
		if (window.innerWidth < 400 || window.innerHeight < 400) {
			console.log('this device is kind of small... does it have a mouse?');
		} else {
			$(document).on('mousemove', e => {
				let rect = document.getElementsByTagName('canvas')[0].getBoundingClientRect();
				this.mouse.x = e.clientX - rect.left - Game.mouseRectSize / 2;
				this.mouse.y = e.clientY - rect.top - Game.mouseRectSize / 2;
			});
		}
		// g for draw quadtree
		$(document).on('keypress', e => {
			if (e.which == 71 || e.which == 103) {
				this.state.drawQuadTree = !this.state.drawQuadTree;
			}
		});
	}
}

class Point {
	static random(bounds) { // returns a point at a random position within a given bounds
		return new Point(F.intBetween(bounds.x, bounds.w), F.intBetween(bounds.y, bounds.h));
	}
	constructor(x, y) {
		this.inRange = false;
		this.x = x;
		this.y = y;
		this.vx = Math.random() < 0.5 ? -0.3 : 0.3;
		this.vy = Math.random() < 0.5 ? -0.3 : 0.3;
	}
	handleEdges(bounds) {
		if (this.x < bounds.x) {
			this.x = bounds.x;
			this.vx = -this.vx;
		} else if (this.x > bounds.x + bounds.w) {
			this.x = bounds.x + bounds.w;
			this.vx = -this.vx;
		}
		if (this.y < bounds.y) {
			this.y = bounds.y;
			this.vy = -this.vy;
		} else if (this.y > bounds.y + bounds.h) {
			this.y = bounds.y + bounds.h;
			this.vy = -this.vy;
		}
	}
	update(bounds) {
		this.handleEdges(bounds);
		this.x += this.vx;
		this.y += this.vy;
	}
}

class Rect {
	constructor(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}
	contains(x, y) {
		return this.x <= x && x <= this.x + this.w && this.y <= y && y <= this.y + this.h;
	}
	intersects(range) {
		if (range.x + range.w < this.x || range.x > this.x + this.w || range.y + range.h < this.y || range.y > this.y + this.h) {
			return false;
		}
		return true;
	}
}

class QuadTree {
	constructor(rect) {
		this.bounds = rect;
		this.div = [];
		this.split = false;
		this.obj = [];
		this.capacity = 2;
	}
	draw(ctx) {
		ctx.lineStyle(1, 0x00ffff, 0.04).drawRect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h);
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
		if (!this.bounds.contains(obj.x, obj.y)) {
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
	query(points, range) {
		let arr = [];
		if (!this.bounds.intersects(range)) {
			return arr;
		}
		for (let i = 0; i < points.length; i++) {
			if (range.contains(points[i].x, points[i].y)) {
				arr.push(points[i]);
			}
		}
		if (this.div.length < 1) {
			return arr;
		}
		this.div.forEach(div => {
			arr.concat(div.query(points, range));
		});
		return arr;
	}
	update(points) {
		this.div = [];
		this.split = false;
		this.obj = [];

		points.forEach(p => {
			this.insert(p);
			p.inRange = false;
		});
	}
}

loader
	// .add('sprite alias', 'filepath')
	.load(function(){$(document).ready(function() {game = new Game();});});