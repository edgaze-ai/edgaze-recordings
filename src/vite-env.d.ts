/// <reference types="vite/client" />

interface Window {
  __edgazeExport?: { width: number; height: number; duration: number };
  __edgazeDone?: boolean;
  __edgazeStart?: () => Promise<void>;
  __edgazeArm?: () => void;
  __edgazeSeek?: (ms: number) => void;
}

interface CaptureController {
  setFocusBehavior?(
    behavior: 'focus-capturing-application' | 'focus-captured-surface' | 'no-focus-change',
  ): void;
}

declare const CaptureController: {
  new (): CaptureController;
};

type CropTarget = { readonly __cropTarget: unique symbol };

declare const CropTarget: {
  fromElement(element: Element): Promise<CropTarget>;
};

interface DisplayMediaStreamOptions {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: 'include' | 'exclude';
  controller?: CaptureController;
}

interface MediaTrackConstraintSet {
  displaySurface?: string;
}

interface MediaStreamTrack {
  cropTo?(target: CropTarget | null): Promise<void>;
}
