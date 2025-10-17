/**
 * OCR (Optical Character Recognition) Module
 *
 * Provides functionality to extract text from images using Tesseract.js.
 * Used for verifying content in images, particularly for testing OpenGraph
 * images and other visual content.
 */

import { createWorker } from "tesseract.js";

/**
 * Extracts text content from an image at the specified URL using OCR
 * @param url - The URL of the image to process
 * @returns Promise that resolves to the extracted text
 * @throws Error if OCR processing fails
 */
export const ocrImageAtUrl = async (url: string): Promise<string> =>
  new Promise(async (resolve, reject) => {
    try {
      const worker = await createWorker("eng", undefined, {
        errorHandler: (e) => reject(e),
      });
      const ret = await worker.recognize(url);
      await worker.terminate();
      resolve(ret.data.text);
    } catch (error) {
      reject(error);
    }
  });
