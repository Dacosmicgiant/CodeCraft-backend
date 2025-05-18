import Tutorial from '../models/tutorial.model.js';
import Lesson from '../models/lesson.model.js';

// @desc    Create new tutorial
// @route   POST /api/v1/tutorials
// @access  Private/Admin
export const createTutorial = async (req, res) => {
  try {
    const { title, description, domain, technology, difficulty, tags } = req.body;

    // Create tutorial
    const tutorial = await Tutorial.create({
      title,
      description,
      domain,
      technology,
      difficulty,
      tags: tags && tags.length > 0 ? tags.split(',').map(tag => tag.trim()) : [],
      author: req.user._id,
      isPublished: false
    });

    res.status(201).json(tutorial);
  } catch (error) {
    console.error('Error in createTutorial:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all tutorials
// @route   GET /api/v1/tutorials
// @access  Public
export const getTutorials = async (req, res) => {
  try {
    const { domain, technology, difficulty, search, page = 1, limit = 10, sort = '-createdAt' } = req.query;
    
    // Build query
    const query = {};
    
    // Only show published tutorials for regular users
    if (!req.user || req.user.role !== 'admin') {
      query.isPublished = true;
    }
    
    if (domain) query.domain = domain;
    if (technology) query.technology = technology;
    if (difficulty) query.difficulty = difficulty;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Count total tutorials
    const total = await Tutorial.countDocuments(query);
    
    // Get tutorials with pagination
    const tutorials = await Tutorial.find(query)
      .populate('domain', 'name slug')
      .populate('technology', 'name slug')
      .populate('author', 'username')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    res.json({
      tutorials,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getTutorials:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get tutorial by ID or slug
// @route   GET /api/v1/tutorials/:id
// @access  Public
export const getTutorialById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let tutorial;
    
    // Check if id is a valid ObjectId
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      tutorial = await Tutorial.findById(id);
    } else {
      // If not, try to find by slug
      tutorial = await Tutorial.findOne({ slug: id });
    }
    
    if (!tutorial) {
      return res.status(404).json({ message: 'Tutorial not found' });
    }
    
    // Only allow admin to see unpublished tutorials
    if (!tutorial.isPublished && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({ message: 'Tutorial not found' });
    }
    
    // Populate related fields
    await tutorial.populate([
      { path: 'domain', select: 'name slug' },
      { path: 'technology', select: 'name slug' },
      { path: 'author', select: 'username' },
      { path: 'lessons', select: 'title slug order duration isPublished', options: { sort: { order: 1 } } }
    ]);
    
    res.json(tutorial);
  } catch (error) {
    console.error('Error in getTutorialById:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update tutorial
// @route   PUT /api/v1/tutorials/:id
// @access  Private/Admin
export const updateTutorial = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, domain, technology, difficulty, tags, isPublished } = req.body;
    
    const tutorial = await Tutorial.findById(id);
    
    if (!tutorial) {
      return res.status(404).json({ message: 'Tutorial not found' });
    }
    
    // Update fields
    if (title !== undefined) tutorial.title = title;
    if (description !== undefined) tutorial.description = description;
    if (domain !== undefined) tutorial.domain = domain;
    if (technology !== undefined) tutorial.technology = technology;
    if (difficulty !== undefined) tutorial.difficulty = difficulty;
    if (tags !== undefined) {
      tutorial.tags = tags.split(',').map(tag => tag.trim());
    }
    
    // Handle publishing
    if (isPublished !== undefined && isPublished !== tutorial.isPublished) {
      tutorial.isPublished = isPublished;
      if (isPublished) {
        tutorial.publishedAt = Date.now();
      }
    }
    
    const updatedTutorial = await tutorial.save();
    
    res.json(updatedTutorial);
  } catch (error) {
    console.error('Error in updateTutorial:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete tutorial
// @route   DELETE /api/v1/tutorials/:id
// @access  Private/Admin
export const deleteTutorial = async (req, res) => {
  try {
    const { id } = req.params;
    
    const tutorial = await Tutorial.findById(id);
    
    if (!tutorial) {
      return res.status(404).json({ message: 'Tutorial not found' });
    }
    
    // Delete associated lessons
    await Lesson.deleteMany({ tutorial: id });
    
    // Delete tutorial
    await tutorial.remove();
    
    res.json({ message: 'Tutorial removed' });
  } catch (error) {
    console.error('Error in deleteTutorial:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};