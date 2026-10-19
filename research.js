// research.js
// 研究用家系圖功能：研究配色、身心（wellbeing）色階、婚姻品質線寬、
// 有方向的關係線（bond 區塊）、家庭類型底色、自動圖例與圖片匯出。
// relationship.js 排版完成後會呼叫 window.FTDLResearch.afterLayout()。

(function () {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // 研究主色盤（與 result/ 圖表相同）
    const PALETTE = {
        sand: '#F3E6D2',
        mist: '#DDD7D1',
        apricot: '#E8C18F',
        amber: '#D9954D',
        clay: '#C3A087',
        stone: '#AFA69D'
    };
    const INK = '#3B2F27';
    const INK_SOFT = '#6B5B4E';

    // 身心色階：低（灰）→ 高（橘）
    const WELLBEING_RAMP = [PALETTE.stone, PALETTE.mist, PALETTE.sand, PALETTE.apricot, PALETTE.amber];

    const BOND_STYLES = ['solid', 'dashed', 'dotted', 'zigzag', 'cutoff', 'double'];
    const TIE_LINES = ['thick', 'thin', 'dashed'];
    // 關係線一律同一色：箭頭＝感情的方向、粗細＝感情的深厚，不以顏色區分身分
    const TIE_COLOR = INK_SOFT;

    function resolveColor(value) {
        if (value === undefined || value === null) return null;
        const v = String(value).trim().replace(/^["']|["']$/g, '');
        if (PALETTE[v.toLowerCase()]) return PALETTE[v.toLowerCase()];
        if (/^#[0-9a-fA-F]{6}$/.test(v) || /^#[0-9a-fA-F]{3}$/.test(v)) return v;
        return null;
    }

    function parseUnit(value) {
        if (value === undefined || value === null || value === '') return null;
        const n = parseFloat(value);
        if (isNaN(n)) return null;
        return Math.max(0, Math.min(1, n));
    }

    function hexToRgb(hex) {
        const h = hex.replace('#', '');
        return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    }

    function rgbToHex(rgb) {
        return '#' + rgb.map(c => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    // 與白色混合，用於家庭類型底色（比主色淡，節點才看得清楚）
    function lighten(hex, amount) {
        const full = hex.length === 4 ? '#' + hex.slice(1).split('').map(c => c + c).join('') : hex;
        return rgbToHex(hexToRgb(full).map(c => c + (255 - c) * amount));
    }

    // 家庭類型底色：依原色深淺決定混白比例，讓最暗的色版也維持在很淡的程度
    function backgroundTint(hex) {
        const full = hex.length === 4 ? '#' + hex.slice(1).split('').map(c => c + c).join('') : hex;
        const minC = Math.min(...hexToRgb(full));
        const amount = minC >= 230 ? 0 : Math.max(0.45, (232 - minC) / (255 - minC));
        return lighten(full, amount);
    }

    function wellbeingColor(value) {
        const t = parseUnit(value);
        if (t === null) return null;
        const pos = t * (WELLBEING_RAMP.length - 1);
        const i = Math.min(Math.floor(pos), WELLBEING_RAMP.length - 2);
        const f = pos - i;
        const a = hexToRgb(WELLBEING_RAMP[i]);
        const b = hexToRgb(WELLBEING_RAMP[i + 1]);
        return rgbToHex(a.map((c, k) => c + (b[k] - c) * f));
    }

    // --- FTDL 解析（研究擴充部分） ---
    function stripValue(v) {
        v = v.trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        return v;
    }

    function parseProps(body) {
        const props = {};
        const re = /\s*(\w+)\s*:\s*([^;]*?)\s*;/g;
        let m;
        while ((m = re.exec(body)) !== null) props[m[1]] = stripValue(m[2]);
        return props;
    }

    function parseBonds(ftdlText) {
        const bonds = [];
        const re = /(^|[\s;}])bond\s*\{([\s\S]*?)\}/g;
        let m;
        while ((m = re.exec(ftdlText)) !== null) {
            const p = parseProps(m[2]);
            if (!p.from || !p.to) continue;
            bonds.push({
                from: p.from,
                to: p.to,
                closeness: parseUnit(p.closeness),
                style: BOND_STYLES.includes(p.style) ? p.style : 'solid',
                color: resolveColor(p.color),
                arrow: p.arrow === undefined ? true : String(p.arrow).toLowerCase() !== 'false',
                label: p.label || ''
            });
        }
        return bonds;
    }

    // 關係強弱標記：tie { from; to; line: thick|thin|dashed; label; color; }
    function parseTies(ftdlText) {
        const ties = [];
        const re = /(^|[\s;}])tie\s*\{([\s\S]*?)\}/g;
        let m;
        while ((m = re.exec(ftdlText)) !== null) {
            const p = parseProps(m[2]);
            if (!p.from || !p.to) continue;
            ties.push({
                from: p.from,
                to: p.to,
                line: TIE_LINES.includes(p.line) ? p.line : 'thin',
                label: p.label || '',
                color: resolveColor(p.color)
            });
        }
        return ties;
    }

    function parseMetadataExtras(ftdlText) {
        const m = (ftdlText || '').match(/metadata\s*\{([\s\S]*?)\}/);
        const p = m ? parseProps(m[1]) : {};
        return {
            background: resolveColor(p.background),
            legend: p.legend === undefined ? true : String(p.legend).toLowerCase() !== 'false'
        };
    }

    // --- 幾何 ---
    // 從節點中心沿方向 (ux, uy) 走到節點邊緣的距離
    function edgeDistance(person, ux, uy) {
        const hw = (person.width || 70) / 2;
        const hh = (person.height || 70) / 2;
        const el = person.el;
        if (el && el.classList.contains('female')) return hw;
        if (el && el.classList.contains('other')) return hw * 0.9;
        const tx = Math.abs(ux) > 1e-6 ? hw / Math.abs(ux) : Infinity;
        const ty = Math.abs(uy) > 1e-6 ? hh / Math.abs(uy) : Infinity;
        return Math.min(tx, ty);
    }

    function svgEl(tag, attrs) {
        const el = document.createElementNS(SVG_NS, tag);
        for (const k in attrs) el.setAttribute(k, attrs[k]);
        return el;
    }

    function norm(x, y) {
        const l = Math.hypot(x, y) || 1;
        return [x / l, y / l];
    }

    function arrowHead(ex, ey, ux, uy, head, color) {
        const nx = -uy, ny = ux;
        const bx = ex - ux * head, by = ey - uy * head;
        return svgEl('polygon', {
            points: `${ex},${ey} ${bx + nx * head * 0.5},${by + ny * head * 0.5} ${bx - nx * head * 0.5},${by - ny * head * 0.5}`,
            fill: color
        });
    }

    function bondLabel(x, y, text) {
        const el = svgEl('text', { x, y, class: 'bond-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
        el.textContent = text;
        return el;
    }

    function isParentOf(parentId, childPerson) {
        const rel = childPerson && childPerson.parentsRelationship;
        return !!(rel && rel.partners && rel.partners.includes(parentId));
    }

    function bondDefaultColor(bond, personsMap) {
        const from = personsMap[bond.from];
        const to = personsMap[bond.to];
        if (isParentOf(bond.from, to)) return { color: PALETTE.apricot, kind: 'parent' };
        if (isParentOf(bond.to, from)) return { color: PALETTE.clay, kind: 'child' };
        return { color: PALETTE.stone, kind: 'other' };
    }

    function drawBond(svg, bond, personsMap, hasReverse) {
        const a = personsMap[bond.from];
        const b = personsMap[bond.to];
        if (!a || !b || isNaN(a.cx) || isNaN(b.cx)) return null;

        const dx = b.cx - a.cx, dy = b.cy - a.cy;
        const len = Math.hypot(dx, dy);
        if (len < 1) return null;
        const ux = dx / len, uy = dy / len;
        const nx = -uy, ny = ux;
        const offset = hasReverse ? 5 : 0;

        const def = bondDefaultColor(bond, personsMap);
        const color = bond.color || TIE_COLOR;
        const width = depthWidth(bond.closeness);
        const head = bond.arrow ? 6 + width * 1.4 : 0;

        const g = svgEl('g', { class: `bond-line bond-${def.kind} bond-style-${bond.style}` });
        const common = { stroke: color, 'stroke-width': width, fill: 'none', 'stroke-linecap': 'round' };

        // 單向感受（solid／dashed／dotted）畫成微彎的弧線：避開垂直的親子結構線，
        // 方向相反的兩條線會各自彎向自己的右側而自然分開。
        const curved = ['solid', 'dashed', 'dotted'].includes(bond.style);
        if (curved) {
            const bend = Math.min(36, 14 + len * 0.06) + (hasReverse ? 4 : 0);
            const cx = (a.cx + b.cx) / 2 + nx * bend, cy = (a.cy + b.cy) / 2 + ny * bend;
            const su = norm(cx - a.cx, cy - a.cy), eu = norm(b.cx - cx, b.cy - cy);
            const gA = edgeDistance(a, su[0], su[1]) + 4, gB = edgeDistance(b, -eu[0], -eu[1]) + 4;
            const sx = a.cx + su[0] * gA, sy = a.cy + su[1] * gA;
            const ex = b.cx - eu[0] * gB, ey = b.cy - eu[1] * gB;
            const lx = ex - eu[0] * head * 0.85, ly = ey - eu[1] * head * 0.85;
            const path = svgEl('path', { d: `M ${sx} ${sy} Q ${cx} ${cy} ${lx} ${ly}`, ...common });
            if (bond.style === 'dashed') path.setAttribute('stroke-dasharray', `${4 + width} ${4 + width}`);
            if (bond.style === 'dotted') path.setAttribute('stroke-dasharray', `0.1 ${3 + width * 1.5}`);
            g.appendChild(path);
            if (bond.arrow) g.appendChild(arrowHead(ex, ey, eu[0], eu[1], head, color));
            if (bond.label) g.appendChild(bondLabel((sx + 2 * cx + ex) / 4 + nx * 10, (sy + 2 * cy + ey) / 4 + ny * 10, bond.label));
            svg.appendChild(g);
            return def.kind;
        }

        const gapA = edgeDistance(a, ux, uy) + 4;
        const gapB = edgeDistance(b, -ux, -uy) + 4;
        const sx = a.cx + ux * gapA + nx * offset, sy = a.cy + uy * gapA + ny * offset;
        const ex = b.cx - ux * gapB + nx * offset, ey = b.cy - uy * gapB + ny * offset;
        const lx = ex - ux * head * 0.85, ly = ey - uy * head * 0.85;

        if (bond.style === 'zigzag') {
            const segLen = Math.hypot(lx - sx, ly - sy);
            const step = 8, amp = 4 + width * 0.5;
            const n = Math.max(2, Math.floor(segLen / step));
            let d = `M ${sx} ${sy}`;
            for (let i = 1; i < n; i++) {
                const t = i / n;
                const side = i % 2 === 0 ? -1 : 1;
                d += ` L ${sx + (lx - sx) * t + nx * amp * side} ${sy + (ly - sy) * t + ny * amp * side}`;
            }
            d += ` L ${lx} ${ly}`;
            g.appendChild(svgEl('path', { d, ...common, 'stroke-linejoin': 'round' }));
        } else if (bond.style === 'double') {
            const o = Math.max(2, width * 0.8);
            [o, -o].forEach(k => g.appendChild(svgEl('line', {
                x1: sx + nx * k, y1: sy + ny * k, x2: lx + nx * k, y2: ly + ny * k, ...common, 'stroke-width': Math.max(1, width * 0.6)
            })));
        } else if (bond.style === 'cutoff') {
            const mx = (sx + lx) / 2, my = (sy + ly) / 2, gap = 5, bar = 7 + width;
            g.appendChild(svgEl('line', { x1: sx, y1: sy, x2: mx - ux * gap, y2: my - uy * gap, ...common }));
            g.appendChild(svgEl('line', { x1: mx + ux * gap, y1: my + uy * gap, x2: lx, y2: ly, ...common }));
            [-gap, gap].forEach(k => g.appendChild(svgEl('line', {
                x1: mx + ux * k + nx * bar, y1: my + uy * k + ny * bar,
                x2: mx + ux * k - nx * bar, y2: my + uy * k - ny * bar, ...common
            })));
        }

        if (bond.arrow) g.appendChild(arrowHead(ex, ey, ux, uy, head, color));
        if (bond.label) g.appendChild(bondLabel((sx + ex) / 2 + nx * 16, (sy + ey) / 2 + ny * 16, bond.label));

        svg.appendChild(g);
        return def.kind;
    }

    // 關係標記：一律畫成單向弧線箭頭，比 bond 彎得更大；
    // 兩人互相標記時，兩條弧線各自彎向自己的右側，並排在兩側。
    // 感情深厚 0–1 → 線寬 1.2–5.2
    function depthWidth(closeness) {
        return 1.2 + (closeness === null || closeness === undefined ? 0.4 : closeness) * 4;
    }

    function drawTie(svg, tie, personsMap, extraBend, haloColor, lineColor, widthOverride) {
        const a = personsMap[tie.from];
        const b = personsMap[tie.to];
        if (!a || !b || isNaN(a.cx) || isNaN(b.cx)) return false;
        const dx = b.cx - a.cx, dy = b.cy - a.cy;
        const len = Math.hypot(dx, dy);
        if (len < 1) return false;
        const ux = dx / len, uy = dy / len;
        const nx = -uy, ny = ux;

        const color = lineColor || tie.color || TIE_COLOR;
        const width = widthOverride || (tie.line === 'thick' ? 4.5 : tie.line === 'dashed' ? 2.2 : 1.8);
        const head = 7 + width * 1.2;
        const bend = Math.max(34, Math.min(80, 26 + len * 0.18)) + extraBend;

        const cx = (a.cx + b.cx) / 2 + nx * bend, cy = (a.cy + b.cy) / 2 + ny * bend;
        const su = norm(cx - a.cx, cy - a.cy), eu = norm(b.cx - cx, b.cy - cy);
        const gA = edgeDistance(a, su[0], su[1]) + 5, gB = edgeDistance(b, -eu[0], -eu[1]) + 5;
        const sx = a.cx + su[0] * gA, sy = a.cy + su[1] * gA;
        const ex = b.cx - eu[0] * gB, ey = b.cy - eu[1] * gB;
        const lx = ex - eu[0] * head * 0.85, ly = ey - eu[1] * head * 0.85;

        const g = svgEl('g', { class: `tie-line tie-${tie.line}` });
        const path = svgEl('path', {
            d: `M ${sx} ${sy} Q ${cx} ${cy} ${lx} ${ly}`,
            stroke: color, 'stroke-width': width, fill: 'none', 'stroke-linecap': tie.line === 'dashed' ? 'butt' : 'round'
        });
        if (tie.line === 'dashed') path.setAttribute('stroke-dasharray', '7 5');
        g.appendChild(path);
        g.appendChild(arrowHead(ex, ey, eu[0], eu[1], head, color));

        if (tie.label) {
            // 弧線頂點（t = 0.5）再往外推一點，標籤放在曲線外側
            const mx = 0.25 * sx + 0.5 * cx + 0.25 * ex, my = 0.25 * sy + 0.5 * cy + 0.25 * ey;
            const off = 11 + width;
            const text = bondLabel(mx + nx * off, my + ny * off, tie.label);
            text.setAttribute('class', 'tie-label');
            text.setAttribute('fill', INK_SOFT);
            text.setAttribute('stroke', haloColor);
            text.setAttribute('stroke-width', '4');
            text.setAttribute('stroke-linejoin', 'round');
            text.setAttribute('paint-order', 'stroke');
            text.dataset.nx = nx;
            text.dataset.ny = ny;
            g.appendChild(text);
        }
        svg.appendChild(g);
        return true;
    }

    // 標籤避讓：與已放好的標籤或節點重疊時，沿弧線的外側法線方向往外移
    function resolveLabelOverlaps(svg, personsMap) {
        const pad = 3;
        const boxes = Object.values(personsMap)
            .filter(p => !isNaN(p.x))
            .map(p => ({ x: p.x - pad, y: p.y - pad, w: (p.width || 70) + pad * 2, h: (p.height || 70) + pad * 2 }));
        const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        svg.querySelectorAll('.tie-label, .bond-label').forEach(text => {
            const nx = parseFloat(text.dataset.nx || 0), ny = parseFloat(text.dataset.ny || -1);
            let box;
            for (let i = 0; i < 8; i++) {
                const bb = text.getBBox();
                box = { x: bb.x - pad, y: bb.y - pad, w: bb.width + pad * 2, h: bb.height + pad * 2 };
                if (!boxes.some(o => overlaps(box, o))) break;
                text.setAttribute('x', parseFloat(text.getAttribute('x')) + nx * 10);
                text.setAttribute('y', parseFloat(text.getAttribute('y')) + ny * 10);
            }
            boxes.push(box);
        });
    }

    // --- 圖例 ---
    function swatchSvg(inner, w = 34, h = 18) {
        return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${inner}</svg>`;
    }

    function arrowSwatch(color, width = 2.5, dash = '') {
        return swatchSvg(`<line x1="2" y1="9" x2="24" y2="9" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''} stroke-linecap="round"/><polygon points="32,9 23,4.5 23,13.5" fill="${color}"/>`);
    }

    function buildLegend(info) {
        const items = [];
        const add = (svg, text) => items.push(`<span class="legend-item">${svg}<span>${text}</span></span>`);

        const shapes = [];
        if (info.genders.has('male')) shapes.push('方形＝男');
        if (info.genders.has('female')) shapes.push('圓形＝女');
        if (info.genders.has('other')) shapes.push('三角形＝其他');
        if (shapes.length) add(swatchSvg(`<rect x="2" y="2" width="14" height="14" fill="${PALETTE.mist}"/><circle cx="26" cy="9" r="7" fill="${PALETTE.sand}"/>`), shapes.join('、'));

        if (info.wellbeing) {
            const stops = WELLBEING_RAMP.map((c, i) => `<stop offset="${i / (WELLBEING_RAMP.length - 1)}" stop-color="${c}"/>`).join('');
            add(swatchSvg(`<defs><linearGradient id="lg-wb" x1="0" x2="1">${stops}</linearGradient></defs><rect x="0" y="3" width="44" height="12" rx="3" fill="url(#lg-wb)"/>`, 44), '節點顏色＝身心（灰低、橘高）');
        }
        if (info.marriage) add(swatchSvg(`<line x1="2" y1="9" x2="32" y2="9" stroke="${PALETTE.amber}" stroke-width="3"/>`), info.quality ? '橫線＝夫妻，粗細＝婚姻品質' : '橫線＝夫妻');
        if (info.partnership) add(swatchSvg(`<line x1="2" y1="9" x2="32" y2="9" stroke="${PALETTE.amber}" stroke-width="2.5" stroke-dasharray="5 4"/>`), '虛橫線＝伴侶／同居');
        if (info.divorced) add(swatchSvg(`<line x1="2" y1="9" x2="32" y2="9" stroke="${PALETTE.amber}" stroke-width="2"/><path d="M10 14 L16 4 M15 14 L21 4" stroke="${INK}" stroke-width="1.6"/>`), '雙斜線＝離婚');
        if (info.separated) add(swatchSvg(`<line x1="2" y1="9" x2="32" y2="9" stroke="${PALETTE.amber}" stroke-width="2"/><path d="M14 4 L20 14" stroke="${INK}" stroke-width="1.6"/>`), '單斜線＝分居');

        const L = TIE_COLOR;
        if (info.bondKinds.size) add(arrowSwatch(L), '箭頭＝感情的方向（A → B：A 對 B 的感情）');
        if (info.depth) add(swatchSvg(`<line x1="2" y1="5" x2="32" y2="5" stroke="${L}" stroke-width="1.2"/><line x1="2" y1="13" x2="32" y2="13" stroke="${L}" stroke-width="4.5"/>`), '粗細＝感情的深厚');
        if (info.dashed) add(arrowSwatch(L, 2.2, '5 4'), '虛線＝破裂／不穩定');
        if (info.bondStyles.has('dotted')) add(arrowSwatch(L, 2.5, '0.1 5'), '點線＝弱連結');
        if (info.bondStyles.has('zigzag')) add(swatchSvg(`<path d="M2 9 L6 5 L10 13 L14 5 L18 13 L22 5 L26 9" stroke="${L}" stroke-width="2" fill="none"/>`), '鋸齒線＝衝突');
        if (info.bondStyles.has('cutoff')) add(swatchSvg(`<line x1="2" y1="9" x2="13" y2="9" stroke="${L}" stroke-width="2"/><line x1="21" y1="9" x2="32" y2="9" stroke="${L}" stroke-width="2"/><path d="M14 2 L14 16 M20 2 L20 16" stroke="${L}" stroke-width="2"/>`), '截斷線＝斷絕往來');
        if (info.bondStyles.has('double')) add(swatchSvg(`<line x1="2" y1="6" x2="32" y2="6" stroke="${L}" stroke-width="2"/><line x1="2" y1="12" x2="32" y2="12" stroke="${L}" stroke-width="2"/>`), '雙線＝非常親密');
        if (info.labels) add(swatchSvg(`<text x="17" y="13" text-anchor="middle" font-size="11" fill="${L}">字</text>`), '線旁文字＝關係性質');
        if (info.proband) add(swatchSvg(`<rect x="9.5" y="1.5" width="15" height="15" rx="2" fill="${PALETTE.mist}" stroke="${INK}" stroke-width="2"/>`), '深棕外框＝案主');
        if (info.chronic) add(swatchSvg(`<rect x="10" y="2" width="14" height="14" fill="${PALETTE.mist}"/><rect x="17" y="2" width="7" height="7" fill="${INK}" fill-opacity="0.35"/>`), '右上角＝慢性病');
        if (info.disability) add(swatchSvg(`<rect x="10" y="2" width="14" height="14" fill="${PALETTE.mist}"/><rect x="17" y="2" width="7" height="14" fill="${INK}" fill-opacity="0.35"/>`), '右半邊＝身心障礙');
        if (info.deceased) add(swatchSvg(`<rect x="10" y="2" width="14" height="14" fill="${PALETTE.mist}"/><path d="M10 2 L24 16 M24 2 L10 16" stroke="${INK_SOFT}" stroke-width="1.5"/>`), 'X＝已過世');
        if (info.background) add(swatchSvg(`<rect x="2" y="2" width="30" height="14" rx="4" fill="${info.background}"/>`), '底色＝家庭類型');

        const legend = document.createElement('div');
        legend.className = 'ftdl-legend';
        legend.innerHTML = items.join('');
        return legend;
    }

    // --- 排版完成後的處理 ---
    function afterLayout(svg, layout, personsMap, relationships, ftdlText, wrapper) {
        if (!svg || !layout || !wrapper) return;
        const meta = parseMetadataExtras(ftdlText);

        // 家庭類型底色：畫在 SVG 最底層的圓角面板（高度在圖例加入後再調整）
        let panel = null;
        if (meta.background) {
            panel = svgEl('rect', {
                class: 'family-background', rx: 18, ry: 18,
                x: layout.bounds.minX, y: layout.bounds.minY,
                width: layout.bounds.maxX - layout.bounds.minX, height: layout.bounds.maxY - layout.bounds.minY,
                fill: backgroundTint(meta.background)
            });
            svg.insertBefore(panel, svg.firstChild);
        }

        // 有方向的關係線
        const bonds = parseBonds(ftdlText).filter(b => personsMap[b.from] && personsMap[b.to]);
        const pairKey = (x, y) => `${x}→${y}`;
        const keys = new Set(bonds.map(b => pairKey(b.from, b.to)));
        const bondLayer = svgEl('g', { class: 'bond-layer' });
        svg.appendChild(bondLayer);
        const bondKinds = new Set();
        const bondStyles = new Set();
        // 同一個方向同時有 bond 與 tie 時合併成一條線：粗細取 bond 的 closeness（感情深厚），
        // 虛線與文字來自 tie。因此兩個人之間最多兩條線，一去一回。
        const ties = parseTies(ftdlText).filter(t => personsMap[t.from] && personsMap[t.to]);
        const tieKeys = new Set(ties.map(t => pairKey(t.from, t.to)));
        const bondByKey = new Map(bonds.map(b => [pairKey(b.from, b.to), b]));
        bonds.forEach(b => {
            if (tieKeys.has(pairKey(b.from, b.to))) return;
            const kind = drawBond(bondLayer, b, personsMap, keys.has(pairKey(b.to, b.from)) || tieKeys.has(pairKey(b.to, b.from)));
            if (kind) { bondKinds.add(kind); bondStyles.add(b.style); }
        });

        // 關係強弱標記（tie）
        const tieLayer = svgEl('g', { class: 'tie-layer' });
        svg.appendChild(tieLayer);
        const tieLines = new Set();
        const halo = meta.background ? backgroundTint(meta.background) : '#FBF8F4';
        ties.forEach(t => {
            const bond = bondByKey.get(pairKey(t.from, t.to));
            const color = t.color || (bond && bond.color) || TIE_COLOR;
            const width = bond && bond.closeness !== null ? depthWidth(bond.closeness) : null;
            if (drawTie(tieLayer, t, personsMap, 0, halo, color, width)) {
                tieLines.add(t.line);
                bondKinds.add('tie');
            }
        });

        resolveLabelOverlaps(svg, personsMap);

        // 案主（先證者）：沿節點外緣畫一圈深棕色外框（畫在節點後方，只露出外圈）
        Object.values(personsMap).forEach(p => {
            if (!p.el || !p.el.classList.contains('is-proband') || isNaN(p.cx)) return;
            const w = p.width || 70, h = p.height || 70;
            const sw = 3, gap = sw / 2;
            const attrs = { class: 'proband-outline', fill: 'none', stroke: INK, 'stroke-width': sw, 'stroke-linejoin': 'round' };
            let shape;
            if (p.el.classList.contains('female')) {
                shape = svgEl('circle', { cx: p.cx, cy: p.cy, r: w / 2 + gap, ...attrs });
            } else if (p.el.classList.contains('other')) {
                // 與 person.css 的三角形 clip-path 相同：(50% 5%) (0% 95%) (100% 95%)，再向外擴 gap
                const pts = [[0.5, 0.05], [0, 0.95], [1, 0.95]].map(([fx, fy]) => [p.x + fx * w, p.y + fy * h]);
                const gx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, gy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
                const k = 1 + (gap * 2.2) / Math.min(w, h);
                shape = svgEl('polygon', { points: pts.map(([x, y]) => `${gx + (x - gx) * k},${gy + (y - gy) * k}`).join(' '), ...attrs });
            } else {
                const radius = parseFloat(getComputedStyle(p.el).borderTopLeftRadius) || 0;
                shape = svgEl('rect', { x: p.x - gap, y: p.y - gap, width: w + sw, height: h + sw, rx: radius + gap, ry: radius + gap, ...attrs });
            }
            svg.appendChild(shape);
        });

        // 圖例
        const oldLegend = wrapper.querySelector('.ftdl-legend');
        if (oldLegend) oldLegend.remove();
        if (!meta.legend) return;

        const persons = Object.values(personsMap);
        const flag = cls => persons.some(p => p.el && (p.el.classList.contains(cls) || p.el.querySelector('.' + cls)));
        const info = {
            genders: new Set(persons.map(p => p.el ? (p.el.classList.contains('male') ? 'male' : p.el.classList.contains('female') ? 'female' : 'other') : 'other')),
            wellbeing: persons.some(p => p.el && p.el.dataset.wellbeing !== undefined),
            marriage: relationships.some(r => r.partners.length > 1 && (r.type || 'marriage') === 'marriage'),
            partnership: relationships.some(r => r.partners.length > 1 && r.type === 'partnership'),
            quality: relationships.some(r => parseUnit(r.quality) !== null),
            divorced: relationships.some(r => r.status === 'divorced'),
            separated: relationships.some(r => r.status === 'separated'),
            bondKinds, bondStyles, tieLines,
            closeness: bonds.some(b => b.closeness !== null),
            depth: bonds.some(b => b.closeness !== null) || (tieLines.has('thick') && tieLines.has('thin')),
            dashed: tieLines.has('dashed') || bondStyles.has('dashed'),
            labels: ties.some(t => t.label) || bonds.some(b => b.label),
            proband: flag('is-proband'),
            chronic: flag('chronic-highlight'),
            disability: flag('disability-highlight'),
            deceased: flag('deceased-x'),
            background: meta.background
        };

        const legend = buildLegend(info);
        if (!legend.children.length) return;
        const top = layout.bounds.maxY;
        legend.style.left = `${Math.max(16, layout.bounds.minX + 16)}px`;
        legend.style.top = `${top}px`;
        legend.style.maxWidth = `${Math.max(420, layout.bounds.maxX - layout.bounds.minX - 32)}px`;
        wrapper.appendChild(legend);
        const needed = top + legend.offsetHeight + 24;
        wrapper.style.height = `${needed}px`;
        const legendRight = legend.offsetLeft + legend.offsetWidth + 24;
        const panelRight = Math.max(layout.bounds.maxX, legendRight);
        if (legendRight > parseFloat(wrapper.style.width || 0)) wrapper.style.width = `${legendRight}px`;
        if (panel) {
            panel.setAttribute('height', needed - layout.bounds.minY);
            panel.setAttribute('width', panelRight - layout.bounds.minX);
        }
    }

    // --- 匯出 ---
    function buildExportNode(cutout) {
        const wrapper = document.getElementById('family-tree-scalable-wrapper');
        if (!wrapper || !wrapper.querySelector('.person-figure')) return null;

        const box = document.createElement('div');
        box.className = 'ftdl-export-box';

        const stack = document.getElementById('metadata-display-stack');
        if (stack) {
            const head = document.createElement('div');
            head.className = 'ftdl-export-head';
            stack.querySelectorAll('div').forEach(d => {
                const line = document.createElement('div');
                line.className = d.className;
                line.textContent = d.textContent;
                head.appendChild(line);
            });
            box.appendChild(head);
        }

        const clone = wrapper.cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.add('ftdl-export-tree');
        clone.style.transform = 'none';
        clone.style.transition = 'none';
        clone.style.position = 'relative';
        clone.style.padding = '0';
        clone.style.display = 'block';
        clone.style.left = '0';
        clone.style.top = '0';
        if (cutout) {
            // 去背：拿掉家庭類型底色面板，標籤的描邊改成透明，只留下人物、線條、文字與圖例
            clone.querySelectorAll('.family-background').forEach(el => el.remove());
            clone.querySelectorAll('.tie-label').forEach(el => el.setAttribute('stroke', 'none'));
            clone.style.backgroundColor = 'transparent';
            clone.querySelectorAll('.ftdl-legend .legend-item').forEach(el => {
                if (el.textContent.includes('底色')) el.remove();
            });
        }
        box.appendChild(clone);

        box.style.position = 'fixed';
        box.style.left = '-100000px';
        box.style.top = '0';
        document.body.appendChild(box);
        return box;
    }

    async function exportImage(kind, button, cutout) {
        if (!window.htmlToImage) {
            alert('匯出元件尚未載入（需要網路連線載入 html-to-image）。');
            return;
        }
        const node = buildExportNode(cutout);
        if (!node) { alert('畫布上還沒有家系圖。'); return; }
        const label = button.textContent;
        button.disabled = true;
        button.textContent = '匯出中…';
        const fn = kind === 'svg' ? window.htmlToImage.toSvg : window.htmlToImage.toPng;
        // 匯出容器放在畫面外；輸出時把根節點的位置改回 0，內容才會落在畫布內
        const opts = {
            pixelRatio: 3,
            cacheBust: true,
            width: node.offsetWidth,
            height: node.offsetHeight,
            style: { position: 'static', left: '0', top: '0', margin: '0' }
        };
        try {
            let url;
            try {
                url = await fn(node, opts);
            } catch (fontErr) {
                console.warn('嵌入字型失敗，改用系統字型匯出：', fontErr);
                url = await fn(node, { ...opts, skipFonts: true });
            }
            const a = document.createElement('a');
            const title = (document.querySelector('#metadata-display-stack .metadata-title') || {}).textContent || 'genogram';
            a.download = `${title.trim() || 'genogram'}${cutout ? '_去背' : ''}.${kind}`;
            a.href = url;
            a.click();
        } catch (err) {
            console.error(err);
            alert('匯出失敗：' + (err && err.message ? err.message : err));
        } finally {
            node.remove();
            button.disabled = false;
            button.textContent = label;
        }
    }

    function addExportButtons() {
        const controls = document.getElementById('canvas-zoom-controls');
        if (!controls || document.getElementById('export-png-btn')) return;
        [
            ['png', '匯出 PNG', false, 'png', '匯出 PNG（3 倍解析度，保留家庭類型底色）'],
            ['png', '匯出 PNG（去背）', true, 'png-cutout', '匯出完全透明背景的 PNG（3 倍解析度，不含家庭類型底色）'],
            ['svg', '匯出 SVG', false, 'svg', '匯出 SVG']
        ].forEach(([kind, text, cutout, id, title]) => {
            const btn = document.createElement('button');
            btn.className = 'zoom-btn export-btn';
            btn.id = `export-${id}-btn`;
            btn.textContent = text;
            btn.title = title;
            btn.addEventListener('click', e => { e.stopPropagation(); exportImage(kind, btn, cutout); });
            btn.addEventListener('mousedown', e => e.stopPropagation());
            controls.appendChild(btn);
        });
    }

    document.addEventListener('DOMContentLoaded', addExportButtons);

    window.FTDLResearch = {
        PALETTE, INK, INK_SOFT, WELLBEING_RAMP, BOND_STYLES,
        resolveColor, lighten, backgroundTint, parseTies, wellbeingColor, parseUnit, parseBonds, afterLayout
    };
})();
