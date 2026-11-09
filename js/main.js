/* ==========================================================================
   main.js · 启动顺序：布局 → 依赖（three + OrbitControls）→ 场景 → 相机 → 播放器
   ========================================================================== */
window.BL = window.BL || {};
(function (BL) {
  'use strict';

  var U = BL.util;

  function boot() {
    try {
      /* 调试开关：?nogl=1 隐藏 WebGL 层，?nohud=1 隐藏 HUD 层，
         ?hide=scanBand,heroClip 隐藏指定 id（排查叠层用） */
      var q = location.search;
      if (/[?&]nogl=1/.test(q)) document.getElementById('gl').style.display = 'none';
      if (/[?&]nohud=1/.test(q)) document.getElementById('hud').style.display = 'none';
      var hm = /[?&]hide=([^&]+)/.exec(q);
      if (hm) hm[1].split(',').forEach(function (id) {
        var n = document.getElementById(id);
        if (n) n.style.display = 'none';
      });

      BL.hud.init();
      BL.scene.init(document.getElementById('gl'));
      BL.rig.init();
      BL.player.init();
      if (BL.exporter) BL.exporter.init();
    } catch (e) {
      U.fail(e && e.stack ? e.stack : String(e));
    }
  }

  function start() {
    U.layoutStage();
    window.addEventListener('resize', U.layoutStage);
    window.addEventListener('orientationchange', U.layoutStage);
    BL.loadVendor(boot);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window.BL);
