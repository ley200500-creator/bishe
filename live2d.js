/* ============================================================================
 * PhishGuard · Live2D 运行时（PixiJS + Cubism 5）
 * 由 popup.js / web.js 在角色区域生成后调用 mountIn()。
 * 设计目标：全身立绘、呼吸/眨眼/轻微摆动，并按检测结果切换情绪。
 * ========================================================================== */
(function (root) {
  'use strict';

  var MODELS = {
    sakura: 'assets/live2d/sakura/sakura_layers.model3.json',
    mint: 'assets/live2d/mint/mint_layers.model3.json',
    sky: 'assets/live2d/sky/sky_layers.model3.json'
  };

  var MOODS = {
    idle: {
      eyeOpen: 1, eyeSmile: 0, cheek: 0.10, gloom: 0, mouthForm: 0,
      angleX: 0, angleY: 0, angleZ: 0, bodyX: 0, browY: 0, speed: 1
    },
    happy: {
      eyeOpen: 0.82, eyeSmile: 1, cheek: 1, gloom: 0, mouthForm: 1,
      angleX: 2, angleY: 1, angleZ: 6, bodyX: 2, browY: 0.3, speed: 1.35
    },
    warn: {
      eyeOpen: 0.92, eyeSmile: -0.4, cheek: 0.05, gloom: 0.16, mouthForm: -0.7,
      angleX: -2, angleY: -5, angleZ: -4, bodyX: -2, browY: -0.35, speed: 0.9
    },
    danger: {
      eyeOpen: 1, eyeSmile: -0.7, cheek: 0, gloom: 0.35, mouthForm: -0.95,
      angleX: -3, angleY: -2, angleZ: -8, bodyX: -3, browY: -0.5, speed: 0.75
    },
    thinking: {
      eyeOpen: 0.72, eyeSmile: 0, cheek: 0.05, gloom: 0, mouthForm: 0,
      angleX: 4, angleY: 2, angleZ: -3, bodyX: 2, browY: 0.3, speed: 1.1
    }
  };

  var instances = new Map();
  var HY = 1000;

  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function stageSize(host) {
    var r = host.getBoundingClientRect();
    return { w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) };
  }

  function setParam(model, id, value) {
    try {
      var cm = model.internalModel && model.internalModel.coreModel;
      if (!cm) return;
      cm.setParameterValueById(id, value);
    } catch (e) { /* 参数不存在时忽略 */ }
  }

  function makeState(mood) {
    var m = MOODS[mood] || MOODS.idle;
    return {
      mood: mood in MOODS ? mood : 'idle',
      cur: { eyeOpen: m.eyeOpen, eyeSmile: m.eyeSmile, cheek: m.cheek, gloom: m.gloom,
        mouthForm: m.mouthForm, angleX: m.angleX, angleY: m.angleY, angleZ: m.angleZ,
        bodyX: m.bodyX, browY: m.browY },
      blinkAt: now() + 1200 + Math.random() * 1800,
      blinkUntil: 0,
      shakeUntil: 0,
      last: now()
    };
  }

  function applyParams(model, st, t) {
    var target = MOODS[st.mood] || MOODS.idle;
    var k = 0.10;
    Object.keys(st.cur).forEach(function (key) {
      st.cur[key] = lerp(st.cur[key], target[key], k);
    });

    var seconds = t * 0.001;
    var speed = target.speed || 1;
    var breath = 0.5 + 0.5 * Math.sin(seconds * 0.95 * speed);
    var sway = Math.sin(seconds * 0.55 * speed) * 2.2;
    var bob = Math.sin(seconds * 0.85 * speed) * 1.8;
    if (st.mood === 'happy') bob += Math.sin(seconds * 2.3) * 3.2;
    if (st.mood === 'danger') bob += Math.sin(seconds * 7.0) * 0.9;

    // 眨眼：每 3–5 秒一次，闭眼 130ms
    if (t > st.blinkAt && t > st.blinkUntil) {
      st.blinkUntil = t + 130;
      st.blinkAt = t + 3000 + Math.random() * 2200;
    }
    var blinking = t < st.blinkUntil;
    var eyeFactor = blinking ? 0.05 : st.cur.eyeOpen;

    // 危险抖动：情绪切换后的 550ms
    var shake = 0;
    if (t < st.shakeUntil) {
      shake = Math.sin(seconds * 42) * 7.0 * (1 - (st.shakeUntil - t) / 550);
    }

    setParam(model, 'ParamBreath', breath);
    setParam(model, 'ParamAngleX', st.cur.angleX + Math.sin(seconds * 0.42) * 2.5);
    setParam(model, 'ParamAngleY', st.cur.angleY + Math.sin(seconds * 0.63) * 1.4);
    setParam(model, 'ParamAngleZ', st.cur.angleZ + sway + shake);
    setParam(model, 'ParamBodyAngleX', st.cur.bodyX + Math.sin(seconds * 0.31) * 1.1);
    setParam(model, 'ParamBodyAngleZ', Math.sin(seconds * 0.27) * 1.2 + shake * 0.35);
    setParam(model, 'ParamBodyAngleY', bob);

    setParam(model, 'ParamEyeLOpen', eyeFactor);
    setParam(model, 'ParamEyeROpen', eyeFactor);
    setParam(model, 'ParamEyeLSmile', st.cur.eyeSmile);
    setParam(model, 'ParamEyeRSmile', st.cur.eyeSmile);
    setParam(model, 'ParamCheek', clamp(st.cur.cheek, 0, 1));
    setParam(model, 'ParamGloom', clamp(st.cur.gloom, 0, 1));
    setParam(model, 'ParamMouthForm', clamp(st.cur.mouthForm, -1, 1));
    setParam(model, 'ParamMouthOpenY', st.mood === 'happy' ? 0.12 : 0);
    setParam(model, 'ParamBrowLY', clamp(st.cur.browY, -1, 1));
    setParam(model, 'ParamBrowRY', clamp(st.cur.browY, -1, 1));

    // 让模型把最新参数写进顶点
    try {
      if (model.internalModel && model.internalModel.coreModel && model.internalModel.coreModel.update) {
        model.internalModel.coreModel.update();
      }
    } catch (e) { /* 忽略 */ }
  }

  function dispose(host) {
    var inst = instances.get(host);
    if (!inst) return;
    instances.delete(host);
    try { if (inst.ro) inst.ro.disconnect(); } catch (e) {}
    try { inst.app.ticker.remove(inst.tick); } catch (e) {}
    try { inst.app.destroy(true, { children: true }); } catch (e) {}
    if (root.app === inst.app) root.app = null;
    host.classList.remove('live2d-ready', 'live2d-failed');
  }

  function stageOf(host) {
    return (host && host.querySelector && host.querySelector('.chara-body')) || host;
  }

  function disposeIn(host) {
    var stage = stageOf(host);
    if (stage) dispose(stage);
  }

  async function mountIn(host, id, mood) {
    if (!host) return null;
    var stage = stageOf(host);
    dispose(stage);
    var canvas = stage.querySelector('.chara-live2d-canvas');
    if (!canvas || !root.PIXI || !PIXI.live2d) {
      stage.classList.add('live2d-failed');
      return null;
    }
    var modelPath = MODELS[id] || MODELS.sakura;
    try {
      var size = stageSize(stage);
      var app = new PIXI.Application();
      await app.init({
        canvas: canvas,
        width: size.w,
        height: size.h,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(2, (root.devicePixelRatio || 1))
      });
      root.PIXI = PIXI;
      root.app = app;

      // Pixi 8 的 backgroundAlpha 在部分构建里没有传到 gl.clearColor，导致画布出现白底。
      // 关闭自动清屏，并在渲染前手动以透明色 clear。
      try {
        app.renderer.background.clearBeforeRender = false;
        var gl = app.renderer.gl;
        var clearTransparent = function () {
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
        };
        app.ticker.add(clearTransparent, null, PIXI.UPDATE_PRIORITY.HIGH);
      } catch (e) { /* 忽略 */ }

      var model = await PIXI.live2d.Live2DModel.from(modelPath);
      app.stage.addChild(model);
      model.anchor.set(0.5, 1);
      var nativeH = model.height;
      model.x = size.w / 2;
      model.y = size.h + 1;
      model.scale.set(size.h / nativeH);

      // 不使用内置动作/眨眼，改由本文件统一驱动；保留物理和变形
      try { model.internalModel.motionManager.stopAllMotions(); } catch (e) {}
      try { model.internalModel.eyeBlink = null; } catch (e) {}

      var st = makeState(mood || 'idle');
      var tick = function () { applyParams(model, st, now()); };
      app.ticker.add(tick);
      applyParams(model, st, now());

      var ro = null;
      if (root.ResizeObserver) {
        ro = new ResizeObserver(function () {
          var s = stageSize(stage);
          if (!s.w || !s.h) return;
          try { app.renderer.resize(s.w, s.h); } catch (e) {}
          model.x = s.w / 2;
          model.y = s.h + 1;
          model.scale.set(s.h / nativeH);
        });
        ro.observe(stage);
      }

      instances.set(stage, { app: app, model: model, st: st, tick: tick, ro: ro });
      stage.classList.add('live2d-ready');
      stage.classList.remove('live2d-failed');
      canvas.dispatchEvent(new CustomEvent('live2d-ready', { bubbles: true }));
      return model;
    } catch (e) {
      stage.classList.add('live2d-failed');
      if (root.console && console.warn) console.warn('[PhishGuard] Live2D load failed:', e);
      return null;
    }
  }

  function setMood(mood) {
    instances.forEach(function (inst) {
      inst.st.mood = mood in MOODS ? mood : 'idle';
      if (inst.st.mood === 'danger') inst.st.shakeUntil = now() + 550;
      else if (inst.st.mood === 'happy') inst.st.shakeUntil = 0;
    });
  }

  root.PhishGuardLive2D = {
    mountIn: mountIn,
    disposeIn: disposeIn,
    disposeAll: function () { Array.from(instances.keys()).forEach(dispose); },
    setMood: setMood,
    MOODS: MOODS
  };
})(typeof window !== 'undefined' ? window : this);
