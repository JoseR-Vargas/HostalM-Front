// Helpers for the /vouchers photo picker (Preline File Upload on top of Dropzone, see FileUpload.jsx).
// Dropzone keeps a hidden `<input type=file>` and swaps it for a fresh one after every selection, so the
// locator is always resolved again instead of holding on to an element.

export const photoPicker = (page) => page.locator('[data-hs-file-upload]');
export const photoTrigger = (page) => page.locator('#fotos');
export const photoPreviews = (page) => page.locator('[data-hs-file-upload-previews] > *');
export const photoRemoveButtons = (page) => page.locator('[data-hs-file-upload-remove]');

/** Waits until the (lazy-loaded) plugin is initialised on the page. */
export async function photoPickerReady(page) {
  await page.locator('[data-hs-file-upload][data-ready="true"]').waitFor();
}

/** Selects files through Dropzone's hidden input, exactly like picking them in the native dialog. */
export async function selectPhotos(page, files) {
  await photoPickerReady(page);
  await page.locator('[data-hs-file-upload] .dz-hidden-input').setInputFiles(files);
}
