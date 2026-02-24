export const IPC_CHANNELS = {
  READ_DIRECTORY: 'fs:read-directory',
  READ_FILE: 'fs:read-file',
  FILE_CHANGED: 'fs:file-changed',
  FILE_ADDED: 'fs:file-added',
  FILE_REMOVED: 'fs:file-removed',
  GET_CONFIG: 'app:get-config',
} as const;

export const DEFAULTS = {
  WINDOW_WIDTH: 1200,
  WINDOW_HEIGHT: 800,
  MIN_WINDOW_WIDTH: 600,
  MIN_WINDOW_HEIGHT: 400,
  SIDEBAR_WIDTH: 240,
  SIDEBAR_MIN_WIDTH: 180,
  SIDEBAR_MAX_WIDTH: 400,
} as const;
