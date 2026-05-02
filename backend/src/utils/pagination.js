/**
 * Pagination helpers
 * Usage:
 *   const { page, limit, offset } = getPagination(req.query);
 *   const { rows, meta } = buildPaginationResult(result, page, limit);
 * 
 * Example endpoint:
 *   GET /api/tasks?page=1&limit=20   -> default limit=20, max=100
 *   GET /api/tasks?offset=0&limit=20  -> direct offset
 */

/**
 * Extract page & limit from req.query.
 * Accepts either `page`/`limit` OR `offset`/`limit`.
 * Default limit = 20, max limit = 100.
 */
function getPagination(query) {
  let limit = parseInt(query.limit, 10);
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  let offset;
  if (query.offset !== undefined) {
    offset = parseInt(query.offset, 10);
    if (isNaN(offset) || offset < 0) offset = 0;
  } else {
    let page = parseInt(query.page, 10);
    if (isNaN(page) || page < 1) page = 1;
    offset = (page - 1) * limit;
  }

  const page = Math.floor(offset / limit) + 1;

  return { page, limit, offset };
}

/**
 * Build standard paginated response.
 * `result` should be a pg result with .rows and possibly .rowCount
 * `totalCount` is optional — pass it if you ran COUNT(*) separately.
 */
function buildPaginationResult(result, page, limit, totalCount) {
  const rows = result.rows || [];
  const fetchedCount = result.rowCount !== undefined ? result.rowCount : rows.length;
  const count = totalCount !== undefined ? totalCount : null;

  return {
    data: rows,
    meta: {
      page,
      limit,
      fetched: fetchedCount,
      ...(count !== null ? { total: count } : {}),
    },
  };
}

/**
 * Build return object with rows already wrapped in { data, meta }
 */
function paginatedResponse(result, page, limit, totalCount) {
  const { data, meta } = buildPaginationResult(result, page, limit, totalCount);
  return { data, meta };
}

module.exports = { getPagination, buildPaginationResult, paginatedResponse };