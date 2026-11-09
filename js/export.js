/* ==========================================================================
   export.js · 导出视频（离线逐帧 → MP4/H.264）
   · 主路径 WebCodecs：VideoEncoder 逐帧编码 H.264（avc1）→ mp4.js 封 MP4，
     faststart + 恒定帧率 + stss 索引，剪辑软件可直接拖入逐帧剪
   · 时间戳由我们给定 → 成片时长严格 = (to - from)，与机器快慢无关
   · 回退链：VP9/VP8 → webm.js；再不济 MediaRecorder（时间戳不可控）
   · 每帧：推进 3D 内容层（不重绘 DOM HUD）→ 同步重绘 → 合成 1280×720
   · 导出期间主循环空转、相机底噪冻结，保证可复现
   ========================================================================== */
window.BL = window.BL || {};
(function (BL) {
  'use strict';

  var U = BL.util;
  var E = { busy: false, cancel: false, done: 0, total: 0, last: null, blob: null };

  function raf() {
    return new Promise(function (res) { requestAnimationFrame(function () { res(); }); });
  }

  function btn() { return U.$('#btnExp'); }
  function label(s) { var b = btn(); if (b) b.textContent = s; }

  function stamp(cx, t, W, H) {
    var sec = BL.secAt(t);
    cx.save();
    cx.font = '600 22px "Noto Sans SC","Microsoft YaHei",sans-serif';
    cx.fillStyle = 'rgba(255,255,255,.92)';
    cx.fillText(sec.num + '  ' + sec.title, 40, 52);
    cx.font = '400 15px "Noto Sans SC","Microsoft YaHei",sans-serif';
    cx.fillStyle = 'rgba(140,190,215,.85)';
    cx.fillText(sec.sub + '  ·  ' + sec.mod, 40, 76);
    cx.font = '500 16px Consolas,monospace';
    cx.fillStyle = 'rgba(140,230,245,.9)';
    cx.textAlign = 'right';
    cx.fillText(U.fmtTC(t), W - 40, 52);
    cx.font = '400 13px "Noto Sans SC","Microsoft YaHei",sans-serif';
    cx.fillStyle = 'rgba(120,140,165,.75)';
    cx.fillText('模拟数据 · 仅原理与算法演示 · 非实测结论', W - 40, H - 34);
    cx.restore();
  }

  var W = 1280, H = 720;

  function prepare(from, to) {
    var C = BL.CONFIG, fps = C.FPS;
    var t0 = Math.max(C.T_START, from || C.T_START);
    var t1 = Math.min(C.T_BUILT, to || C.T_BUILT);
    return { fps: fps, step: 1 / fps, t0: t0, t1: t1,
      n: Math.max(1, Math.round((t1 - t0) * fps)) };
  }

  function makeComp() {
    var comp = document.createElement('canvas');
    comp.width = W; comp.height = H;
    return { comp: comp, cx: comp.getContext('2d') };
  }

  function drawFrame(cx, gl, t) {
    cx.clearRect(0, 0, W, H);
    cx.fillStyle = '#04070c';
    cx.fillRect(0, 0, W, H);
    cx.drawImage(gl, 0, 0, W, H);      /* 1920×1080 → 1280×720 等比 */
    stamp(cx, t, W, H);
  }

  function begin(J) {
    J.wasPlaying = BL.player.isPlaying();
    J.wasStill = BL.player.still();
    E.busy = true; E.cancel = false; E.done = 0; E.total = J.n;
    BL.player.pause();
    BL.player.setStill(true);
    BL.player.setQuiet(true);            /* 主循环空转，导出器独占渲染 */
    var b = btn();
    if (b) b.classList.add('running');
    label('导出中 0%');
  }

  function end(J) {
    BL.player.setQuiet(false);
    BL.player.setStill(J.wasStill);
    BL.player.seek(BL.player.time());    /* 恢复 HUD 到当前时刻 */
    if (J.wasPlaying) BL.player.play();
    E.busy = false;
    var b = btn();
    if (b) b.classList.remove('running');
    label('导出视频');
  }

  function tickLabel(i, n) {
    if (i % 8 === 0 || i >= n) label('导出中 ' + Math.round(i / n * 100) + '%');
  }

  /* 生成文件名 + 触发下载，同时把 blob 留在 E.blob 供调试取回 */
  function deliver(blob, J, kind, extra) {
    var ext = kind === 'mp4' ? '.mp4' : '.webm';
    var mime = kind === 'mp4' ? 'video/mp4' : 'video/webm';
    var name = 'blander_B_' + J.t0.toFixed(1) + '-' + J.t1.toFixed(1) + ext;
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
    E.blob = blob;
    E.last = { ok: true, size: blob.size, frames: J.n, mime: mime, name: name,
      dur: J.n / J.fps };
    if (extra) for (var k in extra) E.last[k] = extra[k];
    return E.last;
  }
  /* ---------- 主路径：WebCodecs（时间戳精确） ---------- */
  /* 优先 H.264（MP4，剪辑软件通吃）；VP9/VP8 仅作回退 */
  var CODECS = [
    { codec: 'avc1.640028', avc: { format: 'avc' }, kind: 'mp4' },
    { codec: 'avc1.4D401F', avc: { format: 'avc' }, kind: 'mp4' },
    { codec: 'avc1.42001f', avc: { format: 'avc' }, kind: 'mp4' },
    { codec: 'vp09.00.10.08', kind: 'webm' },
    { codec: 'vp8', kind: 'webm' }
  ];

  function pickEncoder(fps) {
    if (!window.VideoEncoder) return Promise.resolve(null);
    var i = 0;
    function next() {
      if (i >= CODECS.length) return Promise.resolve(null);
      var c = CODECS[i++];
      var cfg = { codec: c.codec, width: W, height: H, bitrate: 6000000, framerate: fps };
      if (c.avc) cfg.avc = c.avc;
      return VideoEncoder.isConfigSupported(cfg).then(function (s) {
        if (s && s.supported) return { cfg: cfg, kind: c.kind, codec: c.codec };
        return next();
      }, next);
    }
    return next();
  }

  function encodeAll(J, comp, cx, gl, cfg) {
    var frames = [], i = 0, desc = null, keyEvery = Math.max(1, Math.round(J.fps * 2));
    return new Promise(function (resolve, reject) {
      var enc;
      try {
        enc = new VideoEncoder({
          output: function (chunk, meta) {
            if (!desc && meta && meta.decoderConfig && meta.decoderConfig.description) {
              desc = new Uint8Array(meta.decoderConfig.description);   /* avcC */
            }
            var buf = new Uint8Array(chunk.byteLength);
            chunk.copyTo(buf);
            frames.push({ data: buf, key: chunk.type === 'key',
              t: Math.round(chunk.timestamp / 1000) });   /* µs → ms */
          },
          error: function (e) { reject(e); }
        });
        enc.configure(cfg);
      } catch (e) { resolve(null); return; }

      function flush() {
        enc.flush().then(function () {
          try { enc.close(); } catch (e) { /* noop */ }
          resolve({ frames: frames, desc: desc });
        }, function (e) { reject(e); });
      }

      function step() {
        if (E.cancel || i >= J.n) return flush();
        var t = Math.min(J.t1, J.t0 + i * J.step);
        /* 直接推进内容层：不碰 HUD（HUD 是 DOM，不进画面），也不等 rAF。
           顺序与 player.render 一致：scene.step → 脚本机位 → 渲染 */
        var shot = BL.rig && BL.rig.shotAt && BL.rig.shotAt(t);
        BL.scene.step(t);
        if (shot) BL.scene.setPose(shot);
        BL.scene.render();
        drawFrame(cx, gl, t);
        var vf;
        try {
          vf = new VideoFrame(comp, { timestamp: Math.round(i * 1e6 / J.fps),
            duration: Math.round(1e6 / J.fps) });
        } catch (e) { reject(e); return; }
        enc.encode(vf, { keyFrame: i % keyEvery === 0 });
        vf.close();
        i++; E.done = i; tickLabel(i, J.n);
        /* 编码队列别堆太深，否则内存飙升；太浅则 CPU 空转 */
        if (enc.encodeQueueSize > 6) setTimeout(step, 2); else step();
      }
      step();
    });
  }
  /* ---------- 回退路径：MediaRecorder（时间戳不可控） ---------- */
  function pickMime() {
    var list = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    for (var i = 0; i < list.length; i++) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(list[i])) return list[i];
    }
    return '';
  }

  function fallback(J, comp, cx, gl) {
    if (!comp.captureStream || !window.MediaRecorder) {
      end(J);
      return Promise.resolve({ ok: false, why: 'unsupported' });
    }
    var mime = pickMime();
    if (!mime) { end(J); return Promise.resolve({ ok: false, why: 'no-webm' }); }

    var stream = comp.captureStream(0), track = stream.getVideoTracks()[0];
    var rec, i = 0, chunks = [];
    try {
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6000000 });
    } catch (e1) {
      try { rec = new MediaRecorder(stream); }
      catch (e2) { end(J); return Promise.resolve({ ok: false, why: 'rec-init' }); }
    }
    E.rec = rec;
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };

    return new Promise(function (resolve) {
      rec.onstop = function () {
        var blob = new Blob(chunks, { type: 'video/webm' });
        var r = deliver(blob, J, 'webm', { path: 'mediarecorder', codec: mime });
        E.rec = null; end(J); resolve(r);
      };
      rec.start();
      var period = 1000 / J.fps, due = performance.now() + period;
      function step() {
        if (E.cancel || i >= J.n) {
          /* 收尾：再推几帧 + 等编码器排空，否则 WebM 只有容器头 */
          var flush = 0;
          (function pump() {
            if (track.requestFrame) track.requestFrame();
            if (++flush < 4) { requestAnimationFrame(pump); return; }
            setTimeout(function () { try { rec.stop(); } catch (e) { /* noop */ } }, 600);
          })();
          return;
        }
        var t = Math.min(J.t1, J.t0 + i * J.step);
        BL.player.seek(t);
        raf().then(function () {
          BL.scene.render();
          drawFrame(cx, gl, t);
          if (track.requestFrame) track.requestFrame();
          i++; E.done = i; tickLabel(i, J.n);
          due += period;
          var wait = due - performance.now();
          if (wait > 1) setTimeout(step, wait); else step();
        });
      }
      step();
    });
  }
  /* 逐帧导出 [from, to]（秒）；返回 Promise<{ok, size, frames, mime, path}> */
  function run(from, to) {
    if (E.busy) return Promise.resolve({ ok: false, why: 'busy' });
    var gl = document.getElementById('gl');
    if (!gl) return Promise.resolve({ ok: false, why: 'unsupported' });
    var J = prepare(from, to), mc = makeComp();
    begin(J);
    return pickEncoder(J.fps).then(function (pick) {
      if (!pick) return fallback(J, mc.comp, mc.cx, gl);
      return encodeAll(J, mc.comp, mc.cx, gl, pick.cfg).then(function (r) {
        if (!r || !r.frames || !r.frames.length) return fallback(J, mc.comp, mc.cx, gl);
        var blob = null;
        try {
          if (pick.kind === 'mp4') {
            if (!r.desc) return fallback(J, mc.comp, mc.cx, gl);   /* 缺 avcC 不能封装 */
            blob = BL.mp4.build({ w: W, h: H, fps: J.fps, frames: r.frames, desc: r.desc });
          } else {
            blob = BL.webm.build({ w: W, h: H, fps: J.fps,
              codec: pick.codec === 'vp8' ? 'V_VP8' : 'V_VP9', frames: r.frames });
          }
        } catch (e) { blob = null; }
        if (!blob || !blob.size) return fallback(J, mc.comp, mc.cx, gl);
        E.frames = r.frames;   /* 调试/自检用：保留编码帧，便于解码验证 */
        var out = deliver(blob, J, pick.kind, { path: 'webcodecs', codec: pick.codec });
        end(J);
        return out;
      }, function () { return fallback(J, mc.comp, mc.cx, gl); });
    });
  }

  function cancel() {
    if (E.busy) { E.cancel = true; label('正在收尾…'); }
  }

  function bind() {
    var b = btn();
    if (!b) return;
    b.addEventListener('click', function () {
      if (E.busy) { cancel(); return; }
      /* 导出整片；期间主循环暂停（结束后恢复播放状态） */
      run(BL.CONFIG.T_START, BL.CONFIG.T_BUILT).then(function (r) {
        if (!r.ok && r.why === 'unsupported') U.log('导出失败：当前浏览器不支持逐帧编码');
        else if (!r.ok && r.why === 'no-webm') U.log('导出失败：不支持 WebM 编码');
      });
    });
  }

  BL.exporter = {
    init: bind,
    run: run,
    cancel: cancel,
    isBusy: function () { return E.busy; },
    progress: function () { return { done: E.done, total: E.total }; },
    last: function () { return E.last; },
    blob: function () { return E.blob; },
    frames: function () { return E.frames; }
  };
})(window.BL);
