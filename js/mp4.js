/* ==========================================================================
   mp4.js · 最小 MP4(ISO BMFF) 封装器
   · 单视频轨 H.264（AVCC 长度前缀）+ avcC，faststart（moov 在 mdat 前）
   · 恒定帧率：sample_delta 固定 → 剪辑软件按 24 fps 精确对齐，可逐帧剪
   · 带 stss 关键帧索引，拖动/切割都正常
   ========================================================================== */
window.BL = window.BL || {};
(function (BL) {
  'use strict';

  function u32(v) {
    var b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, v >>> 0);
    return b;
  }
  function u16(v) {
    var b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, v & 0xffff);
    return b;
  }
  function s16(v) {
    var b = new Uint8Array(2);
    new DataView(b.buffer).setInt16(0, v);
    return b;
  }
  function s4(s) {
    var b = new Uint8Array(4);
    for (var i = 0; i < 4; i++) b[i] = s.charCodeAt(i);
    return b;
  }
  function cat(parts) {
    var n = 0, i;
    for (i = 0; i < parts.length; i++) n += parts[i].length;
    var out = new Uint8Array(n), o = 0;
    for (i = 0; i < parts.length; i++) { out.set(parts[i], o); o += parts[i].length; }
    return out;
  }

  /* 普通 box：长度 + 类型 + 负载 */
  function box(type, parts) {
    var body = cat(parts || []);
    var out = new Uint8Array(8 + body.length);
    new DataView(out.buffer).setUint32(0, 8 + body.length);
    out.set(s4(type), 4);
    out.set(body, 8);
    return out;
  }

  /* full box：加 version + flags */
  function full(type, ver, flags, parts) {
    var vf = new Uint8Array(4);
    vf[0] = ver;
    vf[1] = (flags >> 16) & 0xff;
    vf[2] = (flags >> 8) & 0xff;
    vf[3] = flags & 0xff;
    return box(type, [vf].concat(parts || []));
  }

  var MATRIX = cat([
    u32(0x00010000), u32(0), u32(0),
    u32(0), u32(0x00010000), u32(0),
    u32(0), u32(0), u32(0x40000000)
  ]);

  function build(opt) {
    var W = opt.w, H = opt.h, fps = opt.fps, frames = opt.frames, desc = opt.desc;
    var N = frames.length;
    var mts = fps * 1000;                  /* 媒体时间基：24 000 */
    var delta = 1000;                      /* 每帧 1000 → 严格 fps */
    var durMs = Math.round(N * 1000 / fps);

    var sizes = [], keys = [], i;
    for (i = 0; i < N; i++) {
      sizes.push(frames[i].data.length);
      if (frames[i].key) keys.push(i + 1);  /* stss 用 1 起始序号 */
    }

    function makeMoov(chunkOffset) {
      var mvhd = full('mvhd', 0, 0, [
        u32(0), u32(0), u32(1000), u32(durMs), u32(0x00010000),
        u16(0x0100), u16(0), u32(0), u32(0),
        MATRIX, u32(0), u32(0), u32(0), u32(0), u32(0), u32(0),
        u32(2)
      ]);

      var tkhd = full('tkhd', 0, 3, [
        u32(0), u32(0), u32(1), u32(0), u32(durMs),
        u32(0), u32(0), u16(0), u16(0), u16(0), u16(0),
        MATRIX, u32(W << 16), u32(H << 16)
      ]);

      var mdhd = full('mdhd', 0, 0, [
        u32(0), u32(0), u32(mts), u32(N * delta),
        u16(0x55C4), u16(0)                       /* 语言 und */
      ]);

      var hdlr = full('hdlr', 0, 0, [
        u32(0), s4('vide'), u32(0), u32(0), u32(0),
        cat([s4('Vide'), s4('oHan'), s4('dler'), new Uint8Array([0])])
      ]);

      var vmhd = full('vmhd', 0, 1, [u16(0), u16(0), u16(0), u16(0)]);

      var avc1 = box('avc1', [
        new Uint8Array(6), u16(1), u16(0), u16(0),
        u32(0), u32(0), u32(0),
        u16(W), u16(H),
        u32(0x00480000), u32(0x00480000), u32(0), u16(1),
        (function () {                            /* compressorname：长度前缀 + 填充 32 */
          var b = new Uint8Array(32);
          b[0] = 7;
          for (var k = 0; k < 7; k++) b[1 + k] = 'blander'.charCodeAt(k);
          return b;
        })(),
        u16(0x0018), s16(-1),
        box('avcC', [desc])
      ]);

      var stsd = full('stsd', 0, 0, [u32(1), avc1]);

      var stts = full('stts', 0, 0, [u32(1), u32(N), u32(delta)]);
      var stsc = full('stsc', 0, 0, [u32(1), u32(1), u32(N), u32(1)]);

      var szBody = [u32(0), u32(N)];
      for (i = 0; i < N; i++) szBody.push(u32(sizes[i]));
      var stsz = full('stsz', 0, 0, szBody);

      var stco = full('stco', 0, 0, [u32(1), u32(chunkOffset)]);

      var ssBody = [u32(keys.length)];
      for (i = 0; i < keys.length; i++) ssBody.push(u32(keys[i]));
      var stss = full('stss', 0, 0, ssBody);

      var stbl = box('stbl', [stsd, stts, stsc, stsz, stco, stss]);
      var dinf = box('dinf', [full('dref', 0, 0, [u32(1), full('url ', 0, 1, [])])]);
      var minf = box('minf', [vmhd, dinf, stbl]);
      var mdia = box('mdia', [mdhd, hdlr, minf]);
      var trak = box('trak', [tkhd, mdia]);
      return box('moov', [mvhd, trak]);
    }

    var ftyp = box('ftyp', [s4('isom'), u32(512), s4('isom'), s4('iso2'), s4('avc1'), s4('mp41')]);

    /* 两遍：先求 moov 长度（不含真实偏移），再按真实偏移重建 */
    var probe = makeMoov(0);
    var dataOffset = ftyp.length + probe.length + 8;   /* mdat box 头 8 字节 */
    var moov = makeMoov(dataOffset);

    var total = 0;
    for (i = 0; i < N; i++) total += sizes[i];
    var mdatHead = new Uint8Array(8);
    new DataView(mdatHead.buffer).setUint32(0, 8 + total);
    mdatHead.set(s4('mdat'), 4);

    var parts = [ftyp, moov, mdatHead];
    for (i = 0; i < N; i++) parts.push(frames[i].data);
    return new Blob(parts, { type: 'video/mp4' });
  }

  BL.mp4 = { build: build };
})(window.BL);
