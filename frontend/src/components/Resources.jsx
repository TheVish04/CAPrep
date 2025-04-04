import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import './Resources.css';
import DonationButton from './DonationButton';
import axios from 'axios';

// Re-use Bookmark icon from Questions component (or define it here if preferred)
const BookmarkIcon = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? '#03a9f4' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
  </svg>
);

const Resources = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [resources, setResources] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    subject: '',
    paperType: '',
    year: '',
    month: '',
    examStage: '',
    paperNo: '',
    search: '',
    bookmarked: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [bookmarkedResourceIds, setBookmarkedResourceIds] = useState(new Set());
  const resourcesPerPage = 10;
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://caprep.onrender.com';

  // --- Fetch Bookmarked Resource IDs --- 
  const fetchBookmarkIds = useCallback(async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/me/bookmarks/resources/ids`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.data && response.data.bookmarkedResourceIds) {
        setBookmarkedResourceIds(new Set(response.data.bookmarkedResourceIds));
      }
    } catch (err) {
      console.error('Error fetching resource bookmark IDs:', err);
    }
  }, [API_BASE_URL]);

  // --- Fetch Resources based on filters --- 
  const fetchResources = useCallback(async (token, currentFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`${API_BASE_URL}/api/resources`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: params
      });
      setResources(response.data || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch resources');
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  // --- Initial Load --- 
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login'); // Redirect to login if no token
    } else {
      fetchBookmarkIds(token);
      // Apply URL params to initial filters before fetching
      const params = new URLSearchParams(location.search);
      const initialFilters = { ...filters }; // Start with default filters
      if (params.get('examStage')) initialFilters.examStage = params.get('examStage');
      if (params.get('subject')) initialFilters.subject = params.get('subject');
      if (params.get('bookmarked') === 'true') initialFilters.bookmarked = true;
      // Update state once, triggering the fetch effect
      setFilters(initialFilters);
    }
  }, [navigate, location.search, fetchBookmarkIds]); // Rerun if location search changes

  // --- Fetch on Filter Change --- 
   useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
        // Fetch whenever filters state changes
        fetchResources(token, filters);
    }
    // Exclude fetchResources if wrapped in useCallback and API_BASE_URL is stable
  }, [filters]); // Dependency on filters object


  // Get unique years for filtering
  const getUniqueYears = () => {
    const uniqueYears = [...new Set(resources.map((r) => r.year))];
    return uniqueYears.sort((a, b) => b - a); // Sort descending
  };

  // --- Handle Filter Input Change --- 
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFilters(prevFilters => {
      const updatedFilters = { ...prevFilters, [name]: newValue };
      if (name === 'examStage') {
          updatedFilters.subject = '';
          updatedFilters.paperNo = '';
      }
      setCurrentPage(1); // Reset page on filter change
      return updatedFilters;
    });
  };

  // --- Handle Bookmark Toggle --- 
  const handleBookmarkToggle = async (resourceId) => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    const isCurrentlyBookmarked = bookmarkedResourceIds.has(resourceId);
    const method = isCurrentlyBookmarked ? 'delete' : 'post';
    const url = `${API_BASE_URL}/api/users/me/bookmarks/resource/${resourceId}`;

    try {
      const response = await axios[method](url, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data && response.data.bookmarkedResourceIds) {
        setBookmarkedResourceIds(new Set(response.data.bookmarkedResourceIds));
      }
      
      // Refetch if viewing bookmarks and one was removed
      if (isCurrentlyBookmarked && filters.bookmarked) {
          fetchResources(token, filters);
      }

    } catch (err) {
      console.error('Error updating resource bookmark:', err);
      alert(err.response?.data?.error || 'Failed to update bookmark');
    }
  };

  // Pagination logic
  const indexOfLastResource = currentPage * resourcesPerPage;
  const indexOfFirstResource = indexOfLastResource - resourcesPerPage;
  const currentResources = resources.slice(indexOfFirstResource, indexOfLastResource);
  const totalPages = Math.ceil(resources.length / resourcesPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Download a resource and increment download count
  const handleDownload = async (resource) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login'); // Redirect if not logged in
      
      // Increment download count (fire and forget, or handle response if needed)
      axios.post(`${API_BASE_URL}/api/resources/${resource._id}/download`, {}, {
          headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => console.error('Failed to increment download count:', err)); // Log error if count fails
      
      // Construct the full URL correctly for opening
      // Assuming fileUrl is like "/uploads/resources/filename.pdf"
      const resourceUrl = `${API_BASE_URL}${resource.fileUrl}`;
      
      window.open(resourceUrl, '_blank');
    } catch (error) { // Catch errors related to window.open or URL construction
      console.error('Error preparing resource download:', error);
      alert('Failed to open the resource. Please check pop-up blockers or try again.');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
      if (bytes === 0 || !bytes) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="resources-section">
        <div className="resources-container">
          <h1>Study Resources</h1>
          
          {loading && <div className="loading-indicator">Loading resources...</div>}
          {error && <div className="error"><p>Error: {error}</p></div>}

          <div className="resources-actions">
            <div className="search-bar">
              <input
                type="text"
                name="search"
                placeholder="Search resources by title/description..."
                value={filters.search}
                onChange={handleFilterChange}
                disabled={loading}
              />
            </div>
            <DonationButton buttonText="Support Us 📚" />
          </div>

          {/* --- Filters Section --- */}
          <div className="filters">
            <div className="filter-group">
              <label>Exam Stage:</label>
              <select name="examStage" value={filters.examStage} onChange={handleFilterChange} disabled={loading}>
                <option value="">All</option>
                <option value="Foundation">Foundation</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Final">Final</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Subject:</label>
              <select name="subject" value={filters.subject} onChange={handleFilterChange} disabled={loading || !filters.examStage}>
                <option value="">All</option>
                {filters.examStage === 'Foundation' ? (
                  <>
                    <option value="Principles and Practices of Accounting">Principles and Practices of Accounting</option>
                    <option value="Business Law">Business Law</option>
                    <option value="Business Correspondence and Reporting">Business Correspondence and Reporting</option>
                    <option value="Business Mathematics">Business Mathematics</option>
                    <option value="Logical Reasoning">Logical Reasoning</option>
                    <option value="Statistics">Statistics</option>
                    <option value="Business Economics">Business Economics</option>
                    <option value="Business and Commercial Knowledge">Business and Commercial Knowledge</option>
                  </>
                ) : filters.examStage === 'Intermediate' ? (
                  <>
                    <option value="Advanced Accounting">Advanced Accounting</option>
                    <option value="Corporate Laws">Corporate Laws</option>
                    <option value="Cost and Management Accounting">Cost and Management Accounting</option>
                    <option value="Taxation">Taxation</option>
                    <option value="Auditing and Code of Ethics">Auditing and Code of Ethics</option>
                    <option value="Financial and Strategic Management">Financial and Strategic Management</option>
                  </>
                ) : filters.examStage === 'Final' ? (
                  <>
                    <option value="Financial Reporting">Financial Reporting</option>
                    <option value="Advanced Financial Management">Advanced Financial Management</option>
                    <option value="Advanced Auditing">Advanced Auditing</option>
                    <option value="Direct and International Tax Laws">Direct and International Tax Laws</option>
                    <option value="Indirect Tax Laws">Indirect Tax Laws</option>
                    <option value="Integrated Business Solutions">Integrated Business Solutions</option>
                  </>
                ) : (
                  <>
                    <option value="Advanced Accounting">Advanced Accounting</option>
                    <option value="Corporate Laws">Corporate Laws</option>
                    <option value="Taxation">Taxation</option>
                    <option value="Cost & Management">Cost & Management</option>
                    <option value="Auditing">Auditing</option>
                    <option value="Financial Management">Financial Management</option>
                  </>
                )}
              </select>
            </div>
            <div className="filter-group">
              <label>Paper Type:</label>
              <select name="paperType" value={filters.paperType} onChange={handleFilterChange} disabled={loading}>
                <option value="">All</option>
                <option value="MTP">MTP</option>
                <option value="RTP">RTP</option>
                <option value="PYQS">PYQS</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Year:</label>
              <select name="year" value={filters.year} onChange={handleFilterChange} disabled={loading}>
                <option value="">All</option>
                {getUniqueYears().map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>Month:</label>
              <select name="month" value={filters.month} onChange={handleFilterChange} disabled={loading}>
                <option value="">All</option>
                <option value="January">January</option>
                <option value="February">February</option>
                <option value="March">March</option>
                <option value="April">April</option>
                <option value="May">May</option>
                <option value="June">June</option>
                <option value="July">July</option>
                <option value="August">August</option>
                <option value="September">September</option>
                <option value="October">October</option>
                <option value="November">November</option>
                <option value="December">December</option>
              </select>
            </div>
            {filters.examStage === 'Foundation' && (
              <div className="filter-group">
                <label>Paper Number:</label>
                <select name="paperNo" value={filters.paperNo} onChange={handleFilterChange} disabled={loading}>
                  <option value="">All</option>
                  <option value="1">Paper 1</option>
                  <option value="2">Paper 2</option>
                  <option value="3">Paper 3</option>
                  <option value="4">Paper 4</option>
                </select>
              </div>
            )}
            <div className="filter-group filter-group-bookmark">
              <label htmlFor="resourceBookmarkFilter" className="bookmark-filter-label">
                <input
                  type="checkbox"
                  id="resourceBookmarkFilter"
                  name="bookmarked"
                  checked={filters.bookmarked}
                  onChange={handleFilterChange}
                  disabled={loading}
                  className="bookmark-checkbox"
                />
                Show Bookmarked Only
              </label>
            </div>
          </div>

          {/* --- Resource List --- */}
          {!loading && resources.length === 0 && !error && (
            <div className="no-resources">
              <p>No resources found matching the selected filters.</p>
            </div>
          )}

          {!loading && resources.length > 0 && (
            <div className="resources-list">
              {currentResources.map((r) => (
                <div key={r._id} className="resource-card">
                  <div className="resource-header">
                    <h3 className="resource-title">{r.title}</h3>
                    <button 
                      onClick={() => handleBookmarkToggle(r._id)} 
                      className="bookmark-btn resource-bookmark-btn"
                      title={bookmarkedResourceIds.has(r._id) ? 'Remove Bookmark' : 'Add Bookmark'}
                     >
                       <BookmarkIcon filled={bookmarkedResourceIds.has(r._id)} />
                    </button>
                  </div>
                  <p className="resource-description">{r.description || 'No description available.'}</p>
                  <div className="resource-meta">
                    <span>{r.subject}</span> | 
                    <span>{r.paperType}</span> | 
                    <span>{r.year} {r.month}</span> | 
                    <span>{r.examStage}</span> 
                    {r.paperNo && <span> | Paper {r.paperNo}</span>}
                  </div>
                   <div className="resource-footer">
                      <span className="file-size">Size: {formatFileSize(r.fileSize)}</span>
                      <button onClick={() => handleDownload(r)} className="download-btn">
                        Download / View PDF
                      </button>
                   </div>
                </div>
              ))}
            </div>
          )}
          
          {/* --- Pagination --- */}
          {!loading && totalPages > 1 && (
             <div className="pagination">
               {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                 <button
                   key={page}
                   onClick={() => paginate(page)}
                   className={currentPage === page ? 'active' : ''}
                 >
                   {page}
                 </button>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Resources; 