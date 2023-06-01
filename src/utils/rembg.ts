import * as ImageJS from "image-js";
// @ts-ignore-next-line
import { InferenceSession, Tensor } from "onnxruntime-web";

let model: InferenceSession = null
const MODEL_DIR: string = '/rembg-web/silueta.onnx'

onmessage = async function(event: MessageEvent) {
  if (event.data === 'loadModel') {
    try {
      await loadModel()
      postMessage('modelLoaded');
    } catch (error) {
      postMessage('modelLoadError');
    }
  } else if (event.data[0] === 'rembg') {
    try {
      const workerResult = await rembg(event.data[1])
      postMessage(['result', workerResult]);
    } catch (error) {
      postMessage('rembgError');
    }
  }
}

export const loadModel = async () => {
  if (model) return model

  const URL: string = MODEL_DIR;
  const session = await InferenceSession.create(URL, { executionProviders: ['wasm'] });

  model = session
  return model
}

export const rembg = async (src: string) => {
  const model = await loadModel()

  // 0 to 255
  const inputImage = await ImageJS.Image.load(src)

  const { width, height } = inputImage
  const imageSize = 320;

  let inputPixels = inputImage.resize({ width: imageSize, height: imageSize }).data as Uint8Array

  if (inputImage.alpha === 1) {
    inputPixels = removeAlpha(inputPixels);
  }

  const inputChannels = [
    new Float32Array(imageSize * imageSize),
    new Float32Array(imageSize * imageSize),
    new Float32Array(imageSize * imageSize),
  ];

  const max = getMax(inputPixels);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];

  for (let i = 0; i < inputPixels.length; i++) {
    const channel = i % 3;
    const channelIndex = Math.floor(i / 3);
    // TODO: look at this again
    inputChannels[channel][channelIndex] =
      (inputPixels[i] / max - mean[channel]) / std[channel];
  }

  const input = concatFloat32Array([
    inputChannels[2],
    inputChannels[0],
    inputChannels[1],
  ]);

  const results = await (model as InferenceSession).run({ "input.1": new Tensor("float32", input, [1, 3, 320, 320]) });

  const mostPreciseOutputName = String(
    Math.min(...(model as InferenceSession).outputNames.map((name: any) => +name)),
  );
  const outputMaskData = results[mostPreciseOutputName]
    .data as Float32Array;

  for (let i = 0; i < outputMaskData.length; i++) {
    outputMaskData[i] = outputMaskData[i] * 255;
  }

  // 从小 resize 到大时，清晰度会变差，导致最后的成图会有锯齿
  const sharpMask = new ImageJS.Image({ width: imageSize, height: imageSize, data: outputMaskData, components: 1, alpha: 0 })
    .resize({ width, height })
    .data;

  const finalPixels = inputImage.clone().data

  for (let i = 0; i < finalPixels.length / 4; i++) {
    const alpha = sharpMask[i];
    finalPixels[i * 4 + 3] = alpha;
  }

  const base64 = (new ImageJS.Image({ width, height, data: finalPixels, kind: 'RGBA' as ImageJS.ImageKind.RGBA, alpha: 1, components: 3 }))
    .toBase64();

  return 'data:image/png;base64,' + base64
}

export function concatFloat32Array(arrays: Float32Array[]): Float32Array {
  let length = 0;
  for (const array of arrays) length += array.length;

  const output = new Float32Array(length);

  let outputIndex = 0;
  for (const array of arrays) {
    for (const n of array) {
      output[outputIndex] = n;
      outputIndex++;
    }
  }

  return output;
}

export function removeAlpha(array: Uint8Array): Uint8Array {
  const output = new Array();
  for (let i = 0; i < array.length; i++) {
    if (i % 4 !== 3) {
      output.push(array[i]);
    }
  }
  return Uint8Array.from(output);
}

export function getMax(array: Uint8Array): number {
  let max = 0;
  for (let i = 0; i < array.length; i++) {
    if (array[i] > max) max = array[i];
  }
  return max;
}