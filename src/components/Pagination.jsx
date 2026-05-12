import React from 'react';
import '../css/Pagination.css';

/**
 * Reusable Pagination component.
 * Props:
 *   currentPage  – 1-based current page index
 *   totalPages   – total number of pages
 *   onPageChange – callback(newPage)
 *   totalItems   – total record count (optional, for label)
 *   pageSize     – records per page (optional, for label)
 */
const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, pageSize }) => {
  if (totalPages <= 1) return null;

  // Build page number buttons: always show first, last, current ±2, with ellipsis gaps
  const buildPages = () => {
    const pages = [];
    const delta = 2;
    const left  = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  const start = pageSize ? (currentPage - 1) * pageSize + 1 : null;
  const end   = pageSize && totalItems ? Math.min(currentPage * pageSize, totalItems) : null;

  return (
    <div className="pagination-bar">
      {totalItems != null && pageSize != null && (
        <span className="pagination-info">
          Showing {start}–{end} of {totalItems}
        </span>
      )}

      <div className="pagination-controls">
        <button
          className="page-btn nav-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <i className="fa-solid fa-chevron-left" />
        </button>

        {buildPages().map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="page-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`page-btn ${p === currentPage ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          className="page-btn nav-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <i className="fa-solid fa-chevron-right" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
