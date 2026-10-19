export function photoFileExists(uri: string) {
  return Boolean(uri);
}

export async function retainPreparedPhoto(uri: string, _originalUri: string) {
  return uri;
}

export async function readPhotoFile(uri: string) {
  // ImageManipulator returns browser blob URLs; native File cannot read them.
  const response = await fetch(uri);
  if (!response.ok) throw new Error("image_read_failed");
  const encoded = await response.blob();
  return { file: encoded, bytes: new Uint8Array(await encoded.arrayBuffer()) };
}

export async function writePhotoFile(
  _uri: string,
  bytes: Uint8Array,
  _originalUri?: string,
) {
  // A self-contained derivative lasts for the draft's page session without
  // allocating another object URL that must stay alive until upload.
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return `data:image/jpeg;base64,${btoa(binary)}`;
}
