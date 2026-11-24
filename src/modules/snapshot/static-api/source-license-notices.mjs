/** Add distribution notices only after normalization and deduplication. */
export function withSourceLicenseNotices(item) {
  const licenses = [...new Map((item.contentLicenses ?? [])
    .filter(license => license.notice)
    .map(license => [license.repository, license])).values()];
  if (!licenses.length) return item;
  const sections = licenses.map(license => {
    const urls = (item.sources ?? [item])
      .filter(source => source.repository === license.repository)
      .map(source => source.url).filter(Boolean);
    return [
      `Source: ${license.repository}`,
      ...[...new Set(urls)].map(url => `Original posting: ${url}`),
      `License: ${license.spdx} — ${license.licenseUrl}`,
      license.notice.trim(),
    ].join('\n');
  });
  const suffix = `\n\nSource and license notices\n\n${sections.join('\n\n')}`;
  const description = item.description ?? '';
  if (description.endsWith(suffix)) return item;
  return { ...item, description: description + suffix };
}
