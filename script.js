/* ========================================================
   1. SOUND ENGINE (GTA + Custom SFX with Built-in Fallback)
   ======================================================== */
const SoundEngine = {
  enabled: true,

  tracks: {
    hover: new Audio('sounds/hover.mp3'),
    click: new Audio('sounds/click.mp3'),
    process: new Audio('sounds/process.mp3'),
    submit: new Audio('sounds/submit.mp3') // GTA Mission Passed sound
  },

  ctx: null,

  initAudioContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  },

  playFallback(freq, type, duration) {
    if (!this.enabled) return;
    try {
      this.initAudioContext();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  },

  play(name) {
    if (!this.enabled) return;
    const sound = this.tracks[name];
    if (sound && sound.src) {
      sound.currentTime = 0;
      sound.play().catch(() => {
        // Agar audio file nahi mili to clean subtle clicks
        if (name === 'hover') this.playFallback(500, 'sine', 0.03);
        if (name === 'click') this.playFallback(800, 'sine', 0.05);
        if (name === 'process') this.playFallback(350, 'triangle', 0.2);
        if (name === 'submit') {
          this.playFallback(523, 'sine', 0.15);
          setTimeout(() => this.playFallback(659, 'sine', 0.2), 100);
        }
      });
    }
  }
};

// Sound toggle button
const soundToggle = document.getElementById('soundToggle');
const soundStatus = document.getElementById('soundStatus');
soundToggle.addEventListener('click', () => {
  SoundEngine.enabled = !SoundEngine.enabled;
  soundStatus.innerText = SoundEngine.enabled ? 'ON' : 'OFF';
  soundStatus.style.color = SoundEngine.enabled ? '#16a34a' : '#ef4444';
});

// Add hover & click listeners to all buttons and inputs
document.querySelectorAll('[data-hover]').forEach((el) => {
  el.addEventListener('mouseenter', () => SoundEngine.play('hover'));
  el.addEventListener('click', () => SoundEngine.play('click'));
});

/* ========================================================
   2. DOM ELEMENTS
   ======================================================== */
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const uploadPrompt = document.getElementById('uploadPrompt');
const imageWrapper = document.getElementById('imageWrapper');
const previewImg = document.getElementById('previewImg');

const fileInfoCard = document.getElementById('fileInfoCard');
const origSizeText = document.getElementById('origSize');
const origDimText = document.getElementById('origDim');
const outputSizeText = document.getElementById('outputSize');

const presetSelect = document.getElementById('presetSelect');
const imgWidth = document.getElementById('imgWidth');
const imgHeight = document.getElementById('imgHeight');
const aspectRatio = document.getElementById('aspectRatio');
const targetKB = document.getElementById('targetKB');

const brightnessSlider = document.getElementById('brightness');
const contrastSlider = document.getElementById('contrast');
const brightVal = document.getElementById('brightVal');
const contrastVal = document.getElementById('contrastVal');
const cleanSignBtn = document.getElementById('cleanSignBtn');
const rotateBtn = document.getElementById('rotateBtn');
const resetAdjustBtn = document.getElementById('resetAdjustBtn');

const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');

let originalImage = new Image();
let originalRatio = 1;
let rotation = 0;
let processedBlob = null;

/* ========================================================
   3. FILE UPLOAD & PREVIEW
   ======================================================== */
dropArea.addEventListener('click', () => fileInput.click());

['dragenter', 'dragover'].forEach((eName) => {
  dropArea.addEventListener(eName, (e) => {
    e.preventDefault();
    dropArea.style.borderColor = '#2563eb';
    dropArea.style.background = '#eff6ff';
  });
});

['dragleave', 'drop'].forEach((eName) => {
  dropArea.addEventListener(eName, (e) => {
    e.preventDefault();
    dropArea.style.borderColor = '#cbd5e1';
    dropArea.style.background = '#f8fafc';
  });
});

dropArea.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  const kb = (file.size / 1024).toFixed(1);
  origSizeText.innerText = `${kb} KB`;

  const reader = new FileReader();
  reader.onload = (e) => {
    originalImage.src = e.target.result;
    originalImage.onload = () => {
      previewImg.src = originalImage.src;
      uploadPrompt.style.display = 'none';
      imageWrapper.style.display = 'flex';
      fileInfoCard.style.display = 'flex';

      imgWidth.value = originalImage.naturalWidth;
      imgHeight.value = originalImage.naturalHeight;
      originalRatio = originalImage.naturalWidth / originalImage.naturalHeight;
      origDimText.innerText = `${originalImage.naturalWidth} x ${originalImage.naturalHeight} px`;

      outputSizeText.innerText = 'Ready to Compress';
      outputSizeText.style.color = '#16a34a';
      downloadBtn.disabled = true;
      resetAdjustments();
    };
  };
  reader.readAsDataURL(file);
}

/* ========================================================
   4. PRESET & ASPECT RATIO
   ======================================================== */
imgWidth.addEventListener('input', () => {
  if (aspectRatio.checked && originalRatio) {
    imgHeight.value = Math.round(imgWidth.value / originalRatio);
  }
});

imgHeight.addEventListener('input', () => {
  if (aspectRatio.checked && originalRatio) {
    imgWidth.value = Math.round(imgHeight.value * originalRatio);
  }
});

presetSelect.addEventListener('change', (e) => {
  const val = e.target.value;
  if (val === 'ssc_photo' || val === 'ibps_photo') {
    imgWidth.value = 200;
    imgHeight.value = 230;
    targetKB.value = 45;
    aspectRatio.checked = false;
  } else if (val === 'ssc_sign' || val === 'ibps_sign') {
    imgWidth.value = 140;
    imgHeight.value = 60;
    targetKB.value = 18;
    aspectRatio.checked = false;
  } else if (val === 'upsc_photo') {
    imgWidth.value = 350;
    imgHeight.value = 350;
    targetKB.value = 90;
    aspectRatio.checked = true;
  }
});

/* ========================================================
   5. IMAGE ADJUSTMENTS (BRIGHTNESS, CONTRAST, CLEAN SIGN)
   ======================================================== */
function updateLiveFilters() {
  previewImg.style.transform = `rotate(${rotation}deg)`;
  previewImg.style.filter = `brightness(${brightnessSlider.value}%) contrast(${contrastSlider.value}%)`;
  brightVal.innerText = `${brightnessSlider.value}%`;
  contrastVal.innerText = `${contrastSlider.value}%`;
}

brightnessSlider.addEventListener('input', updateLiveFilters);
contrastSlider.addEventListener('input', updateLiveFilters);

rotateBtn.addEventListener('click', () => {
  rotation = (rotation + 90) % 360;
  updateLiveFilters();
});

// Signature clear (mobile se khinchee signature ko clean white paper banata hai)
cleanSignBtn.addEventListener('click', () => {
  brightnessSlider.value = 120;
  contrastSlider.value = 160;
  updateLiveFilters();
});

function resetAdjustments() {
  rotation = 0;
  brightnessSlider.value = 100;
  contrastSlider.value = 100;
  updateLiveFilters();
}

resetAdjustBtn.addEventListener('click', resetAdjustments);

/* ========================================================
   6. AUTO COMPRESSOR & RESIZE
   ======================================================== */
processBtn.addEventListener('click', async () => {
  if (!originalImage.src) {
    return alert('Pehle koi photo upload karein!');
  }

  SoundEngine.play('process');
  outputSizeText.innerText = 'Compressing...';
  outputSizeText.style.color = '#eab308';
  downloadBtn.disabled = true;

  const targetW = parseInt(imgWidth.value) || originalImage.naturalWidth;
  const targetH = parseInt(imgHeight.value) || originalImage.naturalHeight;
  const maxKB = parseFloat(targetKB.value) || 50;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (rotation % 180 !== 0) {
    canvas.width = targetH;
    canvas.height = targetW;
  } else {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  // Draw image with adjustments
  ctx.filter = `brightness(${brightnessSlider.value}%) contrast(${contrastSlider.value}%)`;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(originalImage, -targetW / 2, -targetH / 2, targetW, targetH);

  // Binary Search to get exact size under target KB
  let minQ = 0.02;
  let maxQ = 0.98;
  let bestBlob = null;

  for (let i = 0; i < 9; i++) {
    const midQ = (minQ + maxQ) / 2;
    const blob = await new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', midQ));
    bestBlob = blob;
    if (blob.size / 1024 > maxKB) {
      maxQ = midQ;
    } else {
      minQ = midQ;
    }
  }

  processedBlob = bestBlob;
  const finalKB = (processedBlob.size / 1024).toFixed(1);
  outputSizeText.innerText = `${finalKB} KB (Target: ≤${maxKB} KB)`;
  outputSizeText.style.color = '#16a34a';

  previewImg.src = URL.createObjectURL(processedBlob);
  downloadBtn.disabled = false;
});

/* ========================================================
   7. DOWNLOAD + GTA SUBMIT SOUND
   ======================================================== */
downloadBtn.addEventListener('click', () => {
  if (!processedBlob) return;

  // GTA / Mission Passed Sound
  SoundEngine.play('submit');

  const link = document.createElement('a');
  link.href = URL.createObjectURL(processedBlob);
  link.download = `exam_${imgWidth.value}x${imgHeight.value}.jpg`;
  link.click();
});