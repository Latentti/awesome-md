import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  sidebarWidth: number;
  zoomLevel: number;
}

const getStatePath = (): string =>
  path.join(app.getPath('userData'), 'window-state.json');

const isValidWindowState = (value: unknown): value is WindowState => {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as WindowState).x !== 'number' ||
    typeof (value as WindowState).y !== 'number' ||
    typeof (value as WindowState).width !== 'number' ||
    typeof (value as WindowState).height !== 'number' ||
    typeof (value as WindowState).sidebarWidth !== 'number'
  ) {
    return false;
  }
  // Default zoomLevel for older state files
  if (typeof (value as WindowState).zoomLevel !== 'number') {
    (value as WindowState).zoomLevel = 0;
  }
  return true;
};

export const loadWindowState = (directory: string): WindowState | null => {
  try {
    const data = fs.readFileSync(getStatePath(), 'utf-8');
    const allStates = JSON.parse(data);
    const state = allStates[directory];
    return isValidWindowState(state) ? state : null;
  } catch {
    return null;
  }
};

export const saveWindowState = (directory: string, state: WindowState): void => {
  try {
    let allStates: Record<string, WindowState> = {};
    try {
      const data = fs.readFileSync(getStatePath(), 'utf-8');
      allStates = JSON.parse(data);
    } catch {
      // File doesn't exist or is corrupt — start fresh
    }
    allStates[directory] = state;
    fs.writeFileSync(getStatePath(), JSON.stringify(allStates, null, 2));
  } catch (err) {
    console.error('Failed to save window state:', err);
  }
};
