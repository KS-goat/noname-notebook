'use strict';
const Jianpu=(()=>{
  const C=typeof MusicCore==='undefined'?require('./core.js'):MusicCore;
  const base=c=>28+C.LETTERS.indexOf(C.MAJOR[c.key+7][0]);
  function describe(pitch,acc,c,shift=0){const distance=pitch+shift*7-base(c),degree=((distance%7)+7)%7+1,octave=Math.floor(distance/7),alter=acc-(C.keyMap(c.key)[C.letter(pitch)]||0);return {degree,octave,alter};}
  function rhythm(e){const beats=e.tuplet||e.triplet?192/e.duration*C.dotFactor(C.dots(e))/48:C.ticks(e)/48,short=e.duration>=4;
    if(short)return {tokens:1,lines:Math.max(0,Math.log2(e.duration)-2),dots:C.dots(e),beats};
    const tokens=Math.max(1,Math.floor(beats+1e-7)),fraction=beats-tokens;let dots=0;for(let i=1;i<=3;i++)if(C.close(fraction,1-Math.pow(2,-i)))dots=i;return {tokens,lines:0,dots,beats};
  }
  const keyLabel=c=>'1='+C.MAJOR[c.key+7]+(c.mode==='minor'?'（6='+C.MINOR[c.key+7]+'）':'');
  return {base,describe,rhythm,keyLabel};
})();
if(typeof module==='object'&&module.exports)module.exports=Jianpu;

function syncNotationTools(){const numbered=notation==='jianpu';if(document.body)document.body.dataset.notation=notation;$('notationToggle').textContent=numbered?'简谱':'五线谱';$('toJianpu').hidden=numbered;$('toStaff').hidden=!numbered;$('modeToggle').hidden=numbered;
  $('graceInput').closest?.('label')?.toggleAttribute('hidden',numbered);
  document.querySelectorAll('[data-symbol]').forEach(b=>{b.hidden=numbered&&['arpeggio','glissando','pedal','ottava'].includes(b.dataset.symbol);});$('score').setAttribute?.('aria-label',numbered?'简谱编辑区':'五线谱编辑区');
}
function drawPedalLine(x1,x2,y){return `<text x="${x1}" y="${y}" class="expression-label">Ped.</text><path d="M ${x1+32} ${y-4} H ${Math.max(x1+33,x2)} V ${y-13}" fill="none" stroke="#333"/><path class="symbol-hit" d="M ${x1} ${y-4} H ${x2}"/>`;}
function jianpuUnsupported(){const issues=[];score.measures.forEach((m,mi)=>{const add=(kind,e,index)=>issues.push({kind,mi,id:e?.id||'',text:kind+' · '+(e?score.voices.find(v=>v.id===e.voice)?.name+' · ':'')+'第 '+(mi+1)+' 小节'+(e?'第 '+(index+1)+' 个音符':'')});if(['pizzicato','arco'].includes(m.articulation))add(m.articulation==='pizzicato'?'拨奏':'弓奏');m.events.forEach(e=>{const index=M.events(score,m,e.voice).indexOf(e);if(e.arpeggio)add('琶音',e,index);if(e.glissando)add(e.glissando==='wavy'?'波浪滑音':'直线滑音',e,index);if(e.pedal)add('踏板',e,index);if(['pizzicato','arco'].includes(e.articulation))add(e.articulation==='pizzicato'?'拨奏':'弓奏',e,index);});});return issues;}
function requestNotation(next){if(next===notation)return;closeScoreSetting();hideMenu();cancelGesture();const issues=next==='jianpu'?jianpuUnsupported():[];if(issues.length){$('conversionList').innerHTML=issues.map(i=>`<li>${escapeXml(i.text)}</li>`).join('');$('conversionDialog').showModal();return;}convertNotation(next);}
function convertNotation(next){try{let converted=JSON.parse(snapshot());const score=converted;
  if(next==='jianpu'){
    const resolved=new Map(M.resolved(score).map(n=>[n.e.id,n]));score.measures.forEach((m,mi)=>{m.events.forEach(e=>{const n=resolved.get(e.id),shift=e.ottava||m.octaves?.[e.voice]||0,tones=M.tones(e);if(tones.some(t=>t.pitch+shift*7<0||t.pitch+shift*7>66)||(e.graceNotes||[]).some(g=>g.pitch+shift*7<0||g.pitch+shift*7>66))throw Error('转换后的音高超出支持范围，请先调整八度线。');if(e.type==='note'){e.pitch+=shift*7;e.accidental=n.tones[0].acc;e.chord=tones.slice(1).map((t,i)=>({...t,pitch:t.pitch+shift*7,accidental:n.tones[i+1].acc}));e.graceNotes=(e.graceNotes||[]).map((g,i)=>({...g,pitch:g.pitch+shift*7,accidental:n.graces[i].acc}));}e.ottava=0;e.arpeggio='';e.arpeggioGroup='';e.glissando='';e.glissTo='';e.pedal=false;e.pedalTo='';if(['pizzicato','arco'].includes(e.articulation))e.articulation='';});m.octaves={};if(['pizzicato','arco'].includes(m.articulation))m.articulation='';});
    M.resolved(score).forEach(n=>{n.tones.forEach(t=>{if(t.redundant){if(t.toneIndex)n.e.chord[t.toneIndex-1].accidental=null;else n.e.accidental=null;}});});
  }
  score.notation=next;$('conversionDialog').close();openConvertedScore(converted);}catch(e){toast(e.message);}}
function filterJianpuMenu(){if(notation!=='jianpu')return;document.querySelectorAll('#contextMenu .menu-category').forEach(cat=>{const label=cat.querySelector('.menu-category-title')?.textContent?.replace('›','').trim();if(['琶音','滑音','符梁','八度线','当前声部谱号','调式'].includes(label))cat.remove();});document.querySelectorAll('#contextMenu [data-prop="articulation"]').forEach(b=>{if(['pizzicato','arco'].includes(JSON.parse(b.dataset.value)))b.remove();});}
function appendKeyboardNote(digit,central=false){
  if(!central&&jianpuChordTarget&&selectedNotes.size===1&&selectedNotes.has(jianpuChordTarget)){
    const f=findNote(jianpuChordTarget);if(!f)return;if(digit===0){if(f.e.type==='note')cycleNote(f.e.id);jianpuChordTarget=null;return;}
    const c=config(f.mi,f.e.voice),pitch=Jianpu.base(c)+digit-1+jianpuOctave*7-M.clefShift({clef:c.clef})*7;if(pitch<0||pitch>66){toast('音高超出支持范围。');return;}
    commit(()=>{if(f.e.type==='rest'){f.e.type='note';f.e.pitch=pitch;f.e.chord=[];f.e.placeholder=false;putNoteSelection(f.e.id);}else{if(f.e.chord.length>=31)throw Error('一个声部内最多 32 组音符。');f.e.chord.push({pitch,accidental:null,singerLayer:true});putNoteSelection(f.e.id,new Set([f.e.chord.length]));}});return;
  }
  let mi=currentMeasure,voice=activeVoice,beforeId=jianpuCursor?.mi===mi?jianpuCursor.beforeId:null;
  const used=M.events(score,score.measures[mi],voice).filter(e=>!e.placeholder).reduce((n,e)=>n+M.ticks(e),0);if(!beforeId&&used>=M.capacity(score,mi)-M.EPS)mi++;
  const c=M.settings(score,Math.min(mi,score.measures.length-1),voice),pitch=central?28-M.clefShift({clef:c.clef})*7-(score.measures[mi]?.octaves?.[voice]||0)*7:Jianpu.base(c)+Math.max(0,digit-1)+jianpuOctave*7-M.clefShift({clef:c.clef})*7;
  if(pitch<0||pitch>66){toast('音高超出支持范围。');return;}
  const sequence=score.measures.slice(0,mi+1).flatMap(m=>M.events(score,m,voice)).filter(e=>!e.placeholder),beforeIndex=beforeId?sequence.findIndex(e=>e.id===beforeId):-1,previous=(beforeIndex>=0?sequence.slice(0,beforeIndex):sequence).at(-1);let rhythm={duration:defaults.duration,dots:defaults.dots};if(!central&&!jianpuRhythmOverride&&previous){const r=M.fragment(M.ticks(previous));rhythm={duration:r.duration,dots:r.dots,exactTicks:r.exactTicks};}if(central)rhythm={duration:4,dots:0,exactTicks:null};
  commit(()=>{if(mi>=score.measures.length){if(score.measures.length>=300)throw Error('最多 300 小节。');const prior=config(score.measures.length-1),clefs={};score.voices.forEach(v=>clefs[v.id]=config(score.measures.length-1,v.id).clef);score.measures.push(M.measure({key:prior.key,mode:prior.mode,meter:[...prior.meter],bpm:prior.bpm,clefs}));}focusMeasure(mi,voice);clearPlaceholders(mi,voice);const es=score.measures[mi].events,at=beforeId?es.findIndex(e=>e.id===beforeId):-1;
    const e=M.event(pitch,{...inputDefaults(),...rhythm,voice,type:!central&&digit===0?'rest':'note'});if(central){const prior=M.resolved(score).filter(n=>n.mi===mi&&n.voice===voice).flatMap(n=>n.tones).filter(t=>t.pitch===pitch).at(-1)?.acc??M.keyMap(c.key)[M.letter(pitch)]??0;e.accidental=prior===0?null:0;}
    es.splice(at<0?es.length:at,0,e);staffLastInputId=e.id;clearSelection();defaults.duration=e.duration;defaults.dots=e.dots;defaults.exactTicks=e.exactTicks??null;jianpuCursor={mi,beforeId:beforeId||null};jianpuChordTarget=null;jianpuRhythmOverride=false;revealedVoice=voice;
  });$('score').focus({preventScroll:true});
}
function jianpuClick(event){if(Date.now()<suppressClickUntil)return;hideMenu();const t=targetAt(event.target),point=coordinates(event),add=event.ctrlKey||event.metaKey;if(symbolTool&&t){placeSymbol(t);return;}const label=event.target.closest('.voice-label');if(label){activeVoice=label.dataset.voice;revealedVoice=activeVoice;clearSelection();jianpuChordTarget=null;jianpuCursor=null;render();return;}if(!point)return;
  if(t?.type==='note'){const index=t.toneIndex??toneIndexAt(notePositions.get(t.id),point);select(t.id,add,index);jianpuChordTarget=selectedNotes.has(t.id)?t.id:null;const f=findNote(t.id),n=M.resolved(score).find(n=>n.e.id===t.id),tone=n?.tones[index];if(tone)jianpuOctave=Jianpu.describe(tone.pitch,tone.acc,config(f.mi,f.e.voice),n.shift).octave;t.toneIndex=index;queueHoverMenu(t,event.clientX,event.clientY);}
  else if(t?.type==='symbol'){selectSymbol(t,add);jianpuChordTarget=null;queueHoverMenu(t,event.clientX,event.clientY);}else if(t?.type==='measure'){const g=geometry.find(g=>g.mi===t.mi&&g.voice===t.voice);selectMeasure(t.mi,t.voice,add);jianpuChordTarget=null;jianpuCursor={mi:t.mi,beforeId:g?.positions.find(p=>p.x>point.x&&!p.e.placeholder)?.e.id||null};queueHoverMenu(t,event.clientX,event.clientY);}else{clearSelection();jianpuChordTarget=null;render();}$('score').focus({preventScroll:true});
}
function setJianpuTicks(e,ticks){if(!Number.isFinite(ticks)||ticks<=M.EPS||ticks>3072)throw Error('时值超出支持范围。');const rhythm=M.fragment(ticks);Object.assign(e,{duration:rhythm.duration,dots:rhythm.dots,dotted:false,exactTicks:rhythm.exactTicks,triplet:false,tuplet:null,positionRatio:null,placeholder:false});}
function detachJianpuTuplets(list){const groups=new Set(list.map(e=>e.tuplet?.id).filter(Boolean));if(groups.size)score.measures.flatMap(m=>m.events).filter(e=>groups.has(e.tuplet?.id)).forEach(e=>setJianpuTicks(e,M.ticks(e)));}
function previousJianpuNote(){const beforeId=jianpuCursor?.mi===currentMeasure?jianpuCursor.beforeId:null,sequence=score.measures.slice(0,currentMeasure+1).flatMap(m=>M.events(score,m,activeVoice)).filter(e=>!e.placeholder),at=beforeId?sequence.findIndex(e=>e.id===beforeId):-1;return (at>=0?sequence.slice(0,at):sequence).at(-1);}
function jianpuEnter(){
  if(notation!=='jianpu')return;hideMenu();cancelGesture();const selectedEvents=selectedList();
  if(selectedNotes.size>=2){
    const voice=selectedEvents[0]?.voice;if(!voice||selectedEvents.length!==selectedNotes.size||selectedEvents.some(e=>e.voice!==voice)){toast('请选择同一声部中相邻的同音音符。');return;}
    const part=M.resolved(score).filter(n=>n.voice===voice),chosen=part.filter(n=>selectedNotes.has(n.e.id)),first=chosen[0],last=chosen.at(-1),signature=n=>n.e.type==='rest'?'rest':n.tones.map(t=>[t.pitch+n.shift*7,t.acc].join(':')).sort().join(',');
    if(chosen.some((n,i)=>i&&(n.sequence!==chosen[i-1].sequence+1||n.mi!==chosen[i-1].mi&&(n.mi!==chosen[i-1].mi+1||!M.close(chosen[i-1].beat+M.ticks(chosen[i-1].e),M.capacity(score,chosen[i-1].mi)))))){toast('所选音符不相邻，请连续选择，中间不能跳过音符或空拍。');return;}
    if(chosen.some(n=>signature(n)!==signature(first))){toast('只能合并相同音高、八度和升降记号的音符；叠放组也须相同。');return;}
    if(chosen.some(n=>n.e.type==='note'&&selectedIndices(n.e).size!==n.tones.length)){toast('合唱分组共用时值，请选中完整的叠放组再合并。');return;}
    const total=chosen.reduce((sum,n)=>sum+M.ticks(n.e),0),removed=new Set(chosen.slice(1).map(n=>n.e.id)),next=part[last.sequence+1],merged=first.e,originalTones=new Map(part.map(n=>[n.e.id,n.tones]));
    commit(()=>{
      detachJianpuTuplets(chosen.map(n=>n.e));setJianpuTicks(merged,total);merged.tie=last.e.tie;
      merged.lyric=[...new Set(chosen.map(n=>n.e.lyric).filter(Boolean))].join(' ').slice(0,80);
      for(const key of ['dynamic','expression','articulation','ornament','slur'])if(!merged[key])merged[key]=chosen.find(n=>n.e[key])?.e[key]||'';
      merged.graceNotes=chosen.flatMap(n=>(n.e.graceNotes||[]).map((g,i)=>({...g,accidental:n.graces[i].acc})));if(merged.graceNotes.length>16)throw Error('合并后的倚音超过 16 个，请先减少倚音。');
      for(const key of ['hairpin','glissando','pedal']){const ref=key==='hairpin'?'hairpinTo':key==='pedal'?'pedalTo':'glissTo',later=chosen.slice(1).find(n=>n.e[key]);if(!merged[key]&&later){merged[key]=later.e[key];merged[ref]=later.e[ref];}}
      score.measures.forEach(m=>m.events=m.events.filter(e=>!removed.has(e.id)));
      const corrected=new Map();M.resolved(score).filter(n=>n.voice===voice).forEach(n=>{n.tones.forEach((t,i)=>{const original=originalTones.get(n.e.id)?.[i];if(original&&original.acc!==t.acc){if(i)n.e.chord[i-1].accidental=original.acc;else n.e.accidental=original.acc;if(!corrected.has(n.e.id))corrected.set(n.e.id,new Set());corrected.get(n.e.id).add(i);}});});
      if(corrected.size)M.resolved(score).filter(n=>corrected.has(n.e.id)).forEach(n=>n.tones.forEach((t,i)=>{if(corrected.get(n.e.id).has(i)&&t.redundant){if(i)n.e.chord[i-1].accidental=null;else n.e.accidental=null;}}));
      score.measures.flatMap(m=>m.events).forEach(e=>{for(const ref of ['hairpinTo','glissTo','pedalTo'])if(removed.has(e[ref]))e[ref]=merged.id;if(e.hairpinTo===e.id){e.hairpin='';e.hairpinTo='';}if(e.glissTo===e.id){e.glissando='';e.glissTo='';}if(e.pedalTo===e.id){e.pedal=false;e.pedalTo='';}});
      const slurs=new Map();score.measures.flatMap(m=>m.events).forEach(e=>{if(e.slur){if(!slurs.has(e.slur))slurs.set(e.slur,[]);slurs.get(e.slur).push(e);}});slurs.forEach(es=>{if(es.length<2)es.forEach(e=>e.slur='');});
      focusMeasure(first.mi,voice);clearSelection();putNoteSelection(merged.id);jianpuCursor={mi:first.mi,beforeId:next?.mi===first.mi?next.e.id:null};jianpuChordTarget=null;jianpuRhythmOverride=false;defaults.duration=merged.duration;defaults.dots=merged.dots;defaults.exactTicks=merged.exactTicks??null;
    });
  }else{
    const previous=selectedEvents[0]||previousJianpuNote();if(!previous){toast('请先输入音符或休止符。');return;}const ticks=M.ticks(previous)+48;
    commit(()=>{detachJianpuTuplets([previous]);setJianpuTicks(previous,ticks);defaults.duration=previous.duration;defaults.dots=previous.dots;defaults.exactTicks=previous.exactTicks??null;jianpuRhythmOverride=false;});
  }
  $('score').focus({preventScroll:true});
}
function handleScoreKeydown(event){if(event.key==='Escape'&&(!$('helpMenu').hidden||!$('scoreList').hidden)){event.preventDefault();closeHelpMenu();closeScoreList();return;}if(document.querySelector('dialog[open]'))return;const field=event.target.closest?.('[data-score-setting]');if(field&&['Enter',' '].includes(event.key)){event.preventDefault();openScoreSetting(field,null);return;}const text=event.target.matches('input,select,textarea');if(event.key==='Tab'&&event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();switchEditor(notation==='staff'?'jianpu':'staff');return;}if(event.key==='Tab'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&notation==='staff'){event.preventDefault();toggleMode();return;}if(text)return;
  if(event.key==='Escape'){event.preventDefault();cancelGesture();symbolTool=null;symbolStart=null;jianpuChordTarget=null;clearSelection();render();return;}
  if(event.ctrlKey||event.metaKey){if(event.key.toLowerCase()==='z'){event.preventDefault();history(event.shiftKey?1:-1);}if(event.key.toLowerCase()==='y'){event.preventDefault();history(1);}return;}
  if(['p','s'].includes(event.key.toLowerCase())&&!event.altKey){event.preventDefault();if(!event.repeat){if(event.key.toLowerCase()==='p')play();else stop();}return;}if(['PageUp','PageDown'].includes(event.key)){event.preventDefault();pageScore(event.key==='PageUp'?-1:1);return;}if(notation==='jianpu'&&event.key==='Enter'){event.preventDefault();if(event.shiftKey)changeJianpuBeat(-1);else jianpuEnter();return;}
  if(notation==='jianpu'&&/^[0-7]$/.test(event.key)){event.preventDefault();appendKeyboardNote(Number(event.key));return;}
  if(mode==='select'&&(event.key==='Delete'||event.key==='Backspace')){event.preventDefault();deleteSelected();jianpuChordTarget=null;}
  if(['ArrowUp','ArrowDown'].includes(event.key)&&(mode==='select'||notation==='jianpu')){event.preventDefault();const amount=event.key==='ArrowUp'?1:-1;if(notation==='jianpu'&&!selectedNotes.size)jianpuOctave=Math.max(-4,Math.min(4,jianpuOctave+amount));else movePitch(amount*(notation==='jianpu'?7:1));}
  if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();if(mode==='select')scaleDuration(event.key==='ArrowLeft'?.5:2);else if(notation==='staff')scaleRecentDuration(event.key==='ArrowLeft'?.5:2);}
  if(event.code==='Space'||event.key===' '){event.preventDefault();if(notation==='jianpu')changeJianpuBeat(0,true);else if(mode==='edit')appendKeyboardNote(1,true);}
}
function renderJianpu(){
  const prefix=125,layouts=score.measures.map(measureLayout),w=Math.max(660,$('score').clientWidth,...layouts.map(l=>l.min+prefix+22)),rows=[];let row=[],occupied=prefix+22;
  layouts.forEach((layout,mi)=>{if(row.length&&occupied+layout.min>w){rows.push(row);row=[];occupied=prefix+22;}row.push({mi,layout});occupied+=layout.min;});if(row.length)rows.push(row);
  const resolved=new Map(M.resolved(score).map(n=>[n.e.id,n]));geometry=[];notePositions=new Map();const out=[];let offset=0;
  rows.forEach((row,ri)=>{const visible=voicesForRow(row),extra=(w-prefix-22-row.reduce((sum,p)=>sum+p.layout.min,0))/row.length;let x=prefix;
    const bars=row.map(p=>{const width=p.layout.min+extra,start=x,end=x+width,points=p.layout.points,space=width-46-points.reduce((n,p)=>n+p.width,0),weights=points.reduce((n,p)=>n+p.weight,0)||1,xmap=new Map();let at=start+23;points.forEach(p=>{xmap.set(beatKey(p.beat),at+p.left);at+=p.width+space*p.weight/weights;});x=end;return {...p,start,end,width,xmap};});
    const c=config(row[0].mi,visible[0].id);out.push(drawNumberSettings(row[0].mi,visible.find(v=>v.id===activeVoice)?.id||visible[0].id,prefix,offset+24));offset+=38;const repeatY=offset+88;
    visible.forEach((v,vi)=>{const all=row.flatMap(({mi})=>M.events(score,score.measures[mi],v.id)),layers=Math.max(1,...all.map(e=>M.tones(e).length)),dots=Math.max(1,...all.flatMap(e=>{const n=resolved.get(e.id);return n.tones.map(t=>Math.abs(Jianpu.describe(t.pitch,t.acc,config(n.mi,v.id),n.shift).octave));})),top=offset+74+Math.min(4,dots)*5,base=top+(layers-1)*48+9,annotationY=base+40+Math.min(4,dots)*5,lyricY=annotationY+24,rowEnd=lyricY+27;
      out.push(`<g data-voice="${v.id}" class="voice-label"><text x="${prefix-18}" y="${top+5}" text-anchor="end" font-size="12" fill="${v.id===activeVoice?'#38624f':'#7a8178'}">${escapeXml(v.name)}</text></g>`);
      bars.forEach(bar=>{const {mi,start,end,width,xmap}=bar,m=score.measures[mi],c=config(mi,v.id),positions=[];let beat=0;
        out.push(`<g class="measure${selectedMeasureVoices.get(m.id)?.has(v.id)?' selected-measure':''}" data-measure="${mi}" data-part="${v.id}"><rect class="measure-click" data-mi="${mi}" data-voice="${v.id}" x="${start}" y="${offset+4}" width="${width}" height="${rowEnd-offset-8}"/>`);
        if(vi===0)out.push(`<text class="measure-number" x="${start+4}" y="${offset+15}">${mi+1}</text>`);if(mi!==row[0].mi&&(config(mi-1,v.id).key!==c.key||config(mi-1,v.id).mode!==c.mode||config(mi-1,v.id).meter.join('/')!==c.meter.join('/')))out.push(scoreSettingGraphic('key',mi,v.id,`<text class="jianpu-key" x="${start+15}" y="${offset+14}">${escapeXml(Jianpu.keyLabel(c))}</text>`,start+11,offset-4,Math.max(65,Jianpu.keyLabel(c).length*10),24),scoreSettingGraphic('meter',mi,v.id,`<text class="jianpu-key" x="${end-40}" y="${offset+14}">${c.meter.join('/')}</text>`,end-44,offset-4,42,24));
        if(m.dynamic||m.expression)out.push(`<text class="expression-label" x="${start+27}" y="${offset+30}">${escapeXml([m.dynamic,m.expression].filter(Boolean).join(' '))}</text>`);
        out.push(drawArticulationSymbol(m.articulation,start+27,offset+31,{mi}));
        M.events(score,m,v.id).forEach((e,ei)=>{const n=resolved.get(e.id),px=xmap.get(beatKey(beat)),rhythm=Jianpu.rhythm(e),tokenXs=Array.from({length:rhythm.tokens},(_,i)=>xmap.get(beatKey(beat+i*(e.tuplet||e.triplet?M.ticks(e)/rhythm.tokens:48)))??px+i*32),p={e,x:px,tokenXs,y:base-9,beat,mi,ei,voice:v.id,base,top,annotationY,lyricY,ri,offset,end,start,bottomPitch:0,downOct:false,rowEnd,header:0,headYs:[],headBoxes:[],down:true,stemX:px+7,stemStart:base,stemEnd:top-18,rowEnd};beat+=M.ticks(e);out.push(drawJianpuNote(p,n,c));positions.push(p);notePositions.set(e.id,p);});
        geometry.push({mi,voice:v.id,start,end,header:0,top,base,offset,rowEnd,positions,bottomPitch:0});drawJianpuGroups(positions,out,c.meter);
        if(!positions.length)out.push(`<text x="${start+35}" y="${base}" class="jianpu-rest">0</text>`);
        if(!M.close(beat,M.capacity(score,mi)))out.push(`<text class="measure-status" x="${end-8}" y="${lyricY+16}" text-anchor="end">${M.fmt(beat/48)} / ${M.fmt(M.capacity(score,mi)/48)} 拍</text>`);
        if(m.hairpins?.[v.id])out.push(`<g ${symbolAttrs('measureHairpin',mi,v.id)}>${wedgePath(start+27,end-20,annotationY+9,m.hairpins[v.id].kind)}</g>`);
        if(m.repeatStart&&vi===0)out.push(`<g ${symbolAttrs('repeatStart',mi)}><rect class="symbol-hit-box" x="${start}" y="${repeatY-30}" width="19" height="45"/><text class="jianpu-repeat" x="${start+2}" y="${repeatY}" font-size="27">𝄆</text></g>`);
        if(m.repeatEnd&&vi===0)out.push(`<g ${symbolAttrs('repeatEnd',mi)}><rect class="symbol-hit-box" x="${end-20}" y="${repeatY-30}" width="20" height="45"/><text class="jianpu-repeat" x="${end-17}" y="${repeatY}" font-size="27">𝄇</text></g>`);
        if(m.ending&&vi===0)out.push(`<g ${symbolAttrs('ending',mi)}><path d="M ${start+2} ${offset+8} V ${offset} H ${end-2} V ${offset+8}" fill="none" stroke="#333"/><path class="symbol-hit" d="M ${start+2} ${offset} H ${end-2}"/><text x="${start+9}" y="${offset+10}" font-size="11">${escapeXml(m.ending)}.</text></g>`);
        if(m.navigation&&vi===0)out.push(`<g ${symbolAttrs('navigation',mi)}><text x="${end-5}" y="${offset+13}" text-anchor="end" font-size="12">${escapeXml(navNames[m.navigation])}</text></g>`);
        out.push(line(end,top-18,end,base+18,'barline'));if(mi===score.measures.length-1)out.push(line(end-4,top-18,end-4,base+18,'barline'));out.push('</g>');
      });offset=rowEnd;
    });offset+=22;
  });drawSpans(out,prefix,w,resolved);$('score').innerHTML=`<svg xmlns="${NS}" style="width:${w}px;max-width:none" viewBox="0 0 ${w} ${Math.max(230,offset)}" role="img" aria-label="${escapeXml(score.title)} · 简谱">${out.join('')}<g id="ghost" class="ghost"></g></svg>`;
}
function drawJianpuNote(p,n,c){const e=p.e,rhythm=Jianpu.rhythm(e),tones=e.type==='rest'?[{pitch:e.pitch,acc:0,toneIndex:0}]:[...n.tones].sort((a,b)=>b.pitch-a.pitch),out=[];
  out.push(`<g class="note-group ${isWholeSelected(e.id)?'selected':selectedNotes.has(e.id)?'partial-selected':''}" data-id="${e.id}" data-note-voice="${e.voice}" role="button" aria-label="${escapeXml(n.name)}"><title>${escapeXml(n.voiceName+' · '+n.name)}</title>`);
  tones.forEach((t,index)=>{const y=p.base-(tones.length-1-index)*48,info=e.type==='rest'?{degree:0,octave:0,alter:0}:Jianpu.describe(t.pitch,t.acc,c,n.shift),hx=p.x+7;p.headYs.push(y-9);p.headBoxes.push({x:hx,y:y-9,pitch:t.pitch,toneIndex:t.toneIndex,rest:e.type==='rest'});if(t.toneIndex===0)p.y=y-9;
    out.push(`<g class="tone-group${isToneSelected(e.id,t.toneIndex)?' selected-tone':''}" data-tone-index="${t.toneIndex}"><ellipse class="tone-halo" cx="${hx}" cy="${y-9}" rx="13" ry="17"/>`);
    const explicit=e.type==='note'&&M.tones(e)[t.toneIndex].accidental!==null&&!t.redundant;if(explicit)out.push(`<text class="jianpu-accidental note-ink" x="${p.x-16}" y="${y-1}">${escapeXml(M.ACC[info.alter]||(info.alter===3?'𝄪♯':'𝄫♭'))}</text>`);
    for(let i=0;i<rhythm.tokens;i++)out.push(`<text class="jianpu-digit note-ink" x="${p.tokenXs[i]}" y="${y}">${i===0||e.type==='rest'?info.degree:'—'}</text>`);
    out.push(`<rect class="number-hit" x="${p.x-3}" y="${y-23}" width="${Math.max(19,p.tokenXs.at(-1)-p.x+19)}" height="28"/>`);
    for(let dot=0;dot<rhythm.dots;dot++)out.push(`<circle class="note-ink" cx="${p.tokenXs.at(-1)+21+dot*6}" cy="${y-8}" r="1.9"/>`);
    for(let octave=0;octave<Math.abs(info.octave);octave++)out.push(`<circle class="note-ink octave-dot" cx="${hx}" cy="${info.octave>0?y-30-octave*6:y+14+rhythm.lines*4+octave*6}" r="1.8"/>`);
    for(let level=1;level<=rhythm.lines;level++)out.push(line(p.x-1,y+5+level*4,p.x+16,y+5+level*4,'note-ink','stroke-width="1.2"'));out.push('</g>');
  });p.stemStart=Math.max(...p.headYs);p.stemEnd=Math.min(...p.headYs)-15;
  out.push(drawArticulationSymbol(e.articulation,p.x,Math.min(...p.headYs)-34,{mi:p.mi,id:e.id}));if(e.ornament)out.push(glyph({trill:'\uE566',mordent:'\uE56D',turn:'\uE567'}[e.ornament],p.x-3,Math.min(...p.headYs)-46,30));
  if(e.dynamic)out.push(`<text class="notation-label" x="${p.x+7}" y="${p.annotationY}" text-anchor="middle">${escapeXml(e.dynamic)}</text>`);if(e.expression)out.push(`<text class="expression-label" x="${p.x+7}" y="${Math.min(...p.headYs)-50}" text-anchor="middle">${escapeXml(e.expression)}</text>`);
  if(e.lyric&&e.type==='note')out.push(`<text class="lyrics" x="${p.x+7}" y="${p.lyricY}" text-anchor="middle">${escapeXml(e.lyric)}</text>`);
  if(e.exactTicks!==null&&e.exactTicks!==undefined)out.push(`<text x="${p.x+7}" y="${p.annotationY-13}" font-size="8">${M.fmt(M.ticks(e)/48)}拍</text>`);
  (e.graceNotes||[]).forEach((g,i)=>{const info=Jianpu.describe(g.pitch,n.graces[i].acc,c,n.shift),gx=p.x-14-(e.graceNotes.length-i)*13,gy=Math.min(...p.headYs)-12;out.push(`<g ${symbolAttrs('grace',p.mi,e.id,g.id)} data-grace-id="${g.id}"><text class="jianpu-grace" x="${gx}" y="${gy}">${info.alter?escapeXml(M.ACC[info.alter]):''}${info.degree}</text><rect class="number-hit" x="${gx-2}" y="${gy-17}" width="13" height="21"/>`);for(let k=0;k<Math.abs(info.octave);k++)out.push(`<circle cx="${gx+4}" cy="${info.octave>0?gy-20-k*4:gy+6+k*4}" r="1.1"/>`);out.push('</g>');});out.push('</g>');return out.join('');}
function drawJianpuGroups(positions,out,meter){const map=new Map(positions.map(p=>[p.e.id,p]));M.beamGroups(positions.map(p=>p.e),meter).forEach(group=>{const ps=group.map(e=>map.get(e.id));for(let level=1;level<=Math.max(...ps.map(p=>Jianpu.rhythm(p.e).lines));level++){for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i];if(Jianpu.rhythm(a.e).lines<level||Jianpu.rhythm(b.e).lines<level||a.headBoxes.length!==b.headBoxes.length)continue;a.headBoxes.forEach((h,j)=>out.push(line(h.x-7,h.y+14+level*4,b.headBoxes[j].x+9,b.headBoxes[j].y+14+level*4,'note-ink','stroke-width="1.2" pointer-events="none"')));}}});
  const groups=new Map();positions.forEach(p=>{if(p.e.tuplet){if(!groups.has(p.e.tuplet.id))groups.set(p.e.tuplet.id,[]);groups.get(p.e.tuplet.id).push(p);}});groups.forEach(ps=>{const a=ps[0],b=ps.at(-1),y=Math.min(...ps.flatMap(p=>p.headYs))-39,mid=(a.x+b.x)/2;out.push(`<g ${symbolAttrs('tuplet',a.mi,a.e.id)}><path d="M ${a.x-3} ${y+5} V ${y} H ${mid-8} M ${mid+8} ${y} H ${b.x+17} V ${y+5}" fill="none" stroke="#333"/><path class="symbol-hit" d="M ${a.x-3} ${y} H ${b.x+17}"/><text x="${mid}" y="${y+4}" text-anchor="middle" font-size="12">${a.e.tuplet.count}</text></g>`);});
}
