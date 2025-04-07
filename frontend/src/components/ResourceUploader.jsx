import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from './Navbar';
import './ResourceUploader.css';

const ResourceUploader = () => {
  const navigate = useNavigate();
  
  // Initialize form state with empty values
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    paperType: '',
    year: '',
    month: '',
    examStage: '',
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

    // Load cached selections if available
    const cachedSelections = localStorage.getItem('resourceUploaderSelections');
    if (cachedSelections) {
      try {
        const { 
          examStage, 
          subject, 
          paperType, 
          year, 
          month, 
          title
        } = JSON.parse(cachedSelections);
        setFilters(prev => ({
          ...prev,
          examStage: examStage || '',
          subject: subject || '',
          paperType: paperType || '',
          year: year || '',
          month: month || '',
        }));
        setFormData(prev => ({
          ...prev,
          title: title || '',
        }));
      } catch (error) {
        console.error('Error parsing cached selections:', error);
      }
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

  // Cache form selections
  const cacheFormSelections = () => {
    const selectionsToCache = {
      examStage: formData.examStage,
      subject: formData.subject,
      paperType: formData.paperType,
      year: formData.year,
      month: formData.month,
      title: formData.title
    };
    localStorage.setItem('resourceUploaderSelections', JSON.stringify(selectionsToCache));
  };

  // Clear cached selections
  const clearCachedSelections = () => {
    localStorage.removeItem('resourceUploaderSelections');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
    
    // Cache selections when any field is changed
    setTimeout(() => cacheFormSelections(), 100);
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
        
        // Set title based on filename (removing .pdf extension)
        const fileName = selectedFile.name.replace(/\.pdf$/i, '');
        setFormData(prev => ({
          ...prev,
          title: fileName
        }));
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
        if (!value || value.trim() === '') {
          error = 'Title is required';
        } else if (value.length < 5) {
          error = 'Title must be at least 5 characters';
        } else if (value.length > 100) {
          error = 'Title must be less than 100 characters';
        }
        break;
        
      case 'subject':
        if (!value || value === '') {
          error = 'Subject is required';
        }
        break;
        
      case 'paperType':
        if (!value || value === '') {
          error = 'Paper Type is required';
        }
        break;
        
      case 'year':
        if (!value || value === '') {
          error = 'Year is required';
        }
        break;
        
      case 'month':
        if (!value || value === '') {
          error = 'Month is required';
        }
        break;
        
      case 'examStage':
        if (!value || value === '') {
          error = 'Exam Stage is required';
        }
        break;
        
      case 'file':
        if (!value && !isEditMode) {
          error = 'File is required';
        } else if (value && value.type !== 'application/pdf') {
          error = 'Only PDF files are allowed';
        } else if (value && value.size > 15 * 1024 * 1024) { // 15MB limit
          error = 'File size must be less than 15MB';
        }
        break;
        
      default:
        break;
    }
    
    // Update error state for the specific field
    setErrors(prev => ({ ...prev, [name]: error }));
    
    return error === '';
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['title', 'subject', 'paperType', 'year', 'month', 'examStage'];
    
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
        if (isEditMode) {
          // For edit mode, reset the form completely
          resetForm();
        } else {
          // For upload mode, only reset file and title fields, keep other metadata
          setFile(null);
          setFormData(prev => ({
            ...prev,
            title: ''
          }));
          setErrors({});
          setIsEditMode(false);
          setEditingResourceId(null);
        }
        
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
      subject: resource.subject || '',
      paperType: resource.paperType || '',
      year: resource.year || '',
      month: resource.month || '',
      examStage: resource.examStage || '',
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
      subject: '',
      paperType: '',
      year: '',
      month: '',
      examStage: '',
    });
    setFile(null);
    setErrors({});
    setIsEditMode(false);
    setEditingResourceId(null);
    
    // Don't clear cached selections when resetting the form
  };

  // Add method to completely reset form and clear cache
  const resetFormAndCache = () => {
    resetForm();
    clearCachedSelections();
  };

  // Filtered resources for display
  const filteredResources = resources.filter((r) => {
    return (
      (!filters.subject || r.subject === filters.subject) &&
      (!filters.paperType || r.paperType === filters.paperType) &&
      (!filters.year || r.year === filters.year) &&
      (!filters.month || r.month === filters.month) &&
      (!filters.examStage || r.examStage === filters.examStage) &&
      (!filters.search || 
        (r.title && r.title.toLowerCase().includes(filters.search.toLowerCase()))
      )
    );
  });

  // Pagination
  const indexOfLastResource = currentPage * resourcesPerPage;
  const indexOfFirstResource = indexOfLastResource - resourcesPerPage;
  const currentResources = filteredResources.slice(indexOfFirstResource, indexOfLastResource);
  const totalPages = Math.ceil(filteredResources.length / resourcesPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const applyFilters = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const query = new URLSearchParams(filters).toString();
    fetchResources(token, query);
    
    // Cache the filter selections
    const selectionsToCache = {
      examStage: filters.examStage,
      subject: filters.subject,
      paperType: filters.paperType,
      year: filters.year,
      month: filters.month,
    };
    localStorage.setItem('resourceUploaderSelections', JSON.stringify(selectionsToCache));
  };

  // Add a new function to handle viewing resources with proper filename
  const handleViewResource = (resource) => {
    try {
      // Create a proper filename from the resource title
      const properFilename = `${resource.title.replace(/[^\w\s.-]/g, '')}.pdf`;
      
      // Construct the full URL 
      const resourceUrl = `https://caprep.onrender.com${resource.fileUrl}`;
      
      // Create a temporary anchor element to trigger the download with the proper filename
      const link = document.createElement('a');
      link.href = resourceUrl;
      link.download = properFilename;
      link.target = '_blank';
      
      // Append to body, click and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error viewing resource:', error);
      alert('Failed to open the resource. Please try again.');
    }
  };

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
                readOnly={!isEditMode && file !== null}
                title={!isEditMode && file !== null ? "Title is automatically set from PDF filename" : ""}
              />
              {errors.title && <div className="error-message">{errors.title}</div>}
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
                    <option value="Accounting">Accounting</option>
                    <option value="Business Laws">Business Laws</option>
                    <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                    <option value="Business Economics">Business Economics</option>
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
                  <option value="Model TP">Model TP</option>
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
              
              <button 
                type="button" 
                className="reset-btn"
                onClick={resetFormAndCache}
              >
                Reset All
              </button>
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
                            <button
                              className="view-btn"
                              onClick={() => handleViewResource(resource)}
                            >
                              View
                            </button>
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