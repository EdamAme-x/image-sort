import './style.css';

interface ImageSlice {
    element: HTMLCanvasElement;
    originalX: number;
    randomHeight: number;
}

const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const sliceWidthInput = document.getElementById('sliceWidth') as HTMLInputElement;
const processButton = document.getElementById('processButton') as HTMLButtonElement;
const sortButton = document.getElementById('sortButton') as HTMLButtonElement;
const canvasContainer = document.getElementById('canvasContainer') as HTMLDivElement;
const sortAlgorithmSelect = document.getElementById('sortAlgorithm') as HTMLSelectElement;
const sortSpeedInput = document.getElementById('sortSpeed') as HTMLInputElement;


let originalImage: HTMLImageElement | null = null;
let imageSlices: ImageSlice[] = [];
let isSorting = false;

imageInput.addEventListener('change', (event) => {
    const files = (event.target as HTMLInputElement).files;
    if (files && files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                console.log(`Image loaded: ${originalImage.width}x${originalImage.height}`);
                processButton.disabled = false;
                sortButton.disabled = true;
                isSorting = false;
                canvasContainer.innerHTML = '';
                canvasContainer.style.width = `${originalImage.width}px`;
                canvasContainer.style.height = `${originalImage.height}px`;
            };
            img.onerror = () => {
                console.error("Failed to load image.");
                alert("画像の読み込みに失敗しました。");
                originalImage = null;
                processButton.disabled = true;
                sortButton.disabled = true;
                isSorting = false;
                canvasContainer.innerHTML = '';
            };
            img.src = e.target?.result as string;
        }
        reader.readAsDataURL(files[0]);
    } else {
        originalImage = null;
        processButton.disabled = true;
        sortButton.disabled = true;
        isSorting = false;
        canvasContainer.innerHTML = '';
    }
});

processButton.addEventListener('click', () => {
    if (!originalImage) {
        alert("まず画像を選択してください。");
        return;
    }
    if (isSorting) {
        alert("現在ソート処理中です。");
        return;
    }
    const sliceWidth = parseInt(sliceWidthInput.value, 10);
    if (isNaN(sliceWidth) || sliceWidth <= 0) {
        alert("スライス幅には正の整数を入力してください。");
        return;
    }

    console.log(`Processing image with slice width: ${sliceWidth}`);
    processImage(originalImage, sliceWidth);
    sortButton.disabled = false;
});

sortButton.addEventListener('click', async () => {
    if (imageSlices.length === 0) {
        alert("先に画像を処理してください。");
        return;
    }
    if (isSorting) {
        alert("現在ソート処理中です。");
        return;
    }

    const algorithm = sortAlgorithmSelect.value;
    const speed = parseInt(sortSpeedInput.value, 10);

    if (isNaN(speed) || speed < 1) {
        alert("ソート速度は1ms以上に設定してください。");
        return;
    }

    console.log(`Starting sort with ${algorithm} at ${speed}ms per swap...`);
    isSorting = true;
    sortButton.disabled = true;
    processButton.disabled = true;

    try {
        const maxHeight = Math.max(...imageSlices.map(slice => slice.randomHeight));
        canvasContainer.style.height = `${maxHeight}px`;

        await shuffleSlicesVisualization(imageSlices, Math.max(10, speed / 10));
        console.log("Slices shuffled visually.");
        await sleep(500);

        if (algorithm === 'bubbleSort') {
            await bubbleSortVisualization(imageSlices, speed);
            console.log("Bubble Sort finished.");
        } else if (algorithm === 'quickSort') {
            await quickSortVisualization(imageSlices, 0, imageSlices.length - 1, speed);
            console.log("Quick Sort finished.");
        } else {
            alert("未実装のアルゴリズムです。");
        }

        resetSlicePositions(imageSlices);

    } catch (error) {
        console.error("Sorting failed:", error);
        alert("ソート処理中にエラーが発生しました。");
    } finally {
        imageSlices.forEach(s => s?.element?.classList.add('no-transition'));
        isSorting = false;
        if (originalImage) {
            sortButton.disabled = false;
            processButton.disabled = false;
        }
        imageSlices.forEach(s => s?.element?.classList.remove('comparing', 'swapping', 'no-transition'));
        console.log("Sort process ended.");
    }
});

function processImage(img: HTMLImageElement, sliceWidth: number) {
    canvasContainer.innerHTML = '';
    imageSlices = [];
    const imgWidth = img.width;
    const imgHeight = img.height;
    canvasContainer.style.width = `${imgWidth}px`;
    canvasContainer.style.height = `${imgHeight}px`;

    const maxHeight = imgHeight;
    const minHeight = imgHeight * 0.5;

    for (let x = 0; x < imgWidth; x += sliceWidth) {
        const currentSliceWidth = Math.min(sliceWidth, imgWidth - x);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = currentSliceWidth;

        const effectiveImgWidth = Math.max(imgWidth - sliceWidth, 1);
        const t = Math.min(x / effectiveImgWidth, 1.0);
        const assignedHeight = Math.floor(minHeight + (maxHeight - minHeight) * t);
        const calculatedHeight = assignedHeight;
        sliceCanvas.height = calculatedHeight;

        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) continue;

        console.log((imgHeight - calculatedHeight), calculatedHeight, calculatedHeight + (imgHeight - calculatedHeight));

        ctx.drawImage(
            img,
            x,(imgHeight - calculatedHeight), currentSliceWidth, calculatedHeight,
            0, 0, currentSliceWidth, calculatedHeight
        );

        sliceCanvas.style.position = 'absolute';
        sliceCanvas.style.left = `${x}px`;
        sliceCanvas.style.bottom = '0px';
        sliceCanvas.style.top = '';
        sliceCanvas.style.transition = `left 0.3s ease-in-out, bottom 0.3s ease-in-out, transform 0.15s ease-in-out, outline-color 0.1s linear`;
        canvasContainer.appendChild(sliceCanvas);

        imageSlices.push({ element: sliceCanvas, originalX: x, randomHeight: calculatedHeight });
    }

    console.log(`Image processed into ${imageSlices.length} slices with assigned heights.`);
}

function resetSlicePositions(slices: ImageSlice[]) {
    let currentLeft = 0;

    slices.forEach((slice) => {
        if (slice?.element) {
            slice.element.style.left = `${currentLeft}px`;
            slice.element.style.bottom = '0px';
            slice.element.style.top = '';
            slice.element.style.transform = '';

            currentLeft += slice.element.width;
        }
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function highlightElements(elements: (HTMLElement | null)[], className: string, duration: number) {
    const validElements = elements.filter(el => el !== null) as HTMLElement[];
    validElements.forEach(el => el.classList.add(className));
    await sleep(duration);
    validElements.forEach(el => el.classList.remove(className));
}

async function bubbleSortVisualization(slices: ImageSlice[], speed: number) {
    const n = slices.length;
    const compareDuration = Math.max(10, speed / 5);

    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (!isSorting) throw new Error("Sort cancelled");
            if (j + 1 >= n) continue;
            const slice1 = slices[j];
            const slice2 = slices[j + 1];
            if (!slice1?.element || !slice2?.element) continue;

            await highlightElements([slice1.element, slice2.element], 'comparing', compareDuration);

            if (slice1.randomHeight > slice2.randomHeight) {
                await swapSlices(slices, j, j + 1, speed);
            }
        }
    }
}

async function quickSortVisualization(slices: ImageSlice[], low: number, high: number, speed: number) {
    if (low < high) {
        if (!isSorting) throw new Error("Sort cancelled");
        const pi = await partition(slices, low, high, speed);
        await quickSortVisualization(slices, low, pi - 1, speed);
        await quickSortVisualization(slices, pi + 1, high, speed);
    }
}

async function partition(slices: ImageSlice[], low: number, high: number, speed: number): Promise<number> {
    if (low >= high || high >= slices.length || low < 0) {
        return low;
    }

    const pivotSlice = slices[high];
    if (!pivotSlice?.element) {
        console.error(`Pivot element invalid at index ${high}`);
        return low;
    }
    const pivotElement = pivotSlice.element;
    const pivotHeight = pivotSlice.randomHeight;

    let i = low - 1;
    const compareDuration = Math.max(10, speed / 5);

    for (let j = low; j < high; j++) {
        if (!isSorting) throw new Error("Sort cancelled");
        const currentSlice = slices[j];
        if (!currentSlice?.element) continue;

        await highlightElements([currentSlice.element, pivotElement], 'comparing', compareDuration);

        if (currentSlice.randomHeight < pivotHeight) {
            i++;
            if (i !== j && i < slices.length && j < slices.length) {
                 await swapSlices(slices, i, j, speed);
            }
        }
    }

    if (i + 1 < slices.length && high < slices.length && i + 1 !== high) {
        await swapSlices(slices, i + 1, high, speed);
    }
    return i + 1;
}

async function swapSlices(slices: ImageSlice[], i: number, j: number, speed: number): Promise<void> {
    if (i === j || i < 0 || j < 0 || i >= slices.length || j >= slices.length) {
        return Promise.resolve();
    }
    const sliceI = slices[i];
    const sliceJ = slices[j];
    if (!sliceI?.element || !sliceJ?.element) {
        console.error(`Invalid slice objects for swap: index i=${i}, index j=${j}`);
        return Promise.resolve();
    }

    const el1 = sliceI.element;
    const el2 = sliceJ.element;

    el1.classList.add('swapping');
    el2.classList.add('swapping');
    el1.style.transform = 'translateY(-10px)';
    el2.style.transform = 'translateY(-10px)';
    await sleep(150);

    const leftI = el1.style.left;
    const leftJ = el2.style.left;
    el1.style.left = leftJ;
    el2.style.left = leftI;

    [slices[i], slices[j]] = [slices[j], slices[i]];

    await sleep(Math.max(0, speed - 150));

    el1.style.transform = '';
    el2.classList.remove('swapping');
}

async function shuffleSlicesVisualization(slices: ImageSlice[], speed: number) {
    const n = slices.length;
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [slices[i], slices[j]] = [slices[j], slices[i]];
    }

    let currentLeft = 0;
    for (let i = 0; i < n; i++) {
        const slice = slices[i];
        if (slice?.element) {
            slice.element.style.left = `${currentLeft}px`;
            currentLeft += slice.element.width;
            await sleep(speed);
        }
    }
}

processButton.disabled = true;
sortButton.disabled = true;
