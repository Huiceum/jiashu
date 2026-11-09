// story.js：公寓模型配合文稿的 90 秒動畫。時間軸全部由 t（秒）算出，可拖曳、也可用 ?t=秒數 停在某一刻。
// 樓層命名：模型 f1 是最上層（緊密互動），f4 是最下層（身心共振）。數字皆取自最終版文稿。
import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';

const DUR = 90;
const AR_SCALE = .42, AR_Y = -.2;
const CROP01 = [0, .075, 1, .875];                       // 路徑圖去掉圖內的標題與腳註，看板上另有文字
const q = new URLSearchParams(location.search);
const TYPES = {
    1: { name: '緊密互動型', sub: '285 戶・子女平均 24.3 歲', img: 'cat-4', text: '接觸最多，親近感雙向帶動最強。', v: [.13, .12, .20, .97, .23, .27] },
    2: { name: '心近身遠型', sub: '170 戶・子女平均 25.8 歲', img: 'cat-7', text: '最親但少見面，家人之間的帶動最弱。', v: [-.11, .03, .97, -.38, .64, .07] },
    3: { name: '各自安好型', sub: '195 戶・子女平均 26.9 歲', img: 'cat-6', text: '身心佳、不黏；子女好，父母更覺親近。', v: [.20, .46, -.63, -.65, -.40, .43] },
    4: { name: '身心共振型', sub: '173 戶・子女平均 27.9 歲', img: 'cat-2', text: '身心差、疏遠；子女身心牽動父母最強。', v: [-.30, -.72, -.48, -.31, -.47, -.93] }
};
const BAR_LABEL = ['婚姻品質', '父母身心', '親密（父母）', '親子接觸', '親密（子女）', '子女身心'];
// 四型在兩個子女年齡層的比例（文稿圖 4）：[21 歲以下, 30 歲以上]
const SHARE = { 1: [.523, .233], 2: [.196, .180], 3: [.183, .267], 4: [.098, .320] };

const SEGS = [
    { a: 0, b: 5, title: '子女長大以後，家由誰來帶動？', text: '臺灣家庭動態調查（PSFD）2018–2024' },
    { a: 5, b: 16, title: '子女成年的四個階段，家裡誰影響誰', text: '只畫出顯著的路徑，線越粗影響越大（555 位子女、356 戶）。', img: 'fig01_paths_main', crop: CROP01 },
    { a: 16, b: 30, title: '親近感的主導權，在三十歲前後換手', text: '子女二十多歲時，父母的親近感帶動子女（.16、.15）；三十歲以後，改由子女帶動父母（.22）。', img: 'fig02_handover', flow: true },
    { a: 30, b: 40, title: '二十出頭時，親子接觸最重要', text: '子女 21–24 歲時接觸越多，25–28 歲時身心越好（.14），是模型中唯一直接通到子女身心的路徑。', img: 'fig03_contact', crop: [0, .07, .36, .86] },
    { a: 40, b: 48, title: '婚姻是父母的底氣，也溢出到親子', text: '婚姻品質與父母身心互相支撐（.17、.18）；婚姻好的父母，更覺得與子女親近（.11）。' },
    { a: 48, b: 54, type: 1 }, { a: 54, b: 60, type: 2 }, { a: 60, b: 66, type: 3 }, { a: 66, b: 72, type: 4 },
    { a: 72, b: 84, title: '子女越年長，緊密互動的家越少', text: '緊密互動型由 52% 降到 23%，身心共振型由 10% 增加到 32%。燈越亮，代表這一型的家庭越多。', img: 'fig09_gnn_age' },
    { a: 84, b: 88, title: '家庭類型不是標籤，是會流動的關係', text: '每兩年約六成的家戶維持同一型，其餘四成發生轉換。' }
];

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
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
if (AR) { world.scale.setScalar(AR_SCALE); world.position.y = AR_Y; anchor.group.add(world); } else scene.add(world);

const note = document.getElementById('note');
const nodes = {}, creatures = [], shades = [], clones = [];
let meta, keys;

function buildKeys() {
    const c = meta.rooms.map(([l, t, r, b]) => [(l + r) / 2, (t + b) / 2]);
    const z = meta.depth * .6;
    const all = [0, -.12, .42, 2.2, 2.2, 0, .1, 0];
    const room = i => [c[i][0], c[i][1], z, .62, 1.12, 0, .05, 1];
    const bldg = [0, -.05, .2, 1.9, 1.3, -.18, .08, 1];
    return [
        [0, 0, -.35, .9, 1.5, 2.6, 0, .32, 0], [3.5, ...all], [6.5, ...bldg], [29, ...bldg],
        [32, c[3][0], c[3][1] - .08, z, .95, 1.5, .25, .14, 1], [39, c[3][0], c[3][1] - .08, z, .95, 1.5, -.2, .14, 1],
        [42, 0, -.05, .25, 1.9, 1.4, .2, .08, 0], [47, 0, -.05, .25, 1.9, 1.4, -.1, .08, 0],
        [49, ...room(0)], [53.2, ...room(0)], [55, ...room(1)], [59.2, ...room(1)], [61, ...room(2)], [65.2, ...room(2)], [67, ...room(3)], [71.2, ...room(3)],
        [74, ...bldg], [83, ...bldg], [86, ...all], [90, 0, -.12, .42, 2.5, 2.5, .22, .22, 0]
    ];
}

// 使用者的視角調整，疊加在導覽鏡頭上
const user = { yaw: 0, pitch: 0, zoom: 1, panX: 0, panY: 0 };
const BOARD = { land: [2.6, 1.95], port: [2.0, 1.58] };
const isLand = () => !AR && innerWidth >= innerHeight;

function applyCamera(t) {
    if (AR) {                                   // 鏡頭由追蹤決定，只需擺放看板（建築上方）
        board.position.set(0, .98 + BOARD.port[1] / 2, BOARD_Z);
        return;
    }
    let i = 0;
    while (i < keys.length - 2 && keys[i + 1][0] <= t) i++;
    const [A, B] = [keys[i], keys[i + 1]];
    const k = smooth((t - A[0]) / (B[0] - A[0]));
    const land = isLand();
    let [x, y, z, vh, vw, yaw, pitch] = A.slice(1).map((v, n) => lerp(v, B[n + 1], k));
    if (!land) [x, y, z, vh, vw] = [0, -.02, .25, 2.05, 2.05];        // 直向畫面固定看整棟（看板在上方），聚焦交給燈光
    const asp = innerWidth / innerHeight, tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const [bw, bh] = land ? BOARD.land : BOARD.port;
    // 看板放在建築後方：橫向畫面在右側、直向畫面在上方，鏡頭同時框住建築與看板
    const boardX = land ? x + vw / 2 + bw / 2 + .14 : 0, boardY = land ? Math.max(y, -.33) : y + vh / 2 + bh / 2 - .04;   // 聚焦 1F 時看板不跟著降到地面後方
    board.position.set(boardX, boardY, BOARD_Z);
    const lookX = land ? x + (bw + .14) / 2 : x, lookY = land ? y : y + (bh - .04) / 2;
    const totalW = land ? vw + bw + .14 : Math.max(vw, bw), totalH = land ? Math.max(vh, bh) : vh + bh;
    // 播放前與播放結束：鏡頭回到畫面中心看整棟
    const c = Math.max(1 - smooth(t / 2.5), smooth((t - 87.5) / 2.5));
    const centerD = Math.max(2.4 / (2 * tan), 2.3 / (2 * tan * asp));
    const d = lerp(Math.max(totalH * 1.04 / (2 * tan), totalW * 1.04 / (2 * tan * asp)), centerD, c) * user.zoom;
    const a = lerp(yaw, 0, c) + user.yaw, p = clamp(lerp(pitch, .12, c) + user.pitch, -.25, 1.25);
    const lx = lerp(lookX, 0, c) + user.panX, ly = lerp(lookY, -.1, c) + user.panY, lz = lerp(z, .42, c);
    camera.position.set(lx + Math.sin(a) * Math.cos(p) * d, ly + Math.sin(p) * d, lz + Math.cos(a) * Math.cos(p) * d);
    camera.lookAt(lx, ly, lz);
    camera.aspect = asp;
    camera.updateProjectionMatrix();
}

function shadeLevels(t) {
    const L = [0, 0, 0, 0], DARK = .74;
    // 主軸段只留有親子對話的層次均亮；接觸段聚焦最下層
    const c = env(t, 30.5, 39.5);
    [0, 1, 2].forEach(f => { L[f] = Math.max(L[f], DARK * c); });
    // 介紹四種家：其他房間變暗
    for (let f = 0; f < 4; f++) {
        const a = 48 + f * 6;
        for (let g = 0; g < 4; g++) if (g !== f) L[g] = Math.max(L[g], DARK * env(t, a - .2, a + 6.2, .8));
    }
    // 類型比例：燈光亮度跟著比例，由 21 歲以下變到 30 歲以上
    const flow = env(t, 72, 84, 1), p = smooth((t - 75) / 6);
    for (let f = 0; f < 4; f++) {
        const [a, b] = SHARE[f + 1];
        L[f] = Math.max(L[f], flow * clamp(.78 - lerp(a, b, p) * 1.9, 0, .78));
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
    const f1 = on(48, 54);
    ['f1_a', 'f1_b', 'f1_c', 'f1_d'].forEach((k, i) => { if (N[k]) { N[k].rotation.z = f1 * Math.sin(t * 3.2 + i * .9) * .07; N[k].position.y += f1 * Math.abs(Math.sin(t * 3.2 + i)) * .014; } });
    // 心近身遠：手機上方持續冒出對話泡泡
    const f2 = on(54, 60);
    clones.forEach((c, i) => {
        const k = ((t - 54) * .55 + i / clones.length) % 1;
        const vis = f2 * smooth(k / .15) * smooth((1 - k) / .3);
        c.visible = vis > .01; c.material.opacity = vis;
        const s = c.userData.base;
        c.position.set(s.x + Math.sin(k * 6 + i) * .018, s.y + k * .17, s.z); c.scale.setScalar(.35 + k * .25);
    });
    // 各自安好：背對的那隻慢慢走向門口
    const f3 = on(60, 66);
    if (N.f3_c) { N.f3_c.position.x += f3 * smooth((t - 60.5) / 4.5) * .085; N.f3_c.rotation.z = f3 * Math.sin(t * 5) * .025; }
    // 身心共振：一隻往下沉，另一隻隔一下跟著沉
    const sink = (k, delay) => { if (!N[k]) return; const d = on(66, 72) * (.5 + .5 * Math.sin((t - delay) * 1.5)); N[k].scale.y *= 1 - d * .16; N[k].scale.x *= 1 + d * .05; };
    sink('f4_a', 66); sink('f4_c', 66.9);
    // 門打開
    if (N.f4_door) N.f4_door.rotation.y = -env(t, 31, 39.5, 1.5) * .75;
    // 鏡頭貼近 1F 時，對面人行道的物件暫時收起來，才不會擋住房間
    const keep = 1 - Math.max(env(t, 30, 40, .8), env(t, 66, 72, .8));
    Object.keys(N).filter(k => k.startsWith('street_') && (N[k].userData.base.z > meta.depth + .6 || N[k].userData.base.x > .5)).forEach(k => { N[k].scale.setScalar(Math.max(keep, .001)); N[k].visible = keep > .01; });
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
    const pic = img(`assets/cats/${y.img}.webp`), m = 40;
    if (pic) ctx.drawImage(pic, m, startY, 220, 220);
    let ty = para(y.name, m + 250, startY + 20, W - m * 2 - 250, 104, 700, INK);
    ty = para(y.sub, m + 250, ty + 2, W - m * 2 - 250, 46, 400, SOFT);
    ty = para(y.text, m, Math.max(ty, startY + 232) + 8, W - m * 2, 60, 400, INK);
    const rowH = Math.min(84, (H - ty - 20) / 6);
    ctx.font = `400 ${Math.min(50, rowH * .68)}px ${FONT}`;
    y.v.forEach((x, i) => {
        const cy = ty + 18 + rowH * i, lx = m + 340, tw = W - m * 2 - 340 - 150, mid = lx + tw / 2, p = Math.min(Math.abs(x) / 1.2, 1) * tw / 2;
        ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.fillText(BAR_LABEL[i], m, cy);
        ctx.fillStyle = MIST; ctx.fillRect(lx, cy + rowH * .3, tw, rowH * .34);
        ctx.fillStyle = AMBER; ctx.fillRect(x >= 0 ? mid : mid - p, cy + rowH * .3, p, rowH * .34);
        ctx.fillStyle = SOFT; ctx.fillRect(mid - 2, cy + rowH * .18, 4, rowH * .58);
        ctx.fillStyle = INK; ctx.textAlign = 'right'; ctx.fillText((x > 0 ? '+' : '') + x.toFixed(2), W - m, cy);
        ctx.textAlign = 'left';
    });
}
let drawn = '';
function updateBoard(t) {
    const seg = SEGS.find(s => t >= s.a && t < s.b) || SEGS[SEGS.length - 1];
    const land = isLand(), [bw, bh] = land ? BOARD.land : BOARD.port;
    board.scale.set(bw, bh, 1);
    board.material.opacity = env(t, seg.a, seg.b, .45);
    const wipe = seg.img ? Math.round(smooth((t - seg.a - .7) / 4) * 40) / 40 : 1, flip = seg.flow && t >= 25;
    const sig = [seg.a, land, wipe, flip].join();
    if (sig === drawn) return;
    drawn = sig;
    const W = 1560, H = Math.round(W * bh / bw), m = 40;
    if (bc.width !== W || bc.height !== H) { bc.width = W; bc.height = H; boardTex.dispose(); }
    ctx.clearRect(0, 0, W, H); ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    if (AR) { ctx.fillStyle = '#FBF8F4'; ctx.beginPath(); ctx.roundRect(0, 0, W, H, 48); ctx.fill(); }   // 疊在海報上時要有底色，字才看得清楚
    if (seg.type) drawType(TYPES[seg.type], W, H, 30);
    else {
        const titleSize = seg.img ? 88 : 122, textSize = seg.img ? 54 : 72;
        let y = seg.img ? 18 : H * .2;
        y = para(seg.title, m, y, W - m * 2, titleSize, 700, INK, 1.2) + 12;
        y = para(seg.text, m, y, W - m * 2, textSize, 400, SOFT) + 8;
        if (seg.flow) {
            ctx.font = `700 50px ${FONT}`;
            ['父母 → 子女', '子女 → 父母'].forEach((l, i) => {
                const x = m + i * 390, hot = (i === 1) === !!flip;
                ctx.fillStyle = hot ? AMBER : MIST; ctx.beginPath(); ctx.roundRect(x, y, 370, 74, 36); ctx.fill();
                ctx.fillStyle = INK; ctx.fillText(l, x + 40, y + 12);
            });
            y += 90;
        }
        if (seg.img) {
            const im = img(`assets/story/${seg.img}.webp`);
            if (im) {
                const [cx, cy, cw, ch] = seg.crop || [0, 0, 1, 1];
                const sx = cx * im.naturalWidth, sy = cy * im.naturalHeight, sw = cw * im.naturalWidth, sh = ch * im.naturalHeight;
                const k = Math.min((W - m * 2) / sw, (H - y - 10) / sh), dw = sw * k, dh = sh * k;
                ctx.save(); ctx.beginPath(); ctx.rect(m, y, dw * wipe, dh); ctx.clip();
                ctx.drawImage(im, sx, sy, sw, sh, m, y, dw, dh); ctx.restore();
            }
        }
    }
    boardTex.needsUpdate = true;
}
function updateNote(t) { note.classList.toggle('on', t >= 5 && t < 88); }

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
    gate.hidden = false; world.visible = false;
    anchor.onTargetFound = () => { world.visible = true; hint.hidden = true; window.arFound = true; if (t < DUR) setPlay(true); };
    anchor.onTargetLost = () => { hint.hidden = false; setPlay(false); };
    btn.addEventListener('click', async () => {
        btn.disabled = true; msg.textContent = '正在開啟相機…';
        try {
            await mindar.start();
            gate.hidden = true; hint.hidden = false;
        } catch (err) {
            btn.disabled = false;
            msg.innerHTML = '沒辦法開啟相機。請允許相機權限，並確認網址是 https。也可以直接<a href="ar-story.html">看 3D 動畫版</a>。';
        }
    });
}

Promise.all([new GLTFLoader().loadAsync('assets/ar/apartment.glb'), fetch('assets/ar/layers.json').then(r => r.json())]).then(([gltf, m]) => {
    meta = m; keys = buildKeys();
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
