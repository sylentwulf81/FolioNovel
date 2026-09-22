import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { exportAllData, importData } from './db';

// Required Google Drive Scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
];

const SYNC_FILENAME = 'folio-manuscripts-sync.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// In-memory access token cache (Strict security requirement: do NOT store in localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;
let verifiedStorageMode: 'appDataFolder' | 'drive' | null = null;

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'pulled' | 'pushed' | 'error' | 'permission_denied';

export interface DriveSyncResult {
  status: SyncStatus;
  message: string;
  timestamp: number;
}

// Subscribed listeners for auth state changes
type AuthListener = (user: User | null, hasToken: boolean) => void;
const authListeners: Set<AuthListener> = new Set();

export function subscribeToGoogleAuth(listener: AuthListener): () => void {
  authListeners.add(listener);
  // Immediately notify with current state
  listener(auth.currentUser, !!cachedAccessToken);
  return () => {
    authListeners.delete(listener);
  };
}

function notifyListeners() {
  const currentUser = auth.currentUser;
  const hasToken = !!cachedAccessToken;
  authListeners.forEach((fn) => fn(currentUser, hasToken));
}

// Initialize Auth Listener on app load
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedAccessToken = null;
      verifiedStorageMode = null;
    }
    notifyListeners();
  });
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export function hasActiveAccessToken(): boolean {
  return !!cachedAccessToken;
}

function createConfiguredProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  SCOPES.forEach((scope) => provider.addScope(scope));
  // Force prompt to ensure user is shown the consent screen with Drive checkboxes
  provider.setCustomParameters({
    prompt: 'select_account consent',
    access_type: 'offline',
  });
  return provider;
}

export async function signInWithGoogle(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const provider = createConfiguredProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not acquire Google Drive access token from sign-in.');
    }
    cachedAccessToken = credential.accessToken;
    verifiedStorageMode = null; // reset to re-detect
    notifyListeners();
    return { user: result.user, accessToken: credential.accessToken };
  } finally {
    isSigningIn = false;
  }
}

export async function signOutGoogle(): Promise<void> {
  cachedAccessToken = null;
  verifiedStorageMode = null;
  await firebaseSignOut(auth);
  notifyListeners();
}

interface FoundDriveFile {
  id: string;
  modifiedTime: string;
  storageMode: 'appDataFolder' | 'drive';
}

/**
 * Searches for the sync file, first testing appDataFolder (if drive.appdata is granted),
 * and seamlessly falling back to user drive space (if drive.file is granted).
 */
async function findSyncFile(token: string): Promise<FoundDriveFile | null> {
  const query = encodeURIComponent(`name = '${SYNC_FILENAME}' and trashed = false`);

  // 1. Try appDataFolder first (preferred for hidden app storage)
  if (verifiedStorageMode !== 'drive') {
    try {
      const appDataUrl = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)`;
      const res = await fetch(appDataUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        verifiedStorageMode = 'appDataFolder';
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          return {
            id: data.files[0].id,
            modifiedTime: data.files[0].modifiedTime,
            storageMode: 'appDataFolder',
          };
        }
        return null;
      } else if (res.status === 401) {
        cachedAccessToken = null;
        notifyListeners();
        throw new Error('Google Drive session expired. Please sign in again.');
      } else if (res.status === 403) {
        // Insufficient scope for appDataFolder - proceed to fallback
        console.warn('appDataFolder scope unavailable (403). Falling back to drive.file storage.');
        verifiedStorageMode = 'drive';
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('expired')) {
        throw err;
      }
    }
  }

  // 2. Fallback: Search in user Drive via drive.file scope
  const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`;
  const res2 = await fetch(driveUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res2.status === 401) {
    cachedAccessToken = null;
    notifyListeners();
    throw new Error('Google Drive session expired. Please sign in again.');
  }

  if (res2.status === 403) {
    // Both attempts returned 403 - user's token does not have any Drive scopes granted
    throw new Error(
      'PERMISSION_DENIED: Google Drive permission was not granted. Please sign in again and check the permission box for Google Drive.'
    );
  }

  if (!res2.ok) {
    const text = await res2.text();
    throw new Error(`Drive lookup failed (${res2.status}): ${text}`);
  }

  verifiedStorageMode = 'drive';
  const data2 = await res2.json();
  if (data2.files && data2.files.length > 0) {
    return {
      id: data2.files[0].id,
      modifiedTime: data2.files[0].modifiedTime,
      storageMode: 'drive',
    };
  }

  return null;
}

/**
 * Uploads local manuscripts to Google Drive (either appDataFolder or Drive root via drive.file)
 */
async function uploadToDrive(
  token: string,
  existingFileId?: string,
  targetMode?: 'appDataFolder' | 'drive'
): Promise<void> {
  const exportJson = await exportAllData();
  const mode = targetMode || verifiedStorageMode || 'appDataFolder';

  if (existingFileId) {
    // Update existing file
    const url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: exportJson,
    });

    if (res.status === 401) {
      cachedAccessToken = null;
      notifyListeners();
      throw new Error('Google Drive session expired. Please sign in again.');
    }

    if (res.status === 403) {
      throw new Error(
        'PERMISSION_DENIED: Google Drive permission was not granted. Please re-authorize and check the permission box.'
      );
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to update Drive file (${res.status}): ${err}`);
    }
  } else {
    // Create new file via multipart upload
    const boundary = '-------314159265358979323846';
    const metadata: { name: string; mimeType: string; parents?: string[] } = {
      name: SYNC_FILENAME,
      mimeType: 'application/json',
    };

    if (mode === 'appDataFolder') {
      metadata.parents = ['appDataFolder'];
    }

    const multipartRequestBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${exportJson}\r\n` +
      `--${boundary}--`;

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    // If appDataFolder failed with 403, retry in Drive root
    if (res.status === 403 && mode === 'appDataFolder') {
      console.warn('Cannot create in appDataFolder (403). Retrying in drive space...');
      verifiedStorageMode = 'drive';
      delete metadata.parents;
      const fallbackBody =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${exportJson}\r\n` +
        `--${boundary}--`;

      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: fallbackBody,
      });
    }

    if (res.status === 401) {
      cachedAccessToken = null;
      notifyListeners();
      throw new Error('Google Drive session expired. Please sign in again.');
    }

    if (res.status === 403) {
      throw new Error(
        'PERMISSION_DENIED: Google Drive permission was not granted. Please sign in again and check the permission box for Google Drive.'
      );
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create Drive file (${res.status}): ${err}`);
    }
  }
}

/**
 * Downloads manuscripts from Google Drive and updates local IndexedDB
 */
async function downloadFromDrive(token: string, fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    cachedAccessToken = null;
    notifyListeners();
    throw new Error('Google Drive session expired. Please sign in again.');
  }

  if (res.status === 403) {
    throw new Error(
      'PERMISSION_DENIED: Google Drive permission was not granted. Please sign in again and check the permission box for Google Drive.'
    );
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to download Drive file (${res.status}): ${err}`);
  }

  const jsonText = await res.text();
  await importData(jsonText);
}

/**
 * Smart Two-Way Sync
 */
export async function syncWithDrive(): Promise<DriveSyncResult> {
  if (!cachedAccessToken) {
    return {
      status: 'error',
      message: 'Not connected to Google Drive. Please click Connect Drive.',
      timestamp: Date.now(),
    };
  }

  try {
    const remote = await findSyncFile(cachedAccessToken);

    if (!remote) {
      // First time sync: push local database to Drive
      await uploadToDrive(cachedAccessToken);
      return {
        status: 'pushed',
        message: 'Initialized and uploaded manuscripts to Google Drive.',
        timestamp: Date.now(),
      };
    }

    const remoteModifiedTime = new Date(remote.modifiedTime).getTime();

    // Fetch remote content to check its internal export timestamp
    const url = `https://www.googleapis.com/drive/v3/files/${remote.id}?alt=media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${cachedAccessToken}` },
    });

    if (!res.ok) {
      // Fallback to push
      await uploadToDrive(cachedAccessToken, remote.id, remote.storageMode);
      return {
        status: 'pushed',
        message: 'Synchronized manuscripts to Google Drive.',
        timestamp: Date.now(),
      };
    }

    const remoteText = await res.text();
    let remotePayload: { exportedAt?: string; folios?: unknown[] } | null = null;
    try {
      remotePayload = JSON.parse(remoteText);
    } catch {
      remotePayload = null;
    }

    const remoteTimestamp = remotePayload?.exportedAt
      ? new Date(remotePayload.exportedAt).getTime()
      : remoteModifiedTime;

    // Compare with local latest export
    const localJson = await exportAllData();
    const localPayload = JSON.parse(localJson);
    const localTimestamp = localPayload?.exportedAt
      ? new Date(localPayload.exportedAt).getTime()
      : 0;

    const localFoliosCount = Array.isArray(localPayload.folios) ? localPayload.folios.length : 0;
    const remoteFoliosCount = Array.isArray(remotePayload?.folios) ? remotePayload.folios.length : 0;

    if (localFoliosCount === 0 && remoteFoliosCount > 0) {
      await importData(remoteText);
      return {
        status: 'pulled',
        message: `Loaded ${remoteFoliosCount} manuscripts from Google Drive.`,
        timestamp: Date.now(),
      };
    }

    if (remoteTimestamp > localTimestamp + 1000) {
      await importData(remoteText);
      return {
        status: 'pulled',
        message: 'Downloaded newer manuscript updates from Google Drive.',
        timestamp: Date.now(),
      };
    } else {
      await uploadToDrive(cachedAccessToken, remote.id, remote.storageMode);
      return {
        status: 'pushed',
        message: 'Uploaded latest manuscript changes to Google Drive.',
        timestamp: Date.now(),
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown sync error';
    const isPermError = msg.includes('PERMISSION_DENIED') || msg.includes('insufficient');
    return {
      status: isPermError ? 'permission_denied' : 'error',
      message: msg,
      timestamp: Date.now(),
    };
  }
}

/**
 * Force Pull from Google Drive
 */
export async function pullLatestFromDrive(): Promise<DriveSyncResult> {
  if (!cachedAccessToken) {
    return {
      status: 'error',
      message: 'Please sign in with Google Drive first.',
      timestamp: Date.now(),
    };
  }

  try {
    const remote = await findSyncFile(cachedAccessToken);
    if (!remote) {
      return {
        status: 'error',
        message: 'No manuscript backup found in your Google Drive yet.',
        timestamp: Date.now(),
      };
    }

    await downloadFromDrive(cachedAccessToken, remote.id);
    return {
      status: 'pulled',
      message: 'Successfully pulled manuscripts from Google Drive.',
      timestamp: Date.now(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to download from Drive';
    const isPermError = msg.includes('PERMISSION_DENIED') || msg.includes('insufficient');
    return {
      status: isPermError ? 'permission_denied' : 'error',
      message: msg,
      timestamp: Date.now(),
    };
  }
}

/**
 * Force Push to Google Drive
 */
export async function pushCurrentToDrive(): Promise<DriveSyncResult> {
  if (!cachedAccessToken) {
    return {
      status: 'error',
      message: 'Please sign in with Google Drive first.',
      timestamp: Date.now(),
    };
  }

  try {
    const remote = await findSyncFile(cachedAccessToken);
    await uploadToDrive(cachedAccessToken, remote?.id, remote?.storageMode);
    return {
      status: 'pushed',
      message: 'Successfully pushed all manuscripts to Google Drive.',
      timestamp: Date.now(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to upload to Drive';
    const isPermError = msg.includes('PERMISSION_DENIED') || msg.includes('insufficient');
    return {
      status: isPermError ? 'permission_denied' : 'error',
      message: msg,
      timestamp: Date.now(),
    };
  }
}
