import Domain from '../models/domain.model.js';
import Technology from '../models/technology.model.js';
import Tutorial from '../models/tutorial.model.js';

// @desc    Create new domain
// @route   POST /api/v1/domains
// @access  Private/Admin
export const createDomain = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    
    // Check if domain already exists
    const domainExists = await Domain.findOne({ name });
    
    if (domainExists) {
      return res.status(400).json({ message: 'Domain already exists' });
    }
    
    // Create domain
    const domain = await Domain.create({
      name,
      description,
      icon: icon || 'folder'
    });
    
    res.status(201).json(domain);
  } catch (error) {
    console.error('Error in createDomain:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all domains
// @route   GET /api/v1/domains
// @access  Public
export const getDomains = async (req, res) => {
  try {
    const domains = await Domain.find().sort({ name: 1 });
    
    res.json(domains);
  } catch (error) {
    console.error('Error in getDomains:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get domain by ID
// @route   GET /api/v1/domains/:id
// @access  Public
export const getDomainById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let domain;
    
    // Check if id is a valid ObjectId
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      domain = await Domain.findById(id);
    } else {
      // If not, try to find by slug
      domain = await Domain.findOne({ slug: id });
    }
    
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }
    
    // Populate technologies
    await domain.populate('technologies');
    
    res.json(domain);
  } catch (error) {
    console.error('Error in getDomainById:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update domain
// @route   PUT /api/v1/domains/:id
// @access  Private/Admin
export const updateDomain = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon } = req.body;
    
    const domain = await Domain.findById(id);
    
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }
    
    // Check if name is being changed and already exists
    if (name && name !== domain.name) {
      const domainExists = await Domain.findOne({ name });
      
      if (domainExists) {
        return res.status(400).json({ message: 'Domain name already exists' });
      }
    }
    
    // Update fields
    if (name) domain.name = name;
    if (description) domain.description = description;
    if (icon) domain.icon = icon;
    
    const updatedDomain = await domain.save();
    
    res.json(updatedDomain);
  } catch (error) {
    console.error('Error in updateDomain:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete domain
// @route   DELETE /api/v1/domains/:id
// @access  Private/Admin
export const deleteDomain = async (req, res) => {
  try {
    const { id } = req.params;
    
    const domain = await Domain.findById(id);
    
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }
    
    // Check if domain has technologies
    const technologiesCount = await Technology.countDocuments({ domain: id });
    
    if (technologiesCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete domain. It has ${technologiesCount} technologies.` 
      });
    }
    
    // Check if domain has tutorials
    const tutorialsCount = await Tutorial.countDocuments({ domain: id });
    
    if (tutorialsCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete domain. It has ${tutorialsCount} tutorials.` 
      });
    }
    
    await domain.remove();
    
    res.json({ message: 'Domain removed' });
  } catch (error) {
    console.error('Error in deleteDomain:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};