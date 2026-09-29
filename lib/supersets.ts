import type { LiveSlot } from './live-workout';
// Groups are adjacent runs. Split or single exercises lose their old group label.
export function normalizeSupersets(slots: LiveSlot[]): LiveSlot[] {
  return slots.map((slot,index)=>{
    const group=slot.target.superset_id;
    if(!group)return slot;
    let start=index,end=index;
    while(start>0&&slots[start-1].target.superset_id===group)start--;
    while(end+1<slots.length&&slots[end+1].target.superset_id===group)end++;
    return {...slot,target:{...slot.target,superset_id:end>start?`superset-${start}`:undefined}};
  });
}
