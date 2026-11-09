/* ==========================================================================
   player.js · 固定帧步进时间轴（24 fps）
   · 播放 / 暂停 / 回放 / 倍速（0.5× / 1× / 2×）
   · 进度条拖动回看（分段方块 + 三角播放头）
   · 键盘：空格 播放/暂停，← → 逐帧寻位，Home 回开头
   · 渲染循环恒速跑：即使暂停，相机也按底噪继续漂移（绝不硬静止）
   ========================================================================== */
window.BL = window.BL || {};
(function (BL) {
  'use strict';

  var U = BL.util;
  var C = BL.CONFIG;
  var STEP = 1 / C.FPS;

  var P = {
    T: C.T_START,
    playing: true,
    speed: 1,
    acc: 0,
    lastWall: 0,
    still: false,
    dragging: false,
    quiet: false
  };

  function syncBtn() {
    var b = U.$('#btnPlay');
    if (b) b.textContent = P.playing ? '暂停' : '继续';
  }

  function render(t) {
    BL.scene.step(t);
    /* 先把脚本机位落到当前 t，再画 HUD：否则标签会用上一帧/初始机位投影，
       在 ?still=1 截图或拖动进度条后明显错位 */
    var shot = BL.rig && BL.rig.shotAt && BL.rig.shotAt(t);
    if (shot) BL.scene.setPose(shot);
    BL.hud.paintAll(t);
  }

  function seek(t) {
    P.T = U.clamp(t, C.T_START, C.T_BUILT);
    P.acc = 0;
    render(P.T);
  }

  /* ---------------- 进度条拖动 ---------------- */
  function bindProgress() {
    var prog = BL.hud.progressEl();
    function at(clientX) {
      var t = BL.hud.timeAtX(U.stageX(clientX));
      seek(t);
    }
    prog.addEventListener('pointerdown', function (e) {
      P.dragging = true;
      if (prog.setPointerCapture) prog.setPointerCapture(e.pointerId);
      at(e.clientX);
      e.preventDefault();
    });
    prog.addEventListener('pointermove', function (e) { if (P.dragging) at(e.clientX); });
    prog.addEventListener('pointerup', function () { P.dragging = false; });
    prog.addEventListener('pointercancel', function () { P.dragging = false; });
  }

  /* ---------------- 控制条 / 键盘 ---------------- */
  function bindUI() {
    U.$('#btnPlay').addEventListener('click', function () {
      if (!P.playing && P.T >= C.T_BUILT - 1e-4) seek(C.T_START);
      P.playing = !P.playing;
      syncBtn();
    });
    U.$('#btnRestart').addEventListener('click', function () {
      seek(C.T_START);
      P.playing = true;
      syncBtn();
    });
    var spd = U.$('#spd');
    spd.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b || !b.dataset.s) return;
      P.speed = parseFloat(b.dataset.s);
      Array.prototype.forEach.call(spd.children, function (x) { x.classList.toggle('on', x === b); });
    });

    bindProgress();

    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space') {
        e.preventDefault();
        P.playing = !P.playing;
        syncBtn();
      } else if (e.code === 'ArrowRight') {
        seek(P.T + STEP * (e.shiftKey ? 24 : 1));
      } else if (e.code === 'ArrowLeft') {
        seek(P.T - STEP * (e.shiftKey ? 24 : 1));
      } else if (e.code === 'Home') {
        seek(C.T_START);
      }
    });

    var ctrl = U.$('#ctrl'), hideTimer = 0;
    U.$('#stage').addEventListener('mousemove', function () {
      ctrl.classList.add('show');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { ctrl.classList.remove('show'); }, 2400);
    });
  }

  /* ---------------- 主循环 ---------------- */
  function frame(now) {
    /* 导出中：主循环让路（导出器自己同步重绘），避免抢 CPU 和抢相机 */
    if (P.quiet) { requestAnimationFrame(frame); return; }

    var dt = P.lastWall ? Math.min(0.05, (now - P.lastWall) / 1000) : 0.016;
    P.lastWall = now;

    if (P.playing && !P.still) {
      P.acc += dt * P.speed;
      var guard = 0;
      while (P.acc >= STEP && guard++ < 10) {
        P.acc -= STEP;
        P.T += STEP;
        if (P.T >= C.T_BUILT) {
          P.T = C.T_BUILT;
          P.playing = false;
          syncBtn();
          render(P.T);
          break;
        }
        render(P.T);
      }
    }

    /* 相机：脚本运镜 → 底噪漂移（暂停时仍在动） */
    BL.scene.update();
    BL.rig.step(P.still ? 0 : dt, P.T, { playing: P.playing, still: P.still });
    BL.hud.paintAnchors(P.T);
    BL.hud.paintPins(P.T);
    BL.scene.render();

    requestAnimationFrame(frame);
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    var q = location.search;
    var m = /[?&]t=([\d.]+)/.exec(q);
    if (m) P.T = U.clamp(parseFloat(m[1]), C.T_START, C.T_BUILT);
    P.still = /[?&]still=1/.test(q);

    bindUI();
    render(P.T);
    syncBtn();
    P.lastWall = 0;
    requestAnimationFrame(frame);

    if (/[?&]probe=1/.test(q)) {
      var probeT = P.still ? 'still' : 'live';
      var rc = function (sel) {
        var e = U.$(sel);
        if (!e) return '-';
        var r = e.getBoundingClientRect();
        return Math.round(r.top) + '..' + Math.round(r.bottom);
      };
      setInterval(function () {
        U.log(BL.scene.info(P.T) + '\nrigMoved=' + BL.rig.moved().toFixed(1) +
          '°  phase=' + BL.rig.phase().toFixed(2) + 's  mode=' + probeT +
          '\nplay=' + P.playing + '  speed=' + P.speed +
          '\ncard=' + rc('#card') + ' dtbar=' + rc('#dtbar') + ' fboard=' + rc('#fboard') +
          ' decide=' + rc('#decide') + ' raw=' + rc('#raw'));
      }, 350);
    }
  }

  BL.player = {
    init: init,
    seek: seek,
    time: function () { return P.T; },
    isPlaying: function () { return P.playing; },
    /* 导出用：暂停主循环推进 / 冻结相机底噪，保证逐帧可复现 */
    play: function () { P.playing = true; syncBtn(); },
    pause: function () { P.playing = false; syncBtn(); },
    setStill: function (v) { P.still = !!v; },
    still: function () { return P.still; },
    /* 导出用：主循环空转（不渲染、不推 HUD），由导出器独占渲染 */
    setQuiet: function (v) { P.quiet = !!v; if (!P.quiet) P.lastWall = 0; }
  };
})(window.BL);
