export const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export { equipmentOptions } from './equipment';
export const patterns = ['vertical_push', 'horizontal_push', 'vertical_pull', 'horizontal_pull', 'knee_dominant', 'hip_hinge', 'plyo', 'core'] as const;
export type Exercise = { id: string; user_id?: string | null; name: string; movement_pattern: string; primary_muscle: string; equipment: string[]; gif_url: string | null; difficulty: number };
// Match the new home seed by name, independently of its database UUID.
export function selectWorkoutExercises(exercises: Exercise[]): Exercise[] {
  const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ['Pull-Ups', 'Deficit Push-Ups', 'Bulgarian Split Squats', 'Single-Leg RDLs (20kg Barbell)']
    .map(name => exercises.find(exercise => normalize(exercise.name) === normalize(name)))
    .filter((exercise): exercise is Exercise => Boolean(exercise));
}
export function localDate() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; }
