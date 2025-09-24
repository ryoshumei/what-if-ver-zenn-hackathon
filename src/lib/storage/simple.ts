import fs from "fs";
import path from "path";

export interface SimpleStorageResult {
  url: string;
  storagePath: string;
}

export class SimpleStorage {
  private publicDir: string;
  private generatedDir: string;

  constructor() {
    this.publicDir = path.join(process.cwd(), "public");
    this.generatedDir = path.join(this.publicDir, "generated");

    // Ensure directories exist
    this.ensureDirectories();
  }

  private ensureDirectories() {
    if (!fs.existsSync(this.generatedDir)) {
      fs.mkdirSync(this.generatedDir, { recursive: true });
    }
  }

  async saveGeneratedImage(
    generationId: string,
    imageBuffer: Buffer,
    format: string = "png",
  ): Promise<SimpleStorageResult> {
    try {
      const filename = `${generationId}.${format}`;
      const filePath = path.join(this.generatedDir, filename);

      // Write the file
      fs.writeFileSync(filePath, imageBuffer);

      // Return public URL
      const url = `/generated/${filename}`;

      return {
        url,
        storagePath: filePath,
      };
    } catch (error) {
      console.error("Error saving image:", error);
      throw new Error("Failed to save generated image");
    }
  }

  async saveGeneratedVideo(
    generationId: string,
    videoBuffer: Buffer,
    format: string = "mp4",
  ): Promise<SimpleStorageResult> {
    try {
      const filename = `${generationId}.${format}`;
      const filePath = path.join(this.generatedDir, filename);

      // Write the file
      fs.writeFileSync(filePath, videoBuffer);

      // Return public URL
      const url = `/generated/${filename}`;

      return {
        url,
        storagePath: filePath,
      };
    } catch (error) {
      console.error("Error saving video:", error);
      throw new Error("Failed to save generated video");
    }
  }

  async saveDataUrl(
    generationId: string,
    dataUrl: string,
    format: string = "png",
  ): Promise<SimpleStorageResult> {
    try {
      // Extract base64 data from data URL
      const matches = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
      if (!matches) {
        throw new Error("Invalid data URL format");
      }

      const base64Data = matches[1];
      const imageBuffer = Buffer.from(base64Data, "base64");

      return this.saveGeneratedImage(generationId, imageBuffer, format);
    } catch (error) {
      console.error("Error saving data URL:", error);
      throw new Error("Failed to save data URL as image");
    }
  }

  async saveAsset(
    buffer: Buffer,
    filename: string,
    metadata?: Record<string, unknown>,
  ): Promise<SimpleStorageResult> {
    try {
      const filePath = path.join(this.generatedDir, filename);

      // Write the file
      fs.writeFileSync(filePath, buffer);

      // Return public URL
      const url = `/generated/${filename}`;

      return {
        url,
        storagePath: filePath,
      };
    } catch (error) {
      console.error("Error saving asset:", error);
      throw new Error("Failed to save asset");
    }
  }

  getFileUrl(filename: string): string {
    return `/generated/${filename}`;
  }

  fileExists(filename: string): boolean {
    const filePath = path.join(this.generatedDir, filename);
    return fs.existsSync(filePath);
  }
}

// Export singleton instance
export const simpleStorage = new SimpleStorage();
