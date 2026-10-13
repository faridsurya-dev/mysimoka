import { NativeModules } from 'react-native';

type TempFilesModule = { deleteCached: (uriOrPath: string) => Promise<boolean> };

// Android native module (TempFilesModule.kt); missing on web/iOS → no-op.
const tempFiles = NativeModules.TempFiles as TempFilesModule | undefined;

/**
 * Deletes a temporary photo from the app cache (face snapshots, gallery
 * copies) after use, so children's photos are not kept on the phone.
 * Best-effort: never throws; files outside the cache are left alone.
 */
export function deleteTempPhoto(uri: string | null | undefined) {
  if (!uri || !tempFiles) {
    return;
  }
  tempFiles.deleteCached(uri).catch(() => undefined);
}
