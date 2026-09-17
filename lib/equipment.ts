export const equipmentGroups = [
  { name: 'Bodyweight & home', items: ['Pull-up bar','Dip bars','Gym rings','Push-up Grips','Parallettes','Suspension trainer','Resistance bands','Small Bands','Mini bands','Secure ankle anchor','Ab wheel','Exercise mat'] },
  { name: 'Free weights', items: ['Barbell','20kg Barbell','Dumbbells','Adjustable dumbbells','Kettlebells','EZ curl bar','Trap bar','Safety squat bar','Weight plates','Weight vest','Ankle weights','Sandbag','Medicine ball','Slam ball'] },
  { name: 'Benches & racks', items: ['Bench','Adjustable bench','Incline bench','Decline bench','Preacher curl bench','Power rack','Squat rack','Smith machine','Landmine attachment','Back extension bench','Glute-ham developer'] },
  { name: 'Cable stations', items: ['Cable machine','Functional trainer','Cable crossover','Lat pulldown machine','Seated cable row','Cable rope attachment','Straight bar attachment','V-bar attachment','Ankle strap','Single cable handle'] },
  { name: 'Upper-body machines', items: ['Chest press machine','Incline chest press machine','Shoulder press machine','Pec deck','Reverse pec deck','Seated row machine','High row machine','Pullover machine','Assisted pull-up/dip machine','Biceps curl machine','Triceps extension machine','Triceps dip machine','Lateral raise machine'] },
  { name: 'Lower-body machines', items: ['Leg press machine','Hack squat machine','Pendulum squat machine','Belt squat machine','Leg extension machine','Seated leg curl machine','Lying leg curl machine','Standing leg curl machine','Hip thrust machine','Hip abductor machine','Hip adductor machine','Standing calf raise machine','Seated calf raise machine','Donkey calf raise machine','Glute kickback machine'] },
  { name: 'Core machines', items: ['Ab crunch machine','Rotary torso machine','Back extension machine','Captain’s chair'] },
  { name: 'Cardio', items: ['Treadmill','Stationary bike','Spin bike','Air bike','Rowing machine','Elliptical','Stair climber','Ski ergometer','Jump rope'] },
  { name: 'Football, conditioning & recovery', items: ['Football','Agility ladder','Cones','Hurdles','Plyometric box','Sled','Battle ropes','Speed parachute','Resistance sprint harness','Balance board','BOSU ball','Exercise ball','Foam roller','Massage ball','Sliders'] },
  { name: 'Unspecified library equipment', items: ['Machine','Other equipment'] },
];
export const equipmentOptions = equipmentGroups.flatMap(group=>group.items);
export const gymPreset = equipmentGroups.filter(group=>['Free weights','Benches & racks','Cable stations','Upper-body machines','Lower-body machines','Core machines','Cardio'].includes(group.name)).flatMap(group=>group.items);
const clean=(value:string)=>value.trim().toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases:Record<string,string>={
  bodyonly:'bodyweight',none:'bodyweight',pullupbars:'pullupbar',chinupbar:'pullupbar',
  parallelbars:'dipbars',parallelbar:'dipbars',smallbands:'bands',resistancebands:'bands',band:'bands',
  pushupgrips:'grips',pushuphandles:'grips',parallettes:'grips',gymrings:'rings',
  dumbbell:'dumbbells',adjustabledumbbells:'dumbbells',kettlebell:'kettlebells',
  cable:'cablemachine',functionaltrainer:'cablemachine',cablecrossover:'cablemachine',
  ezbar:'ezcurlbar',ezcurlbar:'ezcurlbar',foamroll:'foamroller',other:'otherequipment',
  flatbench:'bench',olympicbarbell:'barbell',latpulldown:'latpulldownmachine',
  legpress:'legpressmachine',legextension:'legextensionmachine',pecdeckmachine:'pecdeck',
  rowingergometer:'rowingmachine',captainschair:'captainschair',
};
export const normalizeEquipment=(value:string)=>aliases[clean(value)]||clean(value);

// Resolve the mirror's generic 'machine' tag only when the name identifies it.
// Owning one machine never grants access to every machine.
export function exerciseEquipment(name:string,equipment:string[]):string[] {
  const n=name.toLowerCase().replace(/[-_]/g,' ');
  const rules:[RegExp,string][]=[
    [/smith/,'Smith machine'],[/assisted.*(pull|chin|dip)/,'Assisted pull-up/dip machine'],
    [/hack squat/,'Hack squat machine'],[/leg press/,'Leg press machine'],[/leg extension/,'Leg extension machine'],
    [/(lying|prone).*leg curl/,'Lying leg curl machine'],[/seated.*leg curl/,'Seated leg curl machine'],[/standing.*leg curl/,'Standing leg curl machine'],
    [/hip abduc/,'Hip abductor machine'],[/hip adduc/,'Hip adductor machine'],
    [/seated.*calf/,'Seated calf raise machine'],[/standing.*calf/,'Standing calf raise machine'],[/donkey.*calf/,'Donkey calf raise machine'],
    [/(reverse.*(fly|pec)|rear delt)/,'Reverse pec deck'],[/(pec deck|butterfly)/,'Pec deck'],
    [/incline.*chest press/,'Incline chest press machine'],[/chest press/,'Chest press machine'],
    [/shoulder press/,'Shoulder press machine'],[/lateral raise/,'Lateral raise machine'],
    [/lat.*pull.?down/,'Lat pulldown machine'],[/seated.*row/,'Seated row machine'],[/high row/,'High row machine'],
    [/pullover/,'Pullover machine'],[/bicep.*curl/,'Biceps curl machine'],[/tricep.*extension/,'Triceps extension machine'],[/tricep.*dip/,'Triceps dip machine'],
    [/ab.*crunch/,'Ab crunch machine'],[/rotary.*torso/,'Rotary torso machine'],[/back extension/,'Back extension machine'],
    [/hip thrust/,'Hip thrust machine'],[/kickback/,'Glute kickback machine'],
    [/treadmill/,'Treadmill'],[/elliptical/,'Elliptical'],[/stair/,'Stair climber'],[/stationary.*bike/,'Stationary bike'],[/rowing/,'Rowing machine'],
  ];
  const machine=rules.find(([pattern])=>pattern.test(n))?.[1];
  const result=equipment.map(item=>normalizeEquipment(item)==='machine'&&machine?machine:item);
  const knownMachine=result.some(item=>/machine|smith|pec deck|calf raise|cable/i.test(item));
  if(!knownMachine){
    if(/\b(pull ups?|pullups?|chin ups?|chinups?)\b/.test(n))result.push('Pull-up bar');
    if(/\bdips?\b/.test(n)&&!/bench|ring|floor/.test(n))result.push('Dip bars');
  }
  if(/\brings?\b/.test(n))result.push('Gym rings');
  if(/deficit push/.test(n))result.push('Push-up Grips');
  if(/bulgarian split squat|bench dips?/.test(n))result.push('Bench');
  if(/nordic/.test(n))result.push('Secure ankle anchor');
  return [...new Set(result)];
}

export function compatibleEquipment(exercise:{name:string;equipment:string[]},equipment:string[]) {
  const available=new Set(equipment.map(normalizeEquipment));available.add('bodyweight');
  if(available.has('20kgbarbell'))available.add('barbell');
  if(available.has('adjustablebench'))['bench','inclinebench','declinebench'].forEach(item=>available.add(item));
  if(available.has('powerrack'))available.add('squatrack');
  // Cable towers support these cable movements, but not dedicated plate-loaded machines.
  if(available.has('cablemachine'))available.add('seatedcablerow');
  return exerciseEquipment(exercise.name,exercise.equipment).map(normalizeEquipment).every(item=>available.has(item));
}
