/** Offline equivalent of the public blog listing endpoint.
 * Popular articles follow the actual public endpoint snapshot captured on
 * 2026-11-03, rather than inventing popularity scores absent from the dataset.
 */
const popularSlugs = new Set([
  'what-you-need-to-know-about-bathing-your-pet',
  'a-couple-of-interesting-facts',
  'proper-care-for-dogs-involves-several-essential-aspects-to-ensure-their-well-being',
  'what-food-is-better-to-choose',
]);

export function handleBlogQuery(data, searchParams = new URLSearchParams()) {
  const params = typeof searchParams === 'string'
    ? new URLSearchParams(searchParams)
    : searchParams;
  const get = key => typeof params.get === 'function' ? params.get(key) : params[key];
  const category = String(get('category') ?? '0');
  const sort = get('sortParam') || 'newest';
  const requestedPage = Number(get('page') || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const sourceLimit = Number(data.blogList?.pagination?.limit);
  const limit = Number.isSafeInteger(sourceLimit) && sourceLimit > 0 ? sourceLimit : 9;
  let articles = [...(data.blogList?.data || [])];

  if (category !== '0' && category !== 'all') {
    const selected = data.categories?.find(item => String(item.id) === category);
    const ids = new Set((selected?.articles || []).map(item => String(item.id)));
    articles = articles.filter(item => ids.has(String(item.id)));
  }
  if (sort === 'popular') articles = articles.filter(item => popularSlugs.has(item.slug));
  const direction = sort === 'oldest' ? 1 : -1;
  articles.sort((a, b) => direction * (
    (Date.parse(a.date_of_publish) || 0) - (Date.parse(b.date_of_publish) || 0)
  ));

  const start = (page - 1) * limit;
  return {
    ...data,
    blogList: {
      ...data.blogList,
      data: articles.slice(start, start + limit),
      pagination: { ...data.blogList?.pagination, start, limit, total: articles.length },
    },
  };
}
