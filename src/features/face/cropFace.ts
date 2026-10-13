// Skia is loaded on first use only (it is heavy, and Jest cannot parse it).
type SkiaModule = typeof import('@shopify/react-native-skia');

export type FaceRect = { x: number; y: number; width: number; height: number };

/** Square around the face, this many times its larger side: room for the server's detector. */
const CONTEXT_SCALE = 2;
const MAX_OUTPUT_SIDE = 640;

/**
 * Cuts one face out of a photo (on the phone, with Skia) and returns it as
 * base64 JPEG. Needed for photos with several children: the face service
 * embeds the largest face of what it receives, so each student must get only
 * their own face. Returns null when the photo cannot be read or its size does
 * not match the detection (e.g. an unhandled EXIF rotation): callers must not
 * fall back to the full photo when it holds more than one face.
 */
export async function cropFaceToBase64(
  imageUri: string,
  face: FaceRect,
  expectedSize: { width: number; height: number },
): Promise<string | null> {
  try {
    const { ImageFormat, Skia }: SkiaModule = await import('@shopify/react-native-skia');
    const data = await Skia.Data.fromURI(imageUri);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) {
      return null;
    }
    const width = image.width();
    const height = image.height();
    if (
      Math.abs(width - expectedSize.width) > 2 ||
      Math.abs(height - expectedSize.height) > 2
    ) {
      return null;
    }

    const side = Math.min(Math.max(face.width, face.height) * CONTEXT_SCALE, width, height);
    const centerX = face.x + face.width / 2;
    const centerY = face.y + face.height / 2;
    const left = Math.min(Math.max(centerX - side / 2, 0), width - side);
    const top = Math.min(Math.max(centerY - side / 2, 0), height - side);
    const outputSide = Math.max(Math.round(Math.min(side, MAX_OUTPUT_SIDE)), 1);

    const surface = Skia.Surface.Make(outputSide, outputSide);
    if (!surface) {
      return null;
    }
    surface
      .getCanvas()
      .drawImageRect(
        image,
        Skia.XYWHRect(left, top, side, side),
        Skia.XYWHRect(0, 0, outputSide, outputSide),
        Skia.Paint(),
      );
    surface.flush();
    return surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, 92);
  } catch {
    return null;
  }
}
