/* Hero background: a small self-exciting spatio-temporal point process.
   Background points ignite at random; each ignition has a decaying
   probability of triggering nearby "offspring" points shortly after —
   the same excitation/decay logic behind a Hawkes intensity kernel. */

(() => {
  const canvas = document.getElementById('field');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W, H, DPR;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const EMBER = '193, 89, 42';
  const MOSS = '107, 125, 95';

  const MU = 0.012;        // background (immigrant) rate per frame
  const BRANCHING = 0.55;  // expected offspring per ignition
  const DECAY = 0.985;     // temporal decay of a point's excitation influence
  const MAX_POINTS = 90;

  let points = [];

  function spawn(x, y, gen) {
    points.push({
      x, y,
      age: 0,
      life: 160 + Math.random() * 140,
      gen,                 // generation: 0 = background, >0 = triggered
      r: gen === 0 ? 2.4 : 1.6,
      color: gen === 0 ? EMBER : MOSS,
      spawned: false
    });
  }

  function seed() {
    for (let i = 0; i < 14; i++) {
      spawn(Math.random() * W, Math.random() * H, 0);
    }
  }
  seed();

  function step() {
    // background ignitions
    if (Math.random() < MU * 60 / 60 && points.length < MAX_POINTS) {
      spawn(Math.random() * W, Math.random() * H, 0);
    }

    for (const p of points) {
      p.age++;

      // mid-life: chance to trigger nearby offspring, decaying with age
      if (!p.spawned && p.age > 20 && p.age < 70 && points.length < MAX_POINTS) {
        const intensity = BRANCHING * Math.pow(DECAY, p.age);
        if (Math.random() < intensity * 0.06) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 30 + Math.random() * 70;
          spawn(
            Math.min(W, Math.max(0, p.x + Math.cos(angle) * dist)),
            Math.min(H, Math.max(0, p.y + Math.sin(angle) * dist)),
            p.gen + 1
          );
          if (Math.random() < 0.7) p.spawned = true;
        }
      }
    }

    points = points.filter(p => p.age < p.life);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (const p of points) {
      const t = p.age / p.life;
      const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      const ringR = p.r + t * 26;

      ctx.beginPath();
      ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${p.color}, ${alpha * 0.18})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${alpha * 0.9})`;
      ctx.fill();
    }
  }

  function loop() {
    step();
    draw();
    requestAnimationFrame(loop);
  }

  if (reduceMotion) {
    // static, denser scatter, no animation loop
    points = [];
    for (let i = 0; i < 40; i++) {
      const gen = Math.random() < 0.4 ? 0 : 1;
      points.push({
        x: Math.random() * W, y: Math.random() * H,
        age: 40, life: 200, gen,
        r: gen === 0 ? 2.4 : 1.6,
        color: gen === 0 ? EMBER : MOSS
      });
    }
    draw();
  } else {
    loop();
  }
})();
