'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Timer, Volume2, VolumeX, X } from 'lucide-react';

export function useWorkoutSound() {
  const context = useRef<AudioContext | null>(null);
  const [enabled,setEnabled] = useState(true);
  const prime = useCallback(() => {
    if (!enabled) return;
    try { context.current ??= new AudioContext(); void context.current.resume().catch(()=>{}); } catch { /* Visual alerts still work. */ }
  },[enabled]);
  const beep = useCallback(() => {
    if (!enabled || !context.current || context.current.state !== 'running') return;
    const audio = context.current;
    const oscillator = audio.createOscillator(); const gain = audio.createGain();
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.frequency.value = 740;
    gain.gain.setValueAtTime(0.12,audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,audio.currentTime+0.55);
    oscillator.start(); oscillator.stop(audio.currentTime+0.6);
  },[enabled]);
  useEffect(()=>()=>{ void context.current?.close().catch(()=>{}); },[]);
  return {enabled,setEnabled,prime,beep};
}

function useCountdown(onFinish:()=>void) {
  const deadline = useRef<number|null>(null);
  const remaining = useRef(0);
  const callback = useRef(onFinish);
  callback.current = onFinish;
  const [seconds,setSeconds] = useState(0);
  const [running,setRunning] = useState(false);
  const [finished,setFinished] = useState(false);
  const start = useCallback((duration:number) => {
    remaining.current=duration*1000; deadline.current=Date.now()+remaining.current;
    setSeconds(duration);setFinished(false);setRunning(true);
  },[]);
  const reset = useCallback(()=>{deadline.current=null;remaining.current=0;setSeconds(0);setRunning(false);setFinished(false);},[]);
  const pause = () => {remaining.current=Math.max(0,(deadline.current || Date.now())-Date.now());deadline.current=null;setRunning(false);};
  const resume = () => {if (remaining.current>0) {deadline.current=Date.now()+remaining.current;setRunning(true);}};
  useEffect(()=>{
    if (!running) return;
    const tick = () => {
      const left=Math.max(0,(deadline.current || Date.now())-Date.now());
      remaining.current=left;setSeconds(Math.ceil(left/1000));
      if (!left && deadline.current !== null) {deadline.current=null;setRunning(false);setFinished(true);callback.current();}
    };
    tick();const interval=setInterval(tick,100);
    const visible=()=>{if(document.visibilityState==='visible') tick();};
    document.addEventListener('visibilitychange',visible);
    return ()=>{clearInterval(interval);document.removeEventListener('visibilitychange',visible);};
  },[running]);
  return {seconds,running,finished,start,reset,pause,resume};
}

export function RestTimer({signal,sound,onTick}:{signal:{id:number;seconds:number}|null;sound:ReturnType<typeof useWorkoutSound>;onTick:(state:{seconds:number;running:boolean;finished:boolean})=>void}) {
  const {start,reset,...timer}=useCountdown(sound.beep);
  useEffect(()=>{if(signal) start(signal.seconds);},[signal,start]);
  useEffect(()=>{onTick({seconds:timer.seconds,running:timer.running,finished:timer.finished});},[timer.seconds,timer.running,timer.finished,onTick]);
  return <section aria-label="Rest timer" className={`rounded-2xl border p-5 transition-colors ${timer.finished?'border-accent bg-accent/10':'border-line bg-white'}`}>
    <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold"><Timer size={17} className="text-accent"/>Rest timer</h2><button aria-label={sound.enabled?'Mute timer':'Enable timer sound'} onClick={()=>{sound.setEnabled(!sound.enabled);sound.prime();}} className="rounded-lg p-2 text-muted hover:text-ink">{sound.enabled?<Volume2 size={17}/>:<VolumeX size={17}/>}</button></div>
    <p className="my-5 text-center font-mono text-5xl font-medium tabular-nums tracking-tight">{String(Math.floor(timer.seconds/60)).padStart(2,'0')}<span className="text-muted">:</span>{String(timer.seconds%60).padStart(2,'0')}</p>
    <p role="status" className={timer.finished?'mb-3 text-center text-xs text-accent':'sr-only'}>{timer.finished?'Rest complete':timer.running?'Running':timer.seconds?'Paused':''}</p>
    <div className="grid grid-cols-3 gap-2">{[30,60,90].map(seconds=><button key={seconds} onClick={()=>{sound.prime();start(seconds);}} className="rounded-lg border border-line py-3 text-sm font-semibold hover:border-accent hover:text-accent">{seconds}s</button>)}</div>
    <div className="mt-3 flex gap-2"><button disabled={!timer.seconds} onClick={()=>{sound.prime();if(timer.running)timer.pause();else timer.resume();}} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-canvas py-3 text-xs">{timer.running?<Pause size={14}/>:<Play size={14}/>} {timer.running?'Pause':'Resume'}</button><button aria-label="Reset rest timer" onClick={reset} className="rounded-lg bg-canvas px-4"><RotateCcw size={15}/></button></div>
    
  </section>;
}

export function TempoModal({name,onClose,sound}:{name:string;onClose:()=>void;sound:ReturnType<typeof useWorkoutSound>}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [duration,setDuration]=useState(3);
  const timer=useCountdown(sound.beep);
  useEffect(()=>{dialog.current?.showModal();},[]);
  return <dialog data-theme="light" ref={dialog} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}} aria-labelledby="tempo-title" className="w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-line bg-white p-6 text-ink backdrop:bg-black/80">
    <div className="flex items-start justify-between gap-4"><div><h2 id="tempo-title" className="mt-2 text-xl font-semibold">Eccentric tempo</h2><p className="mt-1 text-xs text-muted">{name}</p></div><button autoFocus onClick={onClose} aria-label="Close tempo timer" className="rounded-lg p-2"><X size={20}/></button></div>
    <div className={`mx-auto my-8 flex h-44 w-44 flex-col items-center justify-center rounded-full border-4 ${timer.finished?'border-accent bg-accent/10':'border-line'}`}><span className="font-mono text-7xl tabular-nums">{timer.finished?'✓':timer.seconds || duration}</span><span className="mt-2 text-xs tracking-wide text-muted">{timer.running?'Lower slowly':timer.finished?'Descent done':'Seconds'}</span></div>
    <p role="status" className="sr-only">{timer.finished?'Descent complete':timer.running?'Lower slowly':''}</p>
    <label className="block text-xs text-muted">Descent duration<select data-ui="select" disabled={timer.running} value={duration} onChange={e=>{setDuration(Number(e.target.value));timer.reset();}} className="mt-2 w-full rounded-xl border border-line bg-white p-3 text-ink">{[3,4,5,6].map(n=><option value={n} key={n}>{n} seconds</option>)}</select></label>
    <button onClick={()=>{sound.prime();timer.start(duration);}} className="mt-5 w-full rounded-xl bg-accent py-4 text-sm font-bold text-white">{timer.running?'Restart descent':timer.finished?'Next rep':'Start descent'}</button>
  </dialog>;
}
