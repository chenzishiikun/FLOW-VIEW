/* ==========================================================================
   vendor-loader.js · Three.js（含 OrbitControls）装载
   顺序：本地 vendor/ → unpkg → npmmirror（jsdelivr 在本机不通，不放首位）
   除 Three.js 外零第三方依赖
   ========================================================================== */
window.BL = window.BL || {};
(function (BL) {
  'use strict';

  var V = '0.128.0';
  var THREE_SRC = [
    'vendor/three.min.js',
    'https://unpkg.com/three@' + V + '/build/three.min.js',
    'https://registry.npmmirror.com/three/' + V + '/files/build/three.min.js'
  ];
  var OC_SRC = [
    'vendor/OrbitControls.js',
    'https://unpkg.com/three@' + V + '/examples/js/controls/OrbitControls.js',
    'https://registry.npmmirror.com/three/' + V + '/files/examples/js/controls/OrbitControls.js'
  ];

  BL.vendor = { three: '', orbit: '' };

  function loadOne(list, i, ok, bad) {
    if (i >= list.length) { bad(); return; }
    var s = document.createElement('script');
    s.src = list[i];
    s.async = false;
    s.onload = function () { ok(list[i]); };
    s.onerror = function () { loadOne(list, i + 1, ok, bad); };
    document.head.appendChild(s);
  }

  BL.loadVendor = function (done) {
    loadOne(THREE_SRC, 0, function (url) {
      BL.vendor.three = url;
      if (!window.THREE) { BL.util.fail('three.js 已下载但未注册 window.THREE'); return; }
      loadOne(OC_SRC, 0, function (u2) {
        BL.vendor.orbit = u2;
        if (!window.THREE.OrbitControls) BL.util.fail('OrbitControls 未注册（将退化为内置拖动/缩放）');
        done();
      }, function () {
        /* OrbitControls 拿不到时不阻塞：scene.js 里有轻量替代实现 */
        BL.util.fail('OrbitControls 加载失败：已退化为内置拖动/缩放');
        done();
      });
    }, function () {
      BL.util.fail('three.js 加载失败：请确认 vendor/three.min.js 存在，或放开 CDN 网络');
    });
  };
})(window.BL);
