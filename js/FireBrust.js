import {getPitch, getLoudness } from "./core.js";

let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");
let rgb = null; 
let loudness = null; 

let particles = [];

class Particles {
  constructor(x, y, dx, dy, size, color) {
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this.size = size;
    this.color = color;
    this.opacity = 1;
  }
  update() {
    this.x += this.dx;
    this.y += this.dy;
    this.opacity -= 0.02; 
  }
  draw() {
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function createExplosion(loudness) {
    let numParticles = Math.min(100, Math.floor(loudness / 2));

    let x = Math.random() * window.innerWidth * 0.3;
    let y = Math.random() * window.innerHeight;

    let p = getPitch().pitch;
    if (p < 130) {
      x += 0;
    }
    else if (p < 400) {
      x += window.innerWidth * 0.3;
    }
    else {
      x+= window.innerWidth * 0.6;      
    }

    for (let i = numParticles * 0.5; i < numParticles; i++) {
        let size = Math.random() * loudness * 4;
        let dx = (Math.random() - 0.5) * 5;
        let dy = (Math.random() - 0.5) * 5;
        //let colors = ["#FF4500", "#FF6347", "#FF8C00", "#FFD700"];
        //let color = colors[Math.floor(Math.random() * colors.length)];
        let color = "rgb(" + (255-rgb[0]) + ", " + (255-rgb[1]) + ", " + (255-rgb[2]) + ")";

        let firework = new Particles(x, y, dx, dy, size, color);
        particles.push(firework);
    }
}

let lastTime = 0; 

function animate() {
    rgb = getPitch().color;

    loudness = getLoudness();
    ctx.fillStyle = "rgb(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ")";

    ctx.fillRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle) => {
        particle.update();
        particle.draw();
    });
    if(Date.now() - lastTime > 10) {
      particles = particles.filter((particle) => particle.opacity > 0.10); // Remove faded particles
      lastTime = Date.now(); 
    }
}

export function loopFireWork() {
    rgb = getPitch().color;
    loudness = getLoudness();
    if(loudness > 15) {
      createExplosion(loudness);
    }
    animate();
    if(window.activemodule == "firework")
    	window.animationFrameId = requestAnimationFrame(loopFireWork);
}

