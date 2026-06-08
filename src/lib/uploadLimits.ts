export const MAX_DRAFT_FILE_SIZE_MB = 4;
export const MAX_DRAFT_FILE_SIZE_BYTES = MAX_DRAFT_FILE_SIZE_MB * 1024 * 1024;

export function getDraftFileSizeErrorMessage() {
  return `Draft files must be ${MAX_DRAFT_FILE_SIZE_MB} MB or smaller.`;
}

export function isDraftFileTooLarge(file: File) {
  return file.size > MAX_DRAFT_FILE_SIZE_BYTES;
}
