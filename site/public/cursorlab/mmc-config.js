// Same-origin MediaPipe + models (CSP: default-src 'self') — no CDN, no remote code.
window.MMC_CONFIG = {
  mediapipeBase: '/cursorlab/mediapipe',
  faceModel: '/cursorlab/mediapipe/models/face_landmarker.task',
  handModel: '/cursorlab/mediapipe/models/hand_landmarker.task',
  cameraSource: 'in-page'
};
