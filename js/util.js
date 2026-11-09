/* ==========================================================================
   util.js · 数学 / 噪声 / 时间格式 / 舞台缩放 / 出错提示
   ========================================================================== */
window.BL = window.BL || {};
(function (BL) {
  'use strict';

  var U = {};
  U.$ = function (s) { return document.querySelector(s); };
  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.clamp01 = function (v) { return U.clamp(v, 0, 1); };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.inv = function (a, b, x) { return U.clamp01((x - a) / (b - a)); };
  U.smooth = function (a, b, x) { var t = U.inv(a, b, x); return t * t * (3 - 2 * t); };
  U.easeIO = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  U.DEG = Math.PI / 180;
  U.fmtTC = function (s) {
    var m = Math.floor(s / 60), r = s - m * 60;
    return String(m).padStart(2, '0') + ':' + r.toFixed(2).padStart(5, '0');
  };
  U.escapeHtml = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  /* 可复现伪随机：不用 Math.random，保证逐帧/逐次回放完全一致 */
  U.hash1 = function (n, s) {
    var x = Math.sin(n * 127.1 + (s || 0) * 311.7 + 0.123) * 43758.5453123;
    return x - Math.floor(x);
  };

  /* 平滑值噪声，返回 -1..1 */
  U.noise1 = function (x, s) {
    var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return U.lerp(U.hash1(i, s) * 2 - 1, U.hash1(i + 1, s) * 2 - 1, u);
  };

  /* 分段方向噪声：每 period 秒换一次方向，段间平滑过渡（-1..1）
     —— 相机漂移用它，方向 3–5 s 一换 */
  U.dirNoise = function (t, period, seed) {
    var k = Math.floor(t / period), f = t / period - k;
    var u = f * f * (3 - 2 * f);
    return U.lerp(U.hash1(k, seed) * 2 - 1, U.hash1(k + 1, seed) * 2 - 1, u);
  };

  /* 关键帧曲线（带缓动），keys = [[t, v], ...] */
  U.curve = function (keys, t) {
    if (!keys || !keys.length) return 1;
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 0; i < keys.length - 1; i++) {
      var a = keys[i], b = keys[i + 1];
      if (t >= a[0] && t <= b[0]) return U.lerp(a[1], b[1], U.easeIO(U.inv(a[0], b[0], t)));
    }
    return keys[keys.length - 1][1];
  };

  /* 16:9 舞台：只整体缩放，不重排 */
  U.layoutStage = function () {
    var stage = U.$('#stage');
    if (!stage) return;
    var s = Math.min(window.innerWidth / BL.CONFIG.W, window.innerHeight / BL.CONFIG.H);
    stage.style.transform = 'translate(-50%,-50%) scale(' + s.toFixed(4) + ')';
  };

  /* 屏幕坐标 → 舞台逻辑坐标（用于进度条拖动） */
  U.stageX = function (clientX) {
    var stage = U.$('#stage');
    var r = stage.getBoundingClientRect();
    var s = r.width / BL.CONFIG.W;
    return (clientX - r.left) / (s || 1);
  };

  /* 出错提示：写进 #dbg，控制台同步 */
  U.fail = function (msg) {
    var dbg = U.$('#dbg');
    if (dbg) { dbg.style.display = 'block'; dbg.textContent = 'ERROR: ' + msg; }
    if (window.console) console.error(msg);
  };
  U.log = function (msg) {
    var dbg = U.$('#dbg');
    if (dbg) { dbg.style.display = 'block'; dbg.textContent = String(msg); }
  };
  window.addEventListener('error', function (e) {
    U.fail((e.message || 'error') + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || ''));
  });

  BL.util = U;
})(window.BL);
