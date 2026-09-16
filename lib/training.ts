export const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const equipmentOptions = ['Pull-up bar', 'Dumbbells', 'Resistance bands', 'Gym rings', 'Bench', 'Football'];
export const patterns = ['vertical_push', 'horizontal_push', 'vertical_pull', 'horizontal_pull', 'knee_dominant', 'hip_hinge', 'plyo', 'core'] as const;
export type Exercise = { id: string; name: string; movement_pattern: string; primary_muscle: string; equipment: string[]; gif_url: string | null; difficulty: number };
export const sampleExercises: Exercise[] = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Pull-ups', movement_pattern: 'vertical_pull', primary_muscle: 'Back & biceps', equipment: ['Pull-up bar'], gif_url: null, difficulty: 3 },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Push-ups', movement_pattern: 'horizontal_push', primary_muscle: 'Chest & triceps', equipment: [], gif_url: null, difficulty: 2 },
  { id: '33333333-3333-4333-8333-333333333333', name: 'Bulgarian split squats', movement_pattern: 'knee_dominant', primary_muscle: 'Quads & glutes', equipment: ['Bench'], gif_url: null, difficulty: 3 },
  { id: '44444444-4444-4444-8444-444444444444', name: 'Dead bugs', movement_pattern: 'core', primary_muscle: 'Core', equipment: [], gif_url: null, difficulty: 1 },
];
export function localDate() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; }
