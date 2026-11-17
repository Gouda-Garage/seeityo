// See It Yo: cinematic camera simulation. Real-time WebGL2, zero dependencies, zero network requests.
// The texture is real text painted at tiny sizes; the shader fakes a noisy, dim, out-of-focus phone sensor
// and a glass lens that sharpens, magnifies and "turns the flashlight on" wherever you point it.
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function dotted(ctx, x, y, w, left, right, size, color) {
    ctx.fillStyle = color; ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left"; ctx.fillText(left, x, y);
    ctx.textAlign = "right"; ctx.fillText(right, x + w, y);
    var l = ctx.measureText(left).width, r = ctx.measureText(right).width, dw = ctx.measureText(". ").width;
    ctx.textAlign = "left";
    var dots = ""; for (var d = x + l + 4; d < x + w - r - 6; d += dw) dots += ". ";
    ctx.globalAlpha = .45; ctx.fillText(dots, x + l + 4, y); ctx.globalAlpha = 1;
  }
  function para(ctx, text, x, y, maxW, lh) {
    var words = text.split(" "), line = "", yy = y;
    for (var i = 0; i < words.length; i++) {
      var t = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); line = words[i]; yy += lh; } else line = t;
    }
    ctx.fillText(line, x, yy); return yy + lh;
  }
  function bokeh(ctx, R, n, w, h, hMax, rgb, rMin, rMax) {
    for (var i = 0; i < n; i++) {
      var x = R() * w, y = R() * h * hMax, r = rMin + R() * (rMax - rMin), a = .05 + R() * .2;
      var c = rgb[R() < .7 ? 0 : 1];
      var g = ctx.createRadialGradient(x, y, r * .2, x, y, r);
      g.addColorStop(0, "rgba(" + c + "," + a + ")"); g.addColorStop(.85, "rgba(" + c + "," + a * .8 + ")"); g.addColorStop(1, "rgba(" + c + ",0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
  }

  // ---------- scene painters (CSS px) ----------
  function paintMenu(ctx, w, h) {
    var R = rng(7);
    var g = ctx.createRadialGradient(w * .62, h * .2, 10, w * .5, h * .5, Math.max(w, h) * .85);
    g.addColorStop(0, "#3d2614"); g.addColorStop(.5, "#160e08"); g.addColorStop(1, "#050302");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    bokeh(ctx, R, 46, w, h, .55, ["255,170,80", "255,120,60"], 10, 48);
    var u = Math.max(7.5, Math.min(10, w * .0085));
    var cw = Math.min(w * .92, 780), ch = Math.min(h * .74, 640);
    ctx.save(); ctx.translate(w / 2, h * .53); ctx.rotate(-.035);
    ctx.shadowColor = "rgba(0,0,0,.75)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    var pg = ctx.createLinearGradient(-cw / 2, -ch / 2, cw / 2, ch / 2); pg.addColorStop(0, "#eadcb6"); pg.addColorStop(1, "#d6c595");
    ctx.fillStyle = pg; ctx.fillRect(-cw / 2, -ch / 2, cw, ch); ctx.shadowColor = "transparent";
    var pad = cw * .07, colW = (cw - pad * 3) / 2, x1 = -cw / 2 + pad, x2 = x1 + colW + pad, y0 = -ch / 2 + pad * 1.1;
    ctx.fillStyle = "#3a1c10"; ctx.textAlign = "center"; ctx.font = (u * 3.1) + "px Rye, Georgia, serif";
    ctx.fillText("THE GARAGE KITCHEN", 0, y0 + u * 2);
    ctx.font = u * .9 + "px 'Space Mono', monospace"; ctx.fillStyle = "#6b4a2a";
    ctx.fillText("WOOD FIRE · SMALL PLATES · EST. 1998", 0, y0 + u * 4);
    ctx.textAlign = "left";
    function col(x, y, title, items) {
      ctx.font = "700 " + u * .95 + "px 'Space Mono', monospace"; ctx.fillStyle = "#8a3b12"; ctx.textAlign = "left";
      ctx.fillText(title, x, y); y += u * 1.9;
      ctx.font = u + "px Georgia, serif";
      items.forEach(function (it) { dotted(ctx, x, y, colW, it[0], it[1], u, "#2a1a10"); y += u * 1.75; if (it[2]) { ctx.font = "italic " + u * .88 + "px Georgia, serif"; ctx.fillStyle = "#6d5a40"; ctx.fillText(it[2], x, y - u * .45); ctx.font = u + "px Georgia, serif"; y += u * .9; } });
      return y + u * .8;
    }
    var yl = y0 + u * 7.2, yr = yl;
    yl = col(x1, yl, "STARTERS", [["Roasted beet salad", "14", "whipped goat cheese, pistachio, honey"], ["Wood-fired octopus", "19", "chorizo, charred lemon, smoked paprika"], ["Bone marrow", "17", "parsley salad, grilled sourdough"], ["Tomato soup", "11", "basil oil, sharp cheddar crouton"]]);
    yl = col(x1, yl, "MAINS", [["Dry-aged ribeye, 12 oz", "58", "bone-in, herb butter, roasted garlic"], ["Seared halibut", "42", "brown butter, capers, fennel"], ["Mushroom risotto", "29", "aged parmesan, thyme"], ["Garage burger", "21", "double patty, onion jam, pickles"]]);
    yr = col(x2, yr, "SIDES", [["Hand-cut fries", "8"], ["Charred broccolini", "9"], ["Mac & cheese", "10"], ["Garlic mashed potatoes", "9"]]);
    yr = col(x2, yr, "WINE BY THE GLASS / BOTTLE", [["2019 Barolo, Piedmont", "22 / 88"], ["2021 Pinot Noir, Willamette", "17 / 68"], ["2022 Albariño, Rías Baixas", "15 / 60"], ["NV Brut, Champagne", "24 / 110"]]);
    ctx.font = u * .78 + "px Georgia, serif"; ctx.fillStyle = "#5d4a32";
    para(ctx, "Please tell your server about any allergies. A 20% gratuity is added to parties of six or more. Prices subject to change without notice. Consuming raw or undercooked meats may increase your risk of foodborne illness. Corkage fee $25 per bottle. Specials are listed on the chalkboard by the bar.", x2, yr + u * .6, colW, u * 1.25);
    // dim edges + candle pool
    var big = Math.max(cw, ch);
    var vg = ctx.createRadialGradient(cw * .15, -ch * .3, big * .05, 0, 0, big * .95);
    vg.addColorStop(0, "rgba(255,200,120,.3)"); vg.addColorStop(.5, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.4)");
    ctx.fillStyle = vg; ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.restore();
  }

  function paintTV(ctx, w, h) {
    var R = rng(21);
    var g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#07090f"); g.addColorStop(1, "#020306");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var tw = Math.min(w * .84, 900), th = tw * .5625, tx = (w - tw) / 2, ty = Math.max(8, (h - th) / 2 - h * .04);
    var gl = ctx.createRadialGradient(w / 2, ty + th / 2, th * .2, w / 2, ty + th / 2, Math.max(w, h) * .7);
    gl.addColorStop(0, "rgba(90,150,255,.35)"); gl.addColorStop(1, "rgba(90,150,255,0)"); ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h);
    bokeh(ctx, R, 10, w, h, 1, ["70,120,255", "255,70,70"], 4, 14);
    ctx.fillStyle = "#0b0b0e"; ctx.fillRect(tx - 8, ty - 8, tw + 16, th + 16);
    var sg = ctx.createLinearGradient(tx, ty, tx + tw, ty + th); sg.addColorStop(0, "#2f6fb2"); sg.addColorStop(.55, "#1b4a85"); sg.addColorStop(1, "#0f2c55");
    ctx.fillStyle = sg; ctx.fillRect(tx, ty, tw, th);
    var s = tw / 420;
    ctx.fillStyle = "rgba(0,0,0,.78)"; ctx.fillRect(tx + tw * .06, ty + th * .72, tw * .88, th * .2);
    ctx.fillStyle = "#e4571d"; ctx.fillRect(tx + tw * .06, ty + th * .72, tw * .012, th * .2);
    ctx.font = "700 " + 13 * s + "px 'Space Mono', monospace"; ctx.fillStyle = "#fff"; ctx.textAlign = "left";
    ctx.fillText("HOME  24", tx + tw * .09, ty + th * .8); ctx.fillText("AWAY  21", tx + tw * .09, ty + th * .87);
    ctx.fillStyle = "#e0a42a"; ctx.fillText("4TH  2:14", tx + tw * .72, ty + th * .8);
    ctx.font = 9 * s + "px 'Space Mono', monospace"; ctx.fillStyle = "#cfe0ff"; ctx.fillText("2ND & 7  ·  BALL ON THE 38", tx + tw * .62, ty + th * .87);
    ctx.font = "700 " + 8 * s + "px 'Space Mono', monospace"; ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fillText("CH 7 HD", tx + tw * .95, ty + th * .1);
    ctx.textAlign = "left"; ctx.font = 9 * s + "px Georgia, serif"; ctx.fillStyle = "#fff";
    ctx.fillText("...and with two minutes left the offense needs a field goal to tie it,", tx + tw * .1, ty + th * .62);
    ctx.fillText("so expect them to run the ball and burn the clock first.", tx + tw * .1, ty + th * .68);
    ctx.font = 7 * s + "px 'Space Mono', monospace"; ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillText("CLOSED CAPTIONING · ENGLISH", tx + tw * .1, ty + th * .1);
    ctx.fillStyle = "rgba(255,40,40,.9)"; ctx.beginPath(); ctx.arc(w * .5, ty + th + 22, 2.4, 0, 7); ctx.fill();
  }

  function paintLabel(ctx, w, h) {
    var R = rng(5);
    var g = ctx.createRadialGradient(w * .5, h * .4, 10, w * .5, h * .5, Math.max(w, h) * .8);
    g.addColorStop(0, "#4a3220"); g.addColorStop(1, "#150d07"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    bokeh(ctx, R, 18, w, h, .4, ["255,190,110", "255,150,80"], 12, 40);
    var u = Math.max(7.5, Math.min(10, w * .0085));
    var lw = Math.min(w * .86, 720), lh = Math.min(h * .88, 470);
    ctx.save(); ctx.translate(w / 2, h * .52); ctx.rotate(.018);
    ctx.shadowColor = "rgba(0,0,0,.7)"; ctx.shadowBlur = 36; ctx.shadowOffsetY = 14;
    ctx.fillStyle = "#efe5c8"; ctx.fillRect(-lw / 2, -lh / 2, lw, lh); ctx.shadowColor = "transparent";
    ctx.fillStyle = "#b8321a"; ctx.fillRect(-lw / 2, -lh / 2, lw, lh * .2);
    ctx.fillStyle = "#f6e9c6"; ctx.textAlign = "left"; ctx.font = u * 3.2 + "px Rye, Georgia, serif"; ctx.fillText("GARAGE HEAT", -lw / 2 + lw * .05, -lh / 2 + lh * .14);
    ctx.font = u * .85 + "px 'Space Mono', monospace"; ctx.textAlign = "right"; ctx.fillText("SMALL BATCH HOT SAUCE", lw / 2 - lw * .05, -lh / 2 + lh * .09); ctx.fillText("5 FL OZ (148 mL)", lw / 2 - lw * .05, -lh / 2 + lh * .14);
    var pad = lw * .05, x1 = -lw / 2 + pad, top = -lh / 2 + lh * .27, cwid = lw * .5;
    ctx.textAlign = "left"; ctx.fillStyle = "#2a1a10"; ctx.font = "700 " + u * .95 + "px 'Space Mono', monospace"; ctx.fillText("INGREDIENTS", x1, top);
    ctx.font = u * .95 + "px Georgia, serif";
    var y = para(ctx, "Aged red peppers, distilled vinegar, water, salt, garlic powder, onion powder, xanthan gum, natural smoke flavor, citric acid, sodium benzoate (to protect freshness).", x1, top + u * 1.6, cwid, u * 1.35);
    ctx.font = "700 " + u * .85 + "px 'Space Mono', monospace"; ctx.fillText("CONTAINS: NO COMMON ALLERGENS", x1, y + u * .8);
    ctx.font = u * .85 + "px Georgia, serif"; ctx.fillStyle = "#5d4a32";
    para(ctx, "Shake well. Refrigerate after opening and use within twelve months. Made in a shared kitchen that also processes tree nuts and sesame. Best by 03/2028. Lot 22-117. Distributed by Garage Heat Co..", x1, y + u * 3, cwid, u * 1.3);
    var nx = lw / 2 - lw * .38, nw = lw * .33, ny = top - u * 1.2;
    ctx.fillStyle = "#2a1a10"; ctx.fillRect(nx - 3, ny - 3, nw + 6, lh * .62 + 6); ctx.fillStyle = "#efe5c8"; ctx.fillRect(nx - 1.5, ny - 1.5, nw + 3, lh * .62 + 3);
    ctx.fillStyle = "#2a1a10"; ctx.font = "700 " + u * 1.7 + "px Georgia, serif"; ctx.fillText("Nutrition Facts", nx + 6, ny + u * 2);
    ctx.font = u * .85 + "px 'Space Mono', monospace";
    var rows = [["Serving size", "1 tsp (5g)"], ["Servings per container", "about 29"], ["Calories", "0"], ["Total Fat", "0g  0%"], ["Sodium", "125mg  5%"], ["Total Carbohydrate", "0g  0%"], ["Protein", "0g"]];
    var yy = ny + u * 3.8; rows.forEach(function (r) { ctx.fillRect(nx + 6, yy - u * 1.05, nw - 12, 1); dotted(ctx, nx + 6, yy, nw - 12, r[0], r[1], u * .85, "#2a1a10"); yy += u * 1.7; });
    ctx.font = u * .7 + "px Georgia, serif"; para(ctx, "Not a significant source of other nutrients. Percent Daily Values are based on a 2,000 calorie diet.", nx + 6, yy + u * .4, nw - 12, u * 1.1);
    var vg = ctx.createRadialGradient(0, 0, lw * .1, 0, 0, lw * .6); vg.addColorStop(0, "rgba(255,230,170,.18)"); vg.addColorStop(1, "rgba(0,0,0,.35)");
    ctx.fillStyle = vg; ctx.fillRect(-lw / 2, -lh / 2, lw, lh);
    ctx.restore();
  }

  var SCENES = {
    menu: { draw: paintMenu, zoom: 2.4, dark: 1, blur: 3.2, torch: 1, label: "Dark restaurant. Menu print, candle light." },
    tv: { draw: paintTV, zoom: 2.6, dark: 1, blur: 2.6, torch: 0, label: "The TV across a dark room. Score and captions." },
    label: { draw: paintLabel, zoom: 2.4, dark: .35, blur: 3, torch: 0, label: "A tiny ingredient and nutrition label." }
  };

  // ---------- WebGL ----------
  var VS = "#version 300 es\nin vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }";
  var FS = "#version 300 es\nprecision highp float;\n" +
    "uniform sampler2D uTex; uniform vec2 uRes, uMouse, uPan, uView; uniform float uR, uZoom, uTime, uDark, uFreeze, uTorch, uBlur, uFlash;\nout vec4 o;\n" +
    "float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\n" +
    "vec3 blurS(vec2 uv,float rad){ vec3 a=vec3(0.); for(int i=0;i<14;i++){ float ang=float(i)*2.39996; float r=sqrt(float(i)+.5)/3.74; a+=texture(uTex,uv+vec2(cos(ang),sin(ang))*r*rad/uRes).rgb; } return a/14.; }\n" +
    "void main(){\n" +
    " vec2 px=gl_FragCoord.xy; px.y=uRes.y-px.y; vec2 uv=px/uRes;\n" +
    " float d=length(px-uMouse);\n" +
    " float lens=smoothstep(uR,uR-1.5,d);\n" +
    " vec3 col;\n" +
    " if(lens<.999){\n" +
    "  vec3 b=blurS(uv,uBlur);\n" +
    "  float lum=dot(b,vec3(.299,.587,.114)); b=mix(vec3(lum),b,.7);\n" +
    "  b+=max(b-.55,0.)*.7;\n" +
    "  b*=mix(1.,.42,uDark);\n" +
    "  b+=(hash(px+uTime*57.)-.5)*.11*(.4+uDark);\n" +
    "  b=mix(b,vec3(lum*.9)*vec3(.9,1.,1.15),.08);\n" +
    "  vec2 c=uv-.5; b*=1.-dot(c,c)*.95;\n" +
    "  b+=uTorch*vec3(1.,.78,.45)*exp(-d*d/(uR*uR*3.2))*.32;\n" +
    "  col=b;\n" +
    " }\n" +
    " if(lens>.001){\n" +
    "  vec2 dir=(px-uMouse)/uR; float rr=length(dir);\n" +
    "  vec2 dd=dir*(1.+.16*rr*rr);\n" +
    "  vec2 suv=(uView+dd*uR/uZoom+uPan)/uRes;\n" +
    "  vec2 e=vec2(1.2,0.)/(uRes*3.);\n" +
    "  vec3 s=texture(uTex,suv).rgb; vec3 n=(texture(uTex,suv+e).rgb+texture(uTex,suv-e).rgb+texture(uTex,suv+e.yx).rgb+texture(uTex,suv-e.yx).rgb)*.25;\n" +
    "  s=clamp(s+(s-n)*.35,0.,1.5);\n" +
    "  s*=mix(1.,.72,uDark*(1.-uTorch));\n" +
    "  s*=1.+uTorch*.22; s=mix(s,s*vec3(1.03,1.0,.95),uTorch);\n" +
    "  s+=(hash(px+uTime*57.)-.5)*.05*(1.-uFreeze)*uDark*(1.-uTorch);\n" +
    "  s=mix(s,vec3(1.),uFlash*.85);\n" +
    "  float rim=smoothstep(uR-7.,uR-1.,d); s=mix(s,vec3(.95,.9,.8),rim*.28);\n" +
    "  float hl=pow(max(dot(normalize(dir+1e-4),normalize(vec2(-.6,-.8))),0.),14.)*smoothstep(.72,.95,rr)*.55; s+=hl;\n" +
    "  float edge=smoothstep(uR-2.5,uR,d)*lens; s=mix(s,vec3(.04,.03,.02),edge*.85);\n" +
    "  col=mix(col,s,lens);\n" +
    " }\n" +
    " o=vec4(col,1.);\n" +
    "}";

  function compile(gl, type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }

  function Stage(canvas, opts) {
    var self = this;
    this.canvas = canvas; this.opts = opts || {};
    var gl = canvas.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error("no webgl2");
    this.gl = gl;
    var pr = gl.createProgram(); gl.attachShader(pr, compile(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(pr, compile(gl, gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr); this.pr = pr;
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.U = {}; ["uTex", "uRes", "uMouse", "uPan", "uView", "uR", "uZoom", "uTime", "uDark", "uFreeze", "uTorch", "uBlur", "uFlash"].forEach(function (n) { self.U[n] = gl.getUniformLocation(pr, n); });
    this.tex = gl.createTexture();
    this.scene = SCENES[this.opts.scene || "menu"];
    this.mouse = { x: 0, y: 0 }; this.target = { x: 0, y: 0 }; this.pan = { x: 0, y: 0 };
    this.frozen = false; this.full = false; this.fr = 0; this.flash = 0; this.torch = 0; this.t0 = performance.now();
    this.lastPointer = -1e9; this.visible = false; this.running = false; this.dpr = 1; this.down = null;
    this.onState = this.opts.onState || function () { };
    this.resize(); this.bind(); this.observe();
    var rz; var again = function () { clearTimeout(rz); rz = setTimeout(function () { var r = self.canvas.getBoundingClientRect(); if (Math.abs(r.width - self.cw) > 1 || Math.abs(r.height - self.ch) > 1) self.resize(); }, 120); };
    window.addEventListener("resize", again); if (window.ResizeObserver) new ResizeObserver(again).observe(canvas);
  }
  Stage.prototype.setScene = function (name) {
    this.scene = SCENES[name]; this.frozen = false; this.pan = { x: 0, y: 0 }; this.flash = 0; this.paint(); this.state();
  };
  Stage.prototype.resize = function () {
    var c = this.canvas, r = c.getBoundingClientRect(); var cw = Math.max(2, r.width), ch = Math.max(2, r.height);
    var dpr = Math.min(window.devicePixelRatio || 1, 2); while (cw * ch * dpr * dpr > 2.4e6 && dpr > 1) dpr -= .25;
    this.dpr = dpr; this.cw = cw; this.ch = ch; c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr);
    this.gl.viewport(0, 0, c.width, c.height);
    this.mouse = { x: c.width * .5, y: c.height * .5 }; this.target = { x: this.mouse.x, y: this.mouse.y };
    this.paint();
  };
  Stage.prototype.paint = function () {
    var self = this, gl = this.gl;
    var go = function () {
      var S = Math.max(1, Math.min(4, 4096 / Math.max(self.cw, self.ch) / self.dpr)) * self.dpr;
      var off = document.createElement("canvas"); off.width = Math.round(self.cw * S); off.height = Math.round(self.ch * S);
      var ctx = off.getContext("2d"); ctx.scale(S, S); self.scene.draw(ctx, self.cw, self.ch);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, self.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);
      gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      self.draw(performance.now());
    };
    if (document.fonts && document.fonts.load) {
      Promise.all(["12px Rye", "12px 'Space Mono'", "700 12px 'Space Mono'"].map(function (f) { return document.fonts.load(f); })).then(go, go);
    } else go();
  };
  Stage.prototype.state = function () {
    this.onState({ frozen: this.frozen, torch: this.scene.torch && !this.frozen ? true : this.scene.torch && this.frozen, dark: this.scene.dark > .5, label: this.scene.label });
  };
  Stage.prototype.pos = function (e) { var r = this.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * this.dpr, y: (e.clientY - r.top) * this.dpr }; };
  Stage.prototype.bind = function () {
    var self = this, c = this.canvas;
    c.addEventListener("pointermove", function (e) {
      var p = self.pos(e); self.lastPointer = performance.now();
      if (self.down && e.buttons) {
        if (self.frozen) { self.pan.x -= (p.x - self.down.last.x) / self.scene.zoom; self.pan.y -= (p.y - self.down.last.y) / self.scene.zoom; }
        self.down.moved += Math.abs(p.x - self.down.last.x) + Math.abs(p.y - self.down.last.y); self.down.last = p;
        if (!self.frozen) self.target = p;
      } else if (!self.frozen) self.target = p;
      if (!self.running) self.draw(performance.now());
    });
    // Tapping the demo must never move the page. The canvas is focusable (keyboard users), and browsers scroll a focused
    // element into view, which threw the page to the bottom on freeze. Block mouse/touch focus and pin the scroll position.
    var keepY = 0, keepX = 0;
    function pin() { if (Math.abs(window.scrollY - keepY) > 1 || Math.abs(window.scrollX - keepX) > 1) window.scrollTo(keepX, keepY); }
    c.addEventListener("mousedown", function (e) { e.preventDefault(); });
    c.addEventListener("focus", function () { pin(); });
    c.addEventListener("pointerdown", function (e) {
      keepX = window.scrollX; keepY = window.scrollY;
      var p = self.pos(e); self.lastPointer = performance.now(); self.down = { start: p, last: p, moved: 0 };
      if (!self.frozen) { self.target = p; }
      try { c.setPointerCapture(e.pointerId); } catch (x) { }
    });
    c.addEventListener("pointerup", function () {
      if (self.down && self.down.moved < 14 * self.dpr && self.full) {
        self.frozen = !self.frozen; self.flash = 1; if (!self.frozen) self.pan = { x: 0, y: 0 }; self.state();
      }
      self.down = null; if (!self.running) self.draw(performance.now());
      pin(); requestAnimationFrame(function () { pin(); requestAnimationFrame(pin); });
    });
    c.addEventListener("pointercancel", function () { self.down = null; });
    c.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); self.frozen = !self.frozen; self.flash = 1; if (!self.frozen) self.pan = { x: 0, y: 0 }; self.state(); } });
  };
  Stage.prototype.observe = function () {
    var self = this;
    if (!("IntersectionObserver" in window)) { this.visible = true; this.loop(); return; }
    new IntersectionObserver(function (en) { self.visible = en[0].isIntersecting; if (self.visible) self.loop(); }, { threshold: 0.01 }).observe(this.canvas);
  };
  Stage.prototype.loop = function () {
    var self = this; if (this.running || reduce) { if (reduce) this.draw(performance.now()); return; }
    this.running = true;
    (function f(now) { if (!self.visible || document.hidden) { self.running = false; return; } self.draw(now); requestAnimationFrame(f); })(performance.now());
  };
  Stage.prototype.draw = function (now) {
    var gl = this.gl, c = this.canvas, U = this.U, t = (now - this.t0) / 1000;
    if (!this.frozen && !reduce) {
      var idle = now - this.lastPointer > 2200;
      if (idle) { this.target = { x: c.width * (.5 + .3 * Math.sin(t * .35)), y: c.height * (.4 + .3 * Math.sin(t * .27 + 1.3)) }; }
      var k = idle ? .035 : .22; this.mouse.x += (this.target.x - this.mouse.x) * k; this.mouse.y += (this.target.y - this.mouse.y) * k;
    } else if (!this.frozen) { this.mouse = { x: this.target.x, y: this.target.y }; }
    var tt = this.scene.torch ? 1 : 0; this.torch += (tt - this.torch) * .06; this.flash *= .88;
    this.fr += ((this.full ? 1 : 0) - this.fr) * .12;
    var base = 0;
    var R = base + (Math.hypot(c.width, c.height) * .8 - base) * this.fr;
    gl.uniform1i(U.uTex, 0); gl.uniform2f(U.uRes, c.width, c.height); var fr = this.fr, cx = c.width / 2, cy = c.height / 2;
    var mx = Math.max(.1, Math.min(.9, this.mouse.x / c.width)) , my = Math.max(.1, Math.min(.9, this.mouse.y / c.height));
    var vx = this.mouse.x + (c.width * (.18 + .64 * (this.mouse.x / c.width)) - this.mouse.x) * fr, vy = this.mouse.y + (c.height * (.15 + .7 * (this.mouse.y / c.height)) - this.mouse.y) * fr;
    gl.uniform2f(U.uView, vx, vy);
    gl.uniform2f(U.uMouse, this.mouse.x + (cx - this.mouse.x) * fr, this.mouse.y + (cy - this.mouse.y) * fr); gl.uniform2f(U.uPan, this.pan.x, this.pan.y);
    gl.uniform1f(U.uR, R); gl.uniform1f(U.uZoom, this.scene.zoom);
    gl.uniform1f(U.uTime, t % 100); gl.uniform1f(U.uDark, this.scene.dark); gl.uniform1f(U.uFreeze, this.frozen ? 1 : 0);
    gl.uniform1f(U.uTorch, this.torch); gl.uniform1f(U.uBlur, this.scene.blur * this.dpr); gl.uniform1f(U.uFlash, this.flash);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  // ---------- boot ----------
  function boot() {
    var stages = [];
    var canvases = document.querySelectorAll("canvas[data-scene]");
    if (!canvases.length) return;
    try {
      canvases.forEach(function (cv) {
        var stage;
        var tag = cv.closest("[data-stage]");
        var ui = tag && tag.querySelector("[data-state]");
        stage = new Stage(cv, {
          scene: cv.getAttribute("data-scene"), lens: parseFloat(cv.getAttribute("data-lens")) || 0,
          onState: function (s) {
            if (!ui) return;
            ui.querySelector("[data-frozen]").hidden = !s.frozen; ui.querySelector("[data-live]").hidden = s.frozen;
            var zr = ui.querySelector("[data-zoom]"); if (zr) zr.textContent = (stage && stage.full ? stage.scene.zoom.toFixed(1) + "×" : "1.0×");
            var hint = tag.querySelector("[data-hint]"); if (hint) hint.textContent = !(stage && stage.full) ? "Your regular camera. Tiny, dim, blurry." : (s.frozen ? "Tap to resume" : "Tap to freeze");
            var tr = ui.querySelector("[data-torch]"); if (tr) tr.classList.toggle("on", !!s.torch && !!(stage && stage.full));
            var lb = tag.querySelector("[data-label]"); if (lb) lb.textContent = s.label;
          }
        });
        stage.state(); stages.push(stage); cv._stage = stage;
        if (cv.hasAttribute("data-main")) {
          var fb = tag.querySelector("[data-full]");
          if (fb) fb.addEventListener("click", function () { stage.full = !stage.full; fb.setAttribute("aria-pressed", stage.full); fb.textContent = stage.full ? "Close See It Yo" : "Open See It Yo"; tag.classList.toggle("open", stage.full); stage.frozen = false; stage.pan = { x: 0, y: 0 }; stage.state(); if (!stage.running) stage.draw(performance.now()); });
          document.querySelectorAll("[data-pick]").forEach(function (b) {
            b.addEventListener("click", function () {
              document.querySelectorAll("[data-pick]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
              stage.setScene(b.getAttribute("data-pick"));
            });
          });
        }
      });
      document.documentElement.classList.add("gl");
    } catch (e) {
      document.documentElement.classList.add("nogl");
      if (window.SIY && window.SIY.fallback) window.SIY.fallback();
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
