/* ==========================================================================
   hud.js · HTML 叠层：章节卡 / 视角标 / 数据卡容器 / 标语 / 指令·代码面板 /
            分段进度条 / 时间码 / W0 定格帧（扫描 + 淡出）
   ========================================================================== */
window.BL = window.BL || {};
(function (BL) {
  'use strict';

  var U = BL.util, $ = U.$;
  var el = {};
  var PROG = { blocks: [], w: 1800, gap: 5 };

  function init() {
    el.chapter = $('#chapter'); el.chNum = $('#chNum'); el.chTitle = $('#chTitle'); el.chSub = $('#chSub');
    el.viewtag = $('#viewtag'); el.viewMod = $('#viewMod');
    el.card = $('#card'); el.cardTitle = $('#cardTitle'); el.cardMeta = $('#cardMeta');
    el.cardCanvas = $('#cardCanvas'); el.cardFoot = $('#cardFoot');
    el.slogan = $('#slogan');
    el.instr = $('#instr'); el.code = $('#code');
    el.instrBody = $('#instrBody'); el.codeBody = $('#codeBody');
    el.instrIdx = $('#instrIdx'); el.codeIdx = $('#codeIdx');
    el.prog = $('#prog'); el.ph = $('#ph'); el.tc = $('#tc');
    el.heroWrap = $('#heroWrap'); el.heroBase = $('#heroBase');
    el.heroClip = $('#heroClip'); el.heroClipImg = $('#heroClipImg');
    el.scanBand = $('#scanBand'); el.vig = $('#heroVignette');

    el.dtbar = $('#dtbar'); el.dtABi = $('#dtAB i'); el.dtBAi = $('#dtBA i');
    el.fboard = $('#fboard'); el.decide = $('#decide'); el.raw = $('#raw'); el.rawGrid = $('#rawGrid');
    el.matag = $('#matag'); el.zoomV = $('#zoomV'); el.hitV = $('#hitV');
    el.whip = $('#whip'); el.pins = $('#pins');

    el.sgauge = $('#sgauge'); el.sigBar = $('#sigBar'); el.sigVal = $('#sigVal');
    el.qBar = $('#qBar'); el.qVal = $('#qVal'); el.gasTxt = $('#gasTxt'); el.gasPill = $('#gasPill');
    el.bytes = $('#bytes'); el.bgrid = $('#bgrid'); el.blegend = $('#blegend');
    el.curve = $('#curve'); el.installFoot = $('#installFoot');
    el.tags = $('#tags'); el.mods = $('#mods');

    /* 06–08：分屏底 / 中缝 / 判定 / 闸门 / 预警 */
    el.screenBg = $('#screenBg'); el.bgScan = $('#screenBg .bgScan');
    el.domSplit = $('#domSplit'); el.dHand = $('#dHand');
    el.ghostY = $('#ghostY'); el.jRecap = $('#jRecap');
    el.scr06 = $('#scr06'); el.jTrack = $('#jTrack'); el.jScan = $('#jScan');
    el.jRate = $('#jRate'); el.wVal = $('#wVal'); el.wFill = $('#wFill');
    el.wN = $('#wN'); el.jHits = $('#jHits');
    el.jRes = $('#jRes'); el.jResTag = $('#jResTag'); el.jResVal = $('#jResVal');
    el.jExp = $('#jExp'); el.jExpArrow = $('#jExp .rexToggle i');
    el.exl = el.jExp.querySelectorAll('.exl');
    el.jCode = $('#jCode'); el.jCodeIdx = el.jCode.querySelector('.ch span');

    el.scr07 = $('#scr07'); el.gateWrap = $('#gateWrap'); el.gateScan = $('#scr07 .gateScan');
    el.trigList = $('#trigList'); el.gateCore = $('#gateCore'); el.actWrap = $('#actWrap');
    el.gateStat = $('#gateStat'); el.gateFlash = $('#gateFlash'); el.gateRate = $('#gateRate');
    el.gateCount = $('#gateCount'); el.person = $('#scr07 .person'); el.personNum = $('#personNum');
    el.gateBar = $('#gateBar'); el.gateStroke = $('#gateStroke');
    el.shutTop = $('#scr07 .shut.top'); el.shutBot = $('#scr07 .shut.bot');
    el.routePath = $('#routePath'); el.routeTip = $('#routeTip');
    el.ticket = $('#ticketPanel'); el.stamp = $('#ticketPanel .ostamp');

    el.scr08 = $('#scr08'); el.yTrack = $('#yTrack'); el.yScan = $('#yScan');
    el.cam08 = $('#cam08'); el.tTiers = $('#tTiers'); el.yNote = $('#yNote'); el.yRate = $('#yRate');
    el.yCode = $('#yCode'); el.yCodeIdx = el.yCode.querySelector('.ch span');

    /* 09：上报（信号链 / 三模块 / 指标卡） */
    el.scr09 = $('#scr09'); el.mCam = $('#mCam'); el.mTrack = $('#mTrack');
    el.mZoom = $('#mZoom'); el.mChain = $('#mChain'); el.mCards = $('#mCards'); el.mKpi = $('#mKpi');

    /* 10：复原（反向播放 / 四拍 / 收尾两行） */
    el.scr10 = $('#scr10'); el.hRate = $('#hRate'); el.hFill = $('#hFill'); el.hHead = $('#hHead');
    el.hAxis = $('#scr10 .hAxis');
    el.hBeats = $('#hBeats'); el.wv10 = $('#wv10'); el.wvTag = $('#wvTag');
    el.s10 = $('#s10'); el.sVal = $('#sVal'); el.sTag = $('#sTag');
    el.evList = $('#evList'); el.evTag = $('#evTag'); el.rtList = $('#rtList'); el.rtTag = $('#rtTag');
    el.hRev = $('#hRev'); el.revFill = $('#revFill'); el.revPct = $('#revPct'); el.revRows = $('#revRows');
    el.hFinal = $('#hFinal'); el.fZoom = $('#fZoom');
    el.hWave = $('#scr10 .hWave'); el.hEvt = $('#scr10 .hEvt');
    el.hS = $('#scr10 .hS'); el.hRoute = $('#scr10 .hRoute');
    el.endLine = $('#endLine');

    /* 03：预编排迭代卡（写错 → 报错 → 改一行 → 重跑 → 修正） */
    el.iter = $('#iter'); el.iterRows = $('#iterRows'); el.iterRun = $('#iterRun');
    el.iterStat = $('#iterStat'); el.iterMsg = $('#iterMsg'); el.iterCv = $('#iterCv');
    el.iterNote = $('#iterNote'); el.iterCnt = $('#iterCnt');

    buildProgress();
    buildPanels();
    buildRaw();
    buildPins();
    buildBytes();
    buildTags();
    buildMods();
    buildJudge();
    buildGate();
    buildAlert();
    buildUplink();
    buildCycle();
    buildIter();
    fillDtText();

    el.cardTitle.textContent = '数据卡 · 流速零点';
    el.cardMeta.textContent = '1 Hz · 40 s 窗口';
    el.cardFoot.innerHTML = '<span class="sw" style="background:#FF6B8A"></span>原始 RAW' +
      '<span class="sw" style="background:#22D3EE"></span>滤波 FILT' +
      '<span class="sw" style="background:#FFC24B"></span>门限 ±0.02 m/s';
  }

  /* ---------------- 1. 白色分段进度条 + 半透明三角播放头 ---------------- */
  function buildProgress() {
    var total = BL.CONFIG.T_END - BL.CONFIG.T_START;
    var items = [];
    BL.SECTIONS.forEach(function (s) {
      var dur = s.t1 - s.t0, n = Math.max(2, Math.round(dur / 1.55));
      for (var i = 0; i < n; i++) items.push({ t0: s.t0 + dur * i / n, t1: s.t0 + dur * (i + 1) / n, sec: s });
    });
    var usable = PROG.w - (items.length - 1) * PROG.gap;
    var frag = document.createDocumentFragment();
    items.forEach(function (it) {
      var w = usable * (it.t1 - it.t0) / total;
      var d = document.createElement('div');
      d.className = 'seg' + (it.sec.built ? ' built' : '');
      d.title = it.sec.num + ' ' + it.sec.title + (it.sec.built ? '' : '（待接入）');
      var fill = document.createElement('i');
      d.appendChild(fill);
      frag.appendChild(d);
      it.w = w; it.fill = fill;
    });
    el.prog.insertBefore(frag, el.ph);
    var x = 0;
    items.forEach(function (it) { it.x = x; x += it.w + PROG.gap; });
    PROG.blocks = items;
  }

  function paintProgress(t) {
    var x = 0;
    for (var i = 0; i < PROG.blocks.length; i++) {
      var b = PROG.blocks[i];
      var f = U.clamp01((t - b.t0) / (b.t1 - b.t0));
      b.fill.style.width = (f * 100).toFixed(1) + '%';
      if (f > 0 && f < 1) x = b.x + b.w * f;
      else if (f >= 1) x = b.x + b.w;
    }
    el.ph.style.left = x.toFixed(2) + 'px';
    el.ph.style.opacity = t > BL.CONFIG.T_START + 0.02 ? '1' : '0';
  }

  /* ---------------- 2. W0 定格帧：焦点 / 扫描 / 淡出 ---------------- */
  function paintHero(t) {
    var W0 = BL.W0, F = BL.CONFIG.HERO_FOCUS;
    var out = U.smooth(W0.heroOut.in, W0.heroOut.out, t);

    if (out >= 0.999) {
      if (el.heroWrap.style.display !== 'none') el.heroWrap.style.display = 'none';
      return;
    }
    if (el.heroWrap.style.display === 'none') el.heroWrap.style.display = 'block';

    /* 极缓推近：0.2 s 几乎不动，但始终保留约 0.5% 的漂移 */
    var push = 1 + 0.014 * U.smooth(9.0, 9.6, t) + 0.004 * Math.sin(t * 1.7);
    var scale = F.zoom * push;
    var tx = (0.5 - F.x) * BL.CONFIG.W * scale;
    var ty = (0.5 - F.y) * BL.CONFIG.H * scale;
    var tf = 'translate(-50%,-50%) translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) +
      'px) scale(' + scale.toFixed(4) + ')';
    el.heroBase.style.transform = tf;
    el.heroClipImg.style.transform = tf;   /* 两层必须同位移，否则压黑层会错位 */
    el.heroWrap.style.opacity = (1 - out).toFixed(3);

    /* 青白扫描光带：自上而下，扫过处压黑降饱和（第二层同图） */
    var sp = U.smooth(W0.scan.in, W0.scan.out, t);
    var bandA = U.smooth(W0.scan.in, W0.scan.in + 0.05, t) * (1 - U.smooth(W0.scan.out - 0.05, W0.scan.out, t));
    el.scanBand.style.opacity = (bandA * 0.95).toFixed(3);
    el.scanBand.style.top = (sp * 1120 - 160).toFixed(1) + 'px';
    el.heroClip.style.clipPath = 'inset(0 0 ' + ((1 - sp) * 100).toFixed(2) + '% 0)';

    /* 扫描时整体再压暗一点，让轮廓跳出来 */
    el.vig.style.opacity = (0.55 + 0.25 * bandA).toFixed(3);
  }

  /* ---------------- 3. 章节卡 / 视角标 ---------------- */
  function secById(id) {
    for (var i = 0; i < BL.SECTIONS.length; i++) if (BL.SECTIONS[i].id === id) return BL.SECTIONS[i];
    return BL.SECTIONS[1];
  }

  function paintChapter(t) {
    var L = BL.CHAPTERS || [], cur = null, text = null;
    for (var i = 0; i < L.length; i++) {
      var c = L[i], fin = c.fin || 0.22, out = 0.24;
      if (t >= c.t) text = c;
      if (t >= c.t && t <= c.t + c.hold + out) {
        cur = { c: c, a: Math.min(U.smooth(c.t, c.t + fin, t), 1 - U.smooth(c.t + c.hold, c.t + c.hold + out, t)) };
      }
    }
    var a = cur ? cur.a * (1 - gateMask(t)) : 0;
    el.chapter.style.opacity = a.toFixed(3);
    /* 09/10 的正文更靠上：章节卡整体抬 40px，避免压住 laneHead */
    var low = cur && (cur.c.sec === '09' || cur.c.sec === '10');
    el.chapter.style.top = low ? '64px' : '104px';
    el.chapter.style.transform = 'translateY(' + ((1 - a) * 12).toFixed(2) + 'px)';
    if (!text) return;
    var s = secById(text.sec);
    if (el.chNum.textContent !== s.num) el.chNum.textContent = s.num;
    if (el.chTitle.textContent !== s.title) el.chTitle.textContent = s.title;
    if (el.chSub.textContent !== s.sub) el.chSub.textContent = s.sub;
  }

  function paintViewtag(t) {
    el.viewtag.style.opacity = U.smooth(9.24, 9.50, t).toFixed(3);
    var s = BL.secAt(t);
    var m = s.id === 'W0' ? 'clamp_on_us' : s.mod;
    if (el.viewMod.textContent !== m) el.viewMod.textContent = m;
  }

  /* ---------------- 4. 数据卡：1 Hz 时间轴波形（02） ---------------- */
  var CARD = { n: 40, vmax: 0.06, vmin: -0.10, burst: [27, 31] };

  /* 模拟采样：底噪 ±0.005，第 27–31 号样本出现一次零点漂移 */
  function smpRaw(i) {
    var j = (U.hash1(i, 5.3) - 0.5) * 0.010;
    var drift = 0;
    if (i >= CARD.burst[0] && i <= CARD.burst[1]) drift = -0.050 + (i - CARD.burst[0]) * 0.004;
    return drift + j;
  }
  /* 滤波后：漂移被剔除（中值 + 门限） */
  function smpFilt(i) { return (U.hash1(i, 9.1) - 0.5) * 0.004; }

  function drawCard02(t) {
    var c = el.cardCanvas, ctx = c.getContext('2d');
    var W = c.width, H = c.height, L = 78, Rr = W - 26, T = 30, B = H - 34;
    ctx.clearRect(0, 0, W, H);

    var X = function (i) { return L + (Rr - L) * (i / (CARD.n - 1)); };
    var Y = function (v) { return T + (B - T) * (1 - (v - CARD.vmin) / (CARD.vmax - CARD.vmin)); };

    /* 网格 */
    ctx.strokeStyle = 'rgba(90,130,170,.13)';
    ctx.lineWidth = 2;
    for (var v = -0.10; v <= 0.051; v += 0.04) {
      ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(Rr, Y(v)); ctx.stroke();
    }
    for (var i = 0; i <= CARD.n; i += 10) {
      ctx.beginPath(); ctx.moveTo(X(i), T); ctx.lineTo(X(i), B); ctx.stroke();
    }

    /* 零点 */
    ctx.setLineDash([9, 8]);
    ctx.strokeStyle = 'rgba(150,180,205,.34)';
    ctx.beginPath(); ctx.moveTo(L, Y(0)); ctx.lineTo(Rr, Y(0)); ctx.stroke();
    ctx.setLineDash([]);

    /* 漂移区间底色 */
    ctx.fillStyle = 'rgba(255,107,138,.10)';
    ctx.fillRect(X(CARD.burst[0]), T, X(CARD.burst[1]) - X(CARD.burst[0]), B - T);

    var prog = U.clamp01((t - BL.SEC['02'].card.in - 0.12) / 1.45);
    var shown = Math.max(2, Math.round((CARD.n - 1) * prog + 1));

    /* 原始线 */
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = 'rgba(255,107,138,.95)';
    ctx.beginPath();
    for (i = 0; i < shown; i++) {
      var x = X(i), y = Y(smpRaw(i));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    /* 滤波线 */
    ctx.strokeStyle = 'rgba(34,211,238,.95)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (i = 0; i < shown; i++) {
      var x2 = X(i), y2 = Y(smpFilt(i));
      if (i === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    /* 采样点 */
    for (i = 0; i < shown; i++) {
      ctx.beginPath();
      ctx.arc(X(i), Y(smpRaw(i)), 3.1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,150,170,.95)';
      ctx.fill();
    }

    /* 坐标标注 */
    ctx.fillStyle = 'rgba(150,180,205,.55)';
    ctx.font = '400 19px "Cascadia Mono",Consolas,monospace';
    ctx.textAlign = 'right';
    ctx.fillText('+0.05', L - 12, Y(0.05) + 6);
    ctx.fillText('0', L - 12, Y(0) + 6);
    ctx.fillText('−0.10', L - 12, Y(-0.10) + 6);
    ctx.fillText('40 s 前', Rr, H - 12);
    ctx.textAlign = 'left';
    ctx.fillText('现在', L, H - 12);

    /* 漂移标注（噪声到点后出现） */
    var zt = BL.SEC['02'].zero;
    var za = U.clamp01((t - zt) / 0.22);
    if (za > 0.01) {
      ctx.save();
      ctx.globalAlpha = za;
      var zx = X(CARD.burst[0]) + 4;
      ctx.strokeStyle = 'rgba(255,107,138,.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(zx, Y(-0.05) + 16); ctx.lineTo(zx + 150, Y(-0.05) + 16); ctx.stroke();
      ctx.fillStyle = '#FF9AB0';
      ctx.font = '600 21px "Microsoft YaHei UI","PingFang SC",sans-serif';
      ctx.fillText('零点漂移 −0.048 m/s', zx + 4, Y(-0.05) + 44);
      ctx.fillStyle = 'rgba(34,211,238,.92)';
      ctx.font = '600 21px "Microsoft YaHei UI","PingFang SC",sans-serif';
      ctx.fillText('→ 已剔除', zx + 4, Y(-0.05) + 70);
      ctx.restore();
    }
  }

  function paintCard(t) {
    var S2 = BL.SEC['02'];
    var a = U.smooth(S2.card.in, S2.card.in + 0.24, t) * (1 - U.smooth(S2.card.out, S2.card.out + 0.24, t));
    el.card.style.opacity = a.toFixed(3);
    el.card.style.transform = 'translateY(' + ((1 - a) * 10).toFixed(2) + 'px)';
    if (a <= 0.002) return;
    drawCard02(t);
  }

  /* ---------------- 5. 大标语（缓速段出现，屏幕空间固定） ---------------- */
  var SLOGANS = null;
  function sloganList() {
    if (!SLOGANS) {
      SLOGANS = (BL.W0.slogan || []).concat((BL.SEC['02'] && BL.SEC['02'].slogan) || []);
    }
    return SLOGANS;
  }

  function paintSlogan(t) {
    var list = sloganList(), html = '', a = 0;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (t >= s.t0 && t <= s.t1) {
        html = s.html;
        a = Math.min(U.smooth(s.t0, s.t0 + 0.20, t), 1 - U.smooth(s.t1 - 0.22, s.t1, t));
      }
    }
    if (html) {
      if (el.slogan.dataset.h !== html) { el.slogan.innerHTML = html; el.slogan.dataset.h = html; }
      el.slogan.style.opacity = a.toFixed(3);
      el.slogan.style.transform = 'translateY(' + ((1 - a) * 10).toFixed(2) + 'px)';
    } else {
      el.slogan.style.opacity = '0';
    }
  }

  /* ---------------- 6. 指令面板 / 代码面板（按节切换内容） ---------------- */
  var PANELS = { hCollapsed: 78, hExpanded: 78, sec: null, data: null };

  function panelData(id) {
    if (id === 'W0') return { instr: BL.W0.instr, code: BL.W0.code };
    var s = BL.SEC[id];
    if (s && s.instr) return { instr: s.instr, code: s.code };
    return { instr: BL.W0.instr, code: BL.W0.code };
  }

  function mkLines(arr, body) {
    body.innerHTML = '';
    arr.forEach(function (it, i) {
      var d = document.createElement('div');
      d.className = 'ln';
      d.innerHTML = '<span class="lnum mono">' + String(i + 1).padStart(2, '0') + '</span>' +
        U.escapeHtml(it.txt || it.src);
      body.appendChild(d);
    });
  }

  function buildPanels() {
    PANELS.sec = null;
    paintPanels(BL.CONFIG.T_START);
  }

  function ensurePanels(t) {
    var id = BL.secAt(t).id;
    if (PANELS.sec === id) return;
    PANELS.sec = id;
    PANELS.data = panelData(id);
    mkLines(PANELS.data.instr, el.instrBody);
    mkLines(PANELS.data.code, el.codeBody);
    PANELS.hCollapsed = 57 + 21.5;
    PANELS.hExpanded = 57 + Math.max(PANELS.data.instr.length, PANELS.data.code.length) * 21.5;
  }

  function paintPanels(t) {
    ensurePanels(t);
    var data = PANELS.data, W0 = BL.W0;
    var a = U.smooth(9.02, 9.20, t);
    var gm = 1 - gateMask(t);   /* 07 独立屏整屏，底部两栏让位 */
    /* 10 收束：判定卡放大 ×4 时两栏让位，收尾两行独立站位 */
    var endGone = 1 - U.smooth(80.30, 80.72, t);
    el.instr.style.opacity = (a * gm * endGone).toFixed(3);
    el.code.style.opacity = (a * gm * endGone).toFixed(3);

    var w0ex = U.smooth(W0.expand[0], W0.expand[0] + 0.16, t) * (1 - U.smooth(W0.expand[1], W0.expand[1] + 0.16, t));
    var ex = t >= 9.86 ? 1 : w0ex;
    var h = U.lerp(PANELS.hCollapsed, PANELS.hExpanded, ex);
    el.instr.style.height = h.toFixed(1) + 'px';
    el.code.style.height = h.toFixed(1) + 'px';

    var i, idx = -1;
    for (i = 0; i < data.instr.length; i++) if (t >= data.instr[i].t) idx = i;
    var lnI = el.instrBody.children;
    for (i = 0; i < lnI.length; i++) lnI[i].classList.toggle('on', i === idx);
    var lnC = el.codeBody.children;
    for (i = 0; i < lnC.length; i++) lnC[i].classList.toggle('on', i === idx);
    var secNow = BL.secAt(t), secNum = secNow.num;
    var curI = String(Math.max(idx + 1, 1)).padStart(2, '0'), totI = String(data.instr.length).padStart(2, '0');
    var curC = String(Math.max(idx + 1, 1)).padStart(2, '0'), totC = String(data.code.length).padStart(2, '0');
    /* 逐条对应十节：行号前带上本节序号（03 / 10） */
    if (el.instrIdx.textContent !== secNum + '/10 · ' + curI + '/' + totI) {
      el.instrIdx.textContent = secNum + '/10 · ' + curI + '/' + totI;
    }
    if (el.codeIdx.textContent !== secNum + '/10 · ' + curC + '/' + totC) {
      el.codeIdx.textContent = secNum + '/10 · ' + curC + '/' + totC;
    }

    /* 标语永远蹲在展开后的面板上方 */
    el.slogan.style.bottom = (104 + h + 30).toFixed(0) + 'px';
  }

  /* ---------------- 7. 双向计时条（Δt：青短 / 橙长） ---------------- */
  function fillDtText() {
    var D = BL.DT;
    $('#dtAB .dval').textContent = D.tAB.toFixed(3) + ' µs';
    $('#dtBA .dval').textContent = D.tBA.toFixed(3) + ' µs';
    $('#dtbar .dd b').textContent = D.dt + ' ns';
    $('#dtbar .dv b').textContent = D.v.toFixed(2) + ' m/s';
  }

  function paintDtbar(t) {
    var S3 = BL.SEC['03'], D = BL.DT;
    var a = U.smooth(S3.dtbar.in, S3.dtbar.in + 0.26, t) * (1 - U.smooth(S3.dtbar.out, S3.dtbar.out + 0.22, t));
    el.dtbar.style.opacity = a.toFixed(3);
    if (a <= 0.002) return;
    /* 条形长度按 90× 放大差值，才看得出「青短橙长」 */
    var EX = 90, pAB = 0.72, pBA = pAB + EX * (D.dt / (D.tAB * 1000));
    var f1 = U.clamp01((t - S3.dtbar.in - 0.10) / 0.50);
    var f2 = U.clamp01((t - S3.dtbar.in - 0.72) / 0.56);
    el.dtABi.style.width = (pAB * f1 * 100).toFixed(1) + '%';
    el.dtBAi.style.width = (pBA * f2 * 100).toFixed(1) + '%';
  }

  /* ---------------- 8. 公式板（4 行逐行淡入） ---------------- */
  function paintFboard(t) {
    var S3 = BL.SEC['03'], F = S3.formula;
    var a = U.smooth(F.t0 - 0.24, F.t0 + 0.10, t) * (1 - U.smooth(S3.out, S3.out + 0.22, t));
    el.fboard.style.opacity = a.toFixed(3);
    var rows = el.fboard.querySelectorAll('.frow');
    for (var i = 0; i < rows.length; i++) {
      var ti = F.t0 + i * F.step;
      var r = U.smooth(ti, ti + 0.26, t);
      rows[i].style.opacity = r.toFixed(3);
      rows[i].style.transform = 'translateY(' + ((1 - r) * 9).toFixed(2) + 'px)';
    }
  }

  /* ---------------- 9. 3 句决策 ---------------- */
  function paintDecide(t) {
    var S3 = BL.SEC['03'], Dc = S3.decide;
    var a = 1 - U.smooth(S3.out, S3.out + 0.22, t);
    el.decide.style.opacity = a.toFixed(3);
    var ln = el.decide.children;
    for (var i = 0; i < ln.length; i++) {
      var ti = Dc.t0 + i * Dc.step;
      var r = U.smooth(ti, ti + 0.22, t);
      ln[i].style.opacity = r.toFixed(3);
      ln[i].style.transform = 'translateX(' + ((1 - r) * 10).toFixed(2) + 'px)';
    }
  }

  /* ---------------- 10. 原始帧弹窗（7 字段） ---------------- */
  var RAWCELLS = [
    ['SEQ', '', ''], ['QUAL', '98 %', ''], ['GAIN', '32 dB', ''],
    ['t_AB 顺流', '', ''], ['t_BA 逆流', '', ''],
    ['Δ t', '', 'hi'], ['V', '', 'hi']
  ];

  function buildRaw() {
    var D = BL.DT;
    RAWCELLS[3][1] = D.tAB.toFixed(3) + ' µs';
    RAWCELLS[4][1] = D.tBA.toFixed(3) + ' µs';
    RAWCELLS[5][1] = D.dt + ' ns';
    RAWCELLS[6][1] = D.v.toFixed(2) + ' m/s';
    RAWCELLS[0][1] = '#000281';
    el.rawGrid.innerHTML = '';
    RAWCELLS.forEach(function (c) {
      var d = document.createElement('div');
      d.className = 'rcell ' + c[2];
      d.innerHTML = '<span class="k">' + U.escapeHtml(c[0]) + '</span>' +
        '<span class="v">' + U.escapeHtml(c[1]) + '</span>';
      el.rawGrid.appendChild(d);
    });
  }

  function paintRaw(t) {
    var R = BL.SEC['03'].raw;
    var a = U.smooth(R.in, R.in + 0.18, t) * (1 - U.smooth(R.out, R.out + 0.22, t));
    var pop = U.smooth(R.in - 0.02, R.in + 0.24, t);
    el.raw.style.opacity = a.toFixed(3);
    el.raw.style.transform = 'translateY(' + ((1 - pop) * 26).toFixed(1) + 'px) scale(' +
      (0.94 + 0.06 * pop).toFixed(3) + ')';
  }


  /* ---------------- 11. 3D 锚点标签 ---------------- */
  var PINS = [
    { id: 'full', cls: 'big' }, { id: 'flow', cls: '' },
    { id: 'A', cls: '' }, { id: 'B', cls: '' },
    { id: 'P1', cls: 'dim' }, { id: 'P2', cls: 'dim' }, { id: 'P3', cls: 'dim' }, { id: 'Pv', cls: 'dim' }
  ];
  var PINW = {
    full: [11.16, 14.30], flow: [12.44, 14.30],
    A: [14.16, 24.10], B: [14.16, 24.10],
    P1: [16.34, 18.14], P2: [16.34, 18.14], P3: [16.34, 18.14],
    Pv: [18.34, 19.62]
  };

  function buildPins() {
    el.pins.innerHTML = '';
    PINS.forEach(function (p) {
      var d = document.createElement('div');
      d.className = 'pin ' + p.cls;
      d.innerHTML = '<span class="dot"></span><span class="lbl"></span>';
      el.pins.appendChild(d);
      p.el = d;
      p.lbl = d.querySelector('.lbl');
      p.cls0 = p.cls;
      p.text = '';
    });
  }

  function probePin(id) {
    var snd = BL.scene.snd();
    var isA = id === 'A';
    var tx = (snd.dir > 0) === isA;
    if (!snd.active) return { cls: '', html: '<b>' + id + '</b><span class="sub">探头</span>' };
    return {
      cls: tx ? (snd.dir > 0 ? '' : 'or') : 'dim',
      html: '<b>' + id + '</b><span class="sub">' + (tx ? '发射 TX' : '接收 RX') + '</span>'
    };
  }

  function paintPins(t) {
    if (typeof t !== 'number') t = BL.player ? BL.player.time() : BL.CONFIG.T_START;
    var A = BL.scene.anchors();
    if (!A) return;
    var snd = BL.scene.snd();
    for (var i = 0; i < PINS.length; i++) {
      var p = PINS[i], w = PINW[p.id];
      var on = t >= w[0] && t <= w[1];
      var a = on ? Math.min(U.smooth(w[0], w[0] + 0.22, t), 1 - U.smooth(w[1] - 0.20, w[1], t)) : 0;
      if (a <= 0.003) { if (p.el.style.opacity !== '0') p.el.style.opacity = '0'; continue; }

      var html, cls = p.cls0;
      if (p.id === 'A' || p.id === 'B') {
        var pp = probePin(p.id);
        html = pp.html; cls = pp.cls;
      } else if (p.id === 'full') {
        html = '<b>满管 100%</b><span class="sub">无气隙 · 声程成立</span>';
      } else if (p.id === 'flow') {
        html = '<b>v = 1.24 m/s</b><span class="sub">抛物线型面</span>';
      } else if (p.id === 'Pv') {
        html = '<b>V 法 · 1 次反射</b>';
      } else {
        html = '<b>' + p.id + '</b><span class="sub">W 法反射</span>';
      }
      if (p.text !== html) { p.lbl.innerHTML = html; p.text = html; }
      if (p.el.className !== 'pin ' + cls) p.el.className = 'pin ' + cls;

      var q = BL.scene.project(A[p.id]);
      if (!q.vis || q.x < -40 || q.x > 1960 || q.y < -40 || q.y > 1120) a = 0;
      p.el.style.opacity = a.toFixed(3);
      p.el.style.transform = 'translate(' + q.x.toFixed(1) + 'px,' + q.y.toFixed(1) + 'px) translate(' +
        (q.x > 1480 ? 'calc(-100% - 16px)' : '15px') + ',-50%)';
    }
  }

  /* ---------------- 12. 测量标（缩放 / 反射命中） ---------------- */
  function paintMatag(t) {
    var S3 = BL.SEC['03'], Z = S3.zoom;
    var a = U.smooth(Z.in, Z.in + 0.30, t) * (1 - U.smooth(Z.out, Z.out + 0.30, t));
    el.matag.style.opacity = a.toFixed(3);
    if (a <= 0.002) return;
    var s = BL.rig.shotAt(t);
    var z = s ? (BL.CONFIG.CAM.dist / s.d) : 1;
    el.zoomV.textContent = '×' + z.toFixed(1);
    var hits = BL.scene.snd().hits;
    el.hitV.textContent = String(hits).padStart(2, '0') + ' / 08';
  }

  /* ---------------- 13. 横甩速度线（03 / 06 / 07 各一段） ---------------- */
  function paintWhip(t) {
    var a = 0, ref = null;
    for (var k in BL.SEC) {
      var W = BL.SEC[k] && BL.SEC[k].whip;
      if (!W) continue;
      var v = U.smooth(W.in + 0.03, W.in + 0.17, t) * (1 - U.smooth(W.out - 0.05, W.out, t));
      if (v > a) { a = v; ref = W; }
    }
    el.whip.style.opacity = (a * 0.85).toFixed(3);
    if (a > 0.002 && ref) el.whip.style.backgroundPosition = (-(t - ref.in) * 1400).toFixed(0) + 'px 0';
  }

  /* ---------------- 14. 04：信号 / 质量仪表（与 3D 立柱同源 BL.sigAt） ---------------- */
  function paintSgauge(t) {
    var S4 = BL.SEC['04'], G = S4.gauge;
    var a = U.smooth(G.in, G.in + 0.26, t) * (1 - U.smooth(S4.out - 0.30, S4.out, t));
    el.sgauge.style.opacity = a.toFixed(3);
    el.sgauge.style.transform = 'translateY(' + ((1 - a) * 10).toFixed(2) + 'px)';
    el.sgauge.classList.toggle('press', t >= S4.gas.on && t < S4.gas.on + 0.22);
    if (a <= 0.002) return;
    var s = BL.sigAt(t);
    el.sigBar.style.width = (U.clamp01(s.sig / 100) * 100).toFixed(1) + '%';
    el.sigBar.classList.toggle('low', s.sig < 62);
    el.sigVal.textContent = Math.round(s.sig) + '%';
    el.qBar.style.width = (U.clamp01((s.q - 20) / 80) * 100).toFixed(1) + '%';
    el.qBar.classList.toggle('low', s.q < 62);
    el.qVal.textContent = String(Math.round(s.q));
    el.gasPill.textContent = s.gas ? 'GAS' : 'FULL';
    el.gasPill.classList.toggle('on', s.gas);
    el.gasTxt.textContent = s.gas ? '顶部积气 ON · 气液界面衰减 −18 dB' : '顶部积气 OFF · 满管 / 声程成立';
  }

  /* 04：两行保留小字带到 05 结束 */
  function paintInstallFoot(t) {
    var K = BL.SEC['04'].keep;
    var a = U.smooth(K.in, K.in + 0.26, t) * (1 - U.smooth(42.76, 43.02, t));
    el.installFoot.style.opacity = a.toFixed(3);
  }

  /* ---------------- 15. 05：原始帧字节网格（4 字段 / 24 B，逐字节点亮） ---------------- */
  var BYTES = { groups: [], cells: [] };

  function buildBytes() {
    var SPEC = [
      { k: 'head', vals: ['AA', '55', '02', 'A7'] },
      { k: 'data', vals: [] },
      { k: 'len', vals: ['00', '18'] },
      { k: 'crc', vals: ['9E', '3C'] }
    ];
    for (var i = 0; i < 16; i++) {
      var v = 0x20 + Math.floor(U.hash1(i, 7.7) * 0xD0);
      SPEC[1].vals.push(v.toString(16).toUpperCase().padStart(2, '0'));
    }
    el.bgrid.innerHTML = '';
    BYTES.groups = []; BYTES.cells = [];
    var idx = 0;
    SPEC.forEach(function (g) {
      var gd = document.createElement('div');
      gd.className = 'bgrp ' + g.k;
      g.i0 = idx;
      g.vals.forEach(function (v) {
        var c = document.createElement('div');
        c.className = 'bc';
        c.innerHTML = '<b>' + v + '</b><i>' + String(idx).padStart(2, '0') + '</i>';
        gd.appendChild(c);
        BYTES.cells.push(c);
        idx++;
      });
      el.bgrid.appendChild(gd);
      BYTES.groups.push(g);
    });
  }

  function paintBytes(t) {
    var S5 = BL.SEC['05'], B = S5.bytes;
    var a = U.smooth(B.in, B.in + 0.26, t) * (1 - U.smooth(42.66, 43.02, t));
    el.bytes.style.opacity = a.toFixed(3);
    el.bytes.style.transform = 'translateY(' + ((1 - a) * 12).toFixed(2) + 'px) scale(' +
      (0.985 + 0.015 * a).toFixed(3) + ')';
    if (a <= 0.002) return;
    var t0 = B.in + 0.34, step = 0.038, i, last = -1;
    for (i = 0; i < BYTES.cells.length; i++) {
      if (t >= t0 + i * step) last = i;
      BYTES.cells[i].classList.toggle('on', t >= t0 + i * step);
      BYTES.cells[i].classList.toggle('cur', false);
    }
    if (last >= 0) BYTES.cells[last].classList.add('cur');
    var lg = el.blegend.children;
    for (i = 0; i < BYTES.groups.length && i < lg.length; i++) {
      lg[i].classList.toggle('on', t >= t0 + BYTES.groups[i].i0 * step);
    }
  }

  /* ---------------- 16. 05：贯穿画面的米黄数据曲线 ---------------- */
  function paintCurve(t) {
    var S5 = BL.SEC['05'], C = S5.curveDraw;
    var c = el.curve, ctx = c.getContext('2d');
    var W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    var a = U.smooth(C.in, C.in + 0.22, t) * (1 - U.smooth(42.50, 42.98, t));
    if (a <= 0.002) return;
    var p = U.clamp01((t - C.in) / (C.out - C.in));
    var xe = W * (0.02 + 0.98 * p);
    function yAt(x) {
      return H * 0.54 + 92 * Math.sin(x * 0.0031 + 0.55) + 40 * Math.sin(x * 0.0093 - 0.9) +
        14 * Math.sin(x * 0.022 + t * 0.9);
    }
    var n = Math.max(3, Math.round(420 * (xe / W))), i, x, y;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (i = 0; i <= n; i++) {
      x = xe * i / n; y = yAt(x);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(243,233,210,.14)'; ctx.lineWidth = 22; ctx.stroke();
    ctx.strokeStyle = 'rgba(243,233,210,.92)'; ctx.lineWidth = 5.5; ctx.stroke();
    var hy = yAt(xe);
    ctx.beginPath(); ctx.arc(xe, hy, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(243,233,210,.22)'; ctx.fill();
    ctx.beginPath(); ctx.arc(xe, hy, 4.2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF8E8'; ctx.fill();
    ctx.restore();
  }

  /* ---------------- 17. 05：箱体 / 盖板 / 断缆 / 出壳 / 包围盒 标签 ---------------- */
  var TAGS = [
    { k: 'box', cls: 'cy', b: '屏蔽机箱', s: 'IP67 · 双电缆入口', w: [33.12, 41.60] },
    { k: 'cover', cls: 'am', b: '盖板 · 水平滑出', s: 'axis +x · 1.72', w: [34.82, 36.05] },
    { k: 'cut', cls: 'rd', b: '线缆断开', s: '物理断开 → 发光虚线改道', w: [35.44, 37.20] },
    { k: 'core', cls: 'cy', b: 'electronics 出壳', s: 'normal +z · 0.42', w: [36.12, 39.50] },
    { k: 'bbox', cls: 'gr', b: '线框包围盒', s: '1.30 × 0.78 × 0.30', w: [37.22, 41.60] },
    /* sweep 与 core 两个锚点在 38.5~39.0 会重合，向下错开 46px 免得压字 */
    { k: 'sweep', cls: 'pk', b: '连续横扫', s: '4 模块依次降 0.2', w: [38.32, 39.50], dy: 46 }
  ];

  function buildTags() {
    el.tags.innerHTML = '';
    TAGS.forEach(function (g) {
      var d = document.createElement('div');
      d.className = 'tx ' + g.cls;
      d.innerHTML = '<span class="td"></span><span class="tb"><b>' + g.b +
        '</b><span class="sub">' + g.s + '</span></span>';
      el.tags.appendChild(d);
      g.el = d;
    });
  }

  function paintTags(t) {
    var I5 = BL.scene.bus && BL.scene.bus();
    if (!I5) return;
    for (var i = 0; i < TAGS.length; i++) {
      var g = TAGS[i];
      var a = U.smooth(g.w[0], g.w[0] + 0.22, t) * (1 - U.smooth(g.w[1] - 0.24, g.w[1], t));
      if (a <= 0.003) { if (g.el.style.opacity !== '0') g.el.style.opacity = '0'; continue; }
      var q = BL.scene.project(I5.anchors[g.k]);
      if (!q.vis) a = 0;
      var qx = q.x, qy = q.y + (g.dy || 0);
      var flip = qx > 1440;
      /* 锚点贴近画面顶端时改为向下展开，避免标签被裁掉 */
      var down = qy < 96;
      if (g.el.classList.contains('flip') !== flip) g.el.classList.toggle('flip', flip);
      if (g.el.classList.contains('down') !== down) g.el.classList.toggle('down', down);
      g.el.style.opacity = a.toFixed(3);
      g.el.style.transform = 'translate(' + qx.toFixed(1) + 'px,' + qy.toFixed(1) + 'px) translate(' +
        (flip ? 'calc(-100% + 4px)' : '-4px') + ',' + (down ? '0' : '-100%') + ')';
    }
  }

  /* ---------------- 18. 05：4 个分离模块的标签 ---------------- */
  var MODS = [
    { name: 'AFE', sub: '模拟前端 · 1 MHz 激励', cls: 'cy' },
    { name: 'ADC', sub: '高速采样 · 40 MS/s', cls: 'gr' },
    { name: 'MCU', sub: '时差运算 · Δt→v→Q', cls: 'pk' },
    { name: 'COMM', sub: '总线输出 · Modbus', cls: 'am' }
  ];

  function buildMods() {
    el.mods.innerHTML = '';
    MODS.forEach(function (m) {
      var d = document.createElement('div');
      d.className = 'md ' + m.cls;
      d.innerHTML = '<i></i><span class="t"><b>' + m.name + '</b><span>' + m.sub + '</span></span>';
      el.mods.appendChild(d);
      m.el = d;
    });
  }

  function paintMods(t) {
    var I5 = BL.scene.bus && BL.scene.bus();
    if (!I5) return;
    var out = 1 - U.smooth(42.66, 43.00, t);
    for (var i = 0; i < MODS.length; i++) {
      var m = MODS[i];
      var a = U.smooth(39.60 + i * 0.08, 39.82 + i * 0.08, t) * out;
      if (a <= 0.003) { if (m.el.style.opacity !== '0') m.el.style.opacity = '0'; continue; }
      var q = BL.scene.project(I5.modWorld(i));
      if (!q.vis) a = 0;
      /* 交错上下 18px，四块靠得近时避免标签横向互相压字 */
      var dy = (i % 2 === 0) ? -18 : 18;
      m.el.style.opacity = a.toFixed(3);
      m.el.style.transform = 'translate(' + (q.x + 12).toFixed(1) + 'px,' + (q.y + dy).toFixed(1) +
        'px) translate(0,-50%)';
    }
  }

  /* 相机动完后再投影锚点：标签必须跟当前帧的机位一致（首帧/跳转也成立） */
  function paintAnchors(t) {
    paintTags(t);
    paintMods(t);
  }

  /* ==========================================================================
     20–23. 06 判定域 / 07 设备门控（独立屏） / 08 预警域
     ========================================================================== */
  var JUDGE = { nodes: [], code: [] };
  var GATE = { trig: [] };
  var ALERT = { nodes: [], tiers: [], code: [] };

  function mkNode(host, n) {
    var d = document.createElement('div');
    d.className = 'jn' + (n.hit ? ' hit' : '');
    d.innerHTML = '<span class="pin"></span><b class="mono">' + U.escapeHtml(n.k) + '</b>' +
      '<span class="nm">' + U.escapeHtml(n.nm) + '</span>' +
      '<span class="sub mono">' + U.escapeHtml(n.v) + '</span>';
    host.appendChild(d);
    return d;
  }

  /* 追加代码行（保留 .ch 表头） */
  function mkCode(host, list, cls) {
    var rows = [];
    list.forEach(function (it, i) {
      var d = document.createElement('div');
      d.className = cls;
      d.innerHTML = '<span class="no mono">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<code class="mono">' + U.escapeHtml(it.src) + '</code>';
      host.appendChild(d);
      rows.push(d);
    });
    return rows;
  }

  function buildJudge() {
    var S = BL.SEC['06'];
    el.jTrack.innerHTML = '';
    JUDGE.nodes = S.nodes.map(function (n) { return { cfg: n, el: mkNode(el.jTrack, n) }; });
    JUDGE.code = mkCode(el.jCode, S.code, 'cl');
    judgeLayout();
  }

  /* 节点圆心（track 内坐标），扫描线跟着当前节点走 */
  function judgeLayout() {
    for (var i = 0; i < JUDGE.nodes.length; i++) {
      var n = JUDGE.nodes[i];
      n.cx = n.el.offsetLeft + n.el.offsetWidth / 2;
    }
  }

  function buildGate() {
    var S = BL.SEC['07'];
    el.trigList.innerHTML = '';
    GATE.trig = S.trig.map(function (r, i) {
      var d = document.createElement('div');
      d.className = 'tr';
      d.innerHTML = '<i class="ti mono">' + String(i + 1).padStart(2, '0') + '</i>' +
        '<span class="tn">' + U.escapeHtml(r.nm) + '<em class="tk mono">' + U.escapeHtml(r.k) + '</em></span>' +
        '<b class="tv mono">' + U.escapeHtml(r.v) + '</b>' +
        '<span class="ts">' + U.escapeHtml(r.s) + '</span>';
      el.trigList.appendChild(d);
      return { cfg: r, el: d };
    });
    if (el.personNum) el.personNum.textContent = '0';   /* 人员告警恒为 0 条 */
  }

  function buildAlert() {
    var S = BL.SEC['08'];
    el.yTrack.innerHTML = '';
    ALERT.nodes = S.nodes.map(function (n) { return { cfg: n, el: mkNode(el.yTrack, n) }; });

    el.tTiers.innerHTML = '';
    ALERT.tiers = S.tiers.map(function (tr) {
      var d = document.createElement('div');
      d.className = 'tcard';
      d.innerHTML = '<div class="tk"><b class="mono">' + U.escapeHtml(tr.k) + '</b>' +
        '<span>' + U.escapeHtml(tr.nm) + '</span></div>' +
        '<div class="tlamp"></div>' +
        '<div class="tth mono">THR ' + tr.th.toFixed(2) + '</div>' +
        '<div class="tscore mono">' + tr.score.toFixed(2) + '</div>' +
        '<div class="tbar"><i></i><em></em></div>';
      el.tTiers.appendChild(d);
      var mark = d.querySelector('.tbar em');
      mark.style.left = (tr.th * 100).toFixed(1) + '%';
      return { cfg: tr, el: d, bar: d.querySelector('.tbar i'), lamp: d.querySelector('.tlamp') };
    });

    ALERT.code = mkCode(el.yCode, S.code, 'yl');
    alertLayout();
  }

  function alertLayout() {
    for (var i = 0; i < ALERT.nodes.length; i++) {
      var n = ALERT.nodes[i];
      n.cx = n.el.offsetLeft + n.el.offsetWidth / 2;
    }
  }

  /* ---------------- 21. 06：判定域（左半屏 · 青） ---------------- */
  function paintJudge(t) {
    var S = BL.SEC['06'], ui = S.ui;
    var a = U.smooth(ui.in, ui.in + 0.26, t) * (1 - U.smooth(ui.out - 0.16, ui.out, t));
    var wp = S.whip ? U.smooth(S.whip.in + 0.10, S.whip.out, t) : 0;
    el.scr06.style.opacity = a.toFixed(3);
    el.scr06.style.transform = 'translateX(' + (-wp * 150).toFixed(1) + 'px)';
    if (a <= 0.002) return;

    /* 速率读数：J6 冲完骤降到 0.1×，读数跟着变，画面仍在动 */
    el.jRate.textContent = 'RATE ' + BL.camRate(t).toFixed(1) + '×';

    var dx = U.curve(S.scroll, t);
    el.jTrack.style.transform = 'translateX(' + (-dx).toFixed(1) + 'px)';

    var i, cur = -1, hits = 0;
    for (i = 0; i < JUDGE.nodes.length; i++) {
      var n = JUDGE.nodes[i], cfg = n.cfg;
      var r = U.smooth(cfg.t, cfg.t + 0.16, t);
      if (t >= cfg.t) { cur = i; if (cfg.hit) hits++; }
      var lit = i === cur, on = r > 0.004;
      n.el.style.opacity = (0.30 + 0.70 * r).toFixed(3);
      n.el.style.transform = 'translateY(' + ((1 - r) * 4 - (lit ? 2 : 0)).toFixed(1) + 'px)';
      n.el.classList.toggle('on', on);
      n.el.classList.toggle('cur', lit);
    }

    var sc = JUDGE.nodes[cur];
    if (sc) {
      el.jScan.style.opacity = '0.80';
      el.jScan.style.transform = 'translateX(' +
        (sc.cx - dx + Math.sin(t * 3.1) * 2).toFixed(1) + 'px)';
    } else {
      el.jScan.style.opacity = '0';
    }

    /* J6 动态权重：N 从 0 涨到 196，之后继续以 1.35 /s 缓慢爬升 */
    var W = S.weight;
    var nv = W.nEnd * U.smooth(W.in, W.tEnd, t) + Math.max(0, t - W.tEnd) * W.creep;
    var w = W.n0 / (W.n0 + nv);
    el.wVal.textContent = w.toFixed(3);
    el.wFill.style.width = (w * 100).toFixed(1) + '%';
    el.wFill.classList.toggle('low', w < 0.45);
    var ns = String(Math.round(nv));
    if (el.wN.textContent !== ns) el.wN.textContent = ns;
    var hs = hits + ' / ' + JUDGE.nodes.length;
    if (el.jHits.textContent !== hs) el.jHits.textContent = hs;

    /* J8 判定输出：卡片向下展开 3 条依据 */
    var R = S.result;
    var done = U.smooth(R.in, R.in + 0.18, t) > 0.5;
    var ex = U.smooth(R.exp, R.exp + 0.34, t);
    el.jRes.classList.toggle('done', done);
    el.jRes.style.height = (112 + 62 * ex).toFixed(1) + 'px';
    var tag = done ? 'REVIEW' : 'WAIT';
    if (el.jResTag.textContent !== tag) el.jResTag.textContent = tag;
    var vtxt = done ? '提示复核 · 不升级预警' : '等待 J8 …';
    if (el.jResVal.textContent !== vtxt) el.jResVal.textContent = vtxt;
    for (i = 0; i < el.exl.length; i++) {
      el.exl[i].style.maxHeight = (20 * ex).toFixed(1) + 'px';
      el.exl[i].style.opacity = ex.toFixed(3);
    }
    el.jExpArrow.style.transform = 'rotate(' + (ex * 180).toFixed(0) + 'deg)';

    paintCodeRows(JUDGE.code, S.code, t, el.jCodeIdx);
  }

  function paintCodeRows(rows, list, t, idxEl) {
    var i, ci = -1;
    for (i = 0; i < list.length; i++) if (t >= list[i].t) ci = i;
    for (i = 0; i < rows.length; i++) {
      rows[i].classList.toggle('on', i <= ci);
      rows[i].classList.toggle('cur', i === ci);
    }
    var s = String(Math.max(ci + 1, 1)).padStart(2, '0') + ' / ' +
      String(list.length).padStart(2, '0') + ' LINES';
    if (idxEl.textContent !== s) idxEl.textContent = s;
  }

  /* ---------------- 22. 07：设备门控（独立全屏闸门） ---------------- */
  function paintGate(t) {
    var S = BL.SEC['07'], ui = S.ui;
    var a = U.smooth(ui.in, ui.in + 0.16, t) * (1 - U.smooth(ui.out - 0.16, ui.out, t));
    var wp = S.whip ? U.smooth(S.whip.in, S.whip.out, t) : 0;
    el.scr07.style.opacity = a.toFixed(3);
    if (a <= 0.002) { el.scr07.classList.remove('fringe'); return; }

    el.gateRate.textContent = 'RATE ' + BL.camRate(t).toFixed(1) + '×';

    /* 进场先收 1.04 → 1.00；闭合后急推 ×5（0.26 s），再 0.5 s 只余 0.1× 的缓动 */
    var settle = U.smooth(ui.in, ui.in + 0.30, t);
    var P = S.push;
    var push = U.smooth(P.t0, P.t1, t);
    var rel = U.smooth(P.t1, P.slow1, t);
    var zoom = 1 + 0.040 * (1 - settle) + 0.040 * push + 0.010 * rel +
      0.0035 * Math.sin(t * 2.2) + 0.030 * wp;
    el.gateWrap.style.transform = 'scale(' + zoom.toFixed(4) + ') translateX(' +
      (wp * 120).toFixed(1) + 'px)';

    /* 顶部扫描带一直往下走 */
    el.gateScan.style.transform = 'translateY(' + ((((t - ui.in) * 250) % 1240) - 240).toFixed(1) + 'px)';

    var i, cnt = 0;
    for (i = 0; i < GATE.trig.length; i++) {
      var g = GATE.trig[i], r = U.smooth(g.cfg.t, g.cfg.t + 0.14, t);
      if (t >= g.cfg.t) cnt++;
      g.el.style.opacity = (0.44 + 0.56 * r).toFixed(3);
      g.el.classList.toggle('on', r > 0.02);
    }
    var cs = cnt + ' / ' + GATE.trig.length;
    if (el.gateCount.textContent !== cs) el.gateCount.textContent = cs;

    /* 闸门「啪」闭合：上下两道闸板 0.12 s 合拢 */
    var sc = U.smooth(S.shut.close, S.shut.close + S.shut.dur, t);
    el.shutTop.style.transform = 'translateY(' + (-100 * (1 - sc)).toFixed(2) + '%)';
    el.shutBot.style.transform = 'translateY(' + (100 * (1 - sc)).toFixed(2) + '%)';
    el.gateBar.style.width = (sc * 100).toFixed(1) + '%';
    var sk = 'STROKE ' + Math.round(sc * 100) + '%';
    if (el.gateStroke.textContent !== sk) el.gateStroke.textContent = sk;
    var closed = sc > 0.5;
    var st = closed ? 'CLOSED' : 'OPEN';
    if (el.gateStat.textContent !== st) el.gateStat.textContent = st;
    el.gateStat.classList.toggle('closed', closed);
    el.actWrap.classList.toggle('dead', closed);
    el.person.classList.toggle('locked', closed);

    /* 合拢瞬间的闪光 + 撞击抖动 */
    var imp = Math.max(0, 1 - Math.abs(t - (S.shut.close + S.shut.dur)) / 0.20);
    el.gateCore.style.transform = 'translateY(' +
      (Math.sin((t - S.shut.close) * 120) * 2.2 * imp).toFixed(2) + 'px)';
    var fl = Math.max(0, 1 - Math.abs(t - (S.shut.close + S.shut.dur * 0.8)) / 0.20);
    el.gateFlash.style.opacity = (fl * fl * 0.70).toFixed(3);

    /* 路由改道：设备工单从闸门右侧拉出，人员面板始终 0 条 */
    var rt = U.smooth(S.route.in, S.route.out, t);
    el.routePath.style.strokeDashoffset = (100 * (1 - rt)).toFixed(2);
    el.routeTip.style.opacity = U.smooth(S.route.out - 0.06, S.route.out + 0.04, t).toFixed(3);
    var ta = U.smooth(S.route.in + 0.06, S.route.in + 0.30, t);
    el.ticket.style.opacity = ta.toFixed(3);
    el.ticket.style.transform = 'translateX(' + ((1 - ta) * 20).toFixed(1) + 'px)';
    var stp = U.smooth(S.route.out + 0.02, S.route.out + 0.22, t);
    el.stamp.style.opacity = stp.toFixed(3);
    el.stamp.style.transform = 'rotate(-8deg) scale(' +
      (0.6 + 0.4 * stp + 0.07 * Math.sin(stp * Math.PI)).toFixed(3) + ')';

    /* 人员面板：从进场起就在，数字恒为 0；0 本身带一点呼吸，避免死帧 */
    var pa = U.smooth(ui.in + 0.10, ui.in + 0.40, t);
    el.person.style.opacity = pa.toFixed(3);
    el.person.style.transform = 'translateY(' + ((1 - pa) * 14).toFixed(1) + 'px)';
    el.personNum.style.transform = 'scale(' + (1 + 0.012 * Math.sin(t * 2.4)).toFixed(3) + ')';

    /* 急推后的两道色差 */
    el.scr07.classList.toggle('fringe', t >= S.fringe[0] && t <= S.fringe[1]);
  }

  /* ---------------- 23. 08：预警域（右半屏 · 橙红） ---------------- */
  function paintAlert(t) {
    var S = BL.SEC['08'], ui = S.ui;
    var a = U.smooth(ui.in, ui.in + 0.22, t) * (1 - U.smooth(ui.out, ui.out + 0.30, t));
    var inx = (1 - U.smooth(ui.in - 0.02, ui.in + 0.28, t)) * 90;
    el.scr08.style.opacity = a.toFixed(3);
    el.scr08.style.transform = 'translateX(' + inx.toFixed(1) + 'px)';
    /* 脚注已移出 #scr08：必须先复位，回拖进度条才不会残留 */
    el.yNote.style.opacity = (a * U.smooth(S.note.in, S.note.in + 0.30, t)).toFixed(3);
    if (a <= 0.002) return;

    var dx = U.curve(S.scroll, t);
    el.yTrack.style.transform = 'translateX(' + (-dx).toFixed(1) + 'px)';

    var i, cur = -1;
    for (i = 0; i < ALERT.nodes.length; i++) {
      var n = ALERT.nodes[i], cfg = n.cfg;
      var r = U.smooth(cfg.t, cfg.t + 0.16, t);
      if (t >= cfg.t) cur = i;
      var lit = i === cur, on = r > 0.004;
      n.el.style.opacity = (0.30 + 0.70 * r).toFixed(3);
      n.el.style.transform = 'translateY(' + ((1 - r) * 4 - (lit ? 2 : 0)).toFixed(1) + 'px)';
      n.el.classList.toggle('on', on);
      n.el.classList.toggle('cur', lit);
    }
    var sc = ALERT.nodes[cur];
    if (sc) {
      el.yScan.style.opacity = '0.80';
      el.yScan.style.transform = 'translateX(' + (sc.cx - dx + Math.sin(t * 3.1) * 2).toFixed(1) + 'px)';
    } else {
      el.yScan.style.opacity = '0';
    }

    /* 分级：T1 / T2 / T3 逐级点亮，卡片随 ×3/×4/×5 微微放大 */
    var tc = -1;
    for (i = 0; i < ALERT.tiers.length; i++) if (t >= ALERT.tiers[i].cfg.at) tc = i;
    for (i = 0; i < ALERT.tiers.length; i++) {
      var T = ALERT.tiers[i], at = T.cfg.at;
      var q = U.smooth(at, at + 0.20, t);
      var isCur = i === tc;
      T.el.style.opacity = (0.42 + 0.58 * q).toFixed(3);
      T.el.classList.toggle('on', q > 0.02);
      T.el.classList.toggle('cur', isCur);
      T.el.classList.toggle('past', tc > i);
      T.el.style.transform = 'translateY(' + ((1 - q) * 6 - (isCur ? 4 : 0)).toFixed(1) +
        'px) scale(' + (1 + 0.04 * (T.cfg.zoom - 3) * q).toFixed(3) + ')';
      T.lamp.style.transform = 'scale(' + (1 + 0.28 * (T.cfg.zoom - 3) * q).toFixed(3) + ')';
      T.bar.style.width = (T.cfg.score * 100 * U.smooth(at, at + 0.34, t)).toFixed(1) + '%';
    }

    /* 镜头缓推（缓推量收敛，保证 T3 卡不被裁切）；读数跟着分级走 ×3 / ×4 / ×5 */
    var camZ = 1 + (U.curve(S.cam, t) - 1) * 0.32;
    el.cam08.style.transform = 'scale(' + camZ.toFixed(4) + ')';
    var zr = tc >= 0 ? ALERT.tiers[tc].cfg.zoom : 1;
    var zs = 'ZOOM ×' + zr.toFixed(1);
    if (el.yRate.textContent !== zs) el.yRate.textContent = zs;

    el.yNote.style.opacity = (a * U.smooth(S.note.in, S.note.in + 0.30, t)).toFixed(3);
    paintCodeRows(ALERT.code, S.code, t, el.yCodeIdx);
  }

  /* ---------------- 24. 分屏底 / 中缝 ---------------- */
  /* 07 独立屏区间：这时要压掉章节卡与底部两栏，避免与闸门同屏 */
  function gateMask(t) {
    return U.smooth(53.96, 54.06, t) * (1 - U.smooth(57.42, 57.52, t));
  }

  function paintScreenBg(t) {
    var a = U.smooth(42.60, 43.14, t) * (1 - U.smooth(65.52, 66.10, t));
    el.screenBg.style.opacity = a.toFixed(3);
    if (a > 0.002) {
      el.bgScan.style.transform = 'translateY(' + (((t * 96) % 1200) - 60).toFixed(1) + 'px)';
    }
  }

  function paintDomSplit(t) {
    var a6 = U.smooth(43.20, 43.50, t) * (1 - U.smooth(53.60, 53.96, t));
    var a8 = U.smooth(57.52, 57.86, t) * (1 - U.smooth(65.50, 66.05, t));
    el.domSplit.style.opacity = Math.max(a6, a8).toFixed(3);
    var h = U.smooth(57.56, 57.78, t) * (1 - U.smooth(58.30, 58.62, t));
    el.dHand.style.opacity = (h * 0.95).toFixed(3);
    el.dHand.style.transform = 'translate(-50%,0) translateX(' +
      (-46 + 92 * U.smooth(57.56, 58.30, t)).toFixed(1) + 'px)';

    /* 空域的填充：06 时右半屏待命水印，08 时左半屏结论回看（都带缓慢漂移） */
    var g = U.smooth(43.60, 44.30, t) * (1 - U.smooth(53.10, 53.60, t));
    el.ghostY.style.opacity = g.toFixed(3);
    el.ghostY.style.transform = 'translateY(' + (Math.sin(t * 0.85) * 7).toFixed(1) + 'px)';
    var rc = U.smooth(58.30, 59.00, t) * (1 - U.smooth(65.10, 65.55, t));
    el.jRecap.style.opacity = rc.toFixed(3);
    el.jRecap.style.transform = 'translateY(' +
      ((1 - rc) * 18 + Math.sin(t * 0.75) * 5).toFixed(1) + 'px)';
  }

  /* ==========================================================================
     25–26. 09 上报（信号链 + 三模块 + 指标卡） / 10 复原（反向 + 24 h 四拍）
     ========================================================================== */
  var UPLINK = { nodes: [], mods: [], kpi: [] };
  var CYCLE = { beats: [], evts: [], route: [], rows: [] };

  function buildUplink() {
    var S = BL.SEC['09'];
    el.mTrack.innerHTML = '';
    UPLINK.nodes = S.chain.nodes.map(function (n) {
      var d = document.createElement('div');
      d.className = 'mNode' + (n.dim ? ' dim' : '') + (n.need ? ' need' : '');
      d.innerHTML = '<i class="dot"></i><b class="mono">' + U.escapeHtml(n.k) + '</b>' +
        '<span class="nm">' + U.escapeHtml(n.nm) + '</span>' +
        '<span class="sv mono">' + U.escapeHtml(n.s) + '</span>';
      el.mTrack.appendChild(d);
      return { cfg: n, el: d };
    });

    el.mCards.innerHTML = '';
    UPLINK.mods = S.mods.map(function (m) {
      var d = document.createElement('div');
      d.className = 'mc ' + m.cls;
      d.innerHTML = '<div class="mh"><b class="mk mono">' + U.escapeHtml(m.k) + '</b>' +
        '<span class="mn">' + U.escapeHtml(m.nm) + '</span>' +
        '<span class="ms">' + U.escapeHtml(m.sub) + '</span></div>' +
        m.rows.map(function (r) {
          return '<div class="mrow"><span>' + U.escapeHtml(r[0]) + '</span>' +
            '<b class="mono">' + U.escapeHtml(r[1]) + '</b></div>';
        }).join('') +
        '<div class="mfoot"><span class="mbar"><i></i></span>' +
        '<span class="mchip">' + U.escapeHtml(m.off) + '</span></div>';
      el.mCards.appendChild(d);
      return { cfg: m, el: d, bar: d.querySelector('.mbar i'), chip: d.querySelector('.mchip') };
    });

    el.mKpi.innerHTML = '';
    UPLINK.kpi = S.kpi.map(function (k) {
      var d = document.createElement('div');
      d.className = 'kcell ' + k.cls;
      d.innerHTML = '<b class="kv mono">0</b><span class="kl">' + U.escapeHtml(k.k) +
        '<em class="ku">' + U.escapeHtml(k.u) + '</em></span>';
      el.mKpi.appendChild(d);
      return { cfg: k, el: d, v: d.querySelector('.kv') };
    });
  }

  function buildCycle() {
    var S = BL.SEC['10'];
    el.hBeats.innerHTML = '';
    CYCLE.beats = S.beats.map(function (b, i) {
      var d = document.createElement('div');
      d.className = 'hb';
      d.style.left = (i * 33.334).toFixed(2) + '%';
      d.innerHTML = '<i></i><b class="mono">' + b.tm + '</b><span>' + U.escapeHtml(b.nm) +
        '</span><em class="mono">' + U.escapeHtml(b.k) + '</em>';
      el.hBeats.appendChild(d);
      return { cfg: b, el: d };
    });

    el.evList.innerHTML = '';
    CYCLE.evts = S.evts.map(function (e) {
      var d = document.createElement('div');
      d.className = 'ev' + (e.v === 'Suspect' ? ' sus' : e.v === 'False' ? ' mis' : '');
      d.innerHTML = '<i class="ek mono">' + U.escapeHtml(e.k) + '</i>' +
        '<span class="en">' + U.escapeHtml(e.c) + ' · ' + U.escapeHtml(e.nm) + '</span>' +
        '<b class="ev2 mono">' + U.escapeHtml(e.v) + '</b>';
      el.evList.appendChild(d);
      return { cfg: e, el: d };
    });

    el.rtList.innerHTML = '';
    CYCLE.route = S.route.map(function (r) {
      var d = document.createElement('div');
      d.className = 'rt';
      d.innerHTML = '<span class="rk mono">' + U.escapeHtml(r.k) + '</span>' +
        '<b>' + U.escapeHtml(r.nm) + '</b>' +
        '<span class="rs mono">' + U.escapeHtml(r.s) + '</span>';
      el.rtList.appendChild(d);
      return { cfg: r, el: d };
    });

    el.revRows.innerHTML = '';
    CYCLE.rows = S.rows.map(function (r) {
      var d = document.createElement('div');
      d.className = 'rr';
      d.innerHTML = '<span class="rk mono">' + U.escapeHtml(r.k) + '</span>' +
        '<b>' + U.escapeHtml(r.nm) + '</b><span class="rd mono">RE-INSERT</span>';
      el.revRows.appendChild(d);
      return { cfg: r, el: d };
    });
  }

  /* 09：信号链推近 ×5 → 猛拉回 ×0.6；模块按「电源 → 存储 → 通信」点亮 */
  function paintUplink(t) {
    var S = BL.SEC['09'], ui = S.ui;
    var a = U.smooth(ui.in, ui.in + 0.24, t) * (1 - U.smooth(ui.out - 0.20, ui.out, t));
    el.scr09.style.opacity = a.toFixed(3);
    if (a <= 0.002) return;

    /* 沿链推近 ×5 → 猛拉回 ×0.6：读数按真实倍率，画面按可读比例缩放（中间不停） */
    var z = U.curve(S.zoom, t);
    var vis = z >= 1 ? 1 + (z - 1) * 0.13 : 0.86 + (z - 0.6) * 0.35;
    el.mCam.style.transform = 'scale(' + vis.toFixed(3) + ')';
    var zs = 'ZOOM ×' + z.toFixed(1);
    if (el.mZoom.textContent !== zs) el.mZoom.textContent = zs;

    var dx = U.curve(S.chain.scroll, t);
    el.mTrack.style.transform = 'translateX(' + (-dx).toFixed(1) + 'px)';

    var i, lit = 0, cur = -1;
    for (i = 0; i < UPLINK.nodes.length; i++) {
      var n = UPLINK.nodes[i], r = U.smooth(n.cfg.at, n.cfg.at + 0.18, t);
      if (t >= n.cfg.at) { lit++; cur = i; }
      n.el.style.opacity = (0.62 + 0.38 * r).toFixed(3);
      n.el.classList.toggle('on', r > 0.02);
      n.el.classList.toggle('cur', i === cur);
    }
    var cs = lit + ' / ' + UPLINK.nodes.length;
    if (el.mChain.textContent !== cs) el.mChain.textContent = cs;

    for (i = 0; i < UPLINK.mods.length; i++) {
      var m = UPLINK.mods[i], mr = U.smooth(m.cfg.at, m.cfg.at + 0.22, t);
      m.el.style.opacity = (0.70 + 0.30 * mr).toFixed(3);
      m.el.style.transform = 'translateY(' + ((1 - mr) * 6).toFixed(1) + 'px)';
      m.el.classList.toggle('on', mr > 0.02);
      m.bar.style.width = (mr * 100).toFixed(1) + '%';
      var ct = mr > 0.12 ? m.cfg.on : m.cfg.off;
      if (m.chip.textContent !== ct) m.chip.textContent = ct;
    }

    for (i = 0; i < UPLINK.kpi.length; i++) {
      var k = UPLINK.kpi[i];
      var p = U.smooth(k.cfg.at - 0.35, k.cfg.at + 0.05, t);
      var v = String(Math.round(k.cfg.n * p)).padStart(k.cfg.pad, '0');
      if (k.v.textContent !== v) k.v.textContent = v;
    }
  }

  /* 10：S(t) 同源读数（曲线、大数字、判定共用） */
  function sValAt(t) {
    var SS = BL.SEC['10'].s;
    var p = U.smooth(SS.in, SS.in + 2.05, t);
    var v = (SS.a + (SS.b - SS.a) * p) * (1 - U.smooth(78.62, 79.12, t));
    return v + 0.006 * Math.sin(t * 2.3);
  }

  /* 四类负样本各自的波形形状（可复现，不用 Math.random） */
  function waveY(i, u, tt) {
    if (i === 0) return 0.10 * Math.sin(u * 44) * (0.4 + 0.6 * U.hash1(Math.floor(u * 36), 3)) + 0.05;
    if (i === 1) return Math.sin(u * 15 + tt * 0.8) * (0.40 + 0.32 * Math.sin(u * 57));
    if (i === 2) return (u - 0.52) * 1.15 + 0.05 * Math.sin(u * 26);
    return 0.045 * Math.sin(u * 62 + tt * 0.5) + 0.02 * Math.sin(u * 11);
  }

  function drawWaves(t) {
    var S = BL.SEC['10'], W = S.wave;
    var c = el.wv10, ctx = c.getContext('2d');
    var w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);
    var n = 4, pad = 6, cw = (w - pad * (n + 1)) / n, chh = h - 22;
    var cols = ['#7FF0FF', '#FFC24B', '#FF9A6B', '#9BEFCF'];
    var mx = 0, i, k;
    for (i = 0; i < n; i++) {
      var at = W.in + i * W.step;
      var g = U.clamp01((t - at) / W.draw);
      if (g <= 0) continue;
      mx = i + 1;
      var x0 = pad + i * (cw + pad), y0 = 2;
      ctx.fillStyle = 'rgba(9,18,25,.92)';
      ctx.fillRect(x0, y0, cw, chh);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(120,170,220,.22)';
      ctx.strokeRect(x0 + .5, y0 + .5, cw - 1, chh - 1);
      var mid = y0 + chh / 2, amp = chh * 0.32, iw = cw - 14;
      ctx.strokeStyle = 'rgba(120,170,220,.14)';
      ctx.beginPath(); ctx.moveTo(x0 + 7, mid); ctx.lineTo(x0 + cw - 7, mid); ctx.stroke();
      var st = Math.max(2, Math.round(iw * g));
      ctx.beginPath();
      for (k = 0; k <= st; k++) {
        var u = k / iw;
        var X = x0 + 7 + k, Y = mid - waveY(i, u, t) * amp;
        if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
      ctx.lineWidth = 1.7;
      ctx.strokeStyle = cols[i];
      ctx.stroke();
      if (g < 0.999) {
        ctx.beginPath();
        ctx.arc(x0 + 7 + iw * g, mid - waveY(i, g, t) * amp, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = '#FFF4E0'; ctx.fill();
      } else {
        var cp = (t * 0.42 + i * 0.23) % 1;
        ctx.strokeStyle = 'rgba(255,255,255,.26)';
        ctx.beginPath();
        ctx.moveTo(x0 + 7 + iw * cp, y0 + 4);
        ctx.lineTo(x0 + 7 + iw * cp, y0 + chh - 4);
        ctx.stroke();
      }
      ctx.font = '11px "Cascadia Mono",Consolas,monospace';
      ctx.fillStyle = 'rgba(206,226,240,.92)';
      ctx.fillText(S.cls[i], x0 + 8, h - 6);
      ctx.font = '9.5px "Cascadia Mono",Consolas,monospace';
      ctx.fillStyle = 'rgba(126,147,168,.9)';
      ctx.fillText('NEG · 0' + (i + 1), x0 + cw - 60, h - 6);
    }
    var tag = mx + ' / ' + n;
    if (el.wvTag.textContent !== tag) el.wvTag.textContent = tag;
  }

  function drawS(t) {
    var S = BL.SEC['10'], SS = S.s;
    var c = el.s10, ctx = c.getContext('2d');
    var w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);
    var x0 = 34, x1 = w - 8, y0 = 8, y1 = h - 12;
    function yOf(v) { return y1 - U.clamp01(v) * (y1 - y0); }
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(120,170,220,.20)';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,194,75,.80)';
    ctx.beginPath(); ctx.moveTo(x0, yOf(SS.lo)); ctx.lineTo(x1, yOf(SS.lo)); ctx.stroke();
    ctx.strokeStyle = 'rgba(251,146,60,.85)';
    ctx.beginPath(); ctx.moveTo(x0, yOf(SS.hi)); ctx.lineTo(x1, yOf(SS.hi)); ctx.stroke();
    ctx.setLineDash([]);

    var T0 = SS.in, T1 = 79.90;
    var px = U.clamp01((t - T0) / (T1 - T0));
    var val = sValAt(t), i;
    if (px > 0.001) {
      ctx.beginPath();
      for (i = 0; i <= 64; i++) {
        var u = (i / 64) * px;
        var X = x0 + (x1 - x0) * u;
        var Y = yOf(sValAt(T0 + u * (T1 - T0)));
        if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = val >= SS.hi ? '#FF9A6B' : val >= SS.lo ? '#FFC24B' : '#22D3EE';
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * px, yOf(val), 3.6, 0, Math.PI * 2);
      ctx.fillStyle = '#FFF4E0'; ctx.fill();
    }
    ctx.font = '9.5px "Cascadia Mono",Consolas,monospace';
    ctx.fillStyle = 'rgba(255,194,75,.92)';
    ctx.fillText('0.55', x0 + 2, yOf(SS.lo) - 3);
    ctx.fillStyle = 'rgba(251,146,60,.95)';
    ctx.fillText('0.68', x0 + 2, yOf(SS.hi) - 3);
    ctx.fillStyle = 'rgba(90,110,130,.95)';
    ctx.fillText('06:00', x0 + 2, y1 - 2);
  }

  /* 10：05 反向复原 → 四拍（正常 / 零用水 / 外呼核实 / 收束） */
  function paintCycle(t) {
    var S = BL.SEC['10'], ui = S.ui, i;
    var a = U.smooth(ui.in, ui.in + 0.30, t) * (1 - U.smooth(81.58, 81.96, t));
    el.scr10.style.opacity = a.toFixed(3);
    /* 24 h 轴：进场淡入，判定卡收束时让位 */
    var axA = U.smooth(68.66, 69.04, t) * (1 - U.smooth(79.36, 79.66, t));
    el.hAxis.style.opacity = axA.toFixed(3);
    /* 收尾两行：固定在屏幕中下方，不随卡片淡出（回拖也先复位） */
    var ea = U.smooth(80.46, 80.88, t);
    el.endLine.style.opacity = ea.toFixed(3);
    el.endLine.style.transform = 'translateX(-50%) translateY(' + ((1 - ea) * 12).toFixed(1) + 'px)';
    if (a <= 0.002) return;

    /* 05 反向播放：进度 100% → 0%，四模块依次回插 */
    var R = S.rev;
    var rv = U.smooth(R.in, R.in + 0.24, t) * (1 - U.smooth(R.out - 0.10, R.out + 0.22, t));
    el.hRev.style.opacity = rv.toFixed(3);
    if (rv > 0.002) {
      el.hRev.style.transform = 'translateY(' + ((1 - rv) * 10).toFixed(1) + 'px)';
      var pr = 1 - U.clamp01((t - R.in) / (R.out - R.in));
      var pt = Math.round(pr * 100) + '%';
      if (el.revPct.textContent !== pt) el.revPct.textContent = pt;
      el.revFill.style.width = (pr * 100).toFixed(1) + '%';
      for (i = 0; i < CYCLE.rows.length; i++) {
        var rw = CYCLE.rows[i], q = U.smooth(rw.cfg.at, rw.cfg.at + 0.20, t);
        rw.el.style.opacity = (0.34 + 0.66 * q).toFixed(3);
        rw.el.classList.toggle('on', q > 0.02);
      }
    }

    /* 24 h 轴：06:00 → 24:00 连续推进 */
    var ap = U.smooth(72.10, 79.90, t);
    el.hFill.style.width = (ap * 100).toFixed(2) + '%';
    el.hHead.style.transform = 'translateX(' + (ap * 1808).toFixed(1) + 'px)';

    var bi = -1;
    for (i = 0; i < CYCLE.beats.length; i++) if (t >= CYCLE.beats[i].cfg.at) bi = i;
    for (i = 0; i < CYCLE.beats.length; i++) {
      var be = CYCLE.beats[i], q2 = U.smooth(be.cfg.at, be.cfg.at + 0.22, t);
      be.el.style.opacity = (0.30 + 0.70 * q2).toFixed(3);
      be.el.classList.toggle('on', q2 > 0.02);
      be.el.classList.toggle('hot', i === bi);
    }
    var hs = bi >= 0 ? (CYCLE.beats[bi].cfg.k + ' · ' + CYCLE.beats[bi].cfg.tm + ' · ' +
      CYCLE.beats[bi].cfg.tag) : '24 H · 4 BEATS';
    if (el.hRate.textContent !== hs) el.hRate.textContent = hs;

    var ba = U.smooth(72.06, 72.34, t) * (1 - U.smooth(79.30, 79.58, t));
    el.hWave.style.opacity = ba.toFixed(3);
    el.hEvt.style.opacity = ba.toFixed(3);
    el.hS.style.opacity = ba.toFixed(3);
    el.hRoute.style.opacity = ba.toFixed(3);
    if (ba > 0.002) {
      drawWaves(t);
      drawS(t);

      /* 事件卡：连续生成，最多同时留 3 张（新的在上） */
      var vis = [];
      for (i = 0; i < CYCLE.evts.length; i++) if (t >= CYCLE.evts[i].cfg.at) vis.push(i);
      var show = vis.slice(-3);
      for (i = 0; i < CYCLE.evts.length; i++) {
        var ev = CYCLE.evts[i], k2 = show.indexOf(i);
        if (k2 < 0) { ev.el.style.opacity = '0'; continue; }
        var q3 = U.smooth(ev.cfg.at, ev.cfg.at + 0.20, t);
        var slot = show.length - 1 - k2;
        ev.el.style.top = (slot * 50).toFixed(0) + 'px';
        ev.el.style.opacity = (q3 * (slot === 0 ? 1 : 0.82)).toFixed(3);
        ev.el.style.transform = 'translateY(' + ((1 - q3) * 12).toFixed(1) + 'px)';
      }
      var es = vis.length + ' / ' + CYCLE.evts.length;
      if (el.evTag.textContent !== es) el.evTag.textContent = es;

      /* S(t) 读数与判定（越黄线 → Suspect；橙级 → 回填后消警） */
      var sv = sValAt(t), sTxt = sv.toFixed(2);
      if (el.sVal.textContent !== sTxt) el.sVal.textContent = sTxt;
      var st = t >= 78.62 ? '已消警 · T2 → 0' :
        sv >= S.s.hi ? 'T2 · 橙级' : sv >= S.s.lo ? 'SUSPECT' : 'NORMAL';
      if (el.sTag.textContent !== st) {
        el.sTag.textContent = st;
        el.sTag.className = 'mono ' + (t >= 78.62 ? 'ok' :
          st === 'SUSPECT' ? 'sus' : st.indexOf('T2') === 0 ? 'mis' : '');
      }

      /* 拍 3 路由链：橙级 → 外呼 → 核实 → 回填 → 微调 → 消警 */
      var rc = 0;
      for (i = 0; i < CYCLE.route.length; i++) {
        var rt2 = CYCLE.route[i], q4 = U.smooth(rt2.cfg.at, rt2.cfg.at + 0.18, t);
        if (t >= rt2.cfg.at) rc++;
        rt2.el.style.opacity = (0.34 + 0.66 * q4).toFixed(3);
        rt2.el.style.transform = 'translateY(' + ((1 - q4) * 6).toFixed(1) + 'px)';
        rt2.el.classList.toggle('on', q4 > 0.02);
        rt2.el.classList.toggle('ok', i === CYCLE.route.length - 1 && q4 > 0.02);
      }
      var rs = rc + ' / ' + CYCLE.route.length;
      if (el.rtTag.textContent !== rs) el.rtTag.textContent = rs;
    }

    /* 拍 4：判定卡放大（读数 ×4，画面按可读比例吃满画幅）→ 极缓漂移淡出 */
    var F = S.final;
    var fa = U.smooth(F.in, F.in + 0.42, t);
    var gp = U.smooth(F.in, F.in + 1.15, t);
    var sc = 1 + 1.35 * gp;
    var fade = fa * (1 - U.smooth(F.out - 0.62, F.out, t));
    el.hFinal.style.opacity = fade.toFixed(3);
    el.hFinal.style.transform = 'translate(' + (Math.sin(t * 0.55) * 6).toFixed(1) + 'px,' +
      ((1 - fa) * 16 + Math.cos(t * 0.42) * 5).toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
    var fz = '×' + (1 + (F.scale - 1) * gp).toFixed(1);
    if (el.fZoom.textContent !== fz) el.fZoom.textContent = fz;
  }

  /* ---------------- 18b. 03 开头：预编排「vibe 迭代」卡 ----------------
     写错（reflect = 4 → 5 段）→ 画面报错 → 只改一行（= 3）→ 重跑 → 画面修正。
     全部读 BL.ITER 的时间码，所以暂停 / 回拖都会原样重放。 */
  var ITER = { rows: [] };

  function buildIter() {
    var I = BL.ITER;
    el.iterRows.innerHTML = '';
    ITER.rows = [];
    for (var i = 0; i < I.rows.length; i++) {
      var r = I.rows[i];
      var d = document.createElement('div');
      d.innerHTML = '<i>' + (i + 1) + '</i><span class="src">' + U.escapeHtml(r.src) + '</span>';
      el.iterRows.appendChild(d);
      ITER.rows.push({ d: d, span: d.querySelector('.src'), src: r.src, fix: !!r.fix });
    }
    el.iterNote.textContent = I.note;
  }

  /* 声路小图：segs 段折线、refl 个反射点，按 p 逐段描出 */
  function drawIterPath(segs, refl, p, ok, wrongKeep) {
    var cv = el.iterCv;
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(2, 0, 0, 2, 0, 0);   /* CSS 400×122，内部 2× 画，字号不受影响 */
    var W = 400, H = 122, x0 = 14, x1 = 332, yT = 26, yB = 96;

    /* 两根管壁（数据平面风格：细线 + 刻度点，不是写实管） */
    ctx.strokeStyle = 'rgba(120,170,220,.30)';
    ctx.lineWidth = 1;
    [yT - 8, yB + 8].forEach(function (y) {
      ctx.beginPath(); ctx.moveTo(x0 - 4, y);
      for (var x = x0; x <= x1; x += 12) ctx.lineTo(x, y);
      ctx.stroke();
    });
    /* 左端探头 */
    ctx.fillStyle = 'rgba(34,211,238,.85)';
    ctx.fillRect(x0 - 9, yT - 4, 5, yB - yT + 8);

    function poly(n, prog, withDots) {
      var pts = [], i, x, y;
      for (i = 0; i <= n; i++) {
        x = x0 + (x1 - x0) * (i / n);
        y = (i % 2 === 0) ? yT : yB;
        pts.push([x, y]);
      }
      /* 按 prog 截断折线 */
      var total = n, draw = total * prog, cur = [];
      for (i = 0; i <= n; i++) {
        if (i <= draw) { cur.push(pts[i]); continue; }
        var f = draw - Math.floor(draw), a = pts[i - 1], b = pts[i];
        cur.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
        break;
      }
      return { pts: cur, all: pts };
    }

    if (wrongKeep) {
      var wr = poly(5, 1, false);
      ctx.strokeStyle = 'rgba(255,107,138,.30)';
      ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(wr.pts[0][0], wr.pts[0][1]);
      for (var k = 1; k < wr.pts.length; k++) ctx.lineTo(wr.pts[k][0], wr.pts[k][1]);
      ctx.stroke(); ctx.setLineDash([]);
    }

    var r = poly(segs, p, true);
    ctx.strokeStyle = ok ? 'rgba(52,211,153,.95)' : 'rgba(255,107,138,.95)';
    ctx.lineWidth = 2; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(r.pts[0][0], r.pts[0][1]);
    for (k = 1; k < r.pts.length; k++) ctx.lineTo(r.pts[k][0], r.pts[k][1]);
    ctx.stroke(); ctx.shadowBlur = 0;

    /* 反射点 */
    for (k = 1; k < r.pts.length - 1; k++) {
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.beginPath(); ctx.arc(r.pts[k][0], r.pts[k][1], 2.6, 0, 6.2832); ctx.fill();
    }
    /* 右端接收 */
    ctx.fillStyle = ok ? 'rgba(52,211,153,.95)' : 'rgba(255,107,138,.95)';
    ctx.fillRect(x1 - 2, yT - 4, 5, yB - yT + 8);

    /* 读数：反射次数 / 段数 */
    ctx.font = '500 11px "JetBrains Mono",Consolas,monospace';
    ctx.fillStyle = ok ? 'rgba(168,245,208,.95)' : 'rgba(255,180,196,.95)';
    ctx.fillText(refl + ' 反射 · ' + segs + ' 段', x1 + 12, (yT + yB) / 2 - 2);
    ctx.fillStyle = 'rgba(110,130,152,.9)';
    ctx.font = '400 10px "JetBrains Mono",Consolas,monospace';
    ctx.fillText(ok ? 'Δt ok' : 'Δt ≠', x1 + 12, (yT + yB) / 2 + 12);

    if (!ok && p >= 1) {
      ctx.strokeStyle = 'rgba(255,107,138,.85)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x1 + 6, yT - 12); ctx.lineTo(x1 + 18, yT); ctx.stroke();
    }
  }

  function paintIter(t) {
    var I = BL.ITER, i, r;
    if (!el.iter) return;
    var a = U.smooth(I.in, I.in + 0.16, t) * (1 - U.smooth(I.out - 0.16, I.out, t));
    el.iter.style.opacity = a.toFixed(3);
    el.iter.style.transform = 'translateY(' + ((1 - U.smooth(I.in, I.in + 0.22, t)) * 10).toFixed(1) + 'px)';
    if (a <= 0.002) return;

    var ph = t < I.err.in ? 1 : (t < I.fix.in ? 2 : (t < I.run2.in ? 3 : 4));
    var run = ph < 4 ? 'RUN 1' : 'RUN 2';

    /* 三行代码：第 2 行是唯一被改的那一行 */
    for (i = 0; i < ITER.rows.length; i++) {
      r = ITER.rows[i];
      if (!r.fix) continue;
      if (ph <= 1) { r.span.textContent = I.fixFrom; r.span.className = 'src r-fix'; }
      else if (ph === 2) { r.span.textContent = I.fixFrom; r.span.className = 'src r-bad'; }
      else if (ph === 3) { r.span.textContent = I.fixTo; r.span.className = 'src r-fix strike'; }
      else { r.span.textContent = I.fixTo; r.span.className = 'src ok'; }
    }

    var msg = ph === 1 ? '运行中 · plot(path)'
      : ph === 2 ? I.errTxt
        : ph === 3 ? I.fixTxt : I.okTxt;
    if (el.iterMsg.textContent !== msg) el.iterMsg.textContent = msg;
    var cls = 'istat ' + (ph === 2 ? 'err' : ph === 3 ? 'fix' : ph === 4 ? 'ok' : 'idle');
    if (el.iterStat.className !== cls) el.iterStat.className = cls;
    if (el.iterRun.textContent !== run) el.iterRun.textContent = run;
    var cnt = (ph <= 2 ? '1' : '2') + ' / 2';
    if (el.iterCnt.textContent !== cnt) el.iterCnt.textContent = cnt;

    if (ph === 1) {
      drawIterPath(I.bad.seg, I.bad.refl, U.clamp01((t - I.run1.in) / (I.run1.out - I.run1.in)), false, false);
    } else if (ph === 2) {
      drawIterPath(I.bad.seg, I.bad.refl, 1, false, false);
    } else if (ph === 3) {
      drawIterPath(I.bad.seg, I.bad.refl, 1, false, true);
    } else {
      drawIterPath(I.good.seg, I.good.refl,
        U.clamp01((t - I.run2.in) / (I.run2.out - I.run2.in)), true, t < I.run2.out - 0.06);
    }
  }

  /* ---------------- 19. 总入口 ---------------- */
  function paintAll(t) {
    paintHero(t);
    paintChapter(t);
    paintViewtag(t);
    paintCard(t);
    paintSlogan(t);
    paintPanels(t);
    paintIter(t);
    paintDtbar(t);
    paintFboard(t);
    paintDecide(t);
    paintRaw(t);
    paintMatag(t);
    paintWhip(t);
    paintSgauge(t);
    paintInstallFoot(t);
    paintBytes(t);
    paintCurve(t);
    paintScreenBg(t);
    paintJudge(t);
    paintGate(t);
    paintAlert(t);
    paintDomSplit(t);
    paintUplink(t);
    paintCycle(t);
    paintAnchors(t);
    paintProgress(t);
    el.tc.textContent = U.fmtTC(t);
  }

  /* 进度条 x（舞台坐标）→ 时间 */
  function timeAtX(xStage) {
    var x = xStage - 64;
    for (var i = 0; i < PROG.blocks.length; i++) {
      var b = PROG.blocks[i];
      if (x >= b.x && x < b.x + b.w) return b.t0 + (b.t1 - b.t0) * U.clamp01((x - b.x) / b.w);
    }
    return x < 0 ? BL.CONFIG.T_START : BL.CONFIG.T_END;
  }

  BL.hud = {
    init: init,
    paintAll: paintAll,
    paintAnchors: paintAnchors,
    paintPins: paintPins,
    timeAtX: timeAtX,
    progressEl: function () { return el.prog; }
  };
})(window.BL);
