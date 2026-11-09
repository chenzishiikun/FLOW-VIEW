/* ==========================================================================
   webm.js · 最小 WebM(Matroska) 封装器
   · 只为「导出逐帧视频」服务：单视频轨（VP9 / VP8），时间戳由调用方精确给出
   · MediaRecorder 的时间戳不可控（会压缩/丢帧导致成片变短），故自己封装
   ========================================================================== */
window.BL = window.BL || {};
(function (BL) {
  'use strict';

  function cat(parts) {
    var n = 0, i;
    for (i = 0; i < parts.length; i++) n += parts[i].length;
    var out = new Uint8Array(n), o = 0;
    for (i = 0; i < parts.length; i++) { out.set(parts[i], o); o += parts[i].length; }
    return out;
  }

  var TE = new TextEncoder();

  /* 元素 ID（已含长度标记位）→ 字节 */
  function idv(id) {
    var b = [], v = id;
    while (v > 0) { b.unshift(v & 0xff); v = Math.floor(v / 256); }
    return new Uint8Array(b);
  }

  /* EBML 大小（vint）→ 字节 */
  function sv(len) {
    var n = len < 127 ? 1 : len < 16383 ? 2 : len < 2097151 ? 3 : len < 268435455 ? 4 : 5;
    var out = new Uint8Array(n), v = len, i;
    for (i = n - 1; i >= 0; i--) { out[i] = v & 0xff; v = Math.floor(v / 256); }
    out[0] |= (0x80 >> (n - 1));
    return out;
  }

  function el(id, payload) { return cat([idv(id), sv(payload.length), payload]); }

  function uintEl(id, v) {
    var b = [], x = v;
    do { b.unshift(x & 0xff); x = Math.floor(x / 256); } while (x > 0);
    return el(id, new Uint8Array(b));
  }

  function u8(id, v) { return el(id, new Uint8Array([v])); }

  function f64(id, v) {
    var b = new Uint8Array(8);
    new DataView(b.buffer).setFloat64(0, v, false);
    return el(id, b);
  }

  function str(id, s) { return el(id, TE.encode(s)); }

  /* 简单块：track 1，相对时间戳 int16，flags 高位=关键帧 */
  function block(data, rel, key) {
    var head = new Uint8Array(4);
    head[0] = 0x81;                                     /* track 1（vint） */
    head[1] = (rel >> 8) & 0xff;
    head[2] = rel & 0xff;
    head[3] = key ? 0x80 : 0x00;
    return cat([head, data]);
  }

  /* 头：EBML + Segment(Info, Tracks) + 所有 Cluster */
  function build(opt) {
    var W = opt.w, H = opt.h, fps = opt.fps, frames = opt.frames, codec = opt.codec;

    var header = el(0x1A45DFA3, cat([
      uintEl(0x4286, 1),          /* EBMLVersion */
      uintEl(0x42F7, 1),          /* EBMLReadVersion */
      uintEl(0x42F2, 4),          /* EBMLMaxIDLength */
      uintEl(0x42F3, 8),          /* EBMLMaxSizeLength */
      str(0x4282, 'webm'),        /* DocType */
      uintEl(0x4287, 4),          /* DocTypeVersion */
      uintEl(0x4285, 2)           /* DocTypeReadVersion */
    ]));

    var durMs = frames.length * 1000 / fps;

    var info = el(0x1549A966, cat([
      uintEl(0x2AD7B1, 1000000),  /* TimestampScale：1 ms */
      str(0x4D80, 'blander'),
      str(0x5741, 'blander'),
      f64(0x4489, durMs)          /* Duration（ms） */
    ]));

    var track = el(0x1654AE6B, el(0xAE, cat([
      uintEl(0xD7, 1),            /* TrackNumber */
      uintEl(0x73C5, 1),          /* TrackUID */
      uintEl(0x83, 1),            /* TrackType：video */
      uintEl(0x9C, 0),            /* FlagLacing */
      str(0x86, codec),           /* CodecID：V_VP9 / V_VP8 */
      el(0xE0, cat([             /* Video */
        uintEl(0xB0, W),          /* PixelWidth */
        uintEl(0xBA, H)           /* PixelHeight */
      ]))
    ])));

    /* 每 30 帧或相对时间戳溢出前换一个新 Cluster */
    var clusters = [], i = 0;
    while (i < frames.length) {
      var start = i, first = frames[i].t, blocks = [];
      while (i < frames.length && i - start < 30 && frames[i].t - first <= 30000) {
        var rel = frames[i].t - first;
        blocks.push(block(frames[i].data, rel, frames[i].key));
        i++;
      }
      clusters.push(el(0x1F43B675, cat([uintEl(0xE7, first)].concat(blocks))));
    }

    var segBody = cat([info, track].concat(clusters));
    var segment = cat([idv(0x18538067), sv(segBody.length), segBody]);
    return new Blob([header, segment], { type: 'video/webm' });
  }

  BL.webm = { build: build };
})(window.BL);
