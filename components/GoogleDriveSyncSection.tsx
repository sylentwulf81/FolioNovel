'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  subscribeToGoogleAuth,
  signInWithGoogle,
  signOutGoogle,
  syncWithDrive,
  pullLatestFromDrive,
  pushCurrentToDrive,
  hasActiveAccessToken,
} from '@/lib/googleDriveSync';

interface GoogleDriveSyncSectionProps {
  onSyncCompleted?: () => void;
}

export const GoogleDriveSyncSection: React.FC<GoogleDriveSyncSectionProps> = ({
  onSyncCompleted,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('folio_last_drive_sync');
    }
    return null;
  });

  useEffect(() => {
    const unsubscribe = subscribeToGoogleAuth((currentUser, tokenPresent) => {
      setUser(currentUser);
      setHasToken(tokenPresent);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      await signInWithGoogle();
      setStatusMessage('Connected to Google Drive. Syncing manuscripts…');
      const res = await syncWithDrive();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(timeStr);
      localStorage.setItem('folio_last_drive_sync', timeStr);
      setStatusMessage(res.message);
      if (onSyncCompleted) onSyncCompleted();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect Google Drive';
      setStatusMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = async () => {
    setIsProcessing(true);
    try {
      await signOutGoogle();
      setStatusMessage('Disconnected from Google Drive.');
    } catch {
      setStatusMessage('Error disconnecting.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSync = async () => {
    if (!hasActiveAccessToken()) {
      setStatusMessage('Session expired. Please sign in with Google again.');
      return;
    }
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await syncWithDrive();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(timeStr);
      localStorage.setItem('folio_last_drive_sync', timeStr);
      setStatusMessage(res.message);
      if (onSyncCompleted) onSyncCompleted();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setStatusMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePull = async () => {
    if (!hasActiveAccessToken()) {
      setStatusMessage('Session expired. Please sign in with Google again.');
      return;
    }
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await pullLatestFromDrive();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(timeStr);
      localStorage.setItem('folio_last_drive_sync', timeStr);
      setStatusMessage(res.message);
      if (onSyncCompleted) onSyncCompleted();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pull failed';
      setStatusMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePush = async () => {
    if (!hasActiveAccessToken()) {
      setStatusMessage('Session expired. Please sign in with Google again.');
      return;
    }
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await pushCurrentToDrive();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(timeStr);
      localStorage.setItem('folio_last_drive_sync', timeStr);
      setStatusMessage(res.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Push failed';
      setStatusMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="google-drive-sync-section" className="pt-4 border-t border-[#E7E0D4] space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs uppercase tracking-wider text-[#57534E] font-medium">
            Multi-Device Cloud Sync
          </label>
          <p className="text-[11px] text-[#78716C] mt-0.5">
            Sync manuscripts across phones, laptops, and tablets for free via private Google Drive App Storage.
          </p>
        </div>
      </div>

      {!user || !hasToken ? (
        <div className="pt-1">
          {/* Official Google Sign-in Button */}
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleSignIn}
            disabled={isProcessing}
            className="inline-flex items-center gap-3 px-4 py-2 bg-white border border-[#D5CDBC] hover:border-[#1C1917] rounded-lg shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 48 48" className="w-5 h-5 block">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-[#1C1917] tracking-wide">
              {isProcessing ? 'Connecting to Google…' : 'Sign in with Google'}
            </span>
          </button>
        </div>
      ) : (
        <div className="p-3 bg-[#F4EFE6] border border-[#E7E0D4] rounded-lg space-y-3">
          {/* User Account & Sync Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-7 h-7 rounded-full object-cover border border-[#D5CDBC]"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#6B2D2D] text-white flex items-center justify-center text-xs font-serif">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-[#1C1917] leading-tight">
                  {user.displayName || user.email}
                </p>
                <p className="text-[10px] text-[#78716C] truncate max-w-[200px]">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#2D5A27] bg-[#2D5A27]/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A27] animate-pulse" />
                Connected
              </span>
              {lastSyncTime && (
                <p className="text-[10px] text-[#78716C] mt-0.5">
                  Synced at {lastSyncTime}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              id="drive-sync-now-btn"
              type="button"
              onClick={handleSync}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-md bg-[#6B2D2D] hover:bg-[#582424] text-[#FAF6EE] text-xs font-medium tracking-wide shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isProcessing ? (
                <span>Syncing…</span>
              ) : (
                <>
                  <span>↻</span>
                  <span>Sync Now</span>
                </>
              )}
            </button>

            <button
              id="drive-pull-btn"
              type="button"
              onClick={handlePull}
              disabled={isProcessing}
              title="Download latest version from Google Drive"
              className="px-2.5 py-1.5 rounded-md border border-[#D5CDBC] bg-white hover:bg-[#FAF6EE] text-xs text-[#57534E] hover:text-[#1C1917] transition-colors disabled:opacity-50"
            >
              Pull from Cloud
            </button>

            <button
              id="drive-push-btn"
              type="button"
              onClick={handlePush}
              disabled={isProcessing}
              title="Upload current local copy to Google Drive"
              className="px-2.5 py-1.5 rounded-md border border-[#D5CDBC] bg-white hover:bg-[#FAF6EE] text-xs text-[#57534E] hover:text-[#1C1917] transition-colors disabled:opacity-50"
            >
              Push to Cloud
            </button>

            <button
              id="drive-signout-btn"
              type="button"
              onClick={handleSignOut}
              disabled={isProcessing}
              className="text-[11px] text-[#78716C] hover:text-[#6B2D2D] px-2 py-1 ml-auto transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {statusMessage && (
        <div
          className={`p-3 rounded-lg text-xs transition-opacity ${
            statusMessage.includes('PERMISSION_DENIED') || statusMessage.includes('permission')
              ? 'bg-[#FDF2F2] border border-[#FCA5A5] text-[#991B1B]'
              : 'bg-[#F4EFE6] border border-[#E7E0D4] text-[#57534E] font-serif italic'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-sans font-medium text-xs">
                {statusMessage.includes('PERMISSION_DENIED') || statusMessage.includes('permission')
                  ? 'Drive Permission Needed'
                  : 'Sync Status'}
              </p>
              <p className="mt-0.5 leading-relaxed text-[11px]">
                {statusMessage.includes('PERMISSION_DENIED') || statusMessage.includes('permission')
                  ? 'Google requires checking the permission box during sign-in to allow Folio to save manuscripts to your Drive.'
                  : statusMessage}
              </p>
            </div>
            {(statusMessage.includes('PERMISSION_DENIED') || statusMessage.includes('permission')) && (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isProcessing}
                className="px-2.5 py-1 rounded bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-[11px] font-medium tracking-wide flex-shrink-0 cursor-pointer"
              >
                Re-authorize
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
