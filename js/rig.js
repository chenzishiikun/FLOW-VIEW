/* ==========================================================================
   rig.js · 相机：脚本运镜（SHOTS）叠加有界底噪漂移
   · 脚本区间内由 SHOTS 直接接管机位（球坐标），漂移以偏移量叠加其上
   · 漂移 = 分段方向噪声的差值（有界，不会越走越远）+ 恒定爬行
   · 缓速窗口（公式处 0.1×）只放慢漂移，绝不归零：镜头全程在动
   · 无脚本区间（W0）保留用户 OrbitControls 拖动，漂移用增量叠加
   ========================================================================== */
window.BL = window.BL || {};
(function (BL) {
  'use strict';

  var U = BL.util, DEG = U.DEG;

  /* 换向周期（秒）：全部落在 3–5 s */
  var PERIOD = { yaw: 3.3, pitch: 4.2, dolly: 4.7, tx: 3.9, ty: 3.5 };
  var CRAWL_YAW = 0.12;     // 恒定爬行（度/秒）
  var BREATH = 0.014;       // 5.3 s 推拉呼吸（比例）
  var FREECAM = /[?&]freecam=1/.test(location.search);

  var R = {
    phase: 0,
    crawl: 0,
    zoom: 1,
    lastT: null,
    moved: 0,
    n0: { yaw: 0, pitch: 0, dolly: 0, tx: 0, ty: 0 },
    drift: { yaw: 0, pitch: 0, dolly: 0, tx: 0, ty: 0 },
    pd: { yaw: 0, pitch: 0, dolly: 0, tx: 0, ty: 0, zoom: 1 }
  };

  function noiseAt(p) {
    return {
      yaw: U.dirNoise(p, PERIOD.yaw, 3.1),
      pitch: U.dirNoise(p, PERIOD.pitch, 8.4),
      dolly: U.dirNoise(p, PERIOD.dolly, 5.6),
      tx: U.dirNoise(p, PERIOD.tx, 2.2),
      ty: U.dirNoise(p, PERIOD.ty, 6.9)
    };
  }

  /* ---------- 运镜脚本求值 ---------- */
  function pack(k) { return { az: k[1], el: k[2], d: k[3], tx: k[4], ty: k[5] }; }
  function mix(a, b, u) {
    return {
      az: U.lerp(a[1], b[1], u), el: U.lerp(a[2], b[2], u), d: U.lerp(a[3], b[3], u),
      tx: U.lerp(a[4], b[4], u), ty: U.lerp(a[5], b[5], u)
    };
  }
  function ease(kind, u) {
    if (kind === 'in') return u * u * u;
    if (kind === 'out') return 1 - Math.pow(1 - u, 3);
    return U.easeIO(u);
  }
  function shotAt(t) {
    var list = BL.SHOTS || [];
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (t < s.t0 || t > s.t1) continue;
      var k = s.keys, n = k.length, r;
      if (t <= k[0][0]) r = pack(k[0]);
      else {
        r = pack(k[n - 1]);
        for (var j = 0; j < n - 1; j++) {
          if (t >= k[j][0] && t <= k[j + 1][0]) {
            r = mix(k[j], k[j + 1], ease(s.ease, U.inv(k[j][0], k[j + 1][0], t)));
            break;
          }
        }
      }
      r.follow = !!s.follow;
      return r;
    }
    return null;
  }

  function init() {
    R.phase = 0; R.crawl = 0; R.lastT = null; R.moved = 0;
    R.n0 = noiseAt(0);
    R.drift = { yaw: 0, pitch: 0, dolly: 0, tx: 0, ty: 0 };
    R.pd = { yaw: 0, pitch: 0, dolly: 0, tx: 0, ty: 0, zoom: 1 };
    R.zoom = 1 + BREATH * U.noise1(0, 7.7);
  }

  /* ---------- 漂移推进（dt 已乘缓速倍率） ---------- */
  function advance(dt) {
    var DR = BL.CONFIG.DRIFT;
    R.phase += dt;
    R.crawl += CRAWL_YAW * dt;
    var v = noiseAt(R.phase);
    R.drift.yaw = R.crawl + (v.yaw - R.n0.yaw) * DR.yaw;
    R.drift.pitch = (v.pitch - R.n0.pitch) * DR.pitch;
    R.drift.dolly = (v.dolly - R.n0.dolly) * DR.dolly;
    R.drift.tx = (v.tx - R.n0.tx) * DR.tx;
    R.drift.ty = (v.ty - R.n0.ty) * DR.ty;
    R.zoom = 1 + BREATH * U.noise1(R.phase * 0.19, 7.7);
  }

  function w0zoom(t) { return t < 9.99 ? U.curve(BL.W0.zoom, t) : 1; }

  function poseFrom(base) {
    return {
      az: base.az + R.drift.yaw,
      el: U.clamp(base.el + R.drift.pitch, 1.5, 89),
      d: Math.max(0.28, base.d * R.zoom * (1 + R.drift.dolly)),
      tx: base.tx + R.drift.tx,
      ty: base.ty + R.drift.ty
    };
  }

  function step(dt, t, mode) {
    mode = mode || {};
    var rate = BL.camRate(t);
    var d = dt * rate;
    if (d > 0) advance(d);

    var shot = shotAt(t);
    /* 跟拍：反射点段机位随脉冲平移（滞后 0.2 声程），保证脉冲头不出画 */
    if (shot && shot.follow && BL.scene.pulseX) {
      var f = BL.scene.pulseX();
      if (f) shot = { az: shot.az, el: shot.el, d: shot.d, tx: f.x, ty: shot.ty };
    }
    var seeked = (R.lastT === null) || Math.abs(t - R.lastT) > 0.12;
    R.lastT = t;

    if (shot && !FREECAM) {
      BL.scene.setPose(poseFrom(shot));
    } else if (!shot && seeked) {
      var C = BL.CONFIG.CAM;
      BL.scene.setPose(poseFrom({ az: C.az, el: C.el, d: C.dist * w0zoom(t), tx: C.tx, ty: C.ty }));
    } else {
      /* 无脚本且非跳转：只把漂移的增量叠上去（保留用户拖动结果） */
      var dYaw = (R.drift.yaw - R.pd.yaw) * DEG;
      var dPitch = (R.drift.pitch - R.pd.pitch) * DEG;
      var dScale = ((1 + R.drift.dolly) / (1 + R.pd.dolly)) * (R.zoom / R.pd.zoom);
      var dTx = R.drift.tx - R.pd.tx, dTy = R.drift.ty - R.pd.ty;
      if (dYaw || dPitch || dTx || dTy || Math.abs(dScale - 1) > 1e-6) {
        BL.scene.nudge({ dYaw: dYaw, dPitch: dPitch, dScale: dScale, dTx: dTx, dTy: dTy });
      }
      R.moved += Math.abs(dYaw) * 57.3 + Math.abs(dPitch) * 57.3 + Math.abs(dTx) * 8;
    }

    R.pd.yaw = R.drift.yaw; R.pd.pitch = R.drift.pitch; R.pd.dolly = R.drift.dolly;
    R.pd.tx = R.drift.tx; R.pd.ty = R.drift.ty; R.pd.zoom = R.zoom;
  }

  BL.rig = {
    init: init,
    step: step,
    shotAt: shotAt,
    /* 自检：累计转过的角度（度），用来证明「全程在动」 */
    moved: function () { return R.moved; },
    phase: function () { return R.phase; },
    drift: function () { return R.drift; }
  };
})(window.BL);

