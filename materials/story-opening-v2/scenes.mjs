const old = '../story-opening-v1/';
const approved = '../story-conflict-v2/';
const picture = (name) => ({ asset: `${approved}${name}.webp`, original: `${approved}originals/${name}.png` });

// Thirteen reader-controlled beats; reach and appraisal are one continuous clip.
export const scenes = [
  { id: 'arrival', title: '挑中好魚', speaker: 'ミーミー', tone: 'chef', text: '老闆，我要這兩尾紅色的魚！\n這麼大，做成炸魚排一定很好吃。', lead: 450, transition: 'soft', asset: `${old}art/01-selecting-fish.webp`, original: `${old}originals/01-selecting-fish.png`, alt: '女主角指著冰上的兩尾紅色魚，期待著用它們做出炸魚排。' },
  { id: 'appraisal', title: '停手、收手與質疑', speaker: '魚店老闆', tone: 'owner', text: '………………炸魚排？？？', lead: 0, transition: 'cut', asset: './motion/owner-hand-return-first-v4.webp', original: '../story-owner-return-flow-v1/end.png', clip: { src: './motion/owner-hand-return-v5.mp4', poster: './motion/owner-hand-return-first-v4.webp', still: './motion/owner-hand-return-held-v4.webp', lockAdvance: true, alt: '手部特寫保留原本起手節奏；伸到一半定格一秒半後，切至原速的收手抬眼鏡頭。', cues: [{ at: 0.7, text: '………………' }, { at: 4.85, text: '………………炸魚排？？？' }] }, alt: '保留原本等待與伸手的節奏，只讓手部特寫伸到一半的定格多停一會，再接原有收手抬眼的鏡頭；兩段連續播放，不需中途翻頁。' },
  { id: 'size-question', holdClipFrom: 'appraisal', title: '只看尺寸？', speaker: '魚店老闆', tone: 'owner', text: '妳挑魚，就只會看尺寸而已嗎？', lead: 0, transition: 'hold', asset: './motion/owner-hand-return-held-v4.webp', original: '../story-owner-return-flow-v1/end.png', alt: '延續動畫最後一格，老闆扶著木框質問女主角。' },
  { id: 'dismissal', title: '被看輕了', speaker: '魚店老闆', tone: 'owner', text: '這批魚，我只想賣給懂料理的人。', lead: 220, transition: 'cut', asset: './art/M-owner-stern-closeup.webp', original: './originals/M-owner-stern-closeup.png', alt: '低角度近臉特寫，老闆壓低眉頭、嚴厲地看著女主角，拒絕把這批魚賣給她。' },
  { id: 'ordinary-fish', title: '這些就可以了', speaker: '魚店老闆・畫外', tone: 'owner', text: '妳的話，這些就可以了。', lead: 160, transition: 'cut', compact: true, asset: './art/K-pointing-value-fish-v2.webp', original: './originals/K-pointing-value-fish-v2.png', alt: '老闆的手收在右上方，隨意指向整批平價銀色魚貨，指尖懸空、不碰魚。' },
  { id: 'retort', title: '我可是廚師', speaker: 'ミーミー', tone: 'chef', text: '我可是廚師！就是要做出好料理，\n才來買最好的魚啊！', lead: 120, transition: 'cut', ...picture('B-retort'), alt: '女主角皺眉握拳，抬頭向老闆反駁。' },
  { id: 'pride', title: '老闆的火氣', speaker: '魚店老闆', tone: 'owner', text: '一個小女孩，口氣倒是不小！\n妳根本不知道我們多辛苦，\n才有這些好魚貨。', lead: 160, transition: 'cut', asset: './art/N-owner-pride.webp', original: './originals/N-owner-pride.png', alt: '從女主角肩後仰看老闆的中近景：他壓眉前傾、撐住木攤回嗆，還未舉手挑戰。' },
  { id: 'challenge', title: '有本事就試試', speaker: '魚店老闆', tone: 'owner', text: '有本事，\n妳自己去釣來看看啊！', lead: 220, transition: 'cut', ...picture('C-challenge'), alt: '切到較遠的側面雙人鏡頭，老闆舉起拇指指向港口，正式要女主角自己去釣魚來。' },
  { id: 'accepted', title: '接下挑戰', speaker: 'ミーミー', tone: 'chef', text: '好啊！釣就釣！\n我就親手釣回來，做出讓你心服口服的料理！', lead: 90, transition: 'cut', ...picture('D-accept-challenge'), alt: '女主角雙手撐住攤緣，帶著怒氣往前頂回老闆的話。' },
  { id: 'bucket', title: '釣具拿去', speaker: '魚店老闆', tone: 'owner', text: '釣具拿去。', lead: 380, transition: 'impact', compact: true, ...picture('G-bucket-impact'), alt: '貼著木板的低角度：老闆大手將水桶用力放下，釣竿斜放前景。' },
  { id: 'grip', title: '握竿接戰', speaker: '魚店老闆・畫外', tone: 'owner', text: '我倒要看看，\n妳能釣到什麼。', lead: 80, transition: 'cut', compact: true, ...picture('H-grip-insert'), alt: '俯視手部特寫，女主角的手握緊軟木竿柄，水桶仍在桌邊。' },
  { id: 'defiance', title: '等著瞧吧', speaker: '', tone: 'silent', text: '', lead: 0, transition: 'cut', ...picture('I-defiant-eyes-v2-model'), alt: '女主角抿嘴壓眉，抬眼瞪回老闆。她還在氣頭上，決心親自證明。' },
  { id: 'departure', title: '親手證明', speaker: '', tone: 'silent', text: '', lead: 0, transition: 'cut', asset: './art/L-angry-departure.webp', original: './originals/L-angry-departure.png', alt: '女主角抿嘴皺眉，握竿提桶大步走向碼頭；老闆在左後方魚攤抱臂看著，海在右側。' },
];
export const assetFor = (scene) => scene.asset;
export const originalFor = (scene) => scene.original;
