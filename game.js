const W = 15,
  H = 13,
  T = 16,
  $ = (i) => document.getElementById(i),
  cv = $("c"),
  ctx = cv.getContext("2d");
ctx.imageSmoothingEnabled = false;
/* ---------- save ---------- */
const DS = {
  xp: 0,
  coins: 0,
  hi: [0, 0, 0],
  ach: {},
  blocks: 0,
  wins: 0,
  fx: {},
  vol: [0.6, 0.4],
  arena: 0,
};
function load() {
  const s = JSON.parse(JSON.stringify(DS));
  try {
    const o = JSON.parse(localStorage.getItem("chromablast"));
    if (o && typeof o == "object") {
      for (const k of ["xp", "coins", "blocks", "wins"])
        if (Number.isFinite(o[k]) && o[k] >= 0) s[k] = o[k];
      if (Number.isInteger(o.arena) && o.arena >= 0 && o.arena < 5)
        s.arena = o.arena;
      if (Array.isArray(o.hi))
        s.hi = [0, 1, 2].map((i) => Math.max(0, +o.hi[i] || 0));
      if (Array.isArray(o.vol))
        s.vol = [0, 1].map((i) =>
          Math.min(1, Math.max(0, +o.vol[i] || 0)),
        );
      if (o.ach && typeof o.ach == "object") s.ach = o.ach;
      if (o.fx && typeof o.fx == "object") s.fx = o.fx;
    }
  } catch (e) {}
  return s;
}
let SV = load();
const save = () => {
    try {
      localStorage.setItem("chromablast", JSON.stringify(SV));
    } catch (e) {}
  },
  lv = () => 1 + Math.floor(SV.xp / 150),
  UN = [1, 1, 2, 3, 4],
  avail = () => [0, 1, 2, 3, 4].filter((i) => UN[i] <= lv());
/* ---------- audio ---------- */
let AC, mi;
function ia() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }
  if (AC && AC.state == "suspended") AC.resume();
}
function sfx(f, d = 0.1, t = "square", sl = 0, v = 0.12, m) {
  if (!AC) return;
  const vol = SV.vol[m ? 1 : 0];
  if (!vol) return;
  const n = AC.currentTime,
    o = AC.createOscillator(),
    gn = AC.createGain();
  o.type = t;
  o.frequency.setValueAtTime(f, n);
  if (sl)
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f + sl), n + d);
  gn.gain.setValueAtTime(v * vol, n);
  gn.gain.exponentialRampToValueAtTime(0.001, n + d);
  o.connect(gn);
  gn.connect(AC.destination);
  o.start(n);
  o.stop(n + d);
}
const SC = [
  [0, 4, 7, 9],
  [0, 2, 7, 9],
  [0, 1, 5, 8],
  [0, 3, 6, 9],
  [0, 4, 7, 11],
];
function mus() {
  clearInterval(mi);
  let s = 0;
  mi = setInterval(() => {
    if (S != "play") return;
    const c = SC[th.i];
    sfx(
      110 *
        2 ** ((c[s % 4] + (s % 8 < 4 ? 0 : 5)) / 12) *
        (s % 2 ? 2 : 1),
      0.16,
      "triangle",
      0,
      0.07,
      1,
    );
    s++;
  }, 200);
}
/* ---------- sprites and palette-swap engine ---------- */
let sid = 0;
function spr(m, p) {
  const c = document.createElement("canvas");
  c.width = m[0].length;
  c.height = m.length;
  c.id = "s" + sid++;
  const q = c.getContext("2d");
  m.forEach((r, y) =>
    [...r].forEach((ch, i) => {
      if (p[ch]) {
        q.fillStyle = p[ch];
        q.fillRect(i, y, 1, 1);
      }
    }),
  );
  return c;
}
const PM = [
  "....oooo....",
  "...oHHHHo...",
  "..oHHHHHHo..",
  "..oSSSSSSo..",
  "..oSeSSeSo..",
  "..oSSSSSSo..",
  "...oBBBBo...",
  ".oBBBBBBBBo.",
  ".oSBBBBBBSo.",
  "..oBBBBBBo..",
  "..oLLooLLo..",
  "..ooo..ooo..",
];
const BM = [
  ".......y....",
  "......y.....",
  "....oooo....",
  "..ooKKKKoo..",
  ".oKKhhKKKKo.",
  ".oKhhKKKKKo.",
  "oKKhKKKKKKKo",
  "oKKKKKKKKKKo",
  "oKKKKKKKKKKo",
  ".oKKKKKKKKo.",
  "..ooKKKKoo..",
  "....oooo....",
];
const BP = { o: "#1a1030", S: "#ffd0a0", e: "#101010", L: "#4a4a6a" },
  ck = (H, B) => spr(PM, { ...BP, H, B });
const PS = ck("#2f7bff", "#f2f2ff"),
  ES = {
    rand: ck("#b07020", "#f0b040"),
    safe: ck("#1a8a70", "#40d8b8"),
    hunt: ck("#a01818", "#ff5050"),
    chroma: ck("#6a28c0", "#c070ff"),
  };
const bs = (K, h) => spr(BM, { o: "#1a1030", K, h, y: "#ffd23f" }),
  BS = {
    normal: bs("#3c4470", "#8a93c8"),
    fire: bs("#e8431b", "#ffb070"),
    ice: bs("#3aa0ff", "#d8f4ff"),
    poison: bs("#6cc03a", "#e4ff80"),
    shadow: bs("#6a2fb0", "#c8a0ff"),
    w: bs("#fff", "#fff"),
  };
const PRI = [
    "rainbow",
    "shielded",
    "frozen",
    "cursed",
    "burning",
    "poison",
    "enraged",
  ],
  FXC = new Map();
const hs = (h, s, l) => {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return (
      255 *
      (l -
        s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)))
    );
  };
  return [f(0), f(8), f(4)];
};
function applyPaletteEffect(s, ef, f = 0) {
  const key = s.id + ef + f;
  if (FXC.has(key)) return FXC.get(key);
  const c = document.createElement("canvas");
  c.width = s.width;
  c.height = s.height;
  const q = c.getContext("2d");
  q.drawImage(s, 0, 0);
  const d = q.getImageData(0, 0, c.width, c.height),
    a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue;
    const l = 0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2];
    let o;
    if (l < 45 && ef != "poison") continue;
    if (ef == "poison")
      o =
        l < 45
          ? [l * 0.5 + 20, l * 0.6 + 25, 10]
          : [l * 0.8, l * 0.95 + 10, l * 0.1];
    else if (ef == "frozen") o = [l * 0.4 + 120, l * 0.45 + 145, 255];
    else if (ef == "enraged") o = [l * 1.4 + 30, l * 0.35, l * 0.1];
    else if (ef == "cursed")
      o = l > 130 ? [30, l, l] : [l * 1.1 + 40, 20, l * 1.5 + 40];
    else if (ef == "burning") o = [255, l * 0.8 + 60, l * 0.15];
    else if (ef == "shielded")
      o = [l * 0.55 + 100, l * 0.7 + 110, l * 0.8 + 130];
    else o = hs(((l / 255) * 0.5 + f / 8) % 1, 0.9, 0.55);
    a[i] = o[0];
    a[i + 1] = o[1];
    a[i + 2] = o[2];
  }
  q.putImageData(d, 0, 0);
  FXC.set(key, c);
  return c;
}
const GL = {
  B: "110101110101110",
  F: "111100110100100",
  S: "011100010001110",
  R: "110101110110101",
  H: "101101111101101",
  C: "011100100100011",
  E: "111100110100111",
  I: "111010010010111",
  P: "110101110100100",
  D: "110101101101110",
  O: "111101101101111",
};
const IC = {
    B: "#ff5e5e",
    F: "#ff9a2e",
    S: "#2ec8ff",
    R: "#e8c81e",
    H: "#2ecf88",
    C: "#d03ec0",
    E: "#e02a2a",
    I: "#5ab8e8",
    P: "#7bc02a",
    D: "#8a4cf0",
    O: "#ff5a00",
  },
  POOL = "BBBBBFFFFFSSSRHHCEIIPPDOO";
/* ---------- themes ---------- */
const TH = [
  {
    n: "GREEN GARDEN",
    f: ["#3f8a3a", "#459440"],
    w: "#2a5b2a",
    wh: "#5aa84f",
    b: "#c98a4b",
    bh: "#e6b070",
    m: "#9be86a",
    v: 0.5,
    d: 0.62,
    ex: [],
  },
  {
    n: "FROZEN FACTORY",
    f: ["#9ccbe6", "#8fc0dc"],
    w: "#4a6a8a",
    wh: "#8fb2d4",
    b: "#e6f4ff",
    bh: "#fff",
    m: "#fff",
    v: 1,
    d: 0.6,
    ex: [
      [7, 3],
      [7, 9],
    ],
  },
  {
    n: "LAVA LABYRINTH",
    f: ["#4a2018", "#552419"],
    w: "#2a1210",
    wh: "#7a2c20",
    b: "#8a4a2a",
    bh: "#e0702a",
    m: "#ff8a2a",
    v: -1,
    d: 0.68,
    ex: [
      [3, 6],
      [11, 6],
    ],
  },
  {
    n: "SHADOW TEMPLE",
    f: ["#2b2442", "#312a4c"],
    w: "#150f26",
    wh: "#4a3c78",
    b: "#5a4a8a",
    bh: "#8a76c8",
    m: "#b48aff",
    v: 0,
    d: 0.64,
    ex: [
      [7, 3],
      [7, 9],
      [3, 6],
      [11, 6],
    ],
  },
  {
    n: "CHROMATIC CHAOS",
    c: 1,
    f: ["#444", "#444"],
    w: "#2a2a4a",
    wh: "#8a8ac8",
    b: "#d0d0f0",
    bh: "#fff",
    m: "#fff",
    v: -0.5,
    d: 0.7,
    ex: [
      [5, 5],
      [9, 7],
      [5, 7],
      [9, 5],
    ],
  },
];
TH.forEach((t, i) => (t.i = i));
function bake(t) {
  const mk = (fn) => {
    const c = document.createElement("canvas");
    c.width = c.height = T;
    fn(c.getContext("2d"));
    return c;
  };
  return {
    f: t.f.map((col) =>
      mk((q) => {
        q.fillStyle = col;
        q.fillRect(0, 0, T, T);
        q.fillStyle = "rgba(0,0,0,.1)";
        q.fillRect(0, 0, T, 1);
        q.fillRect(0, 0, 1, T);
      }),
    ),
    w: mk((q) => {
      q.fillStyle = t.w;
      q.fillRect(0, 0, T, T);
      q.fillStyle = t.wh;
      q.fillRect(0, 0, T, 2);
      q.fillRect(0, 0, 2, T);
      q.fillStyle = "rgba(0,0,0,.35)";
      q.fillRect(0, T - 2, T, 2);
      q.fillRect(T - 2, 0, 2, T);
      q.fillStyle = t.wh;
      q.fillRect(5, 5, 6, 6);
      q.fillStyle = t.w;
      q.fillRect(6, 6, 4, 4);
    }),
    b: mk((q) => {
      q.fillStyle = t.b;
      q.fillRect(1, 1, 14, 14);
      q.fillStyle = t.bh;
      q.fillRect(1, 1, 14, 2);
      q.fillRect(1, 1, 2, 14);
      q.fillStyle = "rgba(0,0,0,.3)";
      q.fillRect(1, 13, 14, 2);
      q.fillRect(13, 1, 2, 14);
      q.fillRect(2, 7, 12, 1);
      q.fillRect(8, 2, 1, 5);
      q.fillRect(5, 8, 1, 5);
    }),
  };
}
/* ---------- state ---------- */
const DR = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
  SP = [
    [1, 1],
    [13, 11],
    [13, 1],
    [1, 11],
    [7, 1],
    [7, 11],
  ],
  AIL = ["rand", "safe", "hunt", "chroma"];
let S = "menu",
  mode = 0,
  th,
  tiles,
  g = [],
  round = 1,
  score = 0,
  tm = 0,
  el = 0,
  wave = 1,
  wt = 0,
  spT = 5,
  hudT = 0,
  P = null,
  E = [],
  B = [],
  F = [],
  IT = {},
  PT = [],
  shake = 0,
  dark = 0,
  dkx = 0,
  dky = 0,
  stat = { k: 0, b: 0 },
  keys = new Set(),
  ax = "x",
  last = 0,
  tNow = 0,
  M = [];
const ents = () => [P, ...E],
  tl = (e) => [((e.x + 8) / T) | 0, ((e.y + 8) / T) | 0],
  rnd = (a) => a[(Math.random() * a.length) | 0];
const ent = (tx, ty, o) =>
  Object.assign(
    {
      x: tx * T,
      y: ty * T,
      tx,
      ty,
      hp: 1,
      maxB: 1,
      out: 0,
      range: 2,
      spd: 56,
      st: {},
      inv: 0,
      ammo: 0,
      cd: 1,
      mv: 0,
    },
    o,
  );
function build() {
  g = [];
  for (let y = 0; y < H; y++) {
    g[y] = [];
    for (let x = 0; x < W; x++)
      g[y][x] =
        x == 0 ||
        y == 0 ||
        x == W - 1 ||
        y == H - 1 ||
        (x % 2 == 0 && y % 2 == 0)
          ? 1
          : Math.random() < th.d
            ? 2
            : 0;
  }
  th.ex.forEach(([a, b]) => (g[b][a] = 1));
  SP.forEach(([sx, sy]) => {
    const dx = sx < 7 ? 1 : sx > 7 ? -1 : 0,
      dy = sy < 6 ? 1 : -1;
    [
      [0, 0],
      [dx, 0],
      [0, dy],
      [-dx, 0],
    ].forEach(([a, b]) => {
      const x = sx + a,
        y = sy + b;
      if (
        g[y][x] != 1 ||
        (x > 0 &&
          y > 0 &&
          x < W - 1 &&
          y < H - 1 &&
          !th.ex.some((e) => e[0] == x && e[1] == y) &&
          (x % 2 || y % 2))
      )
        g[y][x] = 0;
    });
  });
}
function newRound() {
  const av = avail();
  th =
    TH[av[(Math.max(av.indexOf(SV.arena), 0) + round - 1) % av.length]];
  th.k = th.k || bake(th);
  tiles = th.k;
  build();
  if (!P) P = ent(1, 1, { p: 1, hp: 3, spd: 62, s: PS, range: 2 });
  else {
    P.x = T;
    P.y = T;
    P.out = 0;
    P.st = {};
    P.inv = 1.5;
  }
  B = [];
  F = [];
  IT = {};
  PT = [];
  E = [];
  wt = 0;
  spT = 5;
  dark = 0;
  const n = mode == 0 ? Math.min(1 + round, 5) : mode == 1 ? 2 : 4;
  for (let i = 0; i < n; i++) spawnE(SP[1 + (i % 5)]);
  M = [...Array(26)].map(() => ({
    x: Math.random() * 240,
    y: Math.random() * 208,
    p: Math.random() * 6,
  }));
}
const dist = (s) => {
  const [a, b] = tl(P);
  return Math.abs(s[0] - a) + Math.abs(s[1] - b);
};
function spawnE(s) {
  s =
    s ||
    SP.slice(1).sort((a, b) => dist(b) - dist(a))[
      (Math.random() * 2) | 0
    ];
  g[s[1]][s[0]] = 0;
  const lim = Math.min(
      4,
      mode == 0 ? 1 + round : mode == 1 ? 2 + (wave >> 1) : 3,
    ),
    ai = AIL[(Math.random() * lim) | 0];
  E.push(
    ent(s[0], s[1], {
      ai,
      spd: Math.min(40 + round * 3 + wave * 2, 72),
      s: ES[ai],
      maxB: 1 + (round > 2 || wave > 3 ? 1 : 0),
      range: 2 + (round > 3 ? 1 : 0),
    }),
  );
}
function regen() {
  for (let i = 0; i < 14; i++) {
    const x = (1 + Math.random() * 13) | 0,
      y = (1 + Math.random() * 11) | 0;
    if (
      !g[y][x] &&
      !B.some((b) => b.tx == x && b.ty == y) &&
      ents().every((e) => {
        const [a, b] = tl(e);
        return Math.abs(a - x) + Math.abs(b - y) > 4;
      })
    ) {
      g[y][x] = 2;
      return;
    }
  }
}
/* ---------- movement and bombs ---------- */
const sol = (e, a, b) =>
    g[b][a] || B.some((z) => z.tx == a && z.ty == b && !z.pass.has(e)),
  free = (e, x, y) =>
    [
      [2, 2],
      [13, 2],
      [2, 13],
      [13, 13],
    ].every(([a, b]) => !sol(e, ((x + a) / T) | 0, ((y + b) / T) | 0)),
  ov = (e, a, b) =>
    e.x + 14 > a * T &&
    e.x + 2 < a * T + T &&
    e.y + 14 > b * T &&
    e.y + 2 < b * T + T;
function step(e, dx, dy, s) {
  const nx = e.x + dx * s,
    ny = e.y + dy * s;
  if (free(e, nx, ny)) {
    e.x = nx;
    e.y = ny;
    return;
  }
  if (dx) {
    const o = Math.round(e.y / T) * T - e.y;
    if (o && Math.abs(o) <= 6) {
      const m = Math.sign(o) * Math.min(s, Math.abs(o));
      if (free(e, e.x, e.y + m)) e.y += m;
    }
  } else {
    const o = Math.round(e.x / T) * T - e.x;
    if (o && Math.abs(o) <= 6) {
      const m = Math.sign(o) * Math.min(s, Math.abs(o));
      if (free(e, e.x + m, e.y)) e.x += m;
    }
  }
}
function blast(tx, ty, r) {
  const c = [[tx, ty]];
  for (const [a, b] of DR)
    for (let i = 1; i <= r; i++) {
      const x = tx + a * i,
        y = ty + b * i,
        v = g[y][x];
      if (v == 1) break;
      c.push([x, y]);
      if (v == 2) break;
    }
  return c;
}
function place(e) {
  const [a, b] = tl(e);
  if (g[b][a] || B.some((q) => q.tx == a && q.ty == b) || e.out >= e.maxB)
    return 0;
  let t = "normal";
  if (e.st.rainbow) t = "rainbow";
  else if (e.ai == "chroma")
    t = rnd(["fire", "ice", "poison", "shadow", "rainbow"]);
  else if (e.ammo > 0) {
    e.ammo--;
    t = e.at;
  }
  const q = {
    tx: a,
    ty: b,
    t: e.p && e.rem ? 8 : 2.2,
    r: e.range + (e.st.enraged ? 1 : 0),
    type: t,
    o: e,
    pass: new Set([e]),
  };
  ents().forEach((z) => {
    if (!z.dead && ov(z, a, b)) q.pass.add(z);
  });
  B.push(q);
  e.out++;
  sfx(300, 0.1, "square", -100);
  if (e.p) ach("FIRST EXPLOSION");
  return 1;
}
function explode(b) {
  B.splice(B.indexOf(b), 1);
  b.o.out--;
  const life = b.type == "poison" ? 2.5 : 0.5;
  blast(b.tx, b.ty, b.r).forEach(([x, y]) => {
    const k = x + y * W,
      was = g[y][x] == 2;
    delete IT[k];
    if (was) {
      g[y][x] = 0;
      stat.b++;
      SV.blocks++;
      if (b.o.p) score += 10;
      if (SV.blocks >= 100) ach("BLOCK BREAKER");
      boom(x * T + 8, y * T + 8, th.bh, 6);
      if (Math.random() < 0.34) IT[k] = rnd(POOL);
    }
    B.forEach((q) => {
      if (q != b && q.tx == x && q.ty == y) q.t = 0;
    });
    F.push({ x, y, t: life, life, type: b.type, hit: new Set() });
  });
  shake = Math.max(shake, 5);
  sfx(180, 0.4, "sawtooth", -130, 0.25);
  if (b.type == "shadow") {
    dark = 2.5;
    dkx = b.tx * T + 8;
    dky = b.ty * T + 8;
  }
}
const FM = {
  normal: [1],
  fire: [1, "burning", 3],
  ice: [0, "frozen", 2.5],
  poison: [0, "poison", 4],
  shadow: [0, "cursed", 5],
};
function addSt(e, n, d) {
  if (e.st.shielded) return;
  e.st[n] = Math.max(e.st[n] || 0, d);
  sfx(500, 0.2, "sine", 300);
  if (!e.p) {
    SV.fx[n] = 1;
    if (Object.keys(SV.fx).length >= 3) ach("COLOR MASTER");
  }
}
function hitFx(e, f) {
  if (e.st.shielded) return;
  const m = FM[f.type == "rainbow" ? rnd(Object.keys(FM)) : f.type];
  if (m[0] && f.life - f.t < 0.5) hurt(e, m[0]);
  if (m[1] && !e.dead) addSt(e, m[1], m[2]);
}
function hurt(e, n, dot) {
  if (e.inv > 0 || e.st.shielded || e.dead) return;
  e.hp -= n;
  e.inv = e.p ? 1.4 : 0.15;
  sfx(e.p ? 120 : 260, 0.25, "sawtooth", -80);
  boom(e.x + 8, e.y + 8, "#fff", 10);
  if (e.hp <= 0) {
    e.dead = 1;
    boom(e.x + 8, e.y + 8, "#ff4e8a", 24);
    if (e.p) over(0);
    else {
      score += 100;
      stat.k++;
      E = E.filter((z) => z != e);
      sfx(420, 0.3, "square", -300);
    }
  } else if (e.p && !dot) {
    e.st = {};
    shake = 6;
  }
}
function give(e, t) {
  if (t == "B") e.maxB = Math.min(6, e.maxB + 1);
  if (t == "F") e.range = Math.min(8, e.range + 1);
  if (t == "S") e.spd = Math.min(e.p ? 105 : 80, e.spd + 9);
  if (t == "R") e.rem = 1;
  if (t == "H") e.st.shielded = 6;
  if (t == "C") e.st.rainbow = 8;
  if (t == "E") e.st.enraged = 8;
  if ("IPDO".includes(t)) {
    e.ammo = 3;
    e.at = { I: "ice", P: "poison", D: "shadow", O: "fire" }[t];
  }
}
function boom(x, y, c, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28,
      s = 20 + Math.random() * 60;
    PT.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      l: 0.4 + Math.random() * 0.3,
      c,
    });
  }
}
function ach(id) {
  if (SV.ach[id]) return;
  SV.ach[id] = 1;
  save();
  toast("ACHIEVEMENT: " + id);
}
let tt;
function toast(m) {
  const t = $("toast");
  t.textContent = m;
  t.style.display = "block";
  clearTimeout(tt);
  tt = setTimeout(() => (t.style.display = "none"), 2200);
}
/* ---------- AI ---------- */
function danger() {
  const d = new Set();
  B.forEach((b) =>
    blast(b.tx, b.ty, b.r).forEach((c) => d.add(c[0] + c[1] * W)),
  );
  F.forEach((f) => d.add(f.x + f.y * W));
  return d;
}
function bfs(sx, sy, goal, max, avoid) {
  const q = [[sx, sy, 0, null]],
    seen = new Set([sx + sy * W]);
  while (q.length) {
    const [x, y, n, f] = q.shift();
    if (n && goal(x, y)) return f;
    if (n >= max) continue;
    for (const dd of DR) {
      const a = x + dd[0],
        b = y + dd[1],
        k = a + b * W;
      if (seen.has(k) || g[b][a] || B.some((z) => z.tx == a && z.ty == b))
        continue;
      if (avoid && avoid.has(k) && !goal(a, b)) continue;
      seen.add(k);
      q.push([a, b, n + 1, f || dd]);
    }
  }
  return null;
}
function want(e) {
  const near = DR.some(([a, b]) => g[e.ty + b][e.tx + a] == 2),
    [pa, pb] = tl(P),
    line =
      (pb == e.ty || pa == e.tx) &&
      Math.abs(pa - e.tx) + Math.abs(pb - e.ty) <= e.range + 1,
    h = e.ai == "hunt" || e.ai == "chroma";
  return (
    (near && Math.random() < (e.ai == "safe" ? 0.2 : 0.6)) ||
    (h && line) ||
    Math.random() < 0.02
  );
}
function think(e) {
  let D = danger();
  if (!D.has(e.tx + e.ty * W) && e.cd <= 0 && e.out < e.maxB && want(e)) {
    const Dh = new Set(D);
    blast(e.tx, e.ty, e.range).forEach((c) => Dh.add(c[0] + c[1] * W));
    if (bfs(e.tx, e.ty, (x, y) => !Dh.has(x + y * W), 6) && place(e)) {
      e.cd = 1.5 + Math.random() * 2;
      D = danger();
    }
  }
  let dir = null;
  if (D.has(e.tx + e.ty * W))
    dir = bfs(e.tx, e.ty, (x, y) => !D.has(x + y * W), 10);
  else if (
    (e.ai == "hunt" || e.ai == "chroma") &&
    P.hp > 0 &&
    !e.st.cursed
  ) {
    const [pa, pb] = tl(P);
    dir = bfs(e.tx, e.ty, (x, y) => x == pa && y == pb, 30, D);
  }
  if (!dir) {
    const ok = DR.filter(([a, b]) => {
      const x = e.tx + a,
        y = e.ty + b;
      return (
        !g[y][x] &&
        !B.some((z) => z.tx == x && z.ty == y) &&
        !D.has(x + y * W)
      );
    });
    if (ok.length)
      dir =
        e.dir &&
        ok.find((o) => o[0] == e.dir[0] && o[1] == e.dir[1]) &&
        Math.random() < 0.7
          ? e.dir
          : rnd(ok);
  }
  if (dir) {
    e.dir = dir;
    e.tx += dir[0];
    e.ty += dir[1];
  }
}
function aiU(e, d) {
  e.cd -= d;
  const sp = e.spd * (e.st.frozen ? 0.3 : 1) * (e.st.enraged ? 1.25 : 1),
    cx = e.tx * T,
    cy = e.ty * T,
    dx = cx - e.x,
    dy = cy - e.y,
    dd = Math.abs(dx) + Math.abs(dy),
    s = sp * d;
  e.mv = dd > 0;
  if (dd <= s) {
    e.x = cx;
    e.y = cy;
    think(e);
  } else {
    e.x += Math.sign(dx) * s;
    e.y += Math.sign(dy) * s;
  }
}
/* ---------- update ---------- */
function upd(d) {
  el += d;
  if (mode == 2) tm -= d;
  if (mode == 1 && el >= 60) ach("SURVIVOR");
  ents().forEach((e) => {
    if (e.dead) return;
    e.inv -= d;
    for (const k in e.st) if ((e.st[k] -= d) <= 0) delete e.st[k];
    if (e.st.poison || e.st.burning) {
      e.dot = (e.dot || 0) + d;
      if (e.dot > 1.4) {
        e.dot = 0;
        if (!(e.p && e.hp < 2)) hurt(e, 1, 1);
      }
    }
  });
  if (P.hp > 0) {
    const k = keys,
      dx =
        (k.has("ArrowRight") || k.has("KeyD") ? 1 : 0) -
        (k.has("ArrowLeft") || k.has("KeyA") ? 1 : 0);
    let dy =
        (k.has("ArrowDown") || k.has("KeyS") ? 1 : 0) -
        (k.has("ArrowUp") || k.has("KeyW") ? 1 : 0),
      ddx = dx;
    if (ddx && dy) {
      if (ax == "x") dy = 0;
      else ddx = 0;
    }
    const c = P.st.cursed ? -1 : 1,
      sp =
        P.spd *
        (P.st.frozen ? 0.3 : 1) *
        (P.st.enraged ? 1.2 : 1) *
        (P.st.rainbow ? 1.3 : 1);
    P.mv = ddx || dy;
    if (P.mv) step(P, ddx * c, dy * c, sp * d);
  }
  B.forEach((b) => {
    b.t -= d;
    b.pass.forEach((z) => {
      if (z.dead || !ov(z, b.tx, b.ty)) b.pass.delete(z);
    });
  });
  let more = 1,
    cnt = 0;
  while (more) {
    more = 0;
    for (const b of [...B])
      if (B.includes(b) && b.t <= 0) {
        explode(b);
        cnt++;
        more = 1;
      }
  }
  if (cnt > 1) ach("CHAIN MASTER");
  F.forEach((f) => {
    f.t -= d;
    ents().forEach((e) => {
      if (e.dead || f.hit.has(e)) return;
      const [a, b] = tl(e);
      if (a == f.x && b == f.y) {
        f.hit.add(e);
        hitFx(e, f);
      }
    });
  });
  F = F.filter((f) => f.t > 0);
  if (S != "play") return;
  E.forEach((e) => aiU(e, d));
  ents().forEach((e) => {
    if (e.dead) return;
    const [a, b] = tl(e),
      k = a + b * W,
      t = IT[k];
    if (t) {
      delete IT[k];
      give(e, t);
      if (e.p) {
        score += 25;
        sfx(700, 0.12, "square", 500);
        boom(a * T + 8, b * T + 8, IC[t], 8);
      }
    }
  });
  if (mode && P.hp > 0) {
    spT -= d;
    if (spT <= 0) {
      spT = mode == 1 ? Math.max(5, 11 - wave) : 3;
      if (E.length < (mode == 1 ? Math.min(6, 3 + wave) : 4)) {
        spawnE();
        if (mode == 1) wave++;
      }
      regen();
    }
  }
  if (mode == 0 && !E.length && P.hp > 0) {
    if (!wt) {
      wt = 1.6;
      score += 150 * round;
      SV.wins++;
      if (SV.wins >= 10) ach("BOMBER CHAMPION");
      sfx(800, 0.4, "square", 400);
    }
    wt -= d;
    if (wt <= 0) {
      wt = 0;
      if (round >= 5) over(1);
      else {
        round++;
        newRound();
        toast("ROUND " + round);
      }
    }
  }
  if (mode == 2 && tm <= 0) over(1);
  PT.forEach((p) => {
    p.x += p.vx * d;
    p.y += p.vy * d;
    p.l -= d;
  });
  PT = PT.filter((p) => p.l > 0);
  shake = Math.max(0, shake - 30 * d);
  dark = Math.max(0, dark - d);
  hudT -= d;
  if (hudT < 0) {
    hudT = 0.15;
    hud();
  }
}
function motes(d) {
  M.forEach((m) => {
    m.y += th.v * 10 * d;
    m.x += (th.v ? Math.sin(tNow + m.p) * 6 : 8) * d;
    m.x = (m.x + 240) % 240;
    m.y = (m.y + 208) % 208;
  });
}
function hud() {
  $("hud").innerHTML =
    `<span>LIVES<b>${P.hp}</b></span><span>SCORE<b>${score}</b></span><span>${mode ? "WAVE" : "ROUND"}<b>${mode ? wave : round + "/5"}</b></span><span>FOES<b>${E.length}</b></span><span>BOMBS<b>${P.maxB - P.out}/${P.maxB}</b></span><span>RANGE<b>${P.range}</b></span><span>TIME<b>${Math.max(0, (mode == 2 ? tm : el) | 0)}</b></span>`;
  $("fxl").textContent = [
    ...Object.keys(P.st).map(
      (k) => k.toUpperCase() + " " + Math.ceil(P.st[k]),
    ),
    P.rem ? "REMOTE" : "",
    P.ammo ? P.at.toUpperCase() + " BOMB x" + P.ammo : "",
  ]
    .filter(Boolean)
    .join("  ");
}
/* ---------- render ---------- */
const FC = {
  normal: ["#fff", "#ffd23f", "#ff7b00"],
  fire: ["#ffffd0", "#ff9a2e", "#e02a1a"],
  ice: ["#fff", "#bfefff", "#3aa0ff"],
  poison: ["#ffee55", "#9be53a", "#3a9a2a"],
  shadow: ["#e0c8ff", "#8a4cf0", "#2a1050"],
};
function draw() {
  ctx.save();
  if (shake > 0)
    ctx.translate(
      Math.round((Math.random() - 0.5) * shake),
      Math.round((Math.random() - 0.5) * shake),
    );
  ctx.fillStyle = "#000";
  ctx.fillRect(-8, -8, 256, 224);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = g[y][x];
      if (v == 1) ctx.drawImage(tiles.w, x * T, y * T);
      else {
        if (th.c) {
          ctx.fillStyle = `hsl(${(tNow * 30 + (x + y) * 14) % 360},40%,${(x + y) % 2 ? 30 : 34}%)`;
          ctx.fillRect(x * T, y * T, T, T);
        } else ctx.drawImage(tiles.f[(x + y) % 2], x * T, y * T);
        if (v == 2) ctx.drawImage(tiles.b, x * T, y * T);
      }
    }
  for (const k in IT) {
    const x = (k % W) * T,
      y = ((k / W) | 0) * T + Math.round(Math.sin(tNow * 5 + +k)),
      t = IT[k];
    ctx.fillStyle = "#1a1030";
    ctx.fillRect(x + 2, y + 2, 12, 12);
    ctx.fillStyle = IC[t];
    ctx.fillRect(x + 3, y + 3, 10, 10);
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.fillRect(x + 3, y + 3, 10, 2);
    ctx.fillStyle = "#fff";
    [...GL[t]].forEach((c, i) => {
      if (c == "1")
        ctx.fillRect(x + 6 + (i % 3), y + 5 + ((i / 3) | 0), 1, 1);
    });
  }
  B.forEach((b) => {
    const s =
      b.type == "rainbow"
        ? applyPaletteEffect(BS.normal, "rainbow", ((tNow * 10) | 0) % 8)
        : b.t < 0.7 && ((b.t * 16) | 0) % 2
          ? BS.w
          : BS[b.type];
    ctx.drawImage(s, b.tx * T + 2, b.ty * T + 3 + (((b.t * 5) | 0) % 2));
  });
  for (const f of F) {
    const c =
        f.type == "rainbow"
          ? [0, 1, 2].map(
              (i) =>
                `hsl(${(tNow * 400 + i * 60 + f.x * 30) % 360},95%,${[88, 60, 45][i]}%)`,
            )
          : FC[f.type],
      o = ((tNow * 20) | 0) % 2;
    ctx.globalAlpha =
      f.type == "poison" && f.life - f.t > 0.5
        ? 0.5
        : Math.min(1, f.t * 4);
    ctx.fillStyle = c[2];
    ctx.fillRect(f.x * T + o, f.y * T + o, T - 2 * o, T - 2 * o);
    ctx.fillStyle = c[1];
    ctx.fillRect(f.x * T + 3, f.y * T + 3, 10, 10);
    ctx.fillStyle = c[0];
    ctx.fillRect(f.x * T + 5, f.y * T + 5, 6, 6);
  }
  ctx.globalAlpha = 1;
  [...E, P]
    .sort((a, b) => a.y - b.y)
    .forEach((e) => {
      if (e.dead || (e.inv > 0 && e.p && ((tNow * 14) | 0) % 2)) return;
      const ef = PRI.find((k) => e.st[k]);
      let s = e.s;
      if (ef)
        s = applyPaletteEffect(
          s,
          ef,
          ef == "rainbow" ? ((tNow * 10) | 0) % 8 : 0,
        );
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.fillRect(Math.round(e.x) + 3, Math.round(e.y) + 13, 10, 2);
      ctx.drawImage(
        s,
        Math.round(e.x) + 2,
        Math.round(e.y) + 1 - (e.mv ? ((tNow * 12) | 0) % 2 : 0),
      );
    });
  PT.forEach((p) => {
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x | 0, p.y | 0, 2, 2);
  });
  ctx.fillStyle = th.m;
  ctx.globalAlpha = 0.7;
  M.forEach((m) => ctx.fillRect(m.x | 0, m.y | 0, 1, 1));
  ctx.globalAlpha = 1;
  if (dark > 0) {
    const gr = ctx.createRadialGradient(dkx, dky, 6, dkx, dky, 64);
    gr.addColorStop(0, "rgba(20,0,40," + Math.min(0.8, dark) + ")");
    gr.addColorStop(1, "rgba(20,0,40,0)");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 240, 208);
  }
  ctx.restore();
}
/* ---------- screens ---------- */
const ovl = (h) => ($("ov").innerHTML = h);
function start(m) {
  ia();
  sfx(600, 0.08);
  mode = m;
  round = 1;
  score = 0;
  el = 0;
  tm = 90;
  wave = 1;
  stat = { k: 0, b: 0 };
  P = null;
  S = "play";
  newRound();
  ovl("");
  hud();
  mus();
}
function menu() {
  S = "menu";
  mode = 0;
  round = 1;
  P = null;
  wave = 1;
  clearInterval(mi);
  newRound();
  hud();
  const a = avail();
  ovl(`<h1 id="logo">${[..."CHROMABLAST"].map((c, i) => `<span style="--i:${i}">${c}</span>`).join("")}</h1><p>Place. Escape. Explode. Dominate.</p><p>LV ${lv()}  COINS ${SV.coins}</p>
<button onclick="start(0)">CLASSIC ARENA (BEST ${SV.hi[0]})</button><button onclick="start(1)">SURVIVAL (BEST ${SV.hi[1]})</button><button onclick="start(2)">TIME ATTACK (BEST ${SV.hi[2]})</button>
<button onclick="arena()">ARENA: ${TH[a.includes(SV.arena) ? SV.arena : 0].n} (${a.length}/5)</button><button onclick="how()">HOW TO PLAY</button><button onclick="sett('menu()')">SETTINGS</button><p class="developer-credit">DEVELOPED BY: RAFAEL JAYCIEH J. DAYOT</p>`);
}
function arena() {
  ia();
  const a = avail();
  SV.arena = a[(a.indexOf(SV.arena) + 1) % a.length] || 0;
  save();
  menu();
}
function how() {
  ovl(
    `<h2>HOW TO PLAY</h2><p>Move: WASD or arrows. Bomb: SPACE. Remote blast: Z. Pause: P.<br>Blow up blocks, grab power-ups, trap foes. Your own blasts hurt you.<br>Ice freezes, poison and fire burn, shadow reverses controls. Colors show who is affected.<br>Gain levels to open arenas.<br>${Object.keys(SV.ach).length}/6 achievements.<br>An original game made with canvas.</p><button onclick="menu()">BACK</button>`,
  );
}
function sett(b) {
  ovl(
    `<h2>SETTINGS</h2><label>SOUND<br><input type="range" min="0" max="100" value="${SV.vol[0] * 100}" oninput="SV.vol[0]=this.value/100;save();sfx(500,.1)"></label><label>MUSIC<br><input type="range" min="0" max="100" value="${SV.vol[1] * 100}" oninput="SV.vol[1]=this.value/100;save()"></label><button onclick="${b}">BACK</button>`,
  );
}
function pm() {
  ovl(
    `<h2>PAUSED</h2><button onclick="pause()">RESUME</button><button onclick="start(mode)">RESTART</button><button onclick="sett('pm()')">SETTINGS</button><button onclick="menu()">MAIN MENU</button>`,
  );
}
function pause() {
  if (S == "play") {
    S = "pause";
    pm();
  } else if (S == "pause") {
    S = "play";
    ovl("");
  }
}
function over(w) {
  S = "over";
  SV.xp += Math.floor(score / 5) + stat.k * 10;
  const c = Math.floor(score / 50),
    nb = score > SV.hi[mode];
  SV.coins += c;
  if (nb) SV.hi[mode] = score;
  save();
  sfx(w ? 800 : 100, 0.6, w ? "square" : "sawtooth", w ? 400 : -60);
  ovl(
    `<h2>${w ? "VICTORY" : "DEFEAT"}</h2><p>SCORE ${score}${nb ? " NEW BEST" : ""}<br>FOES ${stat.k}  BLOCKS ${stat.b}<br>TIME ${el | 0}s  COINS +${c}</p><button onclick="start(${mode})">PLAY AGAIN</button><button onclick="menu()">MAIN MENU</button>`,
  );
}
/* ---------- input ---------- */
function act() {
  if (S == "play" && P.hp > 0) place(P);
}
function rem() {
  if (S == "play" && P.rem)
    B.filter((z) => z.o == P).forEach((z) => (z.t = 0));
}
function press(k) {
  keys.add(k);
  if (k == "ArrowLeft" || k == "ArrowRight" || k == "KeyA" || k == "KeyD")
    ax = "x";
  else if (/^(Arrow|Key[WS])/.test(k)) ax = "y";
  if (k == "Space") act();
  if (k == "KeyZ") rem();
}
addEventListener("keydown", (e) => {
  ia();
  if (S == "play" && /^(Space|Arrow)/.test(e.code)) e.preventDefault();
  if (e.code == "KeyP" || e.code == "Escape") {
    pause();
    return;
  }
  if (keys.has(e.code)) return;
  press(e.code);
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => {
  keys.clear();
  if (S == "play") pause();
});
document.querySelectorAll("[data-k]").forEach((b) => {
  const k = b.dataset.k;
  b.onpointerdown = (e) => {
    e.preventDefault();
    ia();
    if (k == "Escape") pause();
    else press(k);
  };
  b.onpointerup =
    b.onpointerleave =
    b.onpointercancel =
      () => keys.delete(k);
});
function rs() {
  const hh =
    $("hud").offsetHeight +
    $("fxl").offsetHeight +
    $("pad").offsetHeight +
    40;
  let s = Math.min(innerWidth / 244, (innerHeight - hh) / 212);
  s = s >= 2 ? Math.floor(s) : Math.max(0.5, s);
  cv.style.width = 240 * s + "px";
  cv.style.height = 208 * s + "px";
}
addEventListener("resize", rs);
function loop(t) {
  requestAnimationFrame(loop);
  const d = Math.min(0.05, (t - last) / 1000 || 0);
  last = t;
  tNow = t / 1000;
  if (S == "play") upd(d);
  else if (S != "over") motes(d);
  if (S == "play") motes(d);
  draw();
}
menu();
rs();
setTimeout(rs, 400);
requestAnimationFrame(loop);