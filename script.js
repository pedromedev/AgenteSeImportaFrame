const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const dropzone = document.getElementById('dropzone');
const canvas = document.getElementById('canvas');
const downloadBtn = document.getElementById('downloadBtn');

const ctx = canvas.getContext('2d');
const SIZE = 1080; // saída em alta resolução 1080x1080
const FRAME_SCALE = 1.09; // ajuste fino do tamanho do overlay

// Prepara canvas inicial
function resetCanvas() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    // Fundo transparente para export em PNG
}

resetCanvas();

// Carrega overlay
const overlayImage = new Image();
overlayImage.src = 'frame/Filtro LinkedIn PVT.png';

let userImage = null; // HTMLImageElement ou ImageBitmap

function drawAll() {
    if (!userImage) return;
    resetCanvas();

    // Recorte circular (máscara)
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 40, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Enquadra a imagem do usuário cobrindo o círculo (cover)
    const { sx, sy, sw, sh } = computeCover(userImage.width, userImage.height, SIZE, SIZE);
    ctx.drawImage(userImage, sx, sy, sw, sh, 0, 0, SIZE, SIZE);

    ctx.restore();

    // Desenha overlay por cima (levemente ampliado para melhor encaixe)
    const ow = SIZE * FRAME_SCALE;
    const oh = SIZE * FRAME_SCALE;
    const ox = (SIZE - ow) / 2;
    const oy = (SIZE - oh) / 2;
    if (overlayImage.complete) {
        ctx.drawImage(overlayImage, ox, oy, ow, oh);
    } else {
        overlayImage.onload = () => {
            ctx.drawImage(overlayImage, ox, oy, ow, oh);
        };
    }

    downloadBtn.disabled = false;
}

// Calcula região de crop para "object-fit: cover"
function computeCover(srcW, srcH, dstW, dstH) {
    const srcRatio = srcW / srcH;
    const dstRatio = dstW / dstH;
    let sw = srcW, sh = srcH;
    if (srcRatio > dstRatio) {
        // imagem mais larga -> corta laterais
        sh = srcH;
        sw = sh * dstRatio;
    } else {
        // imagem mais alta -> corta topo/base
        sw = srcW;
        sh = sw / dstRatio;
    }
    const sx = (srcW - sw) / 2;
    const sy = (srcH - sh) / 2;
    return { sx, sy, sw, sh };
}

async function handleFiles(files) {
    const file = files && files[0];
    if (!file) return;

    downloadBtn.disabled = true;

    // Tenta usar createImageBitmap para maior compatibilidade (ex.: HEIC/AVIF quando suportado)
    try {
        if (window.createImageBitmap) {
            userImage = await createImageBitmap(file);
            drawAll();
            return;
        }
    } catch (err) {
        // Fallback abaixo
    }

    // Fallback via FileReader + Image
    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            userImage = img;
            drawAll();
        };
        img.onerror = () => {
            alert('Não foi possível abrir esta imagem. Tente JPG/PNG/WebP.');
        };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
}

// Download robusto (toBlob com fallback e tratamento de erros de segurança)
downloadBtn.addEventListener('click', () => {
    try {
        if (canvas.toBlob) {
            canvas.toBlob((blob) => {
                if (!blob) {
                    // Fallback raro
                    const url = canvas.toDataURL('image/png');
                    triggerDownload(url);
                    return;
                }
                const url = URL.createObjectURL(blob);
                triggerDownload(url, true);
            }, 'image/png', 1);
        } else {
            const url = canvas.toDataURL('image/png');
            triggerDownload(url);
        }
    } catch (err) {
        alert('Não foi possível gerar o arquivo. Tente outra imagem ou permita downloads.');
        console.error(err);
    }
});

function triggerDownload(url, isObjectURL = false) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linkedin-open-to-work.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (isObjectURL) setTimeout(() => URL.revokeObjectURL(url), 500);
}

// UI Events
selectBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

// Drag and drop
['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.style.borderColor = 'var(--cyan)';
}));
['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.style.borderColor = 'rgba(255,255,255,.18)';
}));
dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleFiles(files);
});


