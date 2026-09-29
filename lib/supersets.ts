import type { LiveSlot } from './live-workout';
// Group identity is independent of its position in the workout.
export function normalizeSupersets(slots: LiveSlot[]): LiveSlot[] {
  const counts=new Map<string,number>();
  for(const slot of slots){const id=slot.target.superset_id;if(id)counts.set(id,(counts.get(id)||0)+1);}
  return slots.map(slot=>slot.target.superset_id&&(counts.get(slot.target.superset_id)||0)<2
    ? {...slot,target:{...slot.target,superset_id:undefined}} : slot);
}
export function workoutGroups(slots: LiveSlot[]): number[][] {
  const groups:number[][]=[];
  const byId=new Map<string,number[]>();
  slots.forEach((slot,index)=>{
    const id=slot.target.superset_id;
    if(id&&byId.has(id)){byId.get(id)!.push(index);return;}
    const group=[index];groups.push(group);if(id)byId.set(id,group);
  });
  return groups;
}
