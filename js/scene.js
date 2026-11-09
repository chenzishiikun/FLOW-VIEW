/* ==========================================================================
   scene.js · Three.js 场景（本轮只有：透视网格 + W0 数字孪生 → 点云溶解 → 轮廓/管轴）
   相机由 OrbitControls 接管用户操作，rig.js 在其上叠加底噪漂移
   ========================================================================== */
window.BL = window.BL || {};
(function (BL) {
  'use strict';

  var U = BL.util, DEG = U.DEG;
  var S = {};

  /* ---------- 溶解材质：逐顶点延迟的「浮现 / 散开」 ---------- */
  var V_DISS = [
    'attribute float aRnd;',
    'uniform float uIn; uniform float uOut; uniform float uSpread;',
    'varying float vA;',
    'void main(){',
    '  float k = aRnd * 0.58 + 0.06;',
    '  float vin  = smoothstep(k, k + 0.26, uIn);',
    '  float vout = smoothstep(k, k + 0.30, uOut);',
    '  vA = vin * (1.0 - vout);',
    '  vec3 p = position;',
    '  vec3 dir = normalize(p + vec3(0.0001, 0.0001, 0.0001));',
    '  p += dir * vout * uSpread * (0.35 + aRnd);',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
    '}'
  ].join('\n');

  function matLines(color, spread) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uIn: { value: 0 }, uOut: { value: 0 }, uAlpha: { value: 1 },
        uSpread: { value: spread }
      },
      vertexShader: V_DISS,
      fragmentShader: 'uniform vec3 uColor; uniform float uAlpha; varying float vA;' +
        'void main(){ gl_FragColor = vec4(uColor, vA * uAlpha); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
  }

  var V_POINTS = [
    'attribute float aRnd;',
    'uniform float uIn; uniform float uOut; uniform float uSpread;',
    'uniform float uSize; uniform float uScale;',
    'varying float vA;',
    'void main(){',
    '  float k = aRnd * 0.58 + 0.06;',
    '  float vin  = smoothstep(k, k + 0.26, uIn);',
    '  float vout = smoothstep(k, k + 0.30, uOut);',
    '  vA = vin * (1.0 - vout);',
    '  vec3 p = position;',
    '  vec3 dir = normalize(p + vec3(0.0001, 0.0001, 0.0001));',
    '  p += dir * vout * uSpread * (0.35 + aRnd);',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    '  gl_PointSize = uSize * uScale / max(0.001, -mv.z);',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  function matPoints(color, size, spread) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uIn: { value: 0 }, uOut: { value: 0 }, uAlpha: { value: 1 },
        uSpread: { value: spread }, uSize: { value: size }, uScale: { value: 1766 }
      },
      vertexShader: V_POINTS,
      fragmentShader: 'uniform vec3 uColor; uniform float uAlpha; varying float vA;' +
        'void main(){ float r = length(gl_PointCoord - vec2(0.5));' +
        'float a = smoothstep(0.5, 0.10, r); gl_FragColor = vec4(uColor, vA * a * uAlpha); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
  }

  /* ---------- 几何生成器 ---------- */
  function rndAttr(n, seed) {
    var a = new Float32Array(n);
    for (var i = 0; i < n; i++) a[i] = U.hash1(i * 0.731 + 3.1, seed);
    return new THREE.BufferAttribute(a, 1);
  }
  function linesFrom(pos, color, spread) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aRnd', rndAttr(pos.length / 3, 5.1));
    var o = new THREE.LineSegments(g, matLines(color, spread || 0.28));
    o.frustumCulled = false;
    return o;
  }
  function pointsFrom(pos, color, size, spread) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aRnd', rndAttr(pos.length / 3, 9.3));
    var o = new THREE.Points(g, matPoints(color, size, spread || 0.30));
    o.frustumCulled = false;
    return o;
  }
  function shellLines(R, L, a0, aLen, segX, segA) {
    var p = [], i, j;
    for (i = 0; i <= segX; i++) {
      var x = -L / 2 + L * i / segX;
      for (j = 0; j < segA; j++) {
        var b1 = a0 + aLen * j / segA, b2 = a0 + aLen * (j + 1) / segA;
        p.push(x, R * Math.cos(b1), R * Math.sin(b1), x, R * Math.cos(b2), R * Math.sin(b2));
      }
    }
    for (j = 0; j <= segA; j += 2) {
      var a = a0 + aLen * j / segA, y = R * Math.cos(a), z = R * Math.sin(a);
      for (i = 0; i < segX; i++) p.push(-L / 2 + L * i / segX, y, z, -L / 2 + L * (i + 1) / segX, y, z);
    }
    return p;
  }
  function shellPoints(R, L, a0, aLen, n, seed) {
    var arr = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var u = U.hash1(i, seed), v = U.hash1(i, seed + 7), w = U.hash1(i, seed + 13);
      var x = -L / 2 + L * u, a = a0 + aLen * v, rr = R * (0.975 + 0.025 * w);
      arr[i * 3] = x; arr[i * 3 + 1] = rr * Math.cos(a); arr[i * 3 + 2] = rr * Math.sin(a);
    }
    return arr;
  }
  function edgesFrom(geo) { return Array.prototype.slice.call(geo.attributes.position.array); }
  function translateArr(arr, x, y, z) {
    for (var i = 0; i < arr.length; i += 3) { arr[i] += x; arr[i + 1] += y; arr[i + 2] += z; }
    return arr;
  }

  /* ---------- 04/05 通用：粗线 + 分组淡入 ---------- */
  function lineObj(pos, color, opacity, opts) {
    opts = opts || {};
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (opts.colors) geo.setAttribute('color', new THREE.Float32BufferAttribute(opts.colors, 3));
    var m = new THREE.LineBasicMaterial({
      color: opts.colors ? 0xFFFFFF : color,
      vertexColors: !!opts.colors,
      transparent: true, opacity: opacity === undefined ? 1 : opacity,
      depthWrite: false, depthTest: opts.depthTest !== false,
      blending: THREE.AdditiveBlending
    });
    var o = new THREE.LineSegments(geo, m);
    o.frustumCulled = false;
    return o;
  }

  /* 把一组材质登记为「同一透明度组」，之后统一乘 alpha */
  function tagMats(g) {
    if (g.userData.mats) return;
    var mats = [];
    g.traverse(function (o) {
      var m = o.material;
      if (m && m.transparent && m.type !== 'ShaderMaterial' && !m.isShaderMaterial) {
        if (mats.indexOf(m) < 0) {
          m.userData.base = m.opacity;
          mats.push(m);
        }
      }
    });
    g.userData.mats = mats;
  }
  function setFade(g, a) {
    if (!g) return;
    tagMats(g);
    var mats = g.userData.mats;
    for (var i = 0; i < mats.length; i++) mats[i].opacity = mats[i].userData.base * a;
    g.visible = a > 0.002;
  }
  function lineCircle(cx, cy, r, seg, z) {
    var p = [];
    for (var i = 0; i < seg; i++) {
      var a1 = Math.PI * 2 * i / seg, a2 = Math.PI * 2 * (i + 1) / seg;
      p.push(cx + r * Math.cos(a1), cy + r * Math.sin(a1), z || 0,
        cx + r * Math.cos(a2), cy + r * Math.sin(a2), z || 0);
    }
    return p;
  }
  function boxEdges(w, h, d) {
    return edgesFrom(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)));
  }


  /* ---------- 透视蓝网格（数据网格，不是房间地板） ---------- */
  function buildGrid() {
    var S0 = 46, step = 2.3, pos = [], fade = [], v, i;
    function f(x, z) { return Math.pow(U.clamp01(1 - Math.sqrt(x * x + z * z) / 52), 1.7); }
    for (v = -S0; v <= S0 + 0.001; v += step) {
      for (i = -S0; i < S0 - 0.001; i += step) {
        var a = i, b = i + step;
        pos.push(a, 0, v, b, 0, v); fade.push(f(a, v), f(b, v));
        pos.push(v, 0, a, v, 0, b); fade.push(f(v, a), f(v, b));
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aFade', new THREE.Float32BufferAttribute(fade, 1));
    S.gridMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0x2C8FB8) }, uAlpha: { value: 0 } },
      vertexShader: 'attribute float aFade; varying float vF;' +
        'void main(){ vF = aFade; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uColor; uniform float uAlpha; varying float vF;' +
        'void main(){ gl_FragColor = vec4(uColor, vF * uAlpha * 0.85); }',
      transparent: true, depthWrite: false
    });
    S.grid = new THREE.LineSegments(geo, S.gridMat);
    S.grid.position.y = -2.05;
    S.grid.frustumCulled = false;
    S.scene.add(S.grid);
  }

  /* ---------- W0 数字孪生：与定格帧同构的简约装配 ----------
     尺寸按定格帧反推（1920 宽 ≈ 7.99 世界单位，即 1 单位 ≈ 240 px）：
     管轴 y≈530px → 世界 y≈+0.04；管外径 ≈60px → R≈0.125；
     直管 150→1590px → L≈5.99、中心 x≈-0.375；弯头在右端下折。
     ------------------------------------------------------------- */
  var TW = { L: 5.99, R: 0.125, x: -0.375, y: 0.042 };
  var ELBOW_R = 0.45;

  function ringPos(R, x, seg) {
    var p = [];
    for (var i = 0; i < seg; i++) {
      var a1 = Math.PI * 2 * i / seg, a2 = Math.PI * 2 * (i + 1) / seg;
      p.push(x, R * Math.cos(a1), R * Math.sin(a1), x, R * Math.cos(a2), R * Math.sin(a2));
    }
    return p;
  }
  /* 右端 90° 下折弯头的中心线点（局部坐标） */
  function elbowPoints(L, r, drop) {
    var pts = [];
    for (var k = 0; k <= 12; k++) {
      var a = k / 12 * Math.PI / 2;
      pts.push(new THREE.Vector3(L / 2 + r * Math.sin(a), -r + r * Math.cos(a), 0));
    }
    pts.push(new THREE.Vector3(L / 2 + r, -r - drop, 0));
    return pts;
  }

  function buildTwin() {
    var g = new THREE.Group(), L = TW.L, R = TW.R;
    g.position.set(TW.x, TW.y, 0);
    S.twinMats = [];

    /* 管身：线框 + 点云（细管，贴合定格帧） */
    g.add(linesFrom(shellLines(R, L, 0, Math.PI * 2, 10, 28), 0x9BEEFF, 0.18));
    g.add(pointsFrom(shellPoints(R, L, 0, Math.PI * 2, 2800, 3.1), 0xD8FBFF, 0.012, 0.17));

    /* 卡箍（管上两道） */
    g.add(linesFrom(ringPos(R * 1.55, 0.62, 22), 0x9BEEFF, 0.18));
    g.add(linesFrom(ringPos(R * 1.55, 1.05, 22), 0x9BEEFF, 0.18));

    /* 悬吊电子箱 */
    g.add(linesFrom(translateArr(edgesFrom(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.44, 1.03, 0.56))), 0.448, -0.715, 0.02), 0x9BEEFF, 0.26));

    /* 数码屏：点阵示意（绿），对应定格帧里的「1234」 */
    var scr = [];
    for (var i = 0; i < 160; i++) {
      var u = U.hash1(i, 12.7), v = U.hash1(i, 31.3);
      scr.push(0.50 - 0.25 + 0.50 * u, -0.654 - 0.135 + 0.27 * v, 0.33);
    }
    g.add(pointsFrom(scr, 0x5BE0A6, 0.011, 0.09));

    /* 阀体（骑在管上）+ 阀杆 + 手轮 */
    g.add(linesFrom(translateArr(edgesFrom(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.62, 0.30, 0.36))), -1.205, 0.00, 0.02), 0x9BEEFF, 0.24));
    g.add(linesFrom([-1.205, 0.15, 0.02, -1.205, 0.50, 0.02], 0x9BEEFF, 0.20));
    g.add(linesFrom(translateArr(edgesFrom(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.26, 0.05, 0.18))), -1.205, 0.53, 0.02), 0x9BEEFF, 0.22));

    /* 右端弯头 + 下行直管 */
    var tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(elbowPoints(L, ELBOW_R, 0.85)), 26, R, 8, false);
    g.add(linesFrom(edgesFrom(new THREE.WireframeGeometry(tube)), 0x9BEEFF, 0.22));

    g.traverse(function (o) {
      if (o.material && o.material.uniforms && o.material.uniforms.uIn) S.twinMats.push({ mat: o.material, base: 1 });
    });
    S.twinMats.forEach(function (m) { m.base = m.mat.uniforms.uAlpha.value; });
    g.visible = false;
    S.scene.add(g);
    S.twin = g;
  }

  /* ---------- 溶解后留下的发光轮廓 + 管轴 ---------- */
  function buildGhost() {
    var g = new THREE.Group(), L = TW.L, R = TW.R;
    g.position.set(TW.x, TW.y, 0);
    S.ghostMats = [];

    function addLS(pos, color, op) {
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      var m = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      var o = new THREE.LineSegments(geo, m);
      o.frustumCulled = false;
      g.add(o);
      S.ghostMats.push({ mat: m, base: op });
    }

    /* 4 条母线 */
    [30, 150, 210, 330].forEach(function (deg) {
      var a = deg * DEG, y = R * Math.cos(a), z = R * Math.sin(a);
      addLS([-L / 2, y, z, L / 2, y, z], 0x9BEEFF, 0.85);
    });
    /* 两端 + 中部圆环 */
    [-L / 2, 0, L / 2].forEach(function (x) { addLS(ringPos(R, x, 44), 0xAFF3FF, 0.80); });
    /* 阀体 / 电子箱：只留极简框架，交代「实物还在」 */
    addLS(translateArr(edgesFrom(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.62, 0.30, 0.36))), -1.205, 0.00, 0.02), 0x9BEEFF, 0.50);
    addLS(translateArr(edgesFrom(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.44, 1.03, 0.56))), 0.448, -0.715, 0.02), 0x9BEEFF, 0.46);
    /* 弯头下行（中心线 + 两侧母线） */
    var cp = elbowPoints(L, ELBOW_R, 0.85);
    var e = [], i2;
    for (i2 = 0; i2 < cp.length - 1; i2++) {
      e.push(cp[i2].x, cp[i2].y + R, 0, cp[i2 + 1].x, cp[i2 + 1].y + R, 0);
      e.push(cp[i2].x, cp[i2].y - R, 0, cp[i2 + 1].x, cp[i2 + 1].y - R, 0);
    }
    addLS(e, 0x9BEEFF, 0.70);

    /* 管轴：虚线，永远在 */
    var ax = [];
    for (var x = -L / 2 - 0.55; x < L / 2 + 0.40; x += 0.30) ax.push(x, 0, 0, x + 0.17, 0, 0);
    addLS(ax, 0xAFF3FF, 0.95);

    g.visible = false;
    S.scene.add(g);
    S.ghost = g;
  }


  /* ==========================================================================
     02：流速粒子（抛物线型面；静水时原地不动）
     ========================================================================== */
  var V_FLOW = [
    'attribute vec3 aBase; attribute float aRnd;',
    'uniform float uT; uniform float uFlow; uniform float uL;',
    'uniform float uScale; uniform float uSize; uniform float uRi;',
    'varying float vA;',
    'void main(){',
    '  float r = length(aBase.yz) / uRi;',
    '  float vv = max(0.04, 1.0 - r * r);',
    '  float x = aBase.x + uFlow * vv * uT * 1.25;',
    '  x = mod(x + uL * 0.5, uL) - uL * 0.5;',
    '  vec4 mv = modelViewMatrix * vec4(x, aBase.y, aBase.z, 1.0);',
    '  vA = (0.26 + 0.74 * vv) * (0.55 + 0.45 * aRnd);',
    '  gl_PointSize = uSize * uScale / max(0.001, -mv.z) * (0.7 + 0.6 * vv);',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  function buildFlow() {
    var N = 1200, L = SEC.L, Ri = SEC.Ri;
    var base = new Float32Array(N * 3), rnd = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      var u = U.hash1(i, 3.7), v = U.hash1(i, 11.3), w = U.hash1(i, 21.1);
      var rr = Ri * 0.97 * Math.sqrt(v), a = u * Math.PI * 2;
      base[i * 3] = -L / 2 + L * w;
      base[i * 3 + 1] = rr * Math.cos(a);
      base[i * 3 + 2] = rr * Math.sin(a) * 0.92;
      rnd[i] = U.hash1(i, 41.7);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(base, 3));
    geo.setAttribute('aBase', new THREE.Float32BufferAttribute(base, 3));
    geo.setAttribute('aRnd', new THREE.Float32BufferAttribute(rnd, 1));

    S.flowMat = new THREE.ShaderMaterial({
      uniforms: {
        uT: { value: 0 }, uFlow: { value: 0 },
        uL: { value: L }, uRi: { value: Ri },
        uScale: { value: 1766 }, uSize: { value: 0.0085 },
        uColor: { value: new THREE.Color(0x9BEEFF) }, uAlpha: { value: 0 }
      },
      vertexShader: V_FLOW,
      fragmentShader: 'uniform vec3 uColor; uniform float uAlpha; uniform float uFlow; varying float vA;' +
        'void main(){ vec2 q = gl_PointCoord - vec2(0.5);' +
        'q.x *= mix(1.0, 0.34, uFlow);' +
        'float a = smoothstep(0.5, 0.02, length(q)); a *= a;' +
        'gl_FragColor = vec4(uColor, vA * a * uAlpha * 0.72); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    var pts = new THREE.Points(geo, S.flowMat);
    pts.frustumCulled = false;
    pts.position.set(TW.x, TW.y, 0);
    pts.visible = false;
    S.scene.add(pts);
    S.flow = pts;
  }

  /* ==========================================================================
     03：探头 A/B、声路（W 4 段 / V 2 段）、反射点、脉冲
     ========================================================================== */
  var SND = {
    xA: -1.00, xB: 1.00,
    W: [], V: [],          // 声路折线（局部坐标）
    P: {},                 // 反射点
    mode: 'w', uP: 0, dir: 1, hits: 0
  };

  /* 折线 → 线段几何 + 归一化弧长属性 aT */
  function pathSegs(pts, sub) {
    var seg = [], total = 0, i;
    for (i = 0; i < pts.length - 1; i++) {
      var d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      seg.push(d); total += d;
    }
    var pos = [], aT = [], acc = 0;
    for (i = 0; i < pts.length - 1; i++) {
      for (var k = 0; k < sub; k++) {
        var t0 = k / sub, t1 = (k + 1) / sub;
        var ax = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t0;
        var ay = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t0;
        var bx = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t1;
        var by = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t1;
        pos.push(ax, ay, 0, bx, by, 0);
        aT.push((acc + seg[i] * t0) / total, (acc + seg[i] * t1) / total);
      }
      acc += seg[i];
    }
    return { pos: pos, aT: aT, total: total };
  }

  /* ==========================================================================
     02：半剖管几何（切开近侧 z>0 半周）+ 满管水体
     ========================================================================== */
  var SEC = { L: TW.L, R: TW.R, Ri: TW.R * 0.86 };   // 内径 0.1075，壁厚约 4 px（基准机位）

  /* 圆弧（a0..a1）→ 线段数组 */
  function arcPairs(r, x, a0, a1, seg) {
    var p = [];
    for (var i = 0; i < seg; i++) {
      var b1 = a0 + (a1 - a0) * i / seg, b2 = a0 + (a1 - a0) * (i + 1) / seg;
      p.push(x, r * Math.cos(b1), r * Math.sin(b1), x, r * Math.cos(b2), r * Math.sin(b2));
    }
    return p;
  }

  /* 半周曲面（局部：管轴 = x，圆周角从 +y 起算） */
  function surfHalf(r, L, a0, aLen, segX, segA) {
    var pos = [], idx = [], i, j;
    for (i = 0; i <= segX; i++) {
      var x = -L / 2 + L * i / segX;
      for (j = 0; j <= segA; j++) {
        var a = a0 + aLen * j / segA;
        pos.push(x, r * Math.cos(a), r * Math.sin(a));
      }
    }
    for (i = 0; i < segX; i++) {
      for (j = 0; j < segA; j++) {
        var k = i * (segA + 1) + j;
        idx.push(k, k + 1, k + segA + 1, k + 1, k + segA + 2, k + segA + 1);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    return g;
  }

  function buildSection() {
    var g = new THREE.Group(), L = SEC.L, R = SEC.R, Ri = SEC.Ri;
    g.position.set(TW.x, TW.y, 0);
    var A0 = Math.PI, A1 = Math.PI * 2;      // z <= 0 的远侧半周
    S.sec = { group: g, mats: [] };

    function addLines(pos, col, sc, base) {
      var o = linesFrom(pos, col, sc);
      o.material.uniforms.uIn.value = 1;
      o.material.uniforms.uOut.value = 0;
      o.material.uniforms.uAlpha.value = base;
      S.sec.mats.push({ mat: o.material, base: base });
      g.add(o);
    }
    /* 远侧外壳 / 内壁（半周） */
    addLines(shellLines(R, L, A0, Math.PI, 12, 12), 0x8FE8FA, 0.24, 0.55);
    addLines(shellLines(Ri, L, A0, Math.PI, 12, 12), 0x5BC3DC, 0.10, 0.26);
    /* 切边：上下各两条（外 / 内），成对即为壁厚 */
    addLines([-L / 2, R, 0, L / 2, R, 0, L / 2, Ri, 0, -L / 2, Ri, 0,
      -L / 2, -R, 0, L / 2, -R, 0, L / 2, -Ri, 0, -L / 2, -Ri, 0], 0xAFF3FF, 0.03, 1.0);
    /* 两端断面：外弧 + 内弧 + 径向缝 */
    [-L / 2, L / 2].forEach(function (x) {
      addLines(arcPairs(R, x, A0, A1, 34), 0x9BEEFF, 0.18, 0.9);
      addLines(arcPairs(Ri, x, A0, A1, 34), 0x7FE0F5, 0.12, 0.7);
      addLines([x, R, 0, x, Ri, 0, x, -R, 0, x, -Ri, 0], 0x9BEEFF, 0.18, 0.9);
    });

    /* 剖面水体：高度正好 = 内径 → 永远满管（无气隙） */
    S.sec.waterMat = new THREE.MeshBasicMaterial({
      color: 0x0E7C9B, transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    var water = new THREE.Mesh(new THREE.PlaneGeometry(L, Ri * 2), S.sec.waterMat);
    water.position.set(0, 0, -0.002);
    g.add(water);

    /* 上下管壁断面（薄带，读作金属壁厚） */
    S.sec.wallMat = new THREE.MeshBasicMaterial({
      color: 0x2E5568, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false
    });
    var tw = R - Ri;
    var wt = new THREE.Mesh(new THREE.PlaneGeometry(L, tw), S.sec.wallMat);
    wt.position.set(0, (R + Ri) / 2, 0);
    var wb = new THREE.Mesh(new THREE.PlaneGeometry(L, tw), S.sec.wallMat);
    wb.position.set(0, -(R + Ri) / 2, 0);
    g.add(wt); g.add(wb);

    /* 远侧内壁的暗色体量，给剖面一点厚度感 */
    S.sec.shellMat = new THREE.MeshBasicMaterial({
      color: 0x0A3A4A, transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    g.add(new THREE.Mesh(surfHalf(Ri, L, A0, Math.PI, 24, 12), S.sec.shellMat));

    g.visible = false;
    S.scene.add(g);
    S.sec.group = g;
  }

  /* ==========================================================================
     03：探头 / 声路 / 反射点
     ========================================================================== */
  var V_P = [
    'attribute float aT;',
    'uniform float uP; uniform float uDir; uniform float uDraw; uniform float uG;',
    'varying float vA; varying float vG;',
    'void main(){',
    '  float s = mix(1.0 - aT, aT, step(0.0, uDir));',
    '  float d = uP - s;',
    '  float glow = exp(-max(0.0, d) * 1.9) * step(0.0, d);',
    '  float head = exp(-abs(uP - s) * 34.0);',
    '  float draw = step(aT, uDraw + 0.002);',
    '  vG = clamp(glow * 0.95 + head, 0.0, 1.0) * uG;',
    '  vA = (0.20 + 1.80 * vG) * draw;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  /* 折线按弧长采样：u∈0..1 → [x, y] */
  function samplePath(pts, u) {
    var segs = [], total = 0, i, d;
    for (i = 0; i < pts.length - 1; i++) {
      d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      segs.push(d); total += d;
    }
    var target = U.clamp01(u) * total, acc = 0;
    for (i = 0; i < segs.length; i++) {
      if (acc + segs[i] >= target) {
        var f = segs[i] > 1e-6 ? (target - acc) / segs[i] : 0;
        return [U.lerp(pts[i][0], pts[i + 1][0], f), U.lerp(pts[i][1], pts[i + 1][1], f)];
      }
      acc += segs[i];
    }
    return pts[pts.length - 1];
  }

  function buildSound() {
    var Ri = SEC.Ri, R = SEC.R, g = new THREE.Group(), i;
    g.position.set(TW.x, TW.y, 0);

    /* W 法：4 段声程、3 个反射点；V 法：2 段声程、1 个反射点 */
    SND.W = [[SND.xA, Ri], [SND.xA + 0.5, -Ri], [SND.xA + 1.0, Ri], [SND.xA + 1.5, -Ri], [SND.xB, Ri]];
    SND.V = [[SND.xA, Ri], [0, -Ri], [SND.xB, Ri]];
    SND.P = {
      P1: [SND.xA + 0.5, -Ri], P2: [SND.xA + 1.0, Ri],
      P3: [SND.xA + 1.5, -Ri], Pv: [0, -Ri]
    };

    function mkPath(pts, color) {
      var p = pathSegs(pts, 24);
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3));
      geo.setAttribute('aT', new THREE.Float32BufferAttribute(p.aT, 1));
      var mat = new THREE.ShaderMaterial({
        uniforms: {
          uP: { value: -0.1 }, uDir: { value: 1 }, uDraw: { value: 0 }, uG: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uHot: { value: new THREE.Color(0x7DF0FF) },
          uAlpha: { value: 0 }
        },
        vertexShader: V_P,
        fragmentShader: 'uniform vec3 uColor; uniform vec3 uHot; uniform float uAlpha;' +
          'varying float vA; varying float vG;' +
          'void main(){ gl_FragColor = vec4(mix(uColor, uHot, vG), vA * uAlpha); }',
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      });
      var o = new THREE.LineSegments(geo, mat);
      o.frustumCulled = false;
      g.add(o);
      return mat;
    }
    SND.matW = mkPath(SND.W, 0x9BEEFF);
    SND.matV = mkPath(SND.V, 0xC7F0FF);

    /* 探头 A/B：管壁上的楔块（描边 + 极淡填充） */
    SND.fadeMats = [];
    function mkProbe(x) {
      var pg = new THREE.Group();
      var bg = new THREE.BoxGeometry(0.098, 0.072, 0.115);
      var fill = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({
        color: 0x0E7C9B, transparent: true, opacity: 0.26,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      var edge = new THREE.LineSegments(new THREE.EdgesGeometry(bg), new THREE.LineBasicMaterial({
        color: 0xC7F0FF, transparent: true, opacity: 0.95
      }));
      pg.add(fill); pg.add(edge);
      pg.position.set(x, R + 0.037, 0);
      g.add(pg);
      SND.fadeMats.push({ mat: fill.material, base: 0.26 });
      SND.fadeMats.push({ mat: edge.material, base: 0.95 });
      return pg;
    }
    SND.probeA = mkProbe(SND.xA);
    SND.probeB = mkProbe(SND.xB);

    /* 反射点小环 */
    SND.rings = {};
    function mkRing(key, r) {
      var q = SND.P[key], pts = [];
      for (i = 0; i <= 22; i++) {
        var a = i / 22 * Math.PI * 2;
        pts.push(new THREE.Vector3(q[0] + r * Math.cos(a), q[1] + r * Math.sin(a), 0));
      }
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var mat = new THREE.LineBasicMaterial({ color: 0xE8FBFF, transparent: true, opacity: 0 });
      var o = new THREE.Line(geo, mat);
      o.frustumCulled = false;
      g.add(o);
      SND.rings[key] = mat;
    }
    mkRing('P1', 0.020); mkRing('P2', 0.020); mkRing('P3', 0.020); mkRing('Pv', 0.024);

    /* 脉冲头：一个发光点，沿当前声路跑（顺流青 / 逆流橙） */
    SND.headGeo = new THREE.BufferGeometry();
    SND.headGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    SND.headMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0x7DF0FF) },
        uAlpha: { value: 0 }, uScale: { value: 1766 }, uSize: { value: 0.026 }
      },
      vertexShader: 'uniform float uScale; uniform float uSize;' +
        'void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0);' +
        'gl_PointSize = uSize * uScale / max(0.001, -mv.z);' +
        'gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uColor; uniform float uAlpha;' +
        'void main(){ float r = length(gl_PointCoord - vec2(0.5));' +
        'float a = smoothstep(0.5, 0.0, r); gl_FragColor = vec4(uColor, a * a * uAlpha); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    SND.head = new THREE.Points(SND.headGeo, SND.headMat);
    SND.head.frustumCulled = false;
    g.add(SND.head);

    g.visible = false;
    S.scene.add(g);
    SND.group = g;
  }

  /* 03：声路 / 脉冲 / 反射命中 */
  function stepSound(t) {
    var S3 = BL.SEC['03'];
    if (!SND.group) return;
    var a = U.smooth(14.02, 14.32, t) * (1 - U.smooth(24.30, 24.66, t));
    SND.group.visible = a > 0.002;
    for (var i = 0; i < SND.fadeMats.length; i++) SND.fadeMats[i].mat.opacity = SND.fadeMats[i].base * a;

    var wOn = 1 - U.smooth(S3.vSwitch, S3.vSwitch + 0.30, t);
    var vOn = U.smooth(S3.vSwitch, S3.vSwitch + 0.30, t);

    /* 当前脉冲：uP 沿声路 0→1；结束后续亮 0.28 s 再衰掉 */
    var uP = -0.1, dir = 1, gain = 0, act = null;
    for (i = 0; i < S3.pulse.length; i++) {
      var p = S3.pulse[i];
      if (t >= p.t0 && t <= p.t1 + 0.28) {
        act = p; dir = p.dir;
        gain = 1 - U.smooth(p.t1, p.t1 + 0.28, t);
        uP = t <= p.t1 ? U.easeIO(U.inv(p.t0, p.t1, t)) : (p.dir > 0 ? 1 : 0);
      }
    }

    var mw = SND.matW.uniforms, mv = SND.matV.uniforms;
    mw.uDraw.value = U.smooth(S3.wPath.in, S3.wPath.out, t);
    mv.uDraw.value = U.smooth(S3.vSwitch, S3.vSwitch + 0.26, t);
    mw.uAlpha.value = wOn * a;
    mv.uAlpha.value = vOn * a;
    mw.uP.value = uP; mv.uP.value = uP;
    mw.uDir.value = dir; mv.uDir.value = dir;
    mw.uG.value = (act && act.m === 'W') ? gain : 0;
    mv.uG.value = (act && act.m === 'V') ? gain : 0;

    /* 脉冲头与方向色：顺流青、逆流橙 */
    var hot = dir > 0 ? 0x7DF0FF : 0xFFB056;
    mw.uHot.value.setHex(hot); mv.uHot.value.setHex(hot);
    var su = dir > 0 ? uP : 1 - uP;
    var pts = (act && act.m === 'V') ? SND.V : SND.W;
    var hp = samplePath(pts, su);
    SND.head.position.set(hp[0], hp[1], 0.001);
    SND.headMat.uniforms.uAlpha.value = a * (act ? gain : 0);
    SND.headMat.uniforms.uColor.value.setHex(hot);
    /* 跟拍锚点：比脉冲头晚 0.20 个声程，机位用它做平移 */
    if (act) {
      var fp = samplePath(pts, dir > 0 ? su - 0.20 : su + 0.20);
      SND.follow = { x: TW.x + fp[0], y: TW.y + fp[1] };
    } else {
      SND.follow = null;
    }

    /* 反射点环：脉冲经过时点亮 */
    var wR = [['P1', 0.25], ['P2', 0.50], ['P3', 0.75]];
    for (i = 0; i < wR.length; i++) {
      var lite = (act && act.m === 'W') ? gain * Math.exp(-Math.abs(uP - wR[i][1]) * 26) : 0;
      SND.rings[wR[i][0]].opacity = a * (0.28 * wOn + 1.0 * lite);
    }
    var liteV = (act && act.m === 'V') ? gain * Math.exp(-Math.abs(uP - 0.5) * 26) : 0;
    SND.rings.Pv.opacity = a * (0.28 * vOn + 1.0 * liteV);

    /* 命中计数：W 3 次 × 2 趟 + V 1 次 × 2 趟 = 8 */
    var hits = 0;
    for (i = 0; i < S3.pulse.length; i++) {
      var q = S3.pulse[i], m = q.m === 'W' ? 3 : 1;
      if (t >= q.t1) hits += m;
      else if (t >= q.t0) hits += Math.min(m, Math.floor(U.inv(q.t0, q.t1, t) * m + 0.35));
    }
    SND.hits = hits;
    if (act) { SND.dir = act.dir; SND.active = true; }
    else SND.active = false;
    SND.mode = (act ? act.m : (t < S3.vSwitch ? 'W' : 'V'));
    SND.uP = uP;
  }

  /* ==========================================================================
     04：安装成立条件
     世界坐标全部挂在 TW 组内（管道局部坐标，x = 米）
     ========================================================================== */
  var I4 = {};

  function glowTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 32;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,.85)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  }
  var GLOW = null;

  function buildInstall() {
    var R = SEC.R, i;
    var g = new THREE.Group();
    g.position.set(TW.x, TW.y, 0);
    g.visible = false;
    S.scene.add(g);
    I4.root = g;

    /* ---- 量尺：上游 10D / 下游 5D（刻度每 0.125 m = 1D） ---- */
    var rg = new THREE.Group();
    var RY = 0.315, A = -2.25, B = 1.625;
    rg.add(lineObj([-2.42, RY, 0, 1.88, RY, 0], 0x7E8DA6, 0.55));
    var tp = [], tc = [];
    var n = Math.round(4.30 / 0.125);
    for (i = 0; i <= n; i++) {
      var x = -2.42 + i * 0.125;
      var major = Math.abs(x / 0.25 - Math.round(x / 0.25)) < 1e-4;
      var h = major ? 0.075 : 0.042;
      var inside = x >= A - 1e-6 && x <= B + 1e-6;
      var col = inside ? (major ? [0.365, 0.878, 1.0] : [0.45, 0.68, 0.78]) : [0.28, 0.36, 0.45];
      tp.push(x, RY, 0, x, RY + h, 0);
      tc.push(col[0], col[1], col[2], col[0], col[1], col[2]);
    }
    rg.add(lineObj(tp, 0, 0.9, { colors: tc }));

    /* 10D：探头 A 上游 1.25 m */
    rg.add(lineObj([A, RY + 0.010, 0, A, RY + 0.20, 0, -1.00, RY + 0.010, 0, -1.00, RY + 0.20, 0,
      A, RY + 0.20, 0, -1.00, RY + 0.20, 0,
      A, RY + 0.155, 0, A, RY + 0.245, 0, -1.00, RY + 0.155, 0, -1.00, RY + 0.245, 0], 0x22D3EE, 0.90));
    /* 5D：探头 B 下游 0.625 m（抬高一层，避免压住 10D 标注） */
    rg.add(lineObj([1.00, RY + 0.010, 0, 1.00, RY + 0.30, 0, B, RY + 0.010, 0, B, RY + 0.30, 0,
      1.00, RY + 0.30, 0, B, RY + 0.30, 0,
      1.00, RY + 0.255, 0, 1.00, RY + 0.345, 0, B, RY + 0.255, 0, B, RY + 0.345, 0], 0x34D399, 0.90));
    /* 尺头：沿尺移动的白色游标 */
    I4.head = lineObj([0, RY - 0.075, 0, 0, RY + 0.145, 0], 0xE8FBFF, 0.95);
    rg.add(I4.head);
    var hd = new THREE.Mesh(new THREE.CircleGeometry(0.021, 14),
      new THREE.MeshBasicMaterial({ color: 0xE8FBFF, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    hd.position.set(0, RY, 0.006);
    I4.headDot = hd;
    rg.add(hd);
    if (!GLOW) GLOW = glowTexture();
    tagMats(rg);
    I4.ruler = rg;
    g.add(rg);

    /* ---- 禁装区：红灰斜线带（阀门 / 弯头） ---- */
    function hatch(x0, x1) {
      var fg = new THREE.Group(), p = [], c = [];
      for (var xx = x0; xx <= x1 + 1e-6; xx += 0.030) {
        var alt = Math.round((xx - x0) / 0.030) % 2 === 0;
        var c0 = alt ? [1.0, 0.33, 0.41] : [0.46, 0.53, 0.61];
        for (var yy = -0.145; yy < 0.145; yy += 0.038) {
          p.push(xx, yy, 0.012, xx, Math.min(yy + 0.021, 0.145), 0.012);
          c.push(c0[0], c0[1], c0[2], c0[0], c0[1], c0[2]);
        }
      }
      for (var k = -0.145; k < 0.145; k += 0.042) {
        var k2 = Math.min(k + 0.16, 0.145);
        p.push(x0, k, 0.013, Math.min(x1, x0 + 0.17), k2, 0.013);
        var c1 = (Math.round(k * 100) % 2 === 0) ? [1.0, 0.36, 0.44] : [0.45, 0.52, 0.60];
        c.push(c1[0], c1[1], c1[2], c1[0], c1[1], c1[2]);
      }
      for (var y2 = -0.15; y2 < 0.15; y2 += 0.030) {
        p.push(x0, y2, 0.014, x0, Math.min(y2 + 0.018, 0.15), 0.014);
        p.push(x1, y2, 0.014, x1, Math.min(y2 + 0.018, 0.15), 0.014);
        c.push(1, 0.28, 0.36, 1, 0.28, 0.36, 1, 0.28, 0.36, 1, 0.28, 0.36);
      }
      fg.add(lineObj(p, 0, 0.90, { colors: c }));
      return fg;
    }
    I4.fValve = hatch(1.86, 2.14);
    I4.fElbow = hatch(2.22, 2.50);
    g.add(I4.fValve); g.add(I4.fElbow);

    /* 阀门：阀体 + 阀杆 + 手轮 */
    var vg = new THREE.Group();
    vg.add(lineObj(boxEdges(0.135, 0.235, 0.185), 0xFF9AAE, 0.88));
    vg.add(lineObj([-0.052, 0.117, 0, -0.052, 0.155, 0, 0.052, 0.117, 0, 0.052, 0.155, 0,
      -0.052, 0.155, 0, 0.052, 0.155, 0], 0xFF9AAE, 0.80));
    vg.add(lineObj([0, 0.117, 0, 0, 0.300, 0], 0xFFB0C0, 0.80));
    vg.add(lineObj(lineCircle(0, 0.305, 0.068, 20, 0), 0xFFC2D0, 0.90));
    vg.add(lineObj([-0.068, 0.305, 0, 0.068, 0.305, 0, 0, 0.237, 0, 0, 0.373, 0], 0xFFC2D0, 0.70));
    vg.position.set(2.00, 0, 0);
    g.add(vg);
    tagMats(vg);
    I4.valve = vg;

    /* 弯头：下折管段（线框） */
    var eg = new THREE.Group();
    var ep = [new THREE.Vector3(2.18, 0, 0), new THREE.Vector3(2.36, 0, 0),
      new THREE.Vector3(2.50, -0.08, 0), new THREE.Vector3(2.54, -0.27, 0), new THREE.Vector3(2.54, -0.52, 0)];
    var tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ep), 26, R, 8, false);
    eg.add(lineObj(edgesFrom(new THREE.WireframeGeometry(tube)), 0xFF9AAE, 0.55));
    eg.add(lineObj([2.48, -0.10, 0.126, 2.60, -0.10, 0.126, 2.48, -0.24, 0.126, 2.60, -0.24, 0.126], 0xFFC2D0, 0.6));
    g.add(eg);
    tagMats(eg);
    I4.elbow = eg;

    /* ---- 两个探头 + 耦合剂薄层 ---- */
    I4.probes = new THREE.Group();
    function mkP4(x) {
      var o = new THREE.Group();
      var bg = new THREE.BoxGeometry(0.105, 0.078, 0.125);
      o.add(new THREE.Mesh(bg, new THREE.MeshBasicMaterial({
        color: 0x0E7C9B, transparent: true, opacity: 0.30,
        blending: THREE.AdditiveBlending, depthWrite: false
      })));
      o.add(lineObj(boxEdges(0.105, 0.078, 0.125), 0xC7F0FF, 0.95));
      o.add(lineObj([0, 0.078, 0, 0, 0.112, 0], 0x9FE6F5, 0.72));
      o.position.set(x, R + 0.039, 0);
      I4.probes.add(o);
    }
    mkP4(-1.00); mkP4(1.00);
    tagMats(I4.probes);
    g.add(I4.probes);

    I4.couplant = new THREE.Group();
    [-1.00, 1.00].forEach(function (x) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(0.128, 0.010, 0.150),
        new THREE.MeshBasicMaterial({
          color: 0x7DF0FF, transparent: true, opacity: 0.55,
          blending: THREE.AdditiveBlending, depthWrite: false
        }));
      m.position.set(x, R + 0.005, 0);
      I4.couplant.add(m);
      var e = lineObj(boxEdges(0.128, 0.010, 0.150), 0xAFF3FF, 0.95);
      e.position.copy(m.position);
      I4.couplant.add(e);
    });
    /* 薄层标尺：0.10 mm 被夸大，只为读出「薄」 */
    I4.couplant.add(lineObj([-0.35, R + 0.022, 0.105, -0.35, R + 0.085, 0.105,
      -0.35, R + 0.022, 0.105, -0.28, R + 0.022, 0.105,
      -0.35, R + 0.085, 0.105, -0.28, R + 0.085, 0.105], 0xAFF3FF, 0.60));
    tagMats(I4.couplant);
    g.add(I4.couplant);

    /* ---- 打磨弧：只去氧化层、保留原弧度 ---- */
    I4.grind = new THREE.Group();
    [-1.00, 1.00].forEach(function (xc) {
      var p = [], a, xx;
      for (a = -0.72; a <= 0.721; a += 0.16) {
        p.push(xc - 0.092, (R + 0.003) * Math.cos(a), (R + 0.003) * Math.sin(a),
          xc + 0.092, (R + 0.003) * Math.cos(a), (R + 0.003) * Math.sin(a));
      }
      for (xx = xc - 0.092; xx <= xc + 0.092 + 1e-6; xx += 0.046) {
        for (a = -0.72; a < 0.72; a += 0.16) {
          p.push(xx, (R + 0.003) * Math.cos(a), (R + 0.003) * Math.sin(a),
            xx, (R + 0.003) * Math.cos(a + 0.16), (R + 0.003) * Math.sin(a + 0.16));
        }
      }
      I4.grind.add(lineObj(p, 0xFFC24B, 0.85));
    });
    var sp = [];
    for (i = 0; i < 30; i++) {
      sp.push(-1 + (U.hash1(i, 2.1) - 0.5) * 0.20,
        R + 0.030 + U.hash1(i, 4.2) * 0.10,
        0.02 + U.hash1(i, 6.3) * 0.10);
    }
    var spGeo = new THREE.BufferGeometry();
    spGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    I4.sparkMat = new THREE.PointsMaterial({
      color: 0xFFD27A, size: 0.011, map: GLOW, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    I4.sparks = new THREE.Points(spGeo, I4.sparkMat);
    I4.sparks.frustumCulled = false;
    I4.grind.add(I4.sparks);
    tagMats(I4.grind);
    g.add(I4.grind);

    /* ---- 顶部积气：气液界面 + 气泡 ---- */
    var half = 0.30;
    I4.gas = new THREE.Group();
    I4.gas.position.set(-1.00, 0.040, 0);
    var shape = new THREE.Shape();
    shape.moveTo(-half, 0.002);
    for (i = 1; i <= 30; i++) {
      var gx = -half + 2 * half * i / 30;
      shape.lineTo(gx, 0.080 * Math.sqrt(Math.max(0, 1 - (gx / half) * (gx / half))));
    }
    for (i = 29; i >= 0; i--) {
      var gx2 = -half + 2 * half * i / 30;
      shape.lineTo(gx2, 0.004 * Math.sin(gx2 * 34) + 0.001 * Math.sin(gx2 * 81));
    }
    shape.closePath();
    I4.gas.add(new THREE.Mesh(new THREE.ShapeGeometry(shape, 30),
      new THREE.MeshBasicMaterial({
        color: 0xBFEFFF, transparent: true, opacity: 0.17, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false
      })));
    var ip = [], ix, ix2;
    for (i = 0; i < 40; i++) {
      ix = -half + 2 * half * i / 40;
      ix2 = -half + 2 * half * (i + 1) / 40;
      ip.push(ix, 0.004 * Math.sin(ix * 34) + 0.001 * Math.sin(ix * 81), 0.006,
        ix2, 0.004 * Math.sin(ix2 * 34) + 0.001 * Math.sin(ix2 * 81), 0.006);
    }
    I4.gas.add(lineObj(ip, 0xE8FBFF, 0.90));
    var bp = [];
    for (i = 0; i < 22; i++) {
      bp.push((U.hash1(i, 3.7) - 0.5) * 0.44, 0.008 + U.hash1(i, 5.8) * 0.058, 0.012);
    }
    var bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    I4.bubbleMat = new THREE.PointsMaterial({
      color: 0xE8FBFF, size: 0.009, map: GLOW, transparent: true, opacity: 0.80,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    var bubbles = new THREE.Points(bGeo, I4.bubbleMat);
    bubbles.frustumCulled = false;
    I4.gas.add(bubbles);
    I4.gas.scale.set(1, 0.02, 1);
    tagMats(I4.gas);
    g.add(I4.gas);

    /* ---- 声束：气液界面之前 / 之后两段 ---- */
    I4.beam = new THREE.Group();
    I4.beam.position.set(-1.00, 0, 0.012);
    function strip(y0, y1, w, color, op) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, y1 - y0),
        new THREE.MeshBasicMaterial({
          color: color, transparent: true, opacity: op, side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending, depthWrite: false
        }));
      m.position.y = (y0 + y1) / 2;
      I4.beam.add(m);
      return m;
    }
    I4.beamTop = strip(0.040, 0.145, 0.013, 0xFFB056, 0.80);
    I4.beamBot = strip(-0.145, 0.040, 0.013, 0x7DF0FF, 0.92);
    strip(0.040, 0.145, 0.042, 0xFFB056, 0.13);
    strip(-0.145, 0.040, 0.042, 0x7DF0FF, 0.15);
    tagMats(I4.beam);
    g.add(I4.beam);

    I4.iface = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.008),
      new THREE.MeshBasicMaterial({
        color: 0xE8FBFF, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
    I4.iface.position.set(-1.00, 0.040, 0.016);
    g.add(I4.iface);

    var hg = new THREE.BufferGeometry();
    hg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    I4.headMat = new THREE.PointsMaterial({
      color: 0xE8FBFF, size: 0.030, map: GLOW, transparent: true, opacity: 0.95,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    I4.beamHead = new THREE.Points(hg, I4.headMat);
    I4.beamHead.frustumCulled = false;
    I4.beamHead.position.set(-1.00, 0.10, 0.028);
    g.add(I4.beamHead);

    /* ---- 3D 信号立柱（与 HUD 同读 BL.sigAt） ---- */
    I4.meter = new THREE.Group();
    I4.meter.position.set(1.55, -0.32, 0);
    I4.meterSeg = [];
    for (i = 0; i < 10; i++) {
      var mm = new THREE.MeshBasicMaterial({
        color: 0x26343F, transparent: true, opacity: 0.25,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      var seg = new THREE.Mesh(new THREE.PlaneGeometry(0.165, 0.040), mm);
      seg.position.set(0, -0.216 + i * 0.048, 0.012);
      I4.meter.add(seg);
      I4.meterSeg.push(mm);
    }
    I4.meterFrame = [];
    function mline(pos, color, op) {
      var o = lineObj(pos, color, op);
      I4.meterFrame.push({ mat: o.material, base: op });
      I4.meter.add(o);
      return o;
    }
    mline([-0.105, -0.252, 0.014, -0.105, 0.252, 0.014,
      0.105, -0.252, 0.014, 0.105, 0.252, 0.014,
      -0.105, -0.252, 0.014, 0.105, -0.252, 0.014,
      -0.105, 0.252, 0.014, 0.105, 0.252, 0.014], 0x5E7089, 0.85);
    mline([-0.125, -0.216, 0.014, -0.105, -0.216, 0.014,
      -0.125, -0.072, 0.014, -0.105, -0.072, 0.014,
      -0.125, 0.072, 0.014, -0.105, 0.072, 0.014,
      -0.125, 0.216, 0.014, -0.105, 0.216, 0.014], 0x63748C, 0.70);
    mline([0, -0.252, 0.004, 0, -0.365, 0.004,
      -0.055, -0.365, 0.004, 0.055, -0.365, 0.004], 0x5E7089, 0.55);
    I4.needle = lineObj([-0.120, 0, 0.016, 0.120, 0, 0.016], 0xE8FBFF, 0.95);
    I4.needleMat = I4.needle.material;
    I4.meter.add(I4.needle);
    g.add(I4.meter);
  }

  /* 04：量尺 → 禁装 → 打磨/耦合 → 积气界面 → 信号立柱 */
  function stepInstall(t) {
    var S4 = BL.SEC['04'], i;
    if (!I4.root) return;
    var aRoot = U.smooth(25.10, 25.42, t) * (1 - U.smooth(32.74, 33.06, t));
    I4.root.visible = aRoot > 0.002;
    var sv = BL.sigAt(t);
    var gasNow = U.smooth(28.30, 28.58, t) * (1 - U.smooth(30.30, 30.86, t));

    /* 量尺 + 游标 */
    var aRuler = aRoot * U.smooth(S4.ruler.in, S4.ruler.in + 0.34, t) * (1 - U.smooth(28.02, 28.20, t));
    setFade(I4.ruler, aRuler);
    var hA = U.smooth(25.46, 25.62, t) * (1 - U.smooth(27.00, 27.16, t));
    var hx = -2.20 + 3.92 * U.easeIO(U.inv(25.50, 27.10, t));
    I4.head.position.x = hx;
    I4.headDot.position.x = hx;
    I4.head.visible = hA > 0.01;
    I4.headDot.visible = hA > 0.01;
    I4.head.material.opacity = 0.95 * aRuler * hA;
    I4.headDot.material.opacity = 0.95 * aRuler * hA;

    /* 禁装区：阀门先亮，弯头稍后；一起退 */
    var fOut = 1 - U.smooth(27.98, 28.18, t);
    var afv = aRoot * U.smooth(S4.forbid.in, S4.forbid.in + 0.17, t) * fOut;
    var afe = aRoot * U.smooth(26.52, 26.69, t) * fOut;
    setFade(I4.fValve, afv); setFade(I4.valve, afv);
    setFade(I4.fElbow, afe); setFade(I4.elbow, afe);

    /* 打磨弧 + 火花 */
    var aGrind = aRoot * U.smooth(26.10, 26.26, t) * (1 - U.smooth(27.42, 27.62, t));
    setFade(I4.grind, aGrind);
    I4.sparkMat.opacity = aGrind * (0.62 + 0.38 * Math.abs(Math.sin(t * 27.0))) *
      (1 - U.smooth(26.92, 27.12, t));

    /* 耦合剂薄层 */
    var aCoup = aRoot * U.smooth(26.90, 27.18, t) * (1 - U.smooth(28.02, 28.22, t));
    setFade(I4.couplant, aCoup);
    var cMats = I4.couplant.userData.mats, cw = 0.86 + 0.14 * Math.sin((t - 26.9) * 5.2);
    for (i = 0; i < cMats.length; i++) cMats[i].opacity *= cw;

    /* 探头本体：装好后一直留到出 04 */
    setFade(I4.probes, aRoot * U.smooth(25.96, 26.20, t) * (1 - U.smooth(32.50, 32.86, t)));

    /* 顶部积气：鼓起 → 排气收平 */
    var aGas = aRoot * U.smooth(28.20, 28.44, t) * (1 - U.smooth(30.30, 30.64, t));
    setFade(I4.gas, aGas);
    I4.gas.scale.y = 0.02 + 0.98 * U.smooth(28.28, 28.62, t) * (1 - U.smooth(30.30, 30.66, t));

    /* 声束：界面后段按积气衰减 */
    var aBeam = aRoot * U.smooth(28.10, 28.32, t) * (1 - U.smooth(31.10, 31.42, t));
    setFade(I4.beam, aBeam);
    I4.beamTop.material.opacity = 0.80 * aBeam;
    I4.beamBot.material.opacity = 0.92 * aBeam * (1 - 0.76 * gasNow);
    var hy = 0.135 - 0.27 * ((t * 1.25) % 1);
    I4.beamHead.position.y = hy;
    var flash = Math.max(0, 1 - Math.abs(hy - 0.040) / 0.030);
    I4.beamHead.visible = aBeam > 0.002;
    I4.headMat.opacity = aBeam * (hy < 0.040 ? 1 - 0.60 * gasNow : 1) *
      (0.62 + 0.38 * Math.abs(Math.sin(t * 11.0)));
    I4.iface.visible = aGas > 0.002;
    I4.iface.material.opacity = aGas * aBeam * (0.20 + 0.80 * flash);

    /* 3D 信号立柱：与 HUD 同读 sig / Q */
    var aMeter = aRoot * U.smooth(30.66, 30.98, t) * (1 - U.smooth(32.58, 32.88, t));
    I4.meter.visible = aMeter > 0.002;
    var lv = Math.round(sv.sig / 10);
    for (i = 0; i < 10; i++) {
      var m = I4.meterSeg[i];
      if (i < lv) {
        var col = sv.gas ? (i < lv - 2 ? 0xFF6B6B : 0xFFB056)
          : (i < 6 ? 0x22D3EE : (i < 8 ? 0x34D399 : 0xFFC24B));
        m.color.setHex(col);
        m.opacity = (0.60 + 0.30 * Math.abs(Math.sin(t * 6.5 + i * 0.55))) * aMeter;
      } else {
        m.color.setHex(0x26343F);
        m.opacity = 0.22 * aMeter;
      }
    }
    I4.needle.position.y = -0.216 + (sv.sig / 100) * 0.432;
    I4.needleMat.color.setHex(sv.gas ? 0xFF6B6B : 0xE8FBFF);
    I4.needleMat.opacity = 0.95 * aMeter;
    for (i = 0; i < I4.meterFrame.length; i++) {
      I4.meterFrame[i].mat.opacity = I4.meterFrame[i].base * aMeter;
    }
  }

  /* ==========================================================================
     05：数据进箱 / 拆盖 / 断缆 / 出壳 / 包围盒 / 四模块分离
     机箱挂在世界坐标，独立于管道组
     ========================================================================== */
  var I5 = {}, HB = { x: 0.10, y: -0.52, z: -0.45 };

  function buildBus() {
    var g = new THREE.Group(), i;
    g.position.set(HB.x, HB.y, HB.z);
    g.visible = false;
    S.scene.add(g);
    I5.root = g;
    var BW = 1.34, BH = 0.82, BD = 0.30;
    I5.size = [BW, BH, BD];
    I5.housing = new THREE.Group();
    g.add(I5.housing);

    /* 背板：实心暗面，挡住身后的管道 */
    var back = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.02, BH - 0.02),
      new THREE.MeshBasicMaterial({
        color: 0x010204, transparent: true, opacity: 1.0, depthWrite: true
      }));
    back.position.z = -BD / 2 + 0.004;
    g.add(back);

    /* 壳体线框 + 前开口 */
    I5.housing.add(lineObj(boxEdges(BW, BH, BD), 0x6C849E, 0.92));
    var oz = BD / 2;
    I5.housing.add(lineObj([-BW / 2 + 0.045, BH / 2 - 0.045, oz, BW / 2 - 0.045, BH / 2 - 0.045, oz,
      BW / 2 - 0.045, BH / 2 - 0.045, oz, BW / 2 - 0.045, -BH / 2 + 0.045, oz,
      BW / 2 - 0.045, -BH / 2 + 0.045, oz, -BW / 2 + 0.045, -BH / 2 + 0.045, oz,
      -BW / 2 + 0.045, -BH / 2 + 0.045, oz, -BW / 2 + 0.045, BH / 2 - 0.045, oz], 0x9FB6CE, 0.80));

    /* 内胆微光 */
    var glow = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.20, BH - 0.20),
      new THREE.MeshBasicMaterial({
        color: 0x0A2C38, transparent: true, opacity: 0.12,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
    glow.position.z = -BD / 2 + 0.012;
    g.add(glow);

    /* 顶部两个格兰头（线缆入口） */
    [-0.58, 0.58].forEach(function (x) {
      var ring = [], k;
      for (k = 0; k < 16; k++) {
        var a1 = Math.PI * 2 * k / 16, a2 = Math.PI * 2 * (k + 1) / 16;
        ring.push(x + 0.045 * Math.cos(a1), BH / 2, 0.055 * Math.sin(a1),
          x + 0.045 * Math.cos(a2), BH / 2, 0.055 * Math.sin(a2));
      }
      ring.push(x - 0.045, BH / 2, 0, x + 0.045, BH / 2, 0,
        x, BH / 2, -0.055, x, BH / 2, 0.055);
      I5.housing.add(lineObj(ring, 0xB9CCDD, 0.85));
    });

    /* 盖板：水平滑出，不掀不翻 */
    I5.cover = new THREE.Group();
    var cv = new THREE.Mesh(new THREE.BoxGeometry(BW - 0.02, BH - 0.02, 0.022),
      new THREE.MeshBasicMaterial({
        color: 0x020509, transparent: true, opacity: 0.95, depthWrite: true
      }));
    I5.cover.add(cv);
    I5.cover.add(lineObj(boxEdges(BW - 0.02, BH - 0.02, 0.022), 0x7F97B0, 0.95));
    var fz = 0.014;
    I5.cover.add(lineObj([
      -BW / 2 + 0.07, BH / 2 - 0.07, fz, -0.44, BH / 2 - 0.07, fz,
      -0.44, BH / 2 - 0.07, fz, -0.44, -BH / 2 + 0.07, fz,
      -0.44, -BH / 2 + 0.07, fz, -BW / 2 + 0.07, -BH / 2 + 0.07, fz,
      -BW / 2 + 0.07, -BH / 2 + 0.07, fz, -BW / 2 + 0.07, BH / 2 - 0.07, fz], 0x54687D, 0.75));
    I5.cover.add(lineObj([-0.56, 0.30, fz, -0.20, 0.30, fz,
      -0.56, 0.265, fz, -0.30, 0.265, fz,
      -0.56, 0.230, fz, -0.38, 0.230, fz], 0x8FA6BD, 0.55));
    for (i = 0; i < 6; i++) {
      I5.cover.add(lineObj([0.18, -0.30 + i * 0.035, fz, 0.50, -0.30 + i * 0.035, fz], 0x3E5368, 0.65));
    }
    [[-0.57, 0.34], [0.57, 0.34], [-0.57, -0.34], [0.57, -0.34]].forEach(function (p) {
      I5.cover.add(lineObj(lineCircle(p[0], p[1], 0.020, 10, fz), 0x8FA6BD, 0.8));
      I5.cover.add(lineObj([p[0] - 0.012, p[1], fz, p[0] + 0.012, p[1], fz,
        p[0], p[1] - 0.012, fz, p[0], p[1] + 0.012, fz], 0x8FA6BD, 0.7));
    });
    I5.cover.position.set(0, 0, oz + 0.014);
    g.add(I5.cover);

    /* ---- electronics：PCB + 4 模块（整体沿 +z 出壳） ---- */
    I5.core = new THREE.Group();
    g.add(I5.core);
    var pcb = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.64, 0.016),
      new THREE.MeshBasicMaterial({
        color: 0x031016, transparent: true, opacity: 0.45, depthWrite: false
      }));
    pcb.position.z = -0.075;
    I5.core.add(pcb);
    var pcbE = lineObj(boxEdges(1.18, 0.64, 0.016), 0x2A6A78, 0.85);
    pcbE.position.z = -0.075;
    I5.core.add(pcbE);
    var tr = [], k;
    for (k = 0; k < 7; k++) {
      var ty = -0.24 + k * 0.08;
      tr.push(-0.50, ty, -0.066, -0.28, ty, -0.066,
        0.28, ty + 0.012, -0.066, 0.50, ty + 0.012, -0.066);
    }
    I5.core.add(lineObj(tr, 0x1E5563, 0.50));

    I5.mods = [];
    I5.modX = [-0.48, -0.16, 0.16, 0.48];
    I5.modName = ['AFE', 'ADC', 'MCU', 'COMM'];
    var mcol = [0x22D3EE, 0x34D399, 0xFF6B8A, 0xFFB056];
    for (i = 0; i < 4; i++) {
      var mg = new THREE.Group();
      mg.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.16),
        new THREE.MeshBasicMaterial({
          color: mcol[i], transparent: true, opacity: 0.10,
          blending: THREE.AdditiveBlending, depthWrite: false
        })));
      mg.add(lineObj(boxEdges(0.24, 0.34, 0.16), mcol[i], 0.95));
      /* 主芯片 */
      var chip = lineObj(boxEdges(0.090, 0.090, 0.012), 0xE8FBFF, 0.62);
      chip.position.set(0, 0.030, 0.086);
      mg.add(chip);
      /* 芯片引脚 */
      var cp = [];
      for (k = 0; k < 5; k++) {
        var cx = -0.036 + k * 0.018;
        cp.push(cx, -0.018, 0.088, cx, -0.018, 0.100);
        cp.push(cx, 0.078, 0.088, cx, 0.078, 0.100);
      }
      mg.add(lineObj(cp, 0xA9C4D4, 0.55));
      /* 底部排针 */
      var pins = [];
      for (k = 0; k < 7; k++) {
        var px = -0.090 + k * 0.030;
        pins.push(px, -0.170, 0.045, px, -0.210, 0.045);
      }
      mg.add(lineObj(pins, 0xB9CCDD, 0.70));
      /* 顶部连接器（线缆落点） */
      var con = lineObj(boxEdges(0.090, 0.036, 0.060), 0xE8FBFF, 0.75);
      con.position.set(0, 0.188, 0.010);
      mg.add(con);
      /* 左下单色标识条 */
      mg.add(lineObj([-0.092, -0.132, 0.082, -0.040, -0.132, 0.082,
        -0.092, -0.120, 0.082, -0.040, -0.120, 0.082], mcol[i], 0.8));
      mg.position.set(I5.modX[i], 0.02, 0.02);
      I5.core.add(mg);
      I5.mods.push(mg);
    }
    I5.drop = [0, 0, 0, 0];

    /* ---- 线框包围盒：先定界 ---- */
    I5.bbox = new THREE.Group();
    I5.bbox.position.z = 0.42;
    I5.bbox.add(lineObj(boxEdges(1.30, 0.78, 0.30), 0x00E08A, 1.0));
    var ticks = [], hx = 0.65, hy = 0.39, hz = 0.15;
    for (var sx = -1; sx <= 1; sx += 2) {
      for (var sy = -1; sy <= 1; sy += 2) {
        for (var sz = -1; sz <= 1; sz += 2) {
          ticks.push(sx * hx, sy * hy, sz * hz, sx * (hx - 0.075), sy * hy, sz * hz);
          ticks.push(sx * hx, sy * hy, sz * hz, sx * hx, sy * (hy - 0.075), sz * hz);
          ticks.push(sx * hx, sy * hy, sz * hz, sx * hx, sy * hy, sz * (hz - 0.060));
        }
      }
    }
    I5.bbox.add(lineObj(ticks, 0x8BFFD0, 1.0));
    /* 尺寸引线（只做视觉刻度） */
    I5.bbox.add(lineObj([-hx, -hy - 0.055, hz, hx, -hy - 0.055, hz,
      -hx, -hy - 0.040, hz, -hx, -hy - 0.070, hz,
      hx, -hy - 0.040, hz, hx, -hy - 0.070, hz], 0x7FFFC0, 0.85));
    g.add(I5.bbox);

    /* ---- 横扫扫描面 ---- */
    I5.sweep = new THREE.Group();
    I5.sweep.position.set(-0.66, 0, 0.60);
    I5.sweep.add(lineObj([0, -0.40, 0, 0, 0.40, 0], 0x8BFFD0, 1.0));
    I5.sweep.add(lineObj([-0.030, 0.40, 0, 0, 0.455, 0, 0.030, 0.40, 0, 0, 0.455, 0,
      -0.030, -0.40, 0, 0, -0.455, 0, 0.030, -0.40, 0, 0, -0.455, 0], 0x8BFFD0, 0.85));
    I5.sweepPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.040, 0.80),
      new THREE.MeshBasicMaterial({
        color: 0x34D399, transparent: true, opacity: 0.20, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
    I5.sweep.add(I5.sweepPlane);
    g.add(I5.sweep);

    /* ---- 两根电缆 + 数据包 + 断点虚线 ---- */
    var UCUT = 0.55;
    function mkCable(pts, color) {
      var cg = new THREE.Group();
      g.add(cg);
      var curve = new THREE.CatmullRomCurve3(pts.map(function (p) {
        return new THREE.Vector3(p[0], p[1], p[2]);
      }));
      var sam = curve.getPoints(100), k;
      var iCut = Math.round(sam.length * UCUT);
      var baseCurve = new THREE.CatmullRomCurve3(sam.slice(0, iCut + 1));
      var tailCurve = new THREE.CatmullRomCurve3(sam.slice(iCut - 1));
      var baseMat = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 0.30,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      var coreMat = new THREE.MeshBasicMaterial({
        color: 0xE8FBFF, transparent: true, opacity: 0.42,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      var base = new THREE.Mesh(new THREE.TubeGeometry(baseCurve, 56, 0.014, 6, false), baseMat);
      base.add(new THREE.Mesh(new THREE.TubeGeometry(baseCurve, 56, 0.0045, 5, false), coreMat));
      cg.add(base);

      var tailMat = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 0.30,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      var tailCoreMat = new THREE.MeshBasicMaterial({
        color: 0xE8FBFF, transparent: true, opacity: 0.45,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      var tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 30, 0.014, 6, false), tailMat);
      tail.add(new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 30, 0.0045, 5, false), tailCoreMat));
      cg.add(tail);

      var sp = tailCurve.getPoints(30), d = [];
      for (k = 0; k < sp.length - 1; k += 2) {
        d.push(sp[k].x, sp[k].y, sp[k].z, sp[k + 1].x, sp[k + 1].y, sp[k + 1].z);
      }
      var dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.Float32BufferAttribute(d, 3));
      var dashMat = new THREE.LineBasicMaterial({
        color: 0xD8FFF6, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      var dash = new THREE.LineSegments(dg, dashMat);
      dash.frustumCulled = false;
      cg.add(dash);

      var pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
      var pm = new THREE.PointsMaterial({
        color: color, size: 0.030, map: GLOW, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      var pk = new THREE.Points(pg, pm);
      pk.frustumCulled = false;
      cg.add(pk);

      var e0 = pts[0], e1 = pts[pts.length - 1];
      var c0 = lineObj(boxEdges(0.060, 0.060, 0.070), color, 0.80);
      c0.position.set(e0[0], e0[1], e0[2]);
      cg.add(c0);
      var c1 = lineObj(boxEdges(0.055, 0.045, 0.050), 0xE8FBFF, 0.75);
      c1.position.set(e1[0], e1[1], e1[2] + 0.01);
      cg.add(c1);

      tagMats(cg);
      return {
        group: cg, curve: curve, tailMats: [tailMat, tailCoreMat],
        dashMat: dashMat, pm: pm, pg: pg, cut: sam[iCut], color: color
      };
    }

    I5.cabA = mkCable([
      [-1.00, 0.78, 0.02], [-1.00, 0.63, 0.04], [-0.95, 0.50, 0.06], [-0.82, 0.42, 0.06],
      [-0.66, 0.41, 0.05], [-0.54, 0.38, 0.04], [-0.47, 0.30, 0.035], [-0.48, 0.225, 0.03]
    ], 0x22D3EE);
    I5.cabB = mkCable([
      [1.00, 0.78, 0.02], [1.00, 0.63, 0.04], [0.95, 0.50, 0.06], [0.82, 0.42, 0.06],
      [0.66, 0.41, 0.05], [0.56, 0.38, 0.04], [0.49, 0.30, 0.035], [0.48, 0.225, 0.03]
    ], 0xFFB056);

    var cutPos = [];
    [I5.cabA.cut, I5.cabB.cut].forEach(function (c, ci) {
      for (var k = 0; k < 12; k++) {
        cutPos.push(c.x + (U.hash1(k, ci + 2) - 0.5) * 0.08,
          c.y + (U.hash1(k, ci + 7) - 0.5) * 0.08,
          c.z + (U.hash1(k, ci + 9) - 0.5) * 0.08);
      }
    });
    var cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(cutPos, 3));
    I5.cutMat = new THREE.PointsMaterial({
      color: 0xFFD27A, size: 0.014, map: GLOW, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    I5.cutPts = new THREE.Points(cg, I5.cutMat);
    I5.cutPts.frustumCulled = false;
    g.add(I5.cutPts);

    /* 默认可见性由 stepBus 控制 */
    I5.bbox.visible = false;
    I5.sweep.visible = false;
    I5.cutPts.visible = false;

    /* HUD 标签锚点（世界坐标） */
    var cutA = I5.cabA.cut;
    I5.anchors = {
      box: [HB.x - 0.42, HB.y + 0.46, HB.z + 0.20],
      cover: [HB.x + 0.55, HB.y + 0.46, HB.z + 0.20],
      cut: [HB.x + (cutA.x + I5.cabB.cut.x) / 2, HB.y + cutA.y + 0.05, HB.z + cutA.z],
      core: [HB.x - 0.40, HB.y - 0.12, HB.z + 0.55],
      bbox: [HB.x - 0.72, HB.y + 0.34, HB.z + 0.57],
      sweep: [HB.x + 0.42, HB.y - 0.14, HB.z + 0.57]
    };
    I5.modWorld = function (i) {
      var d = I5.drop[i] || 0;
      return [HB.x + I5.modX[i], HB.y + 0.02 - d + 0.215, HB.z + 0.52];
    };

    /* 分组淡出缓存：必须在原始透明度下缓存，避免被首帧 aRoot 缩放 */
    tagMats(I5.cover);
    tagMats(I5.housing);
    tagMats(g);
  }

  /* 05：盖板滑出 → 断缆 → 出壳 → 包围盒 → 连续横扫
     10 复原：tm 倒着走（41.10 → 33.55），同一套动作整体回退 = 反向播放 */
  function stepBus(t) {
    var S5 = BL.SEC['05'], S10 = BL.SEC['10'], i;
    if (!I5.root) return;
    var tm = t, aRoot, R = S10 && S10.rev;
    if (R && t >= R.in - 0.02 && t <= R.out + 0.30) {
      tm = U.lerp(R.tm0, R.tm1, U.smooth(R.in, R.out, t));
      aRoot = U.smooth(R.in, R.in + 0.34, t) * (1 - U.smooth(R.out, R.out + 0.28, t));
    } else {
      aRoot = U.smooth(33.00, 33.30, t) * (1 - U.smooth(42.66, 43.02, t));
    }
    I5.root.visible = aRoot > 0.002;
    if (!I5.root.visible) return;
    setFade(I5.root, aRoot);
    /* 壳体在包围盒出现后退居背景；盖板滑出画面后淡出，避免右缘残留一块面板 */
    setFade(I5.housing, aRoot * (1 - 0.80 * U.smooth(37.25, 37.85, tm)));
    setFade(I5.cover, aRoot * (1 - U.smooth(35.85, 36.20, tm)));

    /* 盖板：沿 +x 直线滑出 1.72，不掀不翻 */
    I5.cover.position.x = 1.72 * U.easeIO(U.inv(S5.cover.in, S5.cover.out, tm));
    /* 盖板滑到画外后，标签停在壳体右缘，避免跟着滑出画面 */
    I5.anchors.cover[0] = HB.x + Math.min(I5.cover.position.x, 0.72) + 0.42;

    /* 两根电缆：数据包持续入箱；35.40 物理断开 */
    var aCable = U.smooth(S5.cables.in, S5.cables.in + 0.26, tm) * (1 - U.smooth(41.00, 41.22, tm));
    var cutOn = 1 - U.smooth(35.40, 35.58, tm);
    var aDash = U.smooth(35.40, 35.70, tm) * aCable;
    var cab = [I5.cabA, I5.cabB];
    for (i = 0; i < 2; i++) {
      var c = cab[i], k;
      setFade(c.group, aRoot * aCable);
      c.tailMats[0].opacity = 0.30 * aRoot * aCable * cutOn;
      c.tailMats[1].opacity = 0.45 * aRoot * aCable * cutOn;
      c.dashMat.opacity = 0.90 * aRoot * aDash;
      c.pm.opacity = 0.95 * aRoot * aCable * (0.72 + 0.28 * Math.abs(Math.sin(tm * 7.0 + i)));
      var pos = c.pg.attributes.position;
      for (k = 0; k < 2; k++) {
        var u = (tm * 0.52 + k * 0.5 + i * 0.24) % 1;
        var p = c.curve.getPointAt(u);
        pos.setXYZ(k, p.x, p.y, p.z);
      }
      pos.needsUpdate = true;
    }

    /* 断点火花 */
    var spark = (tm >= 35.36 && tm < 35.84) ?
      (1 - U.smooth(35.36, 35.84, tm)) * (0.55 + 0.45 * Math.abs(Math.sin(tm * 41.0))) : 0;
    I5.cutPts.visible = spark * aRoot > 0.002;
    I5.cutMat.opacity = 0.95 * aRoot * spark;

    /* electronics 沿 +z 法线整体出壳 */
    I5.core.position.z = 0.42 * U.smooth(S5.out.in, S5.out.out, tm);

    /* 包围盒 */
    setFade(I5.bbox, aRoot * U.smooth(37.20, 37.56, tm) * (1 - U.smooth(42.60, 42.96, tm)));

    /* 连续横扫：x 从 -0.66 到 +0.66，4 块依次下落 0.2 */
    var su = U.clamp01(U.inv(S5.sweep.in, S5.sweep.out, tm));
    var sw = U.smooth(38.30, 38.44, tm) * (1 - U.smooth(39.86, 40.08, tm));
    I5.sweep.position.x = -0.66 + 1.32 * su;
    I5.anchors.sweep[0] = HB.x + I5.sweep.position.x;
    setFade(I5.sweep, aRoot * sw);

    for (i = 0; i < 4; i++) {
      var sui = (I5.modX[i] + 0.66) / 1.32;
      var ti = S5.sweep.in + sui * (S5.sweep.out - S5.sweep.in);
      var drop = 0.20 * U.smooth(ti, ti + 0.24, tm);
      I5.drop[i] = drop;
      I5.mods[i].position.y = 0.02 - drop;
      var hot = Math.exp(-Math.abs(su - sui) * 55);
      var fill = I5.mods[i].children[0].material;
      fill.opacity = (0.10 + 0.32 * hot * sw) * aRoot;
    }
  }

  function buildAnchors() {
    var R = SEC.R, L = SEC.L;
    S.anchors = {
      A: [TW.x + SND.xA, TW.y + R + 0.086, 0],
      B: [TW.x + SND.xB, TW.y + R + 0.086, 0],
      P1: [TW.x + SND.P.P1[0], TW.y + SND.P.P1[1], 0],
      P2: [TW.x + SND.P.P2[0], TW.y + SND.P.P2[1], 0],
      P3: [TW.x + SND.P.P3[0], TW.y + SND.P.P3[1], 0],
      Pv: [TW.x + SND.P.Pv[0], TW.y + SND.P.Pv[1], 0],
      full: [TW.x + 0.78, TW.y + 0.01, 0],
      flow: [TW.x - 0.55, TW.y + 0.02, 0]
    };
  }

  var _pv = null;
  function project(p) {
    if (!_pv) _pv = new THREE.Vector3();
    _pv.set(p[0], p[1], p[2]).project(S.camera);
    return {
      x: (_pv.x * 0.5 + 0.5) * BL.CONFIG.W,
      y: (-_pv.y * 0.5 + 0.5) * BL.CONFIG.H,
      z: _pv.z,
      vis: _pv.z > -1 && _pv.z < 1
    };
  }

  /* 02：半剖 + 满管 + 流速粒子 */
  function stepSec(t) {
    var S2 = BL.SEC['02'];
    var a = U.smooth(S2.intro.in, S2.intro.out, t);
    if (S.sec) {
      S.sec.group.visible = a > 0.002;
      for (var i = 0; i < S.sec.mats.length; i++) {
        S.sec.mats[i].mat.uniforms.uAlpha.value = S.sec.mats[i].base * a;
      }
      S.sec.waterMat.opacity = 0.50 * a;
      S.sec.wallMat.opacity = 0.72 * a;
      S.sec.shellMat.opacity = 0.22 * a;
    }
    if (S.flow) {
      var f = U.smooth(S2.flow.in, S2.flow.out, t);
      S.flow.visible = a > 0.002;
      S.flowMat.uniforms.uAlpha.value = a * (0.60 + 0.40 * f);
      S.flowMat.uniforms.uFlow.value = f;
      S.flowMat.uniforms.uT.value = Math.max(0, t - S2.flow.in);
    }
  }


  var UP;

  function setBase() {
    var C = BL.CONFIG.CAM, az = C.az * DEG, el = C.el * DEG, d = C.dist;
    S.camera.position.set(
      S.target.x + d * Math.cos(el) * Math.sin(az),
      S.target.y + d * Math.sin(el),
      S.target.z + d * Math.cos(el) * Math.cos(az)
    );
    S.camera.lookAt(S.target);
  }

  function makeFallbackOrbit(canvas) {
    var st = { target: S.target };
    var sph = { r: BL.CONFIG.CAM.dist, az: BL.CONFIG.CAM.az * DEG, el: BL.CONFIG.CAM.el * DEG };
    function apply() {
      S.camera.position.set(
        st.target.x + sph.r * Math.cos(sph.el) * Math.sin(sph.az),
        st.target.y + sph.r * Math.sin(sph.el),
        st.target.z + sph.r * Math.cos(sph.el) * Math.cos(sph.az)
      );
      S.camera.lookAt(st.target);
    }
    var drag = false, px = 0, py = 0;
    canvas.addEventListener('pointerdown', function (e) {
      drag = true; px = e.clientX; py = e.clientY;
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', function () { drag = false; });
    canvas.addEventListener('pointercancel', function () { drag = false; });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      sph.az -= (e.clientX - px) * 0.005;
      sph.el = U.clamp(sph.el + (e.clientY - py) * 0.004, 18 * DEG, 100 * DEG);
      px = e.clientX; py = e.clientY; apply();
    });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      sph.r = U.clamp(sph.r * (1 + (e.deltaY > 0 ? 0.06 : -0.06)), 3.2, 16);
      apply();
    }, { passive: false });
    /* 每帧把相机实际位置读回球坐标，避免与漂移打架 */
    st.update = function () {
      var off = S.camera.position.clone().sub(st.target);
      sph.r = off.length() || 7.35;
      sph.el = U.clamp(Math.asin(U.clamp(off.y / sph.r, -1, 1)), 18 * DEG, 100 * DEG);
      sph.az = Math.atan2(off.x, off.z);
    };
    apply();
    return st;
  }

  function setupControls(canvas) {
    if (THREE.OrbitControls) {
      var c = new THREE.OrbitControls(S.camera, canvas);
      c.target.copy(S.target);
      c.enableDamping = true;
      c.dampingFactor = 0.075;
      c.rotateSpeed = 0.55;
      c.zoomSpeed = 0.60;
      c.enablePan = false;
      c.minDistance = 0.35;
      c.maxDistance = 20;
      c.minPolarAngle = 18 * DEG;
      c.maxPolarAngle = 100 * DEG;
      c.update();
      S.controls = c;
      S.controlsKind = 'OrbitControls';
    } else {
      S.controls = makeFallbackOrbit(canvas);
      S.controlsKind = 'fallback';
    }
  }

  function init(canvas) {
    var C = BL.CONFIG;
    UP = new THREE.Vector3(0, 1, 0);

    S.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, premultipliedAlpha: false });
    S.renderer.setPixelRatio(1);
    S.renderer.setSize(C.W, C.H, false);
    S.renderer.setClearColor(0x000000, 0);
    if ('outputEncoding' in S.renderer && THREE.sRGBEncoding !== undefined) S.renderer.outputEncoding = THREE.sRGBEncoding;

    S.scene = new THREE.Scene();
    S.camera = new THREE.PerspectiveCamera(34, C.W / C.H, 0.05, 400);
    S.target = new THREE.Vector3(C.CAM.tx, C.CAM.ty, C.CAM.tz);
    setBase();
    setupControls(canvas);

    buildGrid();
    buildTwin();
    buildGhost();
    buildSection();
    buildFlow();
    buildSound();
    buildInstall();
    buildBus();
    buildAnchors();
  }

  /* ---------- 时间驱动：孪生浮现 / 溶解 / 轮廓接管 / 网格淡入 ---------- */
  function step(t) {
    var W0 = BL.W0;
    var inP = U.smooth(W0.scanReveal.in, W0.scanReveal.out, t);
    var outP = U.smooth(W0.diss.in, W0.diss.out, t);
    var i;
    for (i = 0; i < S.twinMats.length; i++) {
      S.twinMats[i].mat.uniforms.uIn.value = inP;
      S.twinMats[i].mat.uniforms.uOut.value = outP;
    }
    S.twin.visible = inP > 0.002 && outP < 0.995;

    var gh = U.smooth(9.74, 9.99, t) * (1 - U.smooth(10.00, 10.34, t));
    for (i = 0; i < S.ghostMats.length; i++) S.ghostMats[i].mat.opacity = S.ghostMats[i].base * gh;
    S.ghost.visible = gh > 0.002;

    S.gridMat.uniforms.uAlpha.value = 0.95 * U.smooth(9.26, 9.64, t);
    S.grid.visible = S.gridMat.uniforms.uAlpha.value > 0.002;

    stepSec(t);
    stepSound(t);
    stepInstall(t);
    stepBus(t);
  }

  /* ---------- 脚本机位：球坐标直接落到相机（rig.js 每帧调用） ---------- */
  function setPose(p) {
    var az = p.az * DEG, el = p.el * DEG, d = p.d;
    S.target.set(p.tx, p.ty, 0);
    S.camera.position.set(
      S.target.x + d * Math.cos(el) * Math.sin(az),
      S.target.y + d * Math.sin(el),
      S.target.z + d * Math.cos(el) * Math.cos(az)
    );
    S.camera.lookAt(S.target);
    if (S.controls && S.controls.target) S.controls.target.copy(S.target);
  }

  /* ---------- 相机微步（rig.js 调用）：围绕 target 的增量旋转 / 推拉 ---------- */
  function nudge(d) {
    var cam = S.camera, tgt = S.controls.target;
    var dx = d.dTx || 0, dy = d.dTy || 0;
    if (dx || dy) {
      tgt.x += dx; tgt.y += dy;
      cam.position.x += dx; cam.position.y += dy;
    }
    var off = cam.position.clone().sub(tgt);
    if (d.dYaw) off.applyAxisAngle(UP, d.dYaw);
    if (d.dPitch) {
      var right = new THREE.Vector3().crossVectors(off, UP);
      if (right.lengthSq() > 1e-8) { right.normalize(); off.applyAxisAngle(right, d.dPitch); }
    }
    if (d.dScale && isFinite(d.dScale) && d.dScale > 0) off.multiplyScalar(d.dScale);
    cam.position.copy(tgt).add(off);
    cam.lookAt(tgt);
  }

  BL.scene = {
    init: init,
    step: step,
    update: function () { if (S.controls && S.controls.update) S.controls.update(); },
    nudge: nudge,
    setPose: setPose,
    project: project,
    zoom: function () { return BL.CONFIG.CAM.dist / (S.camera.position.distanceTo(S.target) || 1); },
    anchors: function () { return S.anchors; },
    inst: function () { return I4; },
    bus: function () { return I5; },
    snd: function () { return SND; },
    pulseX: function () { return SND.follow; },
    render: function () { S.renderer.render(S.scene, S.camera); },
    /* 自检信息：无头截图时用 ?probe=1 打印 */
    info: function (t) {
      var p = S.camera.position, tg = S.controls.target;
      return 'three=' + (window.THREE ? THREE.REVISION : 'none') +
        ' ctl=' + S.controlsKind +
        ' t=' + t.toFixed(2) +
        ' cam=(' + p.x.toFixed(2) + ',' + p.y.toFixed(2) + ',' + p.z.toFixed(2) + ')' +
        ' dist=' + p.distanceTo(tg).toFixed(2) +
        ' tgt=(' + tg.x.toFixed(2) + ',' + tg.y.toFixed(2) + ')' +
        ' sec=' + (S.sec ? S.sec.group.visible : '-') +
        ' flow=' + (S.flow ? S.flowMat.uniforms.uFlow.value.toFixed(2) : '-') +
        ' snd=' + SND.mode + '/' + SND.dir + '/hits' + SND.hits +
        ' pulse=' + SND.uP.toFixed(2) + ',g=' + SND.matW.uniforms.uG.value.toFixed(2) +
        ',a=' + SND.matW.uniforms.uAlpha.value.toFixed(2) +
        ',head=' + SND.headMat.uniforms.uAlpha.value.toFixed(2) +
        '@' + SND.head.position.x.toFixed(2) + ',' + SND.head.position.y.toFixed(2) +
        ' ghost=' + (S.ghostMats[0] ? S.ghostMats[0].mat.opacity.toFixed(2) : '-') +
        ' grid=' + S.gridMat.uniforms.uAlpha.value.toFixed(2);
    },
    state: S
  };
})(window.BL);
