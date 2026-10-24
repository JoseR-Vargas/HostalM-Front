import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cls } from './ui';

/*
 * Preline File Upload (npm `@preline/file-upload`, drag & drop + previews on top of Dropzone), wired to React.
 *
 * The plugin is a vanilla-DOM widget: it reads `data-hs-*` attributes, clones the `<template>` into the
 * previews container and owns everything it adds. So:
 * - the previews container is rendered once, empty, and React never renders children into it;
 * - the preview template is injected as an HTML string (React would append `<template>` children as plain DOM
 *   nodes, leaving `template.content` empty, and the plugin would silently fall back to its own default markup);
 * - lodash, Dropzone and the plugin are loaded on demand (dynamic `import()`), so they only weigh on the pages
 *   that mount this component.
 *
 * Nothing is ever uploaded through Dropzone (`autoProcessQueue: false`): the files just live in
 * `dropzone.files` and the page sends them itself (see `buildVoucherFormData`).
 */

// Preview card. Classes are the Preline recipe plus these additions:
// - remove button: `bg-transparent border-0` (Preflight is off, so a bare `<button>` would draw the browser's grey
//   chrome) and `p-1 -m-1` (24px tap target, same look);
// - `gap-x-3` on the header row, `min-w-0` / `flex` on the name column and `shrink-0` on the icon and the button: without them a long file name
//   (the recipe only caps it at `max-w-75`, 300px) pushes the trash button out of a 320px screen.
const PREVIEW_TEMPLATE = `
<div class="p-3 bg-layer border border-layer-line rounded-xl">
  <div class="mb-1 flex justify-between items-center gap-x-3">
    <div class="flex min-w-0 items-center gap-x-3">
      <span class="shrink-0 size-10 flex justify-center items-center bg-layer border border-layer-line text-muted-foreground-1 rounded-lg" data-hs-file-upload-file-icon>
        <img class="rounded-lg hidden" src="data:," alt="" data-dz-thumbnail>
      </span>
      <div class="min-w-0">
        <p class="flex text-sm font-medium text-foreground">
          <span class="truncate inline-block max-w-75 align-bottom" data-hs-file-upload-file-name></span>.<span data-hs-file-upload-file-ext></span>
        </p>
        <p class="text-xs text-muted-foreground-1" data-hs-file-upload-file-size></p>
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-x-2">
      <button type="button" aria-label="Quitar archivo" class="p-1 -m-1 cursor-pointer bg-transparent border-0 text-muted-foreground-1 hover:text-foreground focus:outline-hidden focus:text-foreground" data-hs-file-upload-remove>
        <svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
      </button>
    </div>
  </div>
  <div class="flex items-center gap-x-3 whitespace-nowrap">
    <div class="flex w-full h-2 bg-surface-1 rounded-full overflow-hidden" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" data-hs-file-upload-progress-bar>
      <div class="flex flex-col justify-center rounded-full overflow-hidden bg-primary text-xs text-primary-foreground text-center whitespace-nowrap transition-all duration-500 hs-file-upload-complete:bg-green-500" style="width: 0" data-hs-file-upload-progress-bar-pane></div>
    </div>
    <div class="w-10 text-end"><span class="text-sm text-foreground"><span data-hs-file-upload-progress-bar-value>0</span>%</span></div>
  </div>
</div>`;

// Read by the plugin from the `data-hs-file-upload` attribute. The URL is a dummy: Dropzone requires one, but
// no request is ever made with it.
const PLUGIN_ATTRIBUTE = JSON.stringify({
  url: 'about:blank',
  extensions: { default: { class: 'shrink-0 size-5' } },
});

// Without Preflight an <img> keeps its natural size, so the thumbnail must be fitted to the 40px icon box.
const ROOT_CLASSES =
  '[&_[data-dz-thumbnail]]:size-full [&_[data-dz-thumbnail]]:object-cover [&.dz-drag-hover_[data-hs-file-upload-trigger]]:border-primary';
const TRIGGER_FOCUS = 'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-focus';

const INVALID_TYPE_MESSAGE = 'Solo se permiten imágenes';

let pluginPromise;

/**
 * Loads lodash and Dropzone, exposes them as globals (the plugin reads `_` and `Dropzone` as globals, so they must
 * exist before it is evaluated and constructed), then loads the plugin in its manual-init build. Cached.
 */
function loadFileUploadPlugin() {
  if (!pluginPromise) {
    pluginPromise = (async () => {
      const [{ default: lodash }, { default: Dropzone }] = await Promise.all([import('lodash'), import('dropzone')]);
      window._ = lodash;
      window.Dropzone = Dropzone;
      const { default: HSFileUpload } = await import('@preline/file-upload/non-auto.mjs');
      return HSFileUpload;
    })();
    pluginPromise.catch(() => {
      pluginPromise = undefined; // let a later mount retry after a failed chunk download
    });
  }
  return pluginPromise;
}

/** Marks the card of a file Dropzone refused (wrong type...) so it does not look like a valid attachment. */
function flagRejected(file, message) {
  const card = file.previewElement;
  if (!card) return;
  card.classList.add('border-red-500!');
  const note = document.createElement('p');
  note.className = 'mt-2 text-xs font-medium text-red-600';
  note.setAttribute('role', 'alert');
  note.textContent = String(message);
  card.appendChild(note);
}

/**
 * Props: `id` (hook id of the clickable zone), `accept`, `className`, `labelledBy` (id of the visible label),
 * `onFilesChange(files)` (every change, once per selection; `files` includes the ones rejected by `accept`, flagged
 * `file.accepted === false`) and `onLoadError(error)`.
 * Ref handle: `getFiles()` -> the current `File[]` (rejected ones included, so validation can report them)
 * and `clear()`.
 */
const FileUpload = forwardRef(function FileUpload(
  { id = 'fotos', accept = 'image/*', className, labelledBy, onFilesChange, onLoadError },
  ref,
) {
  const rootRef = useRef(null);
  const dropzoneRef = useRef(null);
  const callbacksRef = useRef({ onFilesChange, onLoadError });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onFilesChange, onLoadError };
  });

  useImperativeHandle(
    ref,
    () => ({
      getFiles: () => dropzoneRef.current?.files.slice() ?? [],
      clear: () => dropzoneRef.current?.removeAllFiles(true),
    }),
    [],
  );

  useEffect(() => {
    // StrictMode runs mount -> cleanup -> mount: `disposed` makes the first (already cancelled) load a no-op,
    // so only one instance is ever created per mounted element.
    let disposed = false;
    let instance = null;

    loadFileUploadPlugin().then(
      (HSFileUpload) => {
        const root = rootRef.current;
        if (disposed || !root || root.dropzone) return;

        // The (minified) class name does not start with "HS", so the plugin cannot create its own instance
        // collection, yet `destroy()` filters it: create it first (that is what `autoInit()` does).
        window.$hsFileUploadCollection ||= [];
        instance = new HSFileUpload(root, {
          acceptedFiles: accept,
          maxFiles: null,
          addRemoveLinks: false,
          autoHideTrigger: false,
          autoProcessQueue: false,
          autoQueue: false,
          hiddenInputContainer: root,
          thumbnailMethod: 'crop',
          dictInvalidFileType: INVALID_TYPE_MESSAGE,
        });
        const { dropzone } = instance;
        dropzoneRef.current = dropzone;

        // A selection of N files fires N `addedfile`: coalesce them into a single notification.
        let scheduled = false;
        const notify = () => {
          if (scheduled) return;
          scheduled = true;
          queueMicrotask(() => {
            scheduled = false;
            if (!disposed) callbacksRef.current.onFilesChange?.(dropzone.files.slice());
          });
        };
        dropzone.on('addedfile', notify);
        dropzone.on('removedfile', notify);
        dropzone.on('error', (file, message) => {
          // Thumbnail failures also emit `error`; only refused files (set before the event) are flagged.
          if (file.accepted === false) flagRejected(file, message);
        });
        setReady(true);
      },
      (error) => {
        if (!disposed) callbacksRef.current.onLoadError?.(error);
      },
    );

    return () => {
      disposed = true;
      dropzoneRef.current = null;
      // Removes the previews, the hidden input, the listeners and the `$hsFileUploadCollection` entry.
      instance?.destroy();
    };
  }, [accept]);

  const openPicker = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    dropzoneRef.current?.hiddenFileInput?.click();
  };

  return (
    <div
      ref={rootRef}
      className={cls(ROOT_CLASSES, className)}
      data-hs-file-upload={PLUGIN_ATTRIBUTE}
      data-ready={ready ? 'true' : 'false'}
    >
      <template data-hs-file-upload-preview dangerouslySetInnerHTML={{ __html: PREVIEW_TEMPLATE }} />

      <div
        id={id}
        role="button"
        tabIndex={0}
        aria-labelledby={labelledBy}
        aria-describedby={`${id}Help`}
        onKeyDown={openPicker}
        className={cls(
          'cursor-pointer p-12 flex justify-center bg-layer border border-dashed border-line-3 rounded-xl',
          TRIGGER_FOCUS,
        )}
        data-hs-file-upload-trigger
      >
        <div className="text-center">
          <span className="inline-flex justify-center items-center size-16">
            <svg
              className="shrink-0 w-16 text-muted-foreground mx-auto"
              width="73"
              height="47"
              viewBox="0 0 73 47"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M54.519 40.4773V6.76876C54.519 3.92686 52.2121 1.62305 49.3664 1.62305H22.7076C19.8619 1.62305 17.555 3.92686 17.555 6.76876V40.4773M54.519 40.4773C54.519 43.3192 52.2121 45.6231 49.3664 45.6231H22.7076C19.8619 45.6231 17.555 43.3192 17.555 40.4773M54.519 40.4773L54.5189 34.6563L48.6564 28.3566L43.2612 34.6373C42.4421 35.5908 40.9662 35.5955 40.141 34.6472L30.3406 23.3844L17.555 36.9154V40.4773M6.20483 9.59424L17.707 7.6798V42.5188L12.6457 43.5828C9.25658 44.2954 5.94238 42.0892 5.29702 38.691L1.14643 16.8357C0.500082 13.4322 2.78322 10.1637 6.20483 9.59424ZM65.8691 9.59424L54.3669 7.6798V42.5188L59.4282 43.5828C62.8173 44.2954 66.1316 42.0892 66.7769 38.691L70.9274 16.8357C71.5738 13.4322 69.2907 10.1637 65.8691 9.59424ZM45.0584 15.3561C45.0584 17.7228 43.1372 19.6413 40.7673 19.6413C38.3974 19.6413 36.4762 17.7228 36.4762 15.3561C36.4762 12.9894 38.3974 11.0708 40.7673 11.0708C43.1372 11.0708 45.0584 12.9894 45.0584 15.3561Z"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </span>
          <div className="mt-4 flex flex-wrap justify-center text-sm/6 text-muted-foreground-2">
            <span className="pe-1 font-medium text-foreground">Arrastrá tus fotos acá o</span>
            <span className="bg-layer font-semibold text-primary hover:text-primary-hover rounded-lg decoration-2 hover:underline focus-within:outline-hidden focus-within:ring-2 focus-within:ring-primary-focus focus-within:ring-offset-2">
              explorá
            </span>
          </div>
          <p id={`${id}Help`} className="mt-1 text-xs text-muted-foreground">
            Seleccioná una o más imágenes desde tu galería o cámara. Hasta 50 MB en total.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 empty:mt-0" data-hs-file-upload-previews />
    </div>
  );
});

export default FileUpload;
