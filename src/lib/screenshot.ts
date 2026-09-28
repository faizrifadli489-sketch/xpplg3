/** URL layanan screenshot (thum.io). `full` = seluruh halaman, bukan cuma layar pertama. */
export function screenshotApiUrl(url: string, full = false): string {
  return `https://image.thum.io/get/width/1280/${full ? "fullpage/" : ""}noanimate/${url}`;
}
