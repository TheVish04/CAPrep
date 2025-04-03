import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import './Resources.css';
import DonationButton from './DonationButton';

const Resources = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [resources, setResources] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  // Filters state with the same criteria as questions
  const [filters, setFilters] = useState({
    subject: '',
    paperType: '',
    year: '',
    month: '',
    examStage: '',
    paperNo: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const resourcesPerPage = 10;

  // Apply query parameters to filters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const examStageParam = params.get('examStage');
    const subjectParam = params.get('subject');
    
    const newFilters = { ...filters };
    
    if (examStageParam) {
      newFilters.examStage = examStageParam;
    }
    
    if (subjectParam) {
      newFilters.subject = subjectParam;
    }
    
    if (examStageParam || subjectParam) {
      setFilters(newFilters);
    }
  }, [location.search]);

  // Fetch resources
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    } else {
      const fetchResources = async () => {
        try {
          setLoading(true);
          const response = await fetch('https://caprep.onrender.com/api/resources', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            throw new Error(`Failed to fetch resources: Status ${response.status} - ${response.statusText}`);
          }
          const data = await response.json();
          console.log('Fetched resources:', data);
          setResources(data);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching resources:', error);
          setError(error.message);
          setLoading(false);
        }
      };
      fetchResources();
    }
  }, [navigate]);

  // Get unique years for filtering
  const getUniqueYears = () => {
    const uniqueYears = [...new Set(resources.map((r) => r.year))];
    return uniqueYears.sort((a, b) => b - a); // Sort in descending order
  };

  // Filter resources based on selected criteria
  const filteredResources = resources.filter((r) => {
    return (
      (!filters.subject || r.subject === filters.subject) &&
      (!filters.paperType || r.paperType === filters.paperType) &&
      (!filters.year || r.year === filters.year) &&
      (!filters.month || r.month === filters.month) &&
      (!filters.examStage || r.examStage === filters.examStage) &&
      (!filters.paperNo || r.paperNo === filters.paperNo) &&
      (!filters.search || 
        (r.title && r.title.toLowerCase().includes(filters.search.toLowerCase())) ||
        (r.description && r.description.toLowerCase().includes(filters.search.toLowerCase()))
      )
    );
  });

  // Pagination logic
  const indexOfLastResource = currentPage * resourcesPerPage;
  const indexOfFirstResource = indexOfLastResource - resourcesPerPage;
  const currentResources = filteredResources.slice(indexOfFirstResource, indexOfLastResource);
  const totalPages = Math.ceil(filteredResources.length / resourcesPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Download a resource and increment download count
  const handleDownload = async (resource) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Increment download count
      await fetch(`https://caprep.onrender.com/api/resources/${resource._id}/download`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Create a full URL for the resource
      const resourceUrl = `https://caprep.onrender.com${resource.fileUrl}`;
      
      // Open the PDF file in a new tab
      window.open(resourceUrl, '_blank');
    } catch (error) {
      console.error('Error downloading resource:', error);
      alert('Failed to download the resource. Please try again.');
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="resources-section">
        <div className="resources-container">
          <h1>Study Resources</h1>
          
          {error && (
            <div className="error">
              <p>Error: {error}</p>
            </div>
          )}

          <div className="resources-actions">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search resources..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <DonationButton buttonText="Support Us 📚" />
          </div>

          {/* Filters Section */}
          <div className="filters">
            <div className="filter-group">
              <label>Filter by Exam Stage:</label>
              <select
                value={filters.examStage}
                onChange={(e) => {
                  setFilters({ 
                    ...filters, 
                    examStage: e.target.value, 
                    subject: '',
                    paperNo: '',
                  });
                }}
              >
                <option value="">All</option>
                <option value="Foundation">Foundation</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Final">Final</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Filter by Subject:</label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
              >
                <option value="">All</option>
                {filters.examStage === 'Foundation' ? (
                  // Foundation subjects
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
                  // Intermediate subjects
                  <>
                    <option value="Advanced Accounting">Advanced Accounting</option>
                    <option value="Corporate Laws">Corporate Laws</option>
                    <option value="Cost and Management Accounting">Cost and Management Accounting</option>
                    <option value="Taxation">Taxation</option>
                    <option value="Auditing and Code of Ethics">Auditing and Code of Ethics</option>
                    <option value="Financial and Strategic Management">Financial and Strategic Management</option>
                  </>
                ) : filters.examStage === 'Final' ? (
                  // Final subjects
                  <>
                    <option value="Financial Reporting">Financial Reporting</option>
                    <option value="Advanced Financial Management">Advanced Financial Management</option>
                    <option value="Advanced Auditing">Advanced Auditing</option>
                    <option value="Direct and International Tax Laws">Direct and International Tax Laws</option>
                    <option value="Indirect Tax Laws">Indirect Tax Laws</option>
                    <option value="Integrated Business Solutions">Integrated Business Solutions</option>
                  </>
                ) : (
                  // Default subjects when no exam stage is selected
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
              <label>Filter by Paper Type:</label>
              <select
                value={filters.paperType}
                onChange={(e) => setFilters({ ...filters, paperType: e.target.value })}
              >
                <option value="">All</option>
                <option value="MTP">MTP</option>
                <option value="RTP">RTP</option>
                <option value="PYQS">PYQS</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Filter by Year:</label>
              <select
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              >
                <option value="">All</option>
                {getUniqueYears().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Filter by Month:</label>
              <select
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              >
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
                <label>Filter by Paper Number:</label>
                <select
                  value={filters.paperNo}
                  onChange={(e) => setFilters({ ...filters, paperNo: e.target.value })}
                >
                  <option value="">All</option>
                  <option value="1">Paper 1</option>
                  <option value="2">Paper 2</option>
                  <option value="3">Paper 3</option>
                  <option value="4">Paper 4</option>
                </select>
              </div>
            )}
          </div>

          {/* Display loading state */}
          {loading ? (
            <div className="loading">
              <p>Loading resources...</p>
            </div>
          ) : currentResources.length === 0 ? (
            <div className="no-resources">
              <p>No resources found matching the selected filters.</p>
            </div>
          ) : (
            <>
              {/* Resources Display */}
              <div className="resources-list">
                {currentResources.map((resource) => (
                  <div key={resource._id} className="resource-card">
                    <div className="resource-info">
                      <h3>{resource.title}</h3>
                      <p className="resource-description">{resource.description}</p>
                      <div className="resource-meta">
                        <span><strong>Subject:</strong> {resource.subject}</span>
                        <span><strong>Paper Type:</strong> {resource.paperType}</span>
                        <span><strong>Exam Stage:</strong> {resource.examStage}</span>
                        <span><strong>Year:</strong> {resource.year}</span>
                        <span><strong>Month:</strong> {resource.month}</span>
                        {resource.paperNo && <span><strong>Paper Number:</strong> {resource.paperNo}</span>}
                        <span><strong>Downloads:</strong> {resource.downloadCount}</span>
                      </div>
                    </div>
                    <div className="resource-actions">
                      <button 
                        className="download-btn"
                        onClick={() => handleDownload(resource)}
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => paginate(pageNumber)}
                      className={currentPage === pageNumber ? 'active' : ''}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Resources; 