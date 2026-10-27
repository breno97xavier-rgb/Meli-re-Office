// Only provider hex colors reach inline styles; unknown/missing colors keep Office's default.
export function googleEventColors(background: unknown) {
  if (typeof background !== 'string' || !/^#[0-9a-f]{6}$/i.test(background)) return undefined;
  const rgb = [1, 3, 5].map(offset => {
    const value = parseInt(background.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return { backgroundColor: background, borderColor: background, color: luminance > 0.179 ? '#000000' : '#ffffff' };
}
