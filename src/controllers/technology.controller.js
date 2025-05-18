import Technology from '../models/technology.model.js';
import Tutorial from '../models/tutorial.model.js';
import Domain from '../models/domain.model.js';

// @desc    Create new technology
// @route   POST /api/v1/technologies
// @access  Private/Admin
export const createTechnology = async (req, res) => {
  try {
    const { name, description, domain, icon } = req.body;
    
    // Check if domain exists
    const domainExists = await Domain.findById(domain);
    
    if (!domainExists) {
      return res.status(404).json({ message: 'Domain not found' });
    }
    
    // Check if technology already exists
    const technologyExists = await Technology.findOne({ name });
    
    if (technologyExists) {
      return res.status(400).json({ message: 'Technology already exists' });
    }
    
    // Create technology
    const technology = await Technology.create({
      name,
      description,
      domain,
      icon: icon || 'code'
    });
    
    res.status(201).json(technology);
  } catch (error) {
    console.error('Error in createTechnology:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all technologies
// @route   GET /api/v1/technologies
// @access  Public
export const getTechnologies = async (req, res) => {
  try {
    const { domain } = req.query;
    
    const query = {};
    
    if (domain) query.domain = domain;
    
    const technologies = await Technology.find(query)
      .populate('domain', 'name slug')
      .sort({ name: 1 });
    
    res.json(technologies);
  } catch (error) {
    console.error('Error in getTechnologies:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get technology by ID
// @route   GET /api/v1/technologies/:id
// @access  Public
export const getTechnologyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let technology;
    
    // Check if id is a valid ObjectId
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      technology = await Technology.findById(id);
    } else {
      // If not, try to find by slug
      technology = await Technology.findOne({ slug: id });
    }
    
    if (!technology) {
      return res.status(404).json({ message: 'Technology not found' });
    }
    
    // Populate domain
    await technology.populate('domain', 'name slug');
    
    res.json(technology);
  } catch (error) {
    console.error('Error in getTechnologyById:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update technology
// @route   PUT /api/v1/technologies/:id
// @access  Private/Admin
export const updateTechnology = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, domain, icon } = req.body;
    
    const technology = await Technology.findById(id);
    
    if (!technology) {
      return res.status(404).json({ message: 'Technology not found' });
    }
    
    // Check if name is being changed and already exists
    if (name && name !== technology.name) {
      const technologyExists = await Technology.findOne({ name });
      
      if (technologyExists) {
        return res.status(400).json({ message: 'Technology name already exists' });
      }
    }
    
    // Check if domain exists if being changed
    if (domain && domain !== technology.domain.toString()) {
      const domainExists = await Domain.findById(domain);
      
      if (!domainExists) {
        return res.status(404).json({ message: 'Domain not found' });
      }
      
      technology.domain = domain;
    }
    
    // Update fields
    if (name) technology.name = name;
    if (description) technology.description = description;
    if (icon) technology.icon = icon;
    
    const updatedTechnology = await technology.save();
    
    // Populate domain for response
    await updatedTechnology.populate('domain', 'name slug');
    
    res.json(updatedTechnology);
  } catch (error) {
    console.error('Error in updateTechnology:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete technology
// @route   DELETE /api/v1/technologies/:id
// @access  Private/Admin
export const deleteTechnology = async (req, res) => {
  try {
    const { id } = req.params;
    
    const technology = await Technology.findById(id);
    
    if (!technology) {
      return res.status(404).json({ message: 'Technology not found' });
    }
    
    // Check if technology has tutorials
    const tutorialsCount = await Tutorial.countDocuments({ technology: id });
    
    if (tutorialsCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete technology. It has ${tutorialsCount} tutorials.` 
      });
    }
    
    // Replace remove() with deleteOne()
    await Technology.deleteOne({ _id: id });
    
    res.json({ message: 'Technology removed' });
  } catch (error) {
    console.error('Error in deleteTechnology:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};