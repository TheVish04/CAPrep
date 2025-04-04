import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from './Navbar';
import './ResourceUploader.css';

const ResourceUploader = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    paperType: '',
    year: '',
    month: '',
    examStage: '',
    paperNo: '',
  });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resources, setResources] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState(null);
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

  // Check admin authentication and fetch existing resources
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    // Check if user is admin
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        navigate('/');
        return;
      }
      const payload = JSON.parse(atob(parts[1]));
      if (payload.role !== 'admin') {
        navigate('/');
        return;
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/');
      return;
    }

    // Fetch resources
    fetchResources(token);
  }, [navigate]);

  const fetchResources = async (token, query = '') => {
    try {
      const response = await fetch(`https://caprep.onrender.com/api/resources${query ? `?${query}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setResources(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch resources:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const applyFilters = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const query = new URLSearchParams(filters).toString();
    fetchResources(token, query);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setErrors((prev) => ({ ...prev, file: 'Only PDF files are allowed' }));
        setFile(null);
      } else if (selectedFile.size > 15 * 1024 * 1024) { // 15MB limit
        setErrors((prev) => ({ ...prev, file: 'File size must be less than 15MB' }));
        setFile(null);
      } else {
        setErrors((prev) => ({ ...prev, file: '' }));
        setFile(selectedFile);
      }
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'title':
        if (!value.trim()) error = 'Title is required';
        break;
      case 'subject':
        if (!value) error = 'Subject is required';
        break;
      case 'paperType':
        if (!value) error = 'Paper Type is required';
        break;
      case 'year':
        if (!value) error = 'Year is required';
        break;
      case 'month':
        if (!value) error = 'Month is required';
        break;
      case 'examStage':
        if (!value) error = 'Exam Stage is required';
        break;
      case 'paperNo':
        if (formData.examStage === 'Foundation' && !value) {
          error = 'Paper No. is required for Foundation stage';
        }
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['title', 'subject', 'paperType', 'year', 'month', 'examStage'];
    
    // Add paperNo to required fields if examStage is Foundation
    if (formData.examStage === 'Foundation') {
      requiredFields.push('paperNo');
    }
    
    requiredFields.forEach((field) => {
      validateField(field, formData[field]);
      if (errors[field]) newErrors[field] = errors[field];
    });
    
    // For new resource, validate file
    if (!isEditMode && !file) {
      newErrors.file = 'PDF file is required';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }
      
      // Create FormData object
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          data.append(key, formData[key]);
        }
      });
      
      if (file) {
        data.append('file', file);
      }
      
      let response;
      
      if (isEditMode) {
        // Update resource (without file)
        response = await fetch(`https://caprep.onrender.com/api/resources/${editingResourceId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      } else {
        // Create new resource
        response = await fetch('https://caprep.onrender.com/api/resources', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: data,
        });
      }
      
      if (response.ok) {
        resetForm();
        fetchResources(token);
        alert(isEditMode ? 'Resource updated successfully!' : 'PDF resource uploaded successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting resource:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (resource) => {
    setFormData({
      title: resource.title || '',
      description: resource.description || '',
      subject: resource.subject || '',
      paperType: resource.paperType || '',
      year: resource.year || '',
      month: resource.month || '',
      examStage: resource.examStage || '',
      paperNo: resource.paperNo || '',
    });
    setIsEditMode(true);
    setEditingResourceId(resource._id);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch(`https://caprep.onrender.com/api/resources/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        fetchResources(token);
        alert('Resource deleted successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      subject: '',
      paperType: '',
      year: '',
      month: '',
      examStage: '',
      paperNo: '',
    });
    setFile(null);
    setErrors({});
    setIsEditMode(false);
    setEditingResourceId(null);
  };

  // Filtered resources for display
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

  // Pagination
  const indexOfLastResource = currentPage * resourcesPerPage;
  const indexOfFirstResource = indexOfLastResource - resourcesPerPage;
  const currentResources = filteredResources.slice(indexOfFirstResource, indexOfLastResource);
  const totalPages = Math.ceil(filteredResources.length / resourcesPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="resource-uploader-section">
        <div className="resource-uploader-container">
          <h1>Admin Panel</h1>
          
          <div className="admin-navigation">
            <Link to="/admin" className="admin-nav-link">Manage Questions</Link>
            <Link to="/admin/resources" className="admin-nav-link active">Manage PDF Resources</Link>
          </div>
          
          <h2>{isEditMode ? 'Edit Resource' : 'Upload PDF Resource'}</h2>
          
          <form onSubmit={handleSubmit} className="resource-form">
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={errors.title ? 'error' : ''}
              />
              {errors.title && <div className="error-message">{errors.title}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="examStage">Exam Stage *</label>
              <select
                id="examStage"
                name="examStage"
                value={formData.examStage}
                onChange={(e) => {
                  // Reset subject when exam stage changes
                  handleChange(e);
                  setFormData(prev => ({ 
                    ...prev, 
                    examStage: e.target.value,
                    subject: '',
                    paperNo: ''
                  }));
                }}
                className={errors.examStage ? 'error' : ''}
              >
                <option value="">Select Exam Stage</option>
                <option value="Foundation">Foundation</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Final">Final</option>
              </select>
              {errors.examStage && <div className="error-message">{errors.examStage}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="subject">Subject *</label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className={errors.subject ? 'error' : ''}
              >
                <option value="">Select Subject</option>
                {formData.examStage === 'Foundation' ? (
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
                ) : formData.examStage === 'Intermediate' ? (
                  // Intermediate subjects
                  <>
                    <option value="Advanced Accounting">Advanced Accounting</option>
                    <option value="Corporate Laws">Corporate Laws</option>
                    <option value="Cost and Management Accounting">Cost and Management Accounting</option>
                    <option value="Taxation">Taxation</option>
                    <option value="Auditing and Code of Ethics">Auditing and Code of Ethics</option>
                    <option value="Financial and Strategic Management">Financial and Strategic Management</option>
                  </>
                ) : formData.examStage === 'Final' ? (
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
                  <option value="">Please select an exam stage first</option>
                )}
              </select>
              {errors.subject && <div className="error-message">{errors.subject}</div>}
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="paperType">Paper Type *</label>
                <select
                  id="paperType"
                  name="paperType"
                  value={formData.paperType}
                  onChange={handleChange}
                  className={errors.paperType ? 'error' : ''}
                >
                  <option value="">Select Paper Type</option>
                  <option value="MTP">MTP</option>
                  <option value="RTP">RTP</option>
                  <option value="PYQS">PYQS</option>
                  <option value="Other">Other</option>
                </select>
                {errors.paperType && <div className="error-message">{errors.paperType}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="year">Year *</label>
                <select
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className={errors.year ? 'error' : ''}
                >
                  <option value="">Select Year</option>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  ))}
                </select>
                {errors.year && <div className="error-message">{errors.year}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="month">Month *</label>
                <select
                  id="month"
                  name="month"
                  value={formData.month}
                  onChange={handleChange}
                  className={errors.month ? 'error' : ''}
                >
                  <option value="">Select Month</option>
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
                {errors.month && <div className="error-message">{errors.month}</div>}
              </div>
            </div>
            
            {formData.examStage === 'Foundation' && (
              <div className="form-group">
                <label htmlFor="paperNo">Paper Number *</label>
                <select
                  id="paperNo"
                  name="paperNo"
                  value={formData.paperNo}
                  onChange={handleChange}
                  className={errors.paperNo ? 'error' : ''}
                >
                  <option value="">Select Paper Number</option>
                  <option value="1">Paper 1</option>
                  <option value="2">Paper 2</option>
                  <option value="3">Paper 3</option>
                  <option value="4">Paper 4</option>
                </select>
                {errors.paperNo && <div className="error-message">{errors.paperNo}</div>}
              </div>
            )}
            
            {!isEditMode && (
              <div className="form-group">
                <label htmlFor="file">PDF File *</label>
                <input
                  type="file"
                  id="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className={errors.file ? 'error' : ''}
                />
                {errors.file && <div className="error-message">{errors.file}</div>}
              </div>
            )}
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : isEditMode ? 'Update Resource' : 'Upload Resource'}
              </button>
              
              {isEditMode && (
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          
          <div className="resources-management">
            <h3>Manage Resources</h3>
            
            <div className="filter-toolbar">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              
              <button 
                className="filter-btn"
                onClick={applyFilters}
              >
                Apply Filters
              </button>
            </div>
            
            <div className="resources-table-container">
              {resources.length === 0 ? (
                <p className="no-resources">No resources found.</p>
              ) : (
                <>
                  <table className="resources-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Subject</th>
                        <th>Type</th>
                        <th>Year/Month</th>
                        <th>Downloads</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentResources.map((resource) => (
                        <tr key={resource._id}>
                          <td>{resource.title}</td>
                          <td>{resource.subject}</td>
                          <td>{resource.paperType}</td>
                          <td>{resource.month} {resource.year}</td>
                          <td>{resource.downloadCount}</td>
                          <td className="action-buttons">
                            <button
                              className="edit-btn"
                              onClick={() => handleEdit(resource)}
                            >
                              Edit
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => handleDelete(resource._id)}
                            >
                              Delete
                            </button>
                            <a
                              href={`https://caprep.onrender.com${resource.fileUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="view-btn"
                            >
                              View
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
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
      </div>
    </div>
  );
};

export default ResourceUploader; 