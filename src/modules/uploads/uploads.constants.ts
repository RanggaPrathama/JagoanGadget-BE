import {
  DOCUMENT_MIMES,
  IMAGE_MIMES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
} from '../storage/storage.constants';

export const UPLOAD_PURPOSES = ['avatar', 'document'] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

export interface UploadPurposeConfig {
  /** temp subfolder under storage/temp/ (also the `purpose` in tempKey) */
  tempFolder: string;
  /** max body size in bytes */
  maxBytes: number;
  /** accepted MIME types for this purpose */
  allowedMimes: readonly string[];
  /** final public folder under storage/public/ — where promote() commits staged files */
  finalFolder: string;

  /** visibility for folder access public or private */
  visibility: string;
}

/**
 * Single source of truth for upload purposes.
 * A new feature = add one entry here; no new service/function needed.
 */
export const UPLOAD_PURPOSE_CONFIG: Record<UploadPurpose, UploadPurposeConfig> =
  {
    avatar: {
      tempFolder: 'avatar',
      maxBytes: MAX_IMAGE_BYTES,
      allowedMimes: IMAGE_MIMES,
      finalFolder: 'users/avatars',
      visibility: 'public',
    },
    document: {
      tempFolder: 'document',
      maxBytes: MAX_DOCUMENT_BYTES,
      allowedMimes: DOCUMENT_MIMES,
      finalFolder: 'uploads/documents',
      visibility: 'private',
    },
  };

/**
 * Generic staged temp key shape: temp/{purpose}/{uuid}.{ext}
 */
export const TEMP_KEY_REGEX = /^temp\/[a-z]+\/[a-z0-9-]+\.[a-z0-9]+$/i;

/**
 * Avatar temp key (stricter: image types only). Used by DTO validation.
 */
export const AVATAR_TEMP_KEY_REGEX =
  /^temp\/avatar\/[a-z0-9-]+\.(jpe?g|png|gif|webp|svg)$/i;
