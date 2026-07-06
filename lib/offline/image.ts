// Compressão de imagem no cliente via canvas (sem dependências).
// Reduz para no máx. `max` px no maior lado e exporta JPEG — alvo ~300-400KB.
// 1280px é o mínimo para assinatura/manuscrito do canhoto continuarem legíveis
// no zoom (o embarcador confere quem assinou); não reduzir sem testar isso.
export async function comprimirImagem(
  file: File,
  max = 1280,
  quality = 0.8,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality),
  );
}
