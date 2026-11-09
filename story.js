// story.js：公寓模型配合文稿的 108 秒動畫。時間軸全部由 t（秒）算出，可拖曳、也可用 ?t=秒數 停在某一刻。
// 樓層命名：模型 f1 是最上層（緊密互動），f4 是最下層（身心共振）。數字皆取自最終版文稿。
import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';

const DUR = 108;
const AR_SCALE = .42, AR_X = .2, AR_Y = -.2;              // 房子在海報右側
const AR_BOARD = { x: -2.05, y: .48, w: 2.9 };            // 看板緊鄰房子左方（模型座標）
const CROP01 = [0, .075, 1, .875];                       // 路徑圖去掉圖內的標題與腳註，看板上另有文字
const q = new URLSearchParams(location.search);
const TYPES = {
    1: { name: '緊密互動型', sub: '285 戶・子女平均 24.3 歲', img: 'cat-4', text: '接觸最多，親近感雙向帶動最強。', v: [.13, .12, .20, .97, .23, .27] },
    2: { name: '心近身遠型', sub: '170 戶・子女平均 25.8 歲', img: 'cat-7', text: '最親但少見面，家人之間的帶動最弱。', v: [-.11, .03, .97, -.38, .64, .07] },
    3: { name: '各自安好型', sub: '195 戶・子女平均 26.9 歲', img: 'cat-6', text: '身心佳、不黏；子女好，父母更覺親近。', v: [.20, .46, -.63, -.65, -.40, .43] },
    4: { name: '身心共振型', sub: '173 戶・子女平均 27.9 歲', img: 'cat-2', text: '身心差、疏遠；子女身心牽動父母最強。', v: [-.30, -.72, -.48, -.31, -.47, -.93] }
};
const BAR_LABEL = ['父母婚姻品質', '父母身心', '親密（父母）', '親子接觸', '親密（子女）', '子女身心'];

const SEGS = [
    { a: 0, b: 5, title: '子女長大以後，家由誰來帶動？', text: '臺灣家庭動態調查（PSFD）2018–2024' },
    { a: 5, b: 13, title: '方法一：看前後階段誰影響誰', text: '交叉延宕模型（CLPM）：控制 B 自己的過去與人口學後，前一階段的 A 還能不能預測下一階段的 B。', method: 'clpm' },
    { a: 13, b: 24, title: '子女成年的四個階段，家裡誰影響誰', text: '只畫出顯著的路徑，線越粗影響越大（555 位子女、356 戶）。', img: 'fig01_paths_main', crop: CROP01 },
    { a: 24, b: 38, title: '二十幾歲爸媽帶著你，三十歲後換你帶著爸媽', text: '二十幾歲時，爸媽覺得跟你親，你之後也會跟著覺得親（.16、.15）；過了三十歲反過來，你覺得跟爸媽親，爸媽才跟著覺得親（.22）。', img: 'fig02_handover', crop: [0, .085, 1, .8], flow: true },
    { a: 38, b: 48, title: '常回家看看，三十歲前暖到爸媽，三十歲後暖到自己', text: '二十幾歲時多見面、多打電話，爸媽之後更覺得跟你親（.14、.10）；過了三十歲，同樣的陪伴，換成你自己更覺得跟爸媽親（.13）。', img: 'fig14_contact_switch' },
    { a: 48, b: 56, title: '方法二：把每個家畫成一張關係圖', text: 'CLPM 一次只看一對親子；圖神經網路（GNN）把兩位家長和所有兄弟姊妹一起放進模型。', method: 'gnn' },
    { a: 56, b: 62, type: 1 }, { a: 62, b: 68, type: 2 }, { a: 68, b: 74, type: 3 }, { a: 74, b: 80, type: 4 },
    { a: 80, b: 90, title: '孩子過得好，只有常相處的家感受得到', text: '在緊密互動的家，孩子身心好，之後爸媽的婚姻品質更好（.09），孩子也更覺得跟爸媽親（.11）；其他三型的家，孩子過得好不好，沒有明顯傳到家裡其他面向。', img: 'fig15_child_outflow' },
    { a: 90, b: 102, title: '子女越年長，緊密互動的家越少', text: '緊密互動型由 52% 降到 23%，身心共振型由 10% 增加到 32%。', img: 'fig09_gnn_age' },
    { a: 102, b: 106, title: '家庭類型不是標籤，是會流動的關係', text: '每兩年約六成的家戶維持同一型，其餘四成發生轉換。' }
];

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const centering = t => Math.max(1 - smooth(t / 2.5), smooth((t - 105.5) / 2.5));   // 播放前與播放結束：房子回到畫面中心
const env = (t, a, b, f = 1) => smooth((t - a) / f) * smooth((b - t) / f);

// ?ar=1：手機鏡頭對準印刷海報時，同一支動畫長在海報上（MindAR 圖像追蹤）；否則是一般的 3D 網頁
const AR = q.has('ar');
let renderer, scene, camera, mindar = null, anchor = null;
if (AR) {
    document.body.classList.add('ar');
    const { MindARThree } = await import('./vendor/mindar/mindar-image-three.prod.js');
    mindar = new MindARThree({ container: document.getElementById('ar-stage'), imageTargetSrc: 'assets/ar/poster.mind', uiLoading: 'no', uiScanning: 'no', uiError: 'no', filterMinCF: .001, filterBeta: 12 });
    ({ renderer, scene, camera } = mindar);
    anchor = mindar.addAnchor(0);
} else {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    document.body.prepend(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, .05, 30);
}
// 模型的掛載點：AR 時縮小並放在海報上（海報寬＝1），一般模式就是原點
const world = new THREE.Group();
if (AR) { world.scale.setScalar(AR_SCALE); world.position.set(AR_X, AR_Y, 0); anchor.group.add(world); } else scene.add(world);

const note = document.getElementById('note');
const nodes = {}, creatures = [], shades = [], clones = [];
let meta;

// 使用者的視角調整，疊加在導覽鏡頭上
const user = { yaw: 0, pitch: 0, zoom: 1, panX: 0, panY: 0 };
const ASPECT = { land: 1.3, port: 1 };                  // 看板寬高比
const isLand = () => AR || innerWidth >= innerHeight;

// 電腦版的預覽和 AR 同一套構圖（房子在右、看板在左，位置固定）；手機直向放不下左右並排，看板在左上、房子在右下
function applyCamera(t) {
    const c = centering(t), asp = AR ? 1 : innerWidth / innerHeight, tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const land = isLand();
    backdrop.visible = land;
    let lx, ly, lz, d, a, p;
    if (land) {
        world.position.x = lerp(AR ? AR_X : AR_X / AR_SCALE, 0, c);
        board.position.set(AR_BOARD.x, AR_BOARD.y, BOARD_Z);
        board.scale.set(AR_BOARD.w, AR_BOARD.w / ASPECT.land, 1);
        board.rotation.set(0, 0, 0);
        if (AR) return;                         // 鏡頭由追蹤決定
        const left = -3.72 + AR_X / AR_SCALE, right = 1.52 + AR_X / AR_SCALE, H = 2.6;
        const d0 = Math.max(H * 1.04 / (2 * tan), (right - left) * 1.04 / (2 * tan * asp));
        const centerD = Math.max(2.4 / (2 * tan), 2.3 / (2 * tan * asp));
        d = lerp(d0, centerD, c); a = 0; p = .08; lz = .25;
        lx = lerp((left + right) / 2, 0, c); ly = lerp(.42, -.1, c);
    } else {
        const vw = 2.05, x = 0, y = -.02;
        const d0 = vw * 1.04 / (2 * tan * asp * .9), hw = d0 * tan * asp, hh = d0 * tan;
        const centerD = Math.max(2.4 / (2 * tan), 2.3 / (2 * tan * asp));
        d = lerp(d0, centerD, c); a = 0; p = .08; lz = .25;
        lx = lerp(x - .1 * hw, 0, c); ly = lerp(y + .42 * hh, -.1, c);
        const VH = 2 * tan * (d + lz - BOARD_Z), VW = VH * asp, A = ASPECT.port;
        const bw = Math.min(.86 * VW, .4 * VH * A), bh = bw / A;
        board.scale.set(bw, bh, 1);
        board.position.set(lx - VW / 2 + .03 * VW + bw / 2, ly + VH / 2 - .1 * VH - bh / 2, BOARD_Z);
        board.rotation.set(0, 0, 0);
    }
    const dist = d * user.zoom, yaw = a + user.yaw, pitch = clamp(p + user.pitch, -.25, 1.25), X = lx + user.panX, Y = ly + user.panY;
    camera.position.set(X + Math.sin(yaw) * Math.cos(pitch) * dist, Y + Math.sin(pitch) * dist, lz + Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(X, Y, lz);
    camera.aspect = asp;
    camera.updateProjectionMatrix();
}

function shadeLevels(t) {
    const L = [0, 0, 0, 0], DARK = .74;
    // 介紹四種家：其他房間變暗
    for (let f = 0; f < 4; f++) {
        const a = 56 + f * 6;
        for (let g = 0; g < 4; g++) if (g !== f) L[g] = Math.max(L[g], DARK * env(t, a - .2, a + 6.2, .8));
    }
    return L;
}

function animate(t, wall) {
    for (const c of creatures) {
        const n = Math.sin(wall / 700 + c.phase);
        c.o.position.copy(c.pos); c.o.rotation.z = 0;
        c.o.scale.set(1 - n * .012, 1 + n * .022, 1);
    }
    const N = nodes, on = (a, b) => env(t, a, b, .6);
    // 路人走過街道
    Object.keys(N).filter(k => k.startsWith('passer_')).forEach((k, i) => {
        const o = N[k], b = o.userData.base, dir = i % 2 ? -1 : 1;
        o.position.x = b.x + dir * (.22 * Math.sin(t / 7 + i)) ;
        o.position.y = b.y + Math.abs(Math.sin(t * 2.6 + i)) * .012;
    });
    // 緊密互動：四隻一起晃動、互相傾向
    const f1 = on(56, 62);
    ['f1_a', 'f1_b', 'f1_c', 'f1_d'].forEach((k, i) => { if (N[k]) { N[k].rotation.z = f1 * Math.sin(t * 3.2 + i * .9) * .07; N[k].position.y += f1 * Math.abs(Math.sin(t * 3.2 + i)) * .014; } });
    // 心近身遠：手機上方持續冒出對話泡泡
    const f2 = on(62, 68);
    clones.forEach((c, i) => {
        const k = ((t - 62) * .55 + i / clones.length) % 1;
        const vis = f2 * smooth(k / .15) * smooth((1 - k) / .3);
        c.visible = vis > .01; c.material.opacity = vis;
        const s = c.userData.base;
        c.position.set(s.x + Math.sin(k * 6 + i) * .018, s.y + k * .17, s.z); c.scale.setScalar(.35 + k * .25);
    });
    // 各自安好：背對的那隻慢慢走向門口
    const f3 = on(68, 74);
    if (N.f3_c) { N.f3_c.position.x += f3 * smooth((t - 68.5) / 4.5) * .085; N.f3_c.rotation.z = f3 * Math.sin(t * 5) * .025; }
    // 身心共振：一隻往下沉，另一隻隔一下跟著沉
    const sink = (k, delay) => { if (!N[k]) return; const d = on(74, 80) * (.5 + .5 * Math.sin((t - delay) * 1.5)); N[k].scale.y *= 1 - d * .16; N[k].scale.x *= 1 + d * .05; };
    sink('f4_a', 74); sink('f4_c', 74.9);
    shadeLevels(t).forEach((v, i) => { shades[i].material.opacity = v; shades[i].visible = v > .004; });
}

// 看板：把文字與圖表畫在 canvas 上，當成建築後方的貼圖
const BOARD_Z = -.3;
const bc = document.createElement('canvas'), ctx = bc.getContext('2d');
const boardTex = new THREE.CanvasTexture(bc);
boardTex.colorSpace = THREE.SRGBColorSpace; boardTex.anisotropy = 8;
const board = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: boardTex, transparent: true, opacity: 0, depthWrite: false }));
board.renderOrder = -10;
const FONT = "'Taipei Sans TC Beta', 'PingFang TC', sans-serif", INK = '#3B2F27', SOFT = '#6B5B4E', AMBER = '#D9954D', MIST = '#DDD7D1';
const images = {};
// 手繪白面板：三邊是粗糙的紙緣，加上粗細起伏、偶爾斷開的 G 筆線；下緣留給相接的另一塊面板
function sketchPanel(w, h, fill) {
    const S = 400, W = Math.round(w * S), H = Math.round(h * S), M = 40, c = document.createElement('canvas'), g = c.getContext('2d');
    c.width = W; c.height = H;
    let seed = Math.round(W * 7 + H * 13);
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const ph = [0, 1, 2, 3, 4, 5].map(() => rnd() * 6.28);
    const wob = s => 9 * Math.sin(s * .011 + ph[0]) + 5 * Math.sin(s * .037 + ph[1]) + 2.4 * Math.sin(s * .13 + ph[2]) + (rnd() - .5) * 2.2;
    const pts = []; let s = 0;
    for (let y = H; y > M; y -= 6, s += 6) pts.push([M + wob(s), y]);
    for (let x = M; x < W - M; x += 6, s += 6) pts.push([x, M + wob(s)]);
    for (let y = M; y <= H; y += 6, s += 6) pts.push([W - M + wob(s), y]);
    g.fillStyle = fill; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
    // 內面的紙紋與少量短筆觸
    g.save(); g.clip();
    for (let i = 0; i < W * H / 900; i++) { g.fillStyle = `rgba(120, 100, 80, ${.02 + rnd() * .05})`; g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2.6, 1 + rnd() * 2.6); }
    g.strokeStyle = 'rgba(59, 47, 39, .16)'; g.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
        const left = i % 2, x = left ? M + 24 + rnd() * 90 : W - M - 24 - rnd() * 90, y = M + 20 + rnd() * (H - M - 90);
        g.lineWidth = 1.5 + rnd() * 2.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 26 + rnd() * 34, y + 18 + rnd() * 22); g.stroke();
    }
    g.restore();
    // G 筆線：線寬隨位置起伏，有時收細或斷開
    g.strokeStyle = '#3B2F27'; g.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
        const k = .5 + .5 * Math.sin(i * .021 + ph[3]) * Math.sin(i * .0071 + ph[4]) + .22 * Math.sin(i * .09 + ph[5]);
        if (k < .16) continue;
        g.lineWidth = 2 + 11 * Math.pow(Math.min(k, 1), 1.7);
        g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
}
const backdrop = new THREE.Group();
function img(src) {
    if (!images[src]) { images[src] = new Image(); images[src].onload = () => { drawn = ''; }; images[src].src = src; }
    return images[src].complete && images[src].naturalWidth ? images[src] : null;
}
function wrap(text, maxW) {
    const lines = []; let cur = '';
    for (const ch of text) { if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; } else cur += ch; }
    if (cur) lines.push(cur);
    return lines;
}
function para(text, x, y, maxW, size, weight, color, lh = 1.32) {
    ctx.font = `${weight} ${size}px ${FONT}`; ctx.fillStyle = color;
    for (const l of wrap(text, maxW)) { ctx.fillText(l, x, y); y += size * lh; }
    return y;
}
function drawType(y, W, H, startY) {
    const pic = img(`assets/cats/${y.img}.webp`), m = 44;
    if (pic) ctx.drawImage(pic, m, startY, 220, 220);
    let ty = para(y.name, m + 250, startY + 20, W - m * 2 - 250, 104, 700, INK);
    ty = para(y.sub, m + 250, ty + 2, W - m * 2 - 250, 46, 400, SOFT);
    ty = para(y.text, m, Math.max(ty, startY + 232) + 8, W - m * 2, 60, 400, INK);
    const rowH = Math.min(130, (H - ty - 44) / 6);
    ctx.font = `400 ${Math.min(64, rowH * .68)}px ${FONT}`;
    y.v.forEach((x, i) => {
        const cy = ty + 18 + rowH * i, lx = m + 410, tw = W - m * 2 - 410 - 150, mid = lx + tw / 2, p = Math.min(Math.abs(x) / 1.2, 1) * tw / 2;
        ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.fillText(BAR_LABEL[i], m, cy);
        ctx.fillStyle = MIST; ctx.fillRect(lx, cy + rowH * .3, tw, rowH * .34);
        ctx.fillStyle = AMBER; ctx.fillRect(x >= 0 ? mid : mid - p, cy + rowH * .3, p, rowH * .34);
        ctx.fillStyle = SOFT; ctx.fillRect(mid - 2, cy + rowH * .18, 4, rowH * .58);
        ctx.fillStyle = INK; ctx.textAlign = 'right'; ctx.fillText((x > 0 ? '+' : '') + x.toFixed(2), W - m, cy);
        ctx.textAlign = 'left';
    });
}
function box(x, y, w, h, fill, label, size = 50, color = INK, r = 30) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
    ctx.font = `700 ${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}
function arrow(x0, y0, x1, y1, color, lw = 11) {
    const a = Math.atan2(y1 - y0, x1 - x0), L = 34;
    ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * L * .7, y1 - Math.sin(a) * L * .7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - L * Math.cos(a - .5), y1 - L * Math.sin(a - .5)); ctx.lineTo(x1 - L * Math.cos(a + .5), y1 - L * Math.sin(a + .5)); ctx.closePath(); ctx.fill();
}
// 方法頁的示意圖：y 起點以下、左右邊界 m 以內
function drawClpm(W, H, m, y) {
    const bw = 470, bh = 130, x0 = m, x1 = W - m - bw, gap = 120, y0 = y + 66, y1 = y0 + bh + gap;
    ctx.font = `700 50px ${FONT}`; ctx.fillStyle = SOFT; ctx.textAlign = 'center';
    ctx.fillText('前一階段', x0 + bw / 2, y); ctx.fillText('下一階段', x1 + bw / 2, y); ctx.textAlign = 'left';
    arrow(x0 + bw + 14, y0 + bh / 2, x1 - 14, y0 + bh / 2, MIST); arrow(x0 + bw + 14, y1 + bh / 2, x1 - 14, y1 + bh / 2, MIST);
    arrow(x0 + bw + 14, y0 + bh - 16, x1 - 14, y1 + 16, AMBER, 15); arrow(x0 + bw + 14, y1 + 16, x1 - 14, y0 + bh - 16, AMBER, 15);
    box(x0, y0, bw, bh, '#E8C18F', '父母的親近感', 56); box(x1, y0, bw, bh, '#E8C18F', '父母的親近感', 56);
    box(x0, y1, bw, bh, '#C3A087', '子女的親近感', 56); box(x1, y1, bw, bh, '#C3A087', '子女的親近感', 56);
    let py = y1 + bh + 34;
    ['21–24', '25–28', '29–32', '33–36'].forEach((l, i, a) => { const w = (W - m * 2 - 180) / 4; box(m + i * (w + 60), py, w, 84, MIST, l + ' 歲', 46, INK, 42); });
    py += 106;
    para('六個構念、四個年齡階段；555 位子女、356 戶。各階段控制人口學，以 FIML 處理遺漏。', m, py, W - m * 2, 50, 400, SOFT);
}
function drawGnn(W, H, m, y) {
    const gw = (W - m * 2) * .48, cx = m + gw / 2, avail = H - y - 44, top = y + 50, gh = Math.min(avail - 60, 640);
    const nodes = { p1: [cx - gw * .27, top + 40], p2: [cx + gw * .27, top + 40], c1: [cx - gw * .34, top + gh - 60], c2: [cx, top + gh - 60], c3: [cx + gw * .34, top + gh - 60] };
    const line = (a, b, c, lw = 11, dash = []) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(...nodes[a]); ctx.lineTo(...nodes[b]); ctx.stroke(); ctx.setLineDash([]); };
    line('p1', 'p2', AMBER, 15);
    ['c1', 'c2', 'c3'].forEach(c => { line('p1', c, '#C3A087'); line('p2', c, '#C3A087'); });
    line('c1', 'c2', '#AFA69D', 10, [8, 24]); line('c2', 'c3', '#AFA69D', 10, [8, 24]);
    const node = (k, label, fill) => { const [x, y] = nodes[k], w = 180, h = 104; box(x - w / 2, y - h / 2, w, h, fill, label, 44, INK, 52); };
    node('p1', '受訪者', '#E8C18F'); node('p2', '配偶', '#E8C18F'); node('c1', '子女', '#F3E6D2'); node('c2', '子女', '#F3E6D2'); node('c3', '子女', '#F3E6D2');
    ctx.font = `400 42px ${FONT}`; ctx.fillStyle = SOFT; ctx.textAlign = 'center';
    ctx.fillText('婚姻', cx, top - 48); ctx.fillText('親子、手足關係都是邊', cx, top + gh + 16); ctx.textAlign = 'left';
    const px = m + gw + 40, pw = W - m - px, steps = ['每戶每波一張圖', '反事實：改變一位家人，看其他人怎麼變', '高斯混合模型分成四型'], n = steps.length, sh = (Math.min(avail, 760) - 150) / n;
    steps.forEach((l, i) => {
        const sy = y + 10 + i * (sh + 56);
        ctx.fillStyle = i === n - 1 ? AMBER : '#F3E6D2'; ctx.beginPath(); ctx.roundRect(px, sy, pw, sh, 30); ctx.fill();
        const lines = (ctx.font = `700 50px ${FONT}`, wrap(l, pw - 60)), lh = 62; ctx.fillStyle = INK; ctx.textAlign = 'center';
        lines.forEach((t, j) => ctx.fillText(t, px + pw / 2, sy + sh / 2 - lines.length * lh / 2 + j * lh + 4)); ctx.textAlign = 'left';
        if (i < n - 1) arrow(px + pw / 2, sy + sh + 6, px + pw / 2, sy + sh + 50, '#C3A087', 10);
    });
}
let drawn = '';
function updateBoard(t) {
    const seg = SEGS.find(s => t >= s.a && t < s.b) || SEGS[SEGS.length - 1];
    const land = isLand();
    board.material.opacity = env(t, seg.a, seg.b, .2);
    const wipe = seg.img ? Math.round(smooth((t - seg.a - .1) / .7) * 20) / 20 : 1, flip = seg.flow && t >= 33;
    const sig = [seg.a, land, wipe, flip].join();
    if (sig === drawn) return;
    drawn = sig;
    const W = 1560, H = Math.round(W / (land ? ASPECT.land : ASPECT.port)), m = 44;
    if (bc.width !== W || bc.height !== H) { bc.width = W; bc.height = H; boardTex.dispose(); }
    ctx.clearRect(0, 0, W, H); ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, .5)'; ctx.beginPath(); ctx.roundRect(0, 0, W, H, 72); ctx.fill();
    if (seg.type) drawType(TYPES[seg.type], W, H, 44);
    else {
        const compact = seg.img || seg.method, titleSize = compact ? 98 : 170, textSize = compact ? 62 : 100;
        let y = compact ? 40 : H * .12;
        y = para(seg.title, m, y, W - m * 2, titleSize, 700, INK, 1.2) + 12;
        y = para(seg.text, m, y, W - m * 2, textSize, 400, SOFT) + 8;
        if (seg.flow) {
            ctx.font = `700 50px ${FONT}`;
            ['爸媽帶著你', '你帶著爸媽'].forEach((l, i) => {
                const x = m + i * 390, hot = (i === 1) === !!flip;
                ctx.fillStyle = hot ? AMBER : MIST; ctx.beginPath(); ctx.roundRect(x, y, 370, 74, 36); ctx.fill();
                ctx.fillStyle = INK; ctx.fillText(l, x + 40, y + 12);
            });
            y += 90;
        }
        if (seg.method) (seg.method === 'clpm' ? drawClpm : drawGnn)(W, H, m, y + 10);
        if (seg.img) {
            const im = img(`assets/story/${seg.img}.webp`);
            if (im) {
                const [cx, cy, cw, ch] = seg.crop || [0, 0, 1, 1];
                const sx = cx * im.naturalWidth, sy = cy * im.naturalHeight, sw = cw * im.naturalWidth, sh = ch * im.naturalHeight;
                const k = Math.min((W - m * 2) / sw, (H - y - 40) / sh), dw = sw * k, dh = sh * k;
                ctx.save(); ctx.beginPath(); ctx.rect(m, y, dw * wipe, dh); ctx.clip();
                ctx.drawImage(im, sx, sy, sw, sh, m, y, dw, dh); ctx.restore();
            }
        }
    }
    boardTex.needsUpdate = true;
}
function updateNote(t) { note.classList.toggle('on', t >= 5 && t < 106); }

const seek = document.getElementById('seek'), timeEl = document.getElementById('time'), playBtn = document.getElementById('play');
let t = Number(q.get('t') || 0), playing = false, last = 0;     // 開啟時停在畫面中心，由使用者按播放
const setPlay = v => { playing = v; playBtn.textContent = v ? '暫停' : '播放'; };
setPlay(playing);
playBtn.addEventListener('click', () => { if (t >= DUR) t = 0; setPlay(!playing); });
seek.addEventListener('input', () => { t = Number(seek.value); });
addEventListener('keydown', e => { if (e.code === 'Space' && e.target.tagName !== 'BUTTON') { e.preventDefault(); playBtn.click(); } });
addEventListener('resize', () => { if (!AR) renderer.setSize(innerWidth, innerHeight); drawn = ''; });

// 上一段／下一段
const jump = dir => {
    const i = SEGS.findIndex(x => t >= x.a && t < x.b);
    const n = i < 0 ? SEGS.length - 1 : clamp(i + dir, 0, SEGS.length - 1);
    t = SEGS[n].a + .9; seek.value = t;
};
document.getElementById('prev').addEventListener('click', () => jump(-1));
document.getElementById('next').addEventListener('click', () => jump(1));
addEventListener('keydown', e => { if (e.key === 'ArrowLeft') jump(-1); if (e.key === 'ArrowRight') jump(1); });

// 視角：單指或滑鼠拖曳旋轉；雙指縮放與平移；滾輪縮放
if (!AR) {
const cv = renderer.domElement, resetBtn = document.getElementById('reset'), pts = new Map();
cv.style.touchAction = 'none'; cv.style.cursor = 'grab';
const touched = () => { resetBtn.hidden = !(user.yaw || user.pitch || user.zoom !== 1 || user.panX || user.panY); };
let pinch = null;
const pinchInfo = () => { const [a, b] = [...pts.values()]; return { dist: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) pinch = pinchInfo(); });
cv.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 1) { user.yaw -= dx * .006; user.pitch = clamp(user.pitch + dy * .005, -.6, 1.1); }
    else if (pts.size === 2 && pinch) {
        const n = pinchInfo();
        user.zoom = clamp(user.zoom * pinch.dist / n.dist, .3, 2.2);
        user.panX -= (n.x - pinch.x) * .004 * user.zoom; user.panY += (n.y - pinch.y) * .004 * user.zoom;
        pinch = n;
    }
    touched();
});
const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => { e.preventDefault(); user.zoom = clamp(user.zoom * Math.exp(e.deltaY * .001), .3, 2.2); touched(); }, { passive: false });
resetBtn.addEventListener('click', () => { Object.assign(user, { yaw: 0, pitch: 0, zoom: 1, panX: 0, panY: 0 }); touched(); });
}
if (document.fonts) document.fonts.load(`700 40px 'Taipei Sans TC Beta'`).then(() => { drawn = ''; });

function setupAR() {
    const gate = document.getElementById('ar-gate'), hint = document.getElementById('ar-hint'), btn = document.getElementById('ar-start'), msg = document.getElementById('ar-msg');
    world.visible = false;
    window.arProgress(1, '準備完成');
    btn.hidden = false;
    anchor.onTargetFound = () => { world.visible = true; hint.hidden = true; window.arFound = true; if (t < DUR) setPlay(true); };
    anchor.onTargetLost = () => { hint.hidden = false; setPlay(false); };
    btn.addEventListener('click', async () => {
        btn.hidden = true; msg.textContent = '';
        // 相機與辨識模型的啟動沒有進度事件，用緩動逼近 95%，完成時補滿
        let p = 0;
        window.arProgress(0, '正在開啟相機與辨識模型…');
        const timer = setInterval(() => { p += (.95 - p) * .06; window.arProgress(p); }, 120);
        try {
            await mindar.start();
            clearInterval(timer); window.arProgress(1, '完成');
            gate.hidden = true; hint.hidden = false;
        } catch (err) {
            clearInterval(timer); window.arProgress(0, '');
            btn.hidden = false;
            msg.innerHTML = '沒辦法開啟相機。請允許相機權限，並確認網址是 https。也可以直接<a href="ar-story.html">看 3D 動畫版</a>。';
        }
    });
}

Promise.all([new GLTFLoader().loadAsync('assets/ar/apartment.glb'), fetch('assets/ar/layers.json').then(r => r.json())]).then(([gltf, m]) => {
    meta = m;
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(o => {
        if (!o.isMesh) return;
        nodes[o.name] = o;
        if (o.material.map) o.material.map.anisotropy = 8;
        if (o.material.transparent) o.renderOrder = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).z * 1000;
        o.userData.base = o.position.clone();
        if (o.userData.kind === 'creature') creatures.push({ o, pos: o.position.clone(), phase: creatures.length * 1.7 });
    });
    world.add(gltf.scene);
    world.add(board);
    // 白牆與白地板（手繪邊緣）：牆底與地板後緣相接，AR 與電腦版預覽共用
    const WALL = { l: -3.65, r: 1.45, top: 1.85 }, FLOOR_FRONT = 1.6, seamZ = BOARD_Z - .02, wallW = WALL.r - WALL.l, wallH = WALL.top - m.ground_y, floorD = FLOOR_FRONT - seamZ;
    const panel = (w, h, fill) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: sketchPanel(w, h, fill), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    const wall = panel(wallW, wallH, '#FFFFFF'), floor = panel(wallW, floorD, '#FBF8F2');
    wall.position.set((WALL.l + WALL.r) / 2, m.ground_y + wallH / 2, seamZ); wall.renderOrder = -5000;
    floor.rotation.set(-Math.PI / 2, 0, Math.PI); floor.position.set((WALL.l + WALL.r) / 2, m.ground_y - .012, seamZ + floorD / 2); floor.renderOrder = -4999;
    backdrop.add(wall, floor); world.add(backdrop);
    // 每層開口前一片暗幕，用來讓其他房間變暗
    m.rooms.forEach(([l, tp, r, b]) => {
        const g = new THREE.PlaneGeometry(r - l, tp - b);
        const s = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x241b16, transparent: true, opacity: 0, depthWrite: false }));
        s.position.set((l + r) / 2, (tp + b) / 2, m.depth + .003);
        s.renderOrder = (m.depth + .004) * 1000;
        world.add(s); shades.push(s);
    });
    const bub = nodes.f2_bubble;
    for (let i = 0; i < 4; i++) {
        const c = bub.clone(); c.material = bub.material.clone(); c.material.transparent = true; c.renderOrder = bub.renderOrder + 1 + i;
        c.userData.base = bub.position.clone().add(new THREE.Vector3(-.13, -.06, .01)); c.visible = false;
        world.add(c); clones.push(c);
    }
    window.storyReady = true;
    if (AR) setupAR();
});

renderer.setAnimationLoop(now => {
    const dt = last ? (now - last) / 1000 : 0; last = now;
    if (!meta) return;
    if (playing) { t += dt; if (t >= DUR) { t = DUR; setPlay(false); } seek.value = t; }
    else if (q.has('t')) seek.value = t;
    timeEl.textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    animate(t, now); applyCamera(t); updateBoard(t); updateNote(t);
    renderer.render(scene, camera);
});
