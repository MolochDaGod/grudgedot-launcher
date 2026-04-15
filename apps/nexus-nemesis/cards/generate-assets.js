const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, 'assets');

function write(subdir, name, svg) {
  const fp = path.join(BASE, subdir, name);
  fs.writeFileSync(fp, svg.trim(), 'utf8');
  console.log(`  ✓ ${subdir}/${name}`);
}

// ============================================================
// FRAMES — Card background bases (220×310 card size)
// ============================================================
console.log('\n🎨 Generating FRAMES...');

function cardFrame(color1, color2, color3, borderColor) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 310">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="${color1}"/>
      <stop offset="50%" stop-color="${color2}"/>
      <stop offset="100%" stop-color="${color3}"/>
    </linearGradient>
    <pattern id="tex" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="rgba(255,255,255,0.03)"/>
      <circle cx="2" cy="2" r="0.5" fill="rgba(255,255,255,0.06)"/>
    </pattern>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="n"/><feColorMatrix type="saturate" values="0" in="n" result="g"/><feBlend in="SourceGraphic" in2="g" mode="overlay"/></filter>
  </defs>
  <rect width="220" height="310" rx="12" fill="url(#bg)"/>
  <rect width="220" height="310" rx="12" fill="url(#tex)"/>
  <rect x="3" y="3" width="214" height="304" rx="10" fill="none" stroke="${borderColor}" stroke-width="1.5" opacity="0.4"/>
  <rect x="8" y="8" width="204" height="294" rx="8" fill="none" stroke="${borderColor}" stroke-width="0.5" opacity="0.2"/>
  <!-- Corner flourishes -->
  <g opacity="0.3" fill="${borderColor}">
    <path d="M16,8 Q12,8 12,12 L12,24 Q12,16 20,12 L28,8 Z"/>
    <path d="M204,8 Q208,8 208,12 L208,24 Q208,16 200,12 L192,8 Z"/>
    <path d="M16,302 Q12,302 12,298 L12,286 Q12,294 20,298 L28,302 Z"/>
    <path d="M204,302 Q208,302 208,298 L208,286 Q208,294 200,298 L192,302 Z"/>
  </g>
</svg>`;
}

write('frames', 'front_blue.svg', cardFrame('#1a2a4a', '#0d1929', '#0a1220', '#4a90d9'));
write('frames', 'front_red.svg', cardFrame('#4a1a1a', '#291010', '#200a0a', '#d94a4a'));
write('frames', 'front_green.svg', cardFrame('#1a3a2a', '#0d2918', '#0a200f', '#4ad97a'));

// Frame overlays
write('frames', 'frame_crystal.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 310">
  <defs>
    <linearGradient id="cr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(100,200,255,0.3)"/>
      <stop offset="50%" stop-color="rgba(150,220,255,0.1)"/>
      <stop offset="100%" stop-color="rgba(100,200,255,0.25)"/>
    </linearGradient>
  </defs>
  <rect width="220" height="310" rx="12" fill="none"/>
  <rect x="2" y="2" width="216" height="306" rx="11" fill="none" stroke="url(#cr)" stroke-width="3"/>
  <rect x="6" y="6" width="208" height="298" rx="9" fill="none" stroke="rgba(150,220,255,0.15)" stroke-width="1"/>
  <!-- Top decorative bar -->
  <rect x="30" y="4" width="160" height="2" rx="1" fill="rgba(150,220,255,0.3)"/>
  <rect x="50" y="7" width="120" height="1" rx="0.5" fill="rgba(150,220,255,0.15)"/>
  <!-- Bottom decorative bar -->
  <rect x="30" y="304" width="160" height="2" rx="1" fill="rgba(150,220,255,0.3)"/>
  <!-- Corner gems -->
  <g fill="rgba(150,220,255,0.5)">
    <circle cx="12" cy="12" r="4"/><circle cx="208" cy="12" r="4"/>
    <circle cx="12" cy="298" r="4"/><circle cx="208" cy="298" r="4"/>
  </g>
  <g fill="rgba(200,240,255,0.8)">
    <circle cx="12" cy="12" r="1.5"/><circle cx="208" cy="12" r="1.5"/>
    <circle cx="12" cy="298" r="1.5"/><circle cx="208" cy="298" r="1.5"/>
  </g>
</svg>`);

write('frames', 'frame_golden.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 310">
  <defs>
    <linearGradient id="gld" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,215,0,0.4)"/>
      <stop offset="30%" stop-color="rgba(255,180,0,0.2)"/>
      <stop offset="70%" stop-color="rgba(255,200,50,0.3)"/>
      <stop offset="100%" stop-color="rgba(255,215,0,0.35)"/>
    </linearGradient>
  </defs>
  <rect width="220" height="310" rx="12" fill="none"/>
  <rect x="2" y="2" width="216" height="306" rx="11" fill="none" stroke="url(#gld)" stroke-width="3.5"/>
  <rect x="6" y="6" width="208" height="298" rx="9" fill="none" stroke="rgba(255,215,0,0.15)" stroke-width="1"/>
  <!-- Gold corner ornaments -->
  <g fill="rgba(255,215,0,0.5)" stroke="rgba(255,180,0,0.3)" stroke-width="0.5">
    <path d="M6,20 L6,12 Q6,6 12,6 L20,6 L16,10 L12,10 Q10,10 10,12 L10,16 Z"/>
    <path d="M214,20 L214,12 Q214,6 208,6 L200,6 L204,10 L208,10 Q210,10 210,12 L210,16 Z"/>
    <path d="M6,290 L6,298 Q6,304 12,304 L20,304 L16,300 L12,300 Q10,300 10,298 L10,294 Z"/>
    <path d="M214,290 L214,298 Q214,304 208,304 L200,304 L204,300 L208,300 Q210,300 210,298 L210,294 Z"/>
  </g>
  <!-- Top/bottom center medallions -->
  <ellipse cx="110" cy="5" rx="20" ry="3" fill="rgba(255,215,0,0.25)"/>
  <ellipse cx="110" cy="305" rx="20" ry="3" fill="rgba(255,215,0,0.25)"/>
</svg>`);

write('frames', 'ornament_runes.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 310">
  <defs>
    <linearGradient id="rn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(200,200,255,0.2)"/>
      <stop offset="100%" stop-color="rgba(200,200,255,0.05)"/>
    </linearGradient>
  </defs>
  <!-- Left rune column -->
  <g fill="none" stroke="rgba(180,200,255,0.15)" stroke-width="0.8" transform="translate(8,40)">
    <path d="M0,0 L4,8 L0,16 M0,8 L6,8"/>
    <path d="M0,24 L3,28 L6,24 L3,32 Z"/>
    <path d="M0,40 L6,44 L0,48 M3,40 L3,48"/>
    <path d="M0,56 L6,60 M0,60 L6,56 M3,54 L3,62"/>
    <path d="M1,72 A4,4 0 1,1 5,72 M3,68 L3,80"/>
    <path d="M0,86 L6,86 L3,94 Z"/>
    <path d="M0,102 L4,110 L0,118 M0,110 L6,110"/>
    <path d="M0,126 L3,130 L6,126 L3,134 Z"/>
  </g>
  <!-- Right rune column (mirrored) -->
  <g fill="none" stroke="rgba(180,200,255,0.15)" stroke-width="0.8" transform="translate(206,40)">
    <path d="M0,0 L4,8 L0,16 M0,8 L6,8"/>
    <path d="M0,24 L3,28 L6,24 L3,32 Z"/>
    <path d="M0,40 L6,44 L0,48 M3,40 L3,48"/>
    <path d="M0,56 L6,60 M0,60 L6,56 M3,54 L3,62"/>
    <path d="M1,72 A4,4 0 1,1 5,72 M3,68 L3,80"/>
    <path d="M0,86 L6,86 L3,94 Z"/>
  </g>
  <!-- Top rune row -->
  <g fill="none" stroke="rgba(180,200,255,0.12)" stroke-width="0.6" transform="translate(40,10)">
    <path d="M0,0 L6,4 L12,0 M6,0 L6,6"/>
    <path d="M24,0 L28,4 L32,0 L28,6 Z"/>
    <path d="M44,0 L50,4 L44,8 M47,0 L47,8"/>
    <path d="M64,1 A4,3 0 1,1 72,1"/>
    <path d="M84,0 L90,4 L84,8 M84,4 L92,4"/>
    <path d="M104,0 L108,4 L112,0 L108,6 Z"/>
  </g>
</svg>`);

write('frames', 'art_overlay.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 310">
  <defs>
    <radialGradient id="shine" cx="0.3" cy="0.2" r="0.8">
      <stop offset="0%" stop-color="rgba(255,255,255,0.15)"/>
      <stop offset="40%" stop-color="rgba(255,255,255,0.05)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
  </defs>
  <rect width="220" height="310" rx="12" fill="url(#shine)"/>
</svg>`);

// ============================================================
// BACKS — Card back designs
// ============================================================
console.log('🎨 Generating BACKS...');

function cardBack(color1, color2, accentColor, pattern) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 310">
  <defs>
    <linearGradient id="bbg" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="${color1}"/>
      <stop offset="100%" stop-color="${color2}"/>
    </linearGradient>
    <pattern id="dia" width="16" height="16" patternUnits="userSpaceOnUse">
      <path d="M8,0 L16,8 L8,16 L0,8 Z" fill="none" stroke="${accentColor}" stroke-width="0.5" opacity="0.15"/>
    </pattern>
    <radialGradient id="cg" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="220" height="310" rx="12" fill="url(#bbg)"/>
  <rect width="220" height="310" rx="12" fill="url(#dia)"/>
  <rect x="6" y="6" width="208" height="298" rx="9" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.4"/>
  <rect x="12" y="12" width="196" height="286" rx="7" fill="none" stroke="${accentColor}" stroke-width="0.8" opacity="0.2"/>
  <!-- Center emblem glow -->
  <ellipse cx="110" cy="155" rx="50" ry="50" fill="url(#cg)"/>
  <!-- Center emblem: stylized N -->
  <g transform="translate(110,155)" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.6">
    <polygon points="-20,-25 -20,25 -12,25 8,-15 8,25 20,25 20,-25 12,-25 -8,15 -8,-25" fill="${accentColor}" fill-opacity="0.15"/>
    <circle r="35" stroke-width="1.5"/>
    <circle r="30" stroke-width="0.5" opacity="0.4"/>
    ${pattern}
  </g>
  <!-- Corner stars -->
  <g fill="${accentColor}" opacity="0.3">
    <polygon points="20,20 22,26 28,26 23,30 25,36 20,32 15,36 17,30 12,26 18,26" transform="scale(0.6) translate(12,12)"/>
    <polygon points="20,20 22,26 28,26 23,30 25,36 20,32 15,36 17,30 12,26 18,26" transform="scale(0.6) translate(338,12)"/>
    <polygon points="20,20 22,26 28,26 23,30 25,36 20,32 15,36 17,30 12,26 18,26" transform="scale(0.6) translate(12,488)"/>
    <polygon points="20,20 22,26 28,26 23,30 25,36 20,32 15,36 17,30 12,26 18,26" transform="scale(0.6) translate(338,488)"/>
  </g>
</svg>`;
}

write('backs', 'back_blue.svg', cardBack('#0d1929', '#061020', '#4a90d9', '<line x1="-40" y1="0" x2="40" y2="0" opacity="0.2"/><line x1="0" y1="-40" x2="0" y2="40" opacity="0.2"/>'));
write('backs', 'back_red.svg', cardBack('#291010', '#1a0808', '#d94a4a', '<line x1="-40" y1="0" x2="40" y2="0" opacity="0.2"/><line x1="0" y1="-40" x2="0" y2="40" opacity="0.2"/>'));
write('backs', 'back_green.svg', cardBack('#0d2918', '#081a0f', '#4ad97a', '<line x1="-40" y1="0" x2="40" y2="0" opacity="0.2"/><line x1="0" y1="-40" x2="0" y2="40" opacity="0.2"/>'));
write('backs', 'back_crystal.svg', cardBack('#141428', '#0a0a1a', '#a0a0ff', `
    <path d="M0,-40 L5,-30 L0,-20 L-5,-30 Z" fill="rgba(160,160,255,0.1)"/>
    <path d="M0,20 L5,30 L0,40 L-5,30 Z" fill="rgba(160,160,255,0.1)"/>
    <line x1="-40" y1="0" x2="40" y2="0" opacity="0.15"/>
  `));

// ============================================================
// STATS — Circular stat bubble backgrounds
// ============================================================
console.log('🎨 Generating STATS...');

function statBubble(color1, color2, highlight) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42">
  <defs>
    <radialGradient id="sb" cx="0.35" cy="0.35" r="0.65">
      <stop offset="0%" stop-color="${highlight}"/>
      <stop offset="60%" stop-color="${color1}"/>
      <stop offset="100%" stop-color="${color2}"/>
    </radialGradient>
  </defs>
  <circle cx="21" cy="21" r="20" fill="url(#sb)"/>
  <circle cx="21" cy="21" r="18" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
  <ellipse cx="16" cy="14" rx="8" ry="5" fill="rgba(255,255,255,0.1)" transform="rotate(-20,16,14)"/>
</svg>`;
}

write('stats', 'stat_blue.svg', statBubble('#2255aa', '#112244', '#4488dd'));
write('stats', 'stat_red.svg', statBubble('#aa2222', '#441111', '#dd4444'));
write('stats', 'stat_green.svg', statBubble('#22aa44', '#114422', '#44dd66'));
write('stats', 'stat_orange.svg', statBubble('#cc6600', '#663300', '#ff8833'));
write('stats', 'stat_purple.svg', statBubble('#7722cc', '#331166', '#aa44ff'));
write('stats', 'stat_yellow.svg', statBubble('#ccaa00', '#665500', '#ffdd33'));
write('stats', 'stat_brown.svg', statBubble('#8b5e3c', '#4a2e1c', '#b07850'));

write('stats', 'stat_border.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 46">
  <defs>
    <linearGradient id="brd" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,215,0,0.7)"/>
      <stop offset="50%" stop-color="rgba(200,170,0,0.5)"/>
      <stop offset="100%" stop-color="rgba(255,215,0,0.6)"/>
    </linearGradient>
  </defs>
  <circle cx="23" cy="23" r="22" fill="none" stroke="url(#brd)" stroke-width="2"/>
  <circle cx="23" cy="23" r="20" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
  <!-- Notch marks -->
  <g stroke="rgba(255,215,0,0.3)" stroke-width="1">
    <line x1="23" y1="1" x2="23" y2="4"/><line x1="23" y1="42" x2="23" y2="45"/>
    <line x1="1" y1="23" x2="4" y2="23"/><line x1="42" y1="23" x2="45" y2="23"/>
  </g>
</svg>`);

write('stats', 'stat_icon_frame.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="11" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
  <circle cx="12" cy="12" r="9" fill="rgba(0,0,0,0.2)"/>
</svg>`);

// ============================================================
// ICONS — Ability/stat icons
// ============================================================
console.log('🎨 Generating ICONS...');

write('icons', 'icon_sword.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs><linearGradient id="sw" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e0e0e0"/><stop offset="100%" stop-color="#888"/></linearGradient></defs>
  <!-- Blade -->
  <path d="M6,18 L16,4 L18,6 L8,20 Z" fill="url(#sw)" stroke="#666" stroke-width="0.5"/>
  <!-- Edge highlight -->
  <line x1="7" y1="17" x2="17" y2="5" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
  <!-- Guard -->
  <rect x="5" y="16" width="10" height="2.5" rx="1" fill="#b8860b" stroke="#8b6508" stroke-width="0.5" transform="rotate(-45,10,17)"/>
  <!-- Pommel -->
  <circle cx="5.5" cy="19.5" r="1.8" fill="#b8860b" stroke="#8b6508" stroke-width="0.5"/>
  <circle cx="5" cy="19" r="0.6" fill="#ffd700" opacity="0.6"/>
</svg>`);

write('icons', 'icon_heart.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs><radialGradient id="hr" cx="0.4" cy="0.35" r="0.7"><stop offset="0%" stop-color="#ff4466"/><stop offset="100%" stop-color="#aa1133"/></radialGradient></defs>
  <path d="M12,20 C4,14 2,9 5,6 C7,4 10,5 12,8 C14,5 17,4 19,6 C22,9 20,14 12,20Z" fill="url(#hr)" stroke="#881122" stroke-width="0.5"/>
  <path d="M7,7.5 Q9,5.5 12,8" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-linecap="round"/>
</svg>`);

write('icons', 'icon_shield.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs><linearGradient id="sh" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#5588cc"/><stop offset="100%" stop-color="#2244aa"/></linearGradient></defs>
  <path d="M12,2 L4,6 L4,13 Q4,19 12,22 Q20,19 20,13 L20,6 Z" fill="url(#sh)" stroke="#1a3366" stroke-width="0.8"/>
  <path d="M12,4 L6,7.5 L6,13 Q6,17.5 12,20 Q18,17.5 18,13 L18,7.5 Z" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
  <!-- Cross emblem -->
  <rect x="10.5" y="7" width="3" height="10" rx="0.5" fill="rgba(255,255,255,0.25)"/>
  <rect x="7" y="10" width="10" height="3" rx="0.5" fill="rgba(255,255,255,0.25)"/>
</svg>`);

write('icons', 'icon_flame.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="fl" x1="0.5" y1="1" x2="0.5" y2="0"><stop offset="0%" stop-color="#ff2200"/><stop offset="40%" stop-color="#ff6600"/><stop offset="80%" stop-color="#ffaa00"/><stop offset="100%" stop-color="#ffee88"/></linearGradient>
  </defs>
  <path d="M12,2 C12,2 8,7 8,12 C8,10 6,8 6,12 C6,17 9,21 12,22 C15,21 18,17 18,12 C18,8 16,10 16,12 C16,7 12,2 12,2Z" fill="url(#fl)" opacity="0.9"/>
  <path d="M12,8 C12,8 10,11 10,14 C10,17 12,18 12,18 C12,18 14,17 14,14 C14,11 12,8 12,8Z" fill="#ffee88" opacity="0.6"/>
</svg>`);

write('icons', 'icon_storm.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs><linearGradient id="st" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffdd00"/><stop offset="100%" stop-color="#ff8800"/></linearGradient></defs>
  <polygon points="13,1 7,12 11,12 6,23 18,10 13,10 17,1" fill="url(#st)" stroke="#cc6600" stroke-width="0.5" stroke-linejoin="round"/>
  <polygon points="12.5,3 8.5,11 11.5,11" fill="rgba(255,255,255,0.3)"/>
</svg>`);

write('icons', 'icon_drop.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs><radialGradient id="dr" cx="0.35" cy="0.4" r="0.6"><stop offset="0%" stop-color="#66ccaa"/><stop offset="100%" stop-color="#227755"/></radialGradient></defs>
  <path d="M12,2 Q12,2 6,13 A7,7 0 0,0 18,13 Q12,2 12,2Z" fill="url(#dr)" stroke="#115533" stroke-width="0.5"/>
  <ellipse cx="9.5" cy="13" rx="2" ry="3" fill="rgba(255,255,255,0.2)" transform="rotate(-15,9.5,13)"/>
</svg>`);

// ============================================================
// CRYSTALS — Mana cost gems
// ============================================================
console.log('🎨 Generating CRYSTALS...');

function crystal(color1, color2, highlight, glow) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 46">
  <defs>
    <linearGradient id="cg1" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="${highlight}"/>
      <stop offset="50%" stop-color="${color1}"/>
      <stop offset="100%" stop-color="${color2}"/>
    </linearGradient>
    <radialGradient id="cgl" cx="0.5" cy="0.5" r="0.6">
      <stop offset="0%" stop-color="${glow}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>
    <filter id="cglow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <!-- Outer glow -->
  <circle cx="23" cy="23" r="20" fill="url(#cgl)"/>
  <!-- Crystal shape -->
  <g filter="url(#cglow)">
    <polygon points="23,3 38,16 35,38 11,38 8,16" fill="url(#cg1)" stroke="${color2}" stroke-width="1"/>
    <!-- Facets -->
    <polygon points="23,3 38,16 23,20 8,16" fill="rgba(255,255,255,0.1)"/>
    <polygon points="23,20 38,16 35,38" fill="rgba(0,0,0,0.1)"/>
    <!-- Highlight -->
    <polygon points="14,12 23,5 28,14 20,18" fill="rgba(255,255,255,0.2)"/>
  </g>
</svg>`;
}

write('crystals', 'crystal_blue.svg', crystal('#2255cc', '#112266', '#66aaff', '#4488ff'));
write('crystals', 'crystal_red.svg', crystal('#cc2233', '#661122', '#ff6677', '#ff4455'));
write('crystals', 'crystal_green.svg', crystal('#22aa55', '#116633', '#66ffaa', '#44dd77'));

// ============================================================
// EMBLEMS — Sub-type icons (28×28)
// ============================================================
console.log('🎨 Generating EMBLEMS...');

write('emblems', 'skull.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
  <defs><radialGradient id="sk" cx="0.4" cy="0.35" r="0.6"><stop offset="0%" stop-color="#f0e0c0"/><stop offset="100%" stop-color="#a08060"/></radialGradient></defs>
  <ellipse cx="14" cy="12" rx="9" ry="10" fill="url(#sk)" stroke="#604020" stroke-width="0.5"/>
  <!-- Eyes -->
  <ellipse cx="10" cy="11" rx="2.5" ry="3" fill="#201008"/>
  <ellipse cx="18" cy="11" rx="2.5" ry="3" fill="#201008"/>
  <ellipse cx="10" cy="10.5" rx="1" ry="1.2" fill="rgba(255,100,100,0.4)"/>
  <ellipse cx="18" cy="10.5" rx="1" ry="1.2" fill="rgba(255,100,100,0.4)"/>
  <!-- Nose -->
  <path d="M13,14 L14,16 L15,14" fill="#402010"/>
  <!-- Jaw -->
  <path d="M8,18 Q8,24 14,24 Q20,24 20,18" fill="url(#sk)" stroke="#604020" stroke-width="0.5"/>
  <g stroke="#604020" stroke-width="0.8">
    <line x1="10" y1="18" x2="10" y2="22"/><line x1="12" y1="18" x2="12" y2="23"/>
    <line x1="14" y1="18" x2="14" y2="24"/><line x1="16" y1="18" x2="16" y2="23"/>
    <line x1="18" y1="18" x2="18" y2="22"/>
  </g>
</svg>`);

write('emblems', 'sword.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
  <path d="M14,2 L16,3 L15,16 L13,16 L12,3 Z" fill="#c0c0c0" stroke="#888" stroke-width="0.5"/>
  <line x1="14" y1="3" x2="14" y2="15" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
  <rect x="9" y="16" width="10" height="2.5" rx="1" fill="#b8860b" stroke="#8b6508" stroke-width="0.5"/>
  <rect x="12.5" y="18.5" width="3" height="5" rx="0.8" fill="#8b6508"/>
  <circle cx="14" cy="25" r="1.5" fill="#b8860b"/>
</svg>`);

write('emblems', 'shild.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
  <defs><linearGradient id="es" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#6699dd"/><stop offset="100%" stop-color="#334488"/></linearGradient></defs>
  <path d="M14,2 L4,7 L4,16 Q4,23 14,26 Q24,23 24,16 L24,7 Z" fill="url(#es)" stroke="#223366" stroke-width="0.8"/>
  <path d="M14,4 L6,8.5 L6,15.5 Q6,21 14,24 Q22,21 22,15.5 L22,8.5 Z" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
  <path d="M14,8 L14,20 M9,13 L19,13" stroke="rgba(255,215,0,0.5)" stroke-width="1.5"/>
</svg>`);

write('emblems', 'magic.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
  <defs><radialGradient id="mg" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stop-color="#cc88ff"/><stop offset="100%" stop-color="#6622aa"/></radialGradient></defs>
  <circle cx="14" cy="14" r="10" fill="url(#mg)" opacity="0.3"/>
  <polygon points="14,3 16.5,10.5 24,10.5 18,15.5 20.5,23 14,18.5 7.5,23 10,15.5 4,10.5 11.5,10.5" fill="none" stroke="#bb77ff" stroke-width="1"/>
  <polygon points="14,6 15.8,11.5 21,11.5 17,14.8 18.8,20.5 14,17 9.2,20.5 11,14.8 7,11.5 12.2,11.5" fill="#bb77ff" opacity="0.4"/>
  <circle cx="14" cy="14" r="2" fill="#eeccff"/>
</svg>`);

write('emblems', 'heart_.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
  <defs><radialGradient id="eh" cx="0.4" cy="0.35" r="0.7"><stop offset="0%" stop-color="#ff5577"/><stop offset="100%" stop-color="#cc1144"/></radialGradient></defs>
  <path d="M14,24 C4,16 1,10 5,6 C8,3.5 11,5 14,9 C17,5 20,3.5 23,6 C27,10 24,16 14,24Z" fill="url(#eh)" stroke="#991133" stroke-width="0.5"/>
  <path d="M8,7 Q11,5 14,9" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.2" stroke-linecap="round"/>
</svg>`);

write('emblems', 'wing.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
  <defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="0.5"><stop offset="0%" stop-color="#e0d8cc"/><stop offset="100%" stop-color="#a09080"/></linearGradient></defs>
  <path d="M4,20 Q2,10 8,4 Q10,8 14,6 Q12,12 18,8 Q16,14 22,10 Q20,16 26,14 Q22,20 14,22 Z" fill="url(#wg)" stroke="#706050" stroke-width="0.5"/>
  <path d="M6,18 Q4,12 8,6" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>
  <path d="M10,16 Q8,12 14,8" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
  <path d="M14,18 Q12,14 18,10" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
</svg>`);

write('emblems', 'arrow.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
  <line x1="4" y1="24" x2="22" y2="4" stroke="#b08040" stroke-width="1.5"/>
  <polygon points="22,4 24,2 26,8 20,6" fill="#a0a0a0" stroke="#666" stroke-width="0.3"/>
  <!-- Fletching -->
  <path d="M5,23 L2,26 L6,24" fill="#882222" opacity="0.7"/>
  <path d="M4,24 L2,22 L6,22" fill="#882222" opacity="0.5"/>
</svg>`);

write('emblems', 'axe.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
  <!-- Handle -->
  <rect x="13" y="4" width="2" height="20" rx="0.5" fill="#8b6508" stroke="#604020" stroke-width="0.3"/>
  <!-- Blade -->
  <path d="M8,5 Q4,8 4,14 Q4,16 8,17 L14,14 L14,5 Z" fill="#b0b0b0" stroke="#666" stroke-width="0.5"/>
  <path d="M9,6 Q6,9 6,13 L12,11 L12,6 Z" fill="rgba(255,255,255,0.15)"/>
</svg>`);

write('emblems', 'moon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
  <defs><radialGradient id="mn" cx="0.3" cy="0.3" r="0.7"><stop offset="0%" stop-color="#e8e0d0"/><stop offset="100%" stop-color="#a0a0c0"/></radialGradient></defs>
  <circle cx="14" cy="14" r="10" fill="url(#mn)"/>
  <circle cx="18" cy="12" r="8" fill="#0a0e1a"/>
  <!-- Stars -->
  <g fill="#ffe066" opacity="0.7">
    <circle cx="22" cy="8" r="0.8"/><circle cx="24" cy="16" r="0.5"/><circle cx="20" cy="22" r="0.6"/>
  </g>
</svg>`);

write('emblems', 'sun.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
  <defs><radialGradient id="sn" cx="0.4" cy="0.4" r="0.5"><stop offset="0%" stop-color="#ffee88"/><stop offset="100%" stop-color="#ddaa00"/></radialGradient></defs>
  <circle cx="14" cy="14" r="6" fill="url(#sn)"/>
  <!-- Rays -->
  <g stroke="#ddaa00" stroke-width="1.5" stroke-linecap="round" opacity="0.8">
    <line x1="14" y1="2" x2="14" y2="6"/><line x1="14" y1="22" x2="14" y2="26"/>
    <line x1="2" y1="14" x2="6" y2="14"/><line x1="22" y1="14" x2="26" y2="14"/>
    <line x1="5.5" y1="5.5" x2="8.3" y2="8.3"/><line x1="19.7" y1="19.7" x2="22.5" y2="22.5"/>
    <line x1="22.5" y1="5.5" x2="19.7" y2="8.3"/><line x1="8.3" y1="19.7" x2="5.5" y2="22.5"/>
  </g>
  <circle cx="12" cy="12" r="2" fill="rgba(255,255,255,0.3)"/>
</svg>`);

write('emblems', 'people.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
  <g fill="#c0b0a0" stroke="#806040" stroke-width="0.5">
    <!-- Person 1 -->
    <circle cx="10" cy="8" r="3.5"/>
    <path d="M4,22 Q4,14 10,14 Q16,14 16,22"/>
    <!-- Person 2 -->
    <circle cx="18" cy="8" r="3.5"/>
    <path d="M12,22 Q12,14 18,14 Q24,14 24,22"/>
  </g>
</svg>`);

write('emblems', 'mighty.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
  <defs><linearGradient id="mt" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#ffd700"/><stop offset="100%" stop-color="#b8860b"/></linearGradient></defs>
  <!-- Crown -->
  <polygon points="4,18 6,8 10,14 14,4 18,14 22,8 24,18" fill="url(#mt)" stroke="#8b6508" stroke-width="0.5"/>
  <rect x="4" y="18" width="20" height="4" rx="1" fill="url(#mt)" stroke="#8b6508" stroke-width="0.5"/>
  <!-- Gems -->
  <circle cx="14" cy="19.5" r="1.5" fill="#ff2222"/><circle cx="9" cy="19.5" r="1" fill="#2255ff"/><circle cx="19" cy="19.5" r="1" fill="#22cc44"/>
  <!-- Point tips -->
  <circle cx="6" cy="8" r="1" fill="#ffd700"/><circle cx="14" cy="4" r="1.2" fill="#ffd700"/><circle cx="22" cy="8" r="1" fill="#ffd700"/>
</svg>`);

// ============================================================
// BANNERS — UI elements
// ============================================================
console.log('🎨 Generating BANNERS...');

write('banners', 'banner_gold.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165 24">
  <defs>
    <linearGradient id="bn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c8a040"/><stop offset="40%" stop-color="#ffd760"/>
      <stop offset="60%" stop-color="#e8b830"/><stop offset="100%" stop-color="#a08020"/>
    </linearGradient>
  </defs>
  <path d="M0,12 L10,0 L155,0 L165,12 L155,24 L10,24 Z" fill="url(#bn)" stroke="#806020" stroke-width="0.5"/>
  <path d="M4,12 L12,2 L153,2 L161,12 L153,22 L12,22 Z" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
  <!-- Edge shadows -->
  <path d="M0,12 L10,0 L12,2 L4,12 L12,22 L10,24 Z" fill="rgba(0,0,0,0.15)"/>
  <path d="M165,12 L155,0 L153,2 L161,12 L153,22 L155,24 Z" fill="rgba(0,0,0,0.1)"/>
</svg>`);

write('banners', 'info_panel.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 118">
  <defs>
    <linearGradient id="ip" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(15,10,5,0.85)"/><stop offset="30%" stop-color="rgba(25,18,10,0.92)"/>
      <stop offset="100%" stop-color="rgba(10,8,4,0.95)"/>
    </linearGradient>
  </defs>
  <rect width="220" height="118" rx="0 0 12 12" fill="url(#ip)"/>
  <rect x="4" y="2" width="212" height="112" rx="4" fill="none" stroke="rgba(200,160,80,0.2)" stroke-width="0.5"/>
  <!-- Divider line -->
  <line x1="20" y1="22" x2="200" y2="22" stroke="rgba(200,160,80,0.15)" stroke-width="0.5"/>
</svg>`);

write('banners', 'heart_gem.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
  <defs><radialGradient id="hg" cx="0.4" cy="0.35"><stop offset="0%" stop-color="#ff6688"/><stop offset="100%" stop-color="#cc1144"/></radialGradient></defs>
  <path d="M10,17 C3,12 1,8 4,5.5 C6,4 8,5 10,7.5 C12,5 14,4 16,5.5 C19,8 17,12 10,17Z" fill="url(#hg)"/>
  <path d="M6,6 Q8,4.5 10,7" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.8"/>
</svg>`);

write('banners', 'shield_gem.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
  <defs><linearGradient id="sg" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#66aaee"/><stop offset="100%" stop-color="#2255aa"/></linearGradient></defs>
  <path d="M10,1 L3,4.5 L3,11 Q3,16 10,19 Q17,16 17,11 L17,4.5 Z" fill="url(#sg)" stroke="#1a3366" stroke-width="0.5"/>
</svg>`);

write('banners', 'emerald.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
  <defs><linearGradient id="em" x1="0.3" y1="0" x2="0.7" y2="1"><stop offset="0%" stop-color="#44ee88"/><stop offset="100%" stop-color="#116633"/></linearGradient></defs>
  <polygon points="10,2 17,7 17,13 10,18 3,13 3,7" fill="url(#em)" stroke="#0a4420" stroke-width="0.5"/>
  <polygon points="10,4 15,8 10,10 5,8" fill="rgba(255,255,255,0.15)"/>
</svg>`);

write('banners', 'star.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
  <defs><radialGradient id="sr" cx="0.4" cy="0.35"><stop offset="0%" stop-color="#ffee88"/><stop offset="100%" stop-color="#ddaa00"/></radialGradient></defs>
  <polygon points="10,1 12.5,7 19,7.5 14,12 15.5,18.5 10,15 4.5,18.5 6,12 1,7.5 7.5,7" fill="url(#sr)" stroke="#aa8800" stroke-width="0.3"/>
  <polygon points="10,4 11.5,8 15,8.5" fill="rgba(255,255,255,0.2)"/>
</svg>`);

// ============================================================
// EFFECTS — Glow/particle overlays
// ============================================================
console.log('🎨 Generating EFFECTS...');

write('effects', 'light_glow.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 310">
  <defs>
    <radialGradient id="lg" cx="0.5" cy="0.3" r="0.7">
      <stop offset="0%" stop-color="rgba(255,255,200,0.15)"/>
      <stop offset="100%" stop-color="rgba(255,255,200,0)"/>
    </radialGradient>
  </defs>
  <rect width="220" height="310" rx="12" fill="url(#lg)"/>
</svg>`);

write('effects', 'rose1.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs><radialGradient id="r1" cx="0.5" cy="0.5"><stop offset="0%" stop-color="#ff88aa"/><stop offset="100%" stop-color="#cc3366"/></radialGradient></defs>
  <g transform="translate(12,12)">
    <ellipse rx="4" ry="8" fill="url(#r1)" opacity="0.7"/>
    <ellipse rx="4" ry="8" fill="url(#r1)" opacity="0.6" transform="rotate(60)"/>
    <ellipse rx="4" ry="8" fill="url(#r1)" opacity="0.5" transform="rotate(120)"/>
    <circle r="3" fill="#ffaacc" opacity="0.5"/>
  </g>
</svg>`);

write('effects', 'rose2.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs><radialGradient id="r2" cx="0.5" cy="0.5"><stop offset="0%" stop-color="#ffaacc"/><stop offset="100%" stop-color="#aa2255"/></radialGradient></defs>
  <g transform="translate(12,12)">
    <ellipse rx="3" ry="7" fill="url(#r2)" opacity="0.6"/>
    <ellipse rx="3" ry="7" fill="url(#r2)" opacity="0.5" transform="rotate(45)"/>
    <ellipse rx="3" ry="7" fill="url(#r2)" opacity="0.4" transform="rotate(90)"/>
    <ellipse rx="3" ry="7" fill="url(#r2)" opacity="0.3" transform="rotate(135)"/>
    <circle r="2.5" fill="#ffccdd" opacity="0.6"/>
  </g>
</svg>`);

write('effects', 'gem1.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
  <defs><linearGradient id="g1" x1="0.3" y1="0" x2="0.7" y2="1"><stop offset="0%" stop-color="#88ccff"/><stop offset="100%" stop-color="#2244aa"/></linearGradient></defs>
  <polygon points="10,2 16,7 14,16 6,16 4,7" fill="url(#g1)" stroke="#112266" stroke-width="0.5"/>
  <polygon points="10,3 14,7 10,9 6,7" fill="rgba(255,255,255,0.2)"/>
  <polygon points="10,9 14,7 13,15" fill="rgba(0,0,0,0.1)"/>
</svg>`);

write('effects', 'gem2.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
  <defs><linearGradient id="g2" x1="0.3" y1="0" x2="0.7" y2="1"><stop offset="0%" stop-color="#88ffaa"/><stop offset="100%" stop-color="#226644"/></linearGradient></defs>
  <polygon points="10,2 18,10 10,18 2,10" fill="url(#g2)" stroke="#114422" stroke-width="0.5"/>
  <polygon points="10,3 16,10 10,10" fill="rgba(255,255,255,0.2)"/>
  <polygon points="10,10 16,10 10,17" fill="rgba(0,0,0,0.1)"/>
</svg>`);

console.log('\n✅ All assets generated!');

// Count files
const dirs = ['frames','backs','stats','icons','crystals','emblems','banners','effects'];
let total = 0;
dirs.forEach(d => {
  const files = fs.readdirSync(path.join(BASE, d));
  total += files.length;
  console.log(`  ${d}: ${files.length} files`);
});
console.log(`\n  Total: ${total} asset files`);
