import { Project } from './project.model';
import { TimeEntry } from './time-entry.model';

export interface Db {
  projects: Project[];
  entries: TimeEntry[];
}

export function emptyDb(): Db {
  return { projects: [], entries: [] };
}
