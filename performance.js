(function(root,factory){const api=factory(typeof MusicCore==='undefined'?require('./core.js'):MusicCore);if(typeof module==='object'&&module.exports)module.exports=api;else root.MusicPerformance=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
  'use strict';
  const styles={
    dolce:[.85,1.03,.012,3500],cantabile:[1,1.04,.009,6500],espressivo:[1.08,1.02,.008,6500],leggiero:[.85,.72,.003,8500],energico:[1.16,.86,.002,12000],sostenuto:[.95,1.04,.014,5500],maestoso:[1.13,1,.01,8000],grazioso:[.9,.9,.006,6500],
    'con brio':[1.15,.88,.003,10000],'con moto':[1.04,.92,.004,9000],affettuoso:[.9,1.03,.012,5000],amoroso:[.86,1.03,.015,4500],appassionato:[1.2,1.03,.006,9500],agitato:[1.14,.78,.002,12000],animato:[1.08,.86,.003,10000],tranquillo:[.84,1,.018,4000],sereno:[.88,1.01,.014,4500],mesto:[.8,.98,.016,4000],malinconico:[.8,1.01,.019,3800],giocoso:[1.08,.76,.003,10000],scherzando:[.94,.65,.002,10000],risoluto:[1.17,.88,.002,11000],marcato:[1.2,.78,.002,11000],pesante:[1.18,1,.012,5500],brillante:[1.16,.9,.003,14000],semplice:[.97,.94,.005,8000],delicato:[.74,.91,.015,3500],'con fuoco':[1.24,.91,.002,12000],'con spirito':[1.15,.86,.003,11000],'sotto voce':[.65,.96,.022,3000],doloroso:[.8,1,.017,4000],solenne:[1.1,1,.015,6000],nobile:[1.08,1.02,.009,6500],calmo:[.82,1,.018,4000],misterioso:[.7,.94,.024,2700],teneramente:[.76,1.02,.018,3500]
  };
  const art={staccato:[.48,1,.003],staccatissimo:[.25,1,.002],accent:[.88,1.24,.002],marcato:[.7,1.38,.002],tenuto:[1,1,.004],fermata:[1,1,.006],breath:[.78,1,.005],legato:[1.04,1,.006],portato:[.76,.96,.009],pizzicato:[.3,.94,.002],arco:[1.05,.9,.04]};
  function policy(n,s){const expression=n.e.expression||s.measures[n.mi]?.expression||'',style=styles[expression]||[1,.93,.004,10000],a=art[n.articulation];return {velocity:style[0]*(a?.[1]||1),gate:a?.[0]??(n.e.slur&&n.next?.e.slur===n.e.slur?1.04:style[1]),attack:a?.[2]??style[2],brightness:n.articulation==='pizzicato'?4500:n.articulation==='arco'?5500:style[3],fp:n.e.dynamic==='fp'&&!n.rangeContinuation};}
  function brightness(volume,base=10000){return Math.max(900,Math.min(16000,base*(.18+1.6*Math.max(0,Math.min(1,volume)))));}
  function auxiliary(s,n,t,direction){const pitch=t.pitch+direction,key=C.keyMap(C.settings(s,n.mi,n.voice).key),alter=key[C.letter(pitch)]||0;return C.naturalMidi(pitch)+alter+n.shift*12;}
  function notes(s,t=C.timeline(s)){
    const result=[],arpGroups=new Map();t.notes.forEach(n=>{if(n.e.arpeggio&&!n.continuation){const k=n.e.arpeggioGroup?'g:'+n.e.arpeggioGroup+':'+n.occurrence+':'+n.beat:'e:'+n.e.id+':'+n.occurrence;if(!arpGroups.has(k))arpGroups.set(k,[]);n.tones.forEach(tone=>arpGroups.get(k).push({n,tone}));}});
    const delays=new Map();arpGroups.forEach(group=>{group.sort((a,b)=>a.tone.midi-b.tone.midi||a.tone.toneIndex-b.tone.toneIndex);if(group.some(x=>x.n.e.arpeggio==='down'))group.reverse();const shortest=Math.min(...group.map(x=>x.tone.seconds??x.n.seconds)),step=Math.min(.06,shortest*.28/Math.max(1,group.length-1));group.forEach(({n,tone},i)=>delays.set(n.e.id+':'+n.occurrence+':'+tone.toneIndex,i*step));});
    function add(base,start,seconds,midi,extra={}){const p=policy(base,s),offset=Math.max(0,start-base.start),ratio=Math.min(1,offset/Math.max(.001,base.seconds));result.push({...base,...p,midi,start,seconds:Math.max(.004,seconds),soundSeconds:Math.max(.004,seconds*p.gate),volume:base.volume+((base.volumeEnd??base.volume)-base.volume)*ratio,volumeEnd:base.volumeEnd??base.volume,validTie:false,continuation:false,next:null,...extra});}
    t.notes.forEach(n=>{
      if(n.midi===null){result.push({...n,next:null});return;}
      let tail=n,total=n.seconds;const segments=[n];while(tail.validTie&&tail.next){tail=tail.next;total+=tail.seconds;segments.push(tail);}
      const graces=n.continuation?[]:n.graces||[],steal=Math.min((n.stepSeconds??n.seconds)*(graces.some(g=>!g.slash)?.5:.25),graces.length*.09),per=graces.length?steal/graces.length:0;
      graces.forEach((g,i)=>add(n,n.start+i*per,per,g.midi,{grace:true,gate:.85,soundSeconds:per*.85,attack:.002,pedalEnd:null}));
      n.tones.forEach(tone=>{
        if(tone.continuation)return;let toneTail=tone,toneTotal=tone.seconds??n.seconds,toneEnd=n;const toneSegments=[n];while(toneTail.validTie&&toneTail.next){toneEnd=toneTail.next.n;toneTail=toneTail.next.tone;toneTotal+=toneTail.seconds??toneEnd.seconds;toneSegments.push(toneEnd);}const delay=delays.get(n.e.id+':'+n.occurrence+':'+tone.toneIndex)||0,start=n.start+steal+delay,length=Math.max(.01,toneTotal-steal-delay),base={...n,...tone,next:n.next,segments:toneSegments,pedalEnd:Math.max(0,...toneSegments.map(x=>x.pedalEnd||0))||null};
        let target=n.glissTarget||n.next;while(target&&target.sequence>n.sequence&&target.sequence<=n.sequence+(t.notes.length+1)&&n.e.glissTo&&target.e.id!==n.e.glissTo){if(!target.next||target.next.sequence!==target.sequence+1){target=null;break;}target=target.next;}
        if(n.e.glissando&&target&&target.midi!==null&&target.sequence>n.sequence&&target.start>start){
          const endpoint=target.tones.find(x=>x.toneIndex===tone.toneIndex)||target.tones[0],direction=Math.sign(endpoint.midi-tone.midi),pitches=[];
          for(let midi=tone.midi+direction;direction&&direction*(endpoint.midi-midi)>0;midi+=direction)if(n.e.glissando==='straight'||[0,2,4,5,7,9,11].includes(((midi%12)+12)%12))pitches.push(midi);
          if(pitches.length){const span=target.start-start,sweep=Math.min(span*.7,.55),begin=target.start-sweep,unit=sweep/pitches.length;add(base,start,Math.max(.01,begin-start),tone.midi,{glissando:true,soundSeconds:Math.max(.01,begin-start),segments:[]});pitches.forEach((midi,i)=>add(base,begin+i*unit,unit,midi,{glissando:true,soundSeconds:unit*.95,attack:.002,pedalEnd:null,segments:[]}));return;}
        }
        const ornament=n.e.ornament||s.measures[n.mi]?.ornament,upper=auxiliary(s,n,tone,1),lower=auxiliary(s,n,tone,-1);
        if(ornament==='trill'){const count=Math.max(2,Math.min(256,Math.round(length/.09))),unit=length/count;for(let i=0;i<count;i++)add(base,start+i*unit,unit,i%2?upper:tone.midi,{ornament:true,soundSeconds:unit*.96,attack:.002,segments:[]});}
        else if(ornament==='mordent'||ornament==='turn'){const sequence=ornament==='turn'?[upper,tone.midi,lower,tone.midi]:[tone.midi,lower,tone.midi],unit=Math.min(.075,length/sequence.length);sequence.forEach((midi,i)=>{const last=i===sequence.length-1,duration=last?length-i*unit:unit;add(base,start+i*unit,duration,midi,{ornament:true,soundSeconds:last?duration*policy(tail,s).gate:unit*.96,attack:.002,segments:[]});});}
        else add(base,start,length,tone.midi,{soundSeconds:length*policy(toneEnd,s).gate,segments:toneSegments});
      });
    });
    result.sort((a,b)=>a.start-b.start||a.midi-b.midi);return result;
  }
  // Crop musical time before performance expansion so ties, ornaments, grace
  // notes and arpeggios are rebuilt at the selected boundaries.
  function section(s,t,range){
    if(!range?.active)return t;
    const {start,end}=range;
    if(start.mi>end.mi||start.mi===end.mi&&end.beat<=start.beat+C.EPS)throw Error('播放终点须在起点之后。');
    const windows=[];let cursor=0;
    for(const visit of t.visits){
      if(visit.mi<start.mi||visit.mi>end.mi)continue;
      const fromBeat=visit.mi===start.mi?start.beat:0,toBeat=visit.mi===end.mi?end.beat:visit.length;
      const time=beat=>visit.start+(beat+visit.holds.reduce((sum,h)=>sum+(h.beat<=beat+C.EPS?h.extra:0),0))/48*60/visit.bpm;
      const from=time(Math.max(0,Math.min(visit.length,fromBeat))),to=time(Math.max(0,Math.min(visit.length,toBeat)));
      if(to<=from)continue;
      windows.push({occurrence:visit.occurrence,from,to,start:cursor,seconds:to-from,mi:visit.mi,pass:visit.pass});cursor+=to-from;
    }
    const pedalTime=(time,index)=>{let window=windows[index];while(index+1<windows.length&&time>window.to+C.EPS&&C.close(window.to,windows[index+1].from))window=windows[++index];return window.start+Math.max(0,Math.min(window.seconds,time-window.from));};
    // Keep a held track from earlier bars; contiguous windows do not reattack it.
    const regions=[];windows.forEach(window=>{const previous=regions.at(-1),tolerance=Number.EPSILON*8*Math.max(Number.MIN_VALUE,Math.abs(previous?.to||0),Math.abs(window.from));if(previous&&Math.abs(previous.to-window.from)<=tolerance)previous.to=window.to;else regions.push({from:window.from,to:window.to,start:window.start,index:windows.indexOf(window)});});
    const result=[];
    regions.forEach(region=>{
      t.notes.filter(n=>n.start<region.to&&n.start+n.seconds>region.from).forEach(n=>{
        const from=Math.max(n.start,region.from),to=Math.min(n.start+n.seconds,region.to),offset=from-n.start,ramp=n.volumeRampEnd??n.stepSeconds??n.seconds,volumeAt=time=>n.volume+((n.volumeEnd??n.volume)-n.volume)*Math.max(0,Math.min(1,time/Math.max(Number.MIN_VALUE,ramp)));
        const clippedTones=n.tones.filter(t=>n.start+(t.seconds??n.seconds)>from).map(t=>({...t,seconds:Math.min(n.start+(t.seconds??n.seconds),region.to)-from,continuation:false,validTie:false,next:null}));if(n.midi!==null&&!clippedTones.length)return;const clipped={...n,tones:clippedTones,midi:clippedTones[0]?.midi??null,start:region.start+from-region.from,stepSeconds:Math.max(0,Math.min(n.start+(n.stepSeconds??n.seconds),region.to)-from),seconds:to-from,volume:volumeAt(offset),volumeEnd:volumeAt(to-n.start),volumeRampEnd:Math.max(0,Math.min(to-from,ramp-offset)),pedalEnd:n.pedalEnd?pedalTime(n.pedalEnd,region.index):null,next:null,validTie:false,continuation:false,rangeContinuation:offset>0};
        if(n.e.glissando){let target=n.next;while(target&&n.e.glissTo&&target.e.id!==n.e.glissTo){if(!target.next||target.next.sequence!==target.sequence+1){target=null;break;}target=target.next;}if(target&&target.sequence>n.sequence)clipped.glissTarget={...target,start:clipped.start+target.start-from,next:null};}
        if(clipped.rangeContinuation){delete clipped.attackVolume;clipped.fp=false;clipped.graces=[];}
        result.push(clipped);
      });
    });
    for(const voice of C.voices(s)){
      const part=result.filter(n=>n.voice===voice.id);
      part.forEach((n,i)=>{const next=part[i+1];n.next=next||null;n.validTie=!!n.e.tie&&n.midi!==null&&next?.midi===n.midi&&next.sequence===n.sequence+1&&C.close(n.start+n.seconds,next.start)&&n.tones.map(t=>t.midi).sort().join(',')===next.tones.map(t=>t.midi).sort().join(',');n.continuation=i>0&&part[i-1].validTie;});
    }
    C.linkToneTies(result);result.sort((a,b)=>a.start-b.start||C.voices(s).findIndex(v=>v.id===a.voice)-C.voices(s).findIndex(v=>v.id===b.voice));
    return {...t,notes:result,seconds:cursor,route:windows.map(w=>({mi:w.mi,pass:w.pass})),warnings:t.warnings.filter(w=>w.mi>=start.mi&&w.mi<=end.mi),rangeActive:true};
  }
  return {notes,policy,styles,brightness,section};
});
