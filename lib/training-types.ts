import type { Exercise } from './training';
import { exerciseEquipment, normalizeEquipment } from './equipment';
export const sessionTypes = [
  {value:'upper',label:'Upper session'}, {value:'lower',label:'Lower session'},
  {value:'push',label:'Push session'}, {value:'pull',label:'Pull session'},
  {value:'plyometrics',label:'Plyometrics'}, {value:'football_power',label:'Football power'},
  {value:'custom',label:'Custom / full body'},
] as const;
export const trainingStyles = [
  {value:'mixed',label:'Mixed training'}, {value:'gym',label:'Gym'},
  {value:'bodyweight',label:'Bodyweight'}, {value:'calisthenics',label:'Calisthenics'},
  {value:'plyometrics',label:'Plyometrics'},
] as const;
export type SessionType = typeof sessionTypes[number]['value'];
export type TrainingStyle = typeof trainingStyles[number]['value'];
export const sessionLabel=(value:string)=>sessionTypes.find(type=>type.value===value)?.label || 'Custom session';
export const styleLabel=(value:string)=>trainingStyles.find(type=>type.value===value)?.label || 'Mixed training';
export function matchesSession(exercise:Exercise,focus:string) {
  const pattern=exercise.movement_pattern;
  if(focus==='custom')return true;
  if(pattern==='core')return true;
  if(focus==='upper')return /push|pull/.test(pattern);
  if(focus==='push')return /push/.test(pattern);
  if(focus==='pull')return /pull/.test(pattern);
  if(focus==='plyometrics')return pattern==='plyo';
  return ['knee_dominant','hip_hinge','plyo'].includes(pattern);
}
export function matchesStyle(exercise:Exercise,style:string='mixed') {
  if(style==='mixed')return true;
  if(style==='plyometrics')return exercise.movement_pattern==='plyo'||exercise.movement_pattern==='core';
  const supports=new Set(['bodyweight','pullupbar','dipbars','rings','grips','bench','adjustablebench','inclinebench','declinebench','exercisemat','secureankleanchor','suspensiontrainer','abwheel','sliders','plyometricbox']);
  const required=exerciseEquipment(exercise.name,exercise.equipment).map(normalizeEquipment);
  const bodyweight=required.every(item=>supports.has(item));
  if(style==='gym')return !bodyweight;
  // Both use body mass as resistance; calisthenics emphasizes strength/control.
  return bodyweight&&(style!=='calisthenics'||exercise.movement_pattern!=='plyo');
}
