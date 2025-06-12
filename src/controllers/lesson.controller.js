// src/controllers/lesson.controller.js
import Lesson from '../models/lesson.model.js';
import Tutorial from '../models/tutorial.model.js';

// Enhanced EditorJS content validation
const validateEditorJSContent = (content) => {
  // Basic structure validation
  if (!content || typeof content !== 'object') {
    return { isValid: false, message: 'Content must be a valid object' };
  }
  
  // Check required fields
  if (!content.hasOwnProperty('time')) {
    return { isValid: false, message: 'Content must have a time field' };
  }
  
  if (!content.hasOwnProperty('blocks')) {
    return { isValid: false, message: 'Content must have a blocks field' };
  }
  
  if (!Array.isArray(content.blocks)) {
    return { isValid: false, message: 'Content blocks must be an array' };
  }
  
  if (!content.hasOwnProperty('version')) {
    return { isValid: false, message: 'Content must have a version field' };
  }
  
  // Validate each block
  for (let i = 0; i < content.blocks.length; i++) {
    const block = content.blocks[i];
    
    if (!block || typeof block !== 'object') {
      return { isValid: false, message: `Block ${i + 1} must be a valid object` };
    }
    
    if (!block.type || typeof block.type !== 'string') {
      return { isValid: false, message: `Block ${i + 1} must have a valid type` };
    }
    
    if (!block.data || typeof block.data !== 'object') {
      return { isValid: false, message: `Block ${i + 1} must have valid data` };
    }
    
    // Validate specific block types
    const blockValidation = validateBlockType(block, i + 1);
    if (!blockValidation.isValid) {
      return blockValidation;
    }
  }
  
  return { isValid: true };
};

// Validate specific block types
const validateBlockType = (block, blockNumber) => {
  const { type, data } = block;
  
  switch (type) {
    case 'paragraph':
      if (typeof data.text !== 'string') {
        return { isValid: false, message: `Block ${blockNumber} (paragraph): text must be a string` };
      }
      break;
      
    case 'header':
      if (typeof data.text !== 'string') {
        return { isValid: false, message: `Block ${blockNumber} (header): text must be a string` };
      }
      if (data.level && (!Number.isInteger(data.level) || data.level < 1 || data.level > 6)) {
        return { isValid: false, message: `Block ${blockNumber} (header): level must be between 1 and 6` };
      }
      break;
      
    case 'list':
      if (!Array.isArray(data.items)) {
        return { isValid: false, message: `Block ${blockNumber} (list): items must be an array` };
      }
      if (data.style && !['ordered', 'unordered'].includes(data.style)) {
        return { isValid: false, message: `Block ${blockNumber} (list): style must be 'ordered' or 'unordered'` };
      }
      break;
      
    case 'code':
      if (typeof data.code !== 'string') {
        return { isValid: false, message: `Block ${blockNumber} (code): code must be a string` };
      }
      break;
      
    case 'quote':
      if (typeof data.text !== 'string') {
        return { isValid: false, message: `Block ${blockNumber} (quote): text must be a string` };
      }
      break;
      
    case 'image':
      if (!data.file || typeof data.file.url !== 'string') {
        return { isValid: false, message: `Block ${blockNumber} (image): must have a valid file.url` };
      }
      break;
      
    case 'embed':
      if (!data.source || typeof data.source !== 'string') {
        return { isValid: false, message: `Block ${blockNumber} (embed): source must be a string` };
      }
      break;
      
    case 'table':
      if (!Array.isArray(data.content)) {
        return { isValid: false, message: `Block ${blockNumber} (table): content must be an array` };
      }
      break;
      
    case 'delimiter':
      // Delimiter blocks typically don't have specific data requirements
      break;
      
    case 'checklist':
      if (!Array.isArray(data.items)) {
        return { isValid: false, message: `Block ${blockNumber} (checklist): items must be an array` };
      }
      break;
      
    // Add more block type validations as needed
    default:
      // For unknown block types, just ensure data exists
      if (!data) {
        return { isValid: false, message: `Block ${blockNumber} (${type}): data is required` };
      }
  }
  
  return { isValid: true };
};

// Helper function to sanitize EditorJS content
const sanitizeEditorJSContent = (content) => {
  const sanitized = {
    time: typeof content.time === 'number' ? content.time : Date.now(),
    blocks: [],
    version: typeof content.version === 'string' ? content.version : "2.28.2"
  };
  
  if (Array.isArray(content.blocks)) {
    sanitized.blocks = content.blocks.map((block, index) => {
      const sanitizedBlock = {
        type: block.type,
        data: block.data || {}
      };
      
      // Include id if present
      if (block.id) {
        sanitizedBlock.id = block.id;
      }
      
      // Include tunes if present
      if (block.tunes) {
        sanitizedBlock.tunes = block.tunes;
      }
      
      return sanitizedBlock;
    });
  }
  
  return sanitized;
};

// Helper function to check for duplicate orders
const checkDuplicateOrder = async (tutorialId, order, excludeLessonId = null) => {
  const query = { 
    tutorial: tutorialId, 
    order: order 
  };
  
  if (excludeLessonId) {
    query._id = { $ne: excludeLessonId };
  }
  
  const existingLesson = await Lesson.findOne(query);
  return existingLesson;
};

// @desc    Create new lesson
// @route   POST /api/v1/tutorials/:tutorialId/lessons
// @access  Private/Admin
export const createLesson = async (req, res) => {
  try {
    const { tutorialId } = req.params;
    const { title, order, content, duration, isPublished } = req.body;
    
    console.log('📝 Creating lesson with content:', JSON.stringify(content, null, 2));
    
    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Lesson title is required' 
      });
    }
    
    if (!order || order < 1) {
      return res.status(400).json({ 
        success: false,
        message: 'Order must be a positive number' 
      });
    }
    
    if (!duration || duration < 1) {
      return res.status(400).json({ 
        success: false,
        message: 'Duration must be a positive number' 
      });
    }
    
    // Check if tutorial exists
    const tutorial = await Tutorial.findById(tutorialId).select('title slug isPublished');
    
    if (!tutorial) {
      return res.status(404).json({ 
        success: false,
        message: 'Tutorial not found' 
      });
    }
    
    // Validate and sanitize EditorJS content
    const contentToValidate = content || {
      time: Date.now(),
      blocks: [],
      version: "2.28.2"
    };
    
    const contentValidation = validateEditorJSContent(contentToValidate);
    if (!contentValidation.isValid) {
      console.error('❌ Content validation failed:', contentValidation.message);
      return res.status(400).json({ 
        success: false,
        message: `Content validation failed: ${contentValidation.message}` 
      });
    }
    
    const sanitizedContent = sanitizeEditorJSContent(contentToValidate);
    console.log('✅ Content validated and sanitized:', JSON.stringify(sanitizedContent, null, 2));
    
    // Check for duplicate order within the same tutorial
    const duplicateOrder = await checkDuplicateOrder(tutorialId, order);
    if (duplicateOrder) {
      return res.status(400).json({ 
        success: false,
        message: `A lesson with order ${order} already exists in this tutorial. Please choose a different order.` 
      });
    }
    
    // Create lesson
    const lessonData = {
      title: title.trim(),
      order: parseInt(order),
      tutorial: tutorialId,
      content: sanitizedContent,
      duration: parseInt(duration),
      isPublished: Boolean(isPublished)
    };
    
    // Set publishedAt if being published
    if (lessonData.isPublished) {
      lessonData.publishedAt = new Date();
    }
    
    console.log('💾 Creating lesson with data:', JSON.stringify(lessonData, null, 2));
    
    const lesson = await Lesson.create(lessonData);
    
    // Populate tutorial information for response
    await lesson.populate('tutorial', 'title slug isPublished');
    
    console.log('✅ Lesson created successfully:', lesson._id);
    
    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: lesson
    });
  } catch (error) {
    console.error('❌ Error in createLesson:', error);
    
    // Handle validation errors from Mongoose
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'A lesson with this order already exists in the tutorial' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// src/controllers/lesson.controller.js - Add this function

// @desc    Get all lessons (admin only) with pagination and filters
// @route   GET /api/v1/lessons
// @access  Private/Admin
export const getAllLessons = async (req, res) => {
  try {
    console.log('🔍 getAllLessons called');
    console.log('📤 User:', req.user?.username, req.user?.role);
    console.log('📤 Query:', req.query);
    
    const { page = 1, limit = 10, search, tutorial, published } = req.query;
    
    // Check authentication and authorization
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin privileges required.' 
      });
    }
    
    // Build query
    const query = {};
    
    if (tutorial) {
      query.tutorial = tutorial;
    }
    
    if (published !== undefined) {
      query.isPublished = published === 'true';
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('📋 Database query:', query);
    
    // Count total lessons
    const total = await Lesson.countDocuments(query);
    console.log('📊 Total lessons found:', total);
    
    // If no lessons found, return empty result
    if (total === 0) {
      console.log('✅ No lessons found, returning empty result');
      return res.json({
        success: true,
        message: 'No lessons found',
        data: [],
        pagination: {
          total: 0,
          page: parseInt(page),
          pages: 0,
          limit: parseInt(limit)
        }
      });
    }
    
    // Get lessons with pagination - using lean() to avoid virtual method errors
    const lessons = await Lesson.find(query)
      .populate('tutorial', 'title slug isPublished')
      .select('-__v') // Exclude version field
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(); // Use lean() to get plain objects and avoid virtual method errors
    
    console.log('📝 Lessons retrieved:', lessons.length);
    
    // Manually format the lessons to ensure consistent structure
    const formattedLessons = lessons.map(lesson => ({
      _id: lesson._id,
      title: lesson.title || 'Untitled Lesson',
      slug: lesson.slug || '',
      order: lesson.order || 1,
      tutorial: lesson.tutorial || null,
      duration: lesson.duration || 0,
      isPublished: lesson.isPublished || false,
      publishedAt: lesson.publishedAt || null,
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt,
      // Only include content summary, not full content for list view
      hasContent: !!(lesson.content && lesson.content.blocks && lesson.content.blocks.length > 0),
      blockCount: lesson.content?.blocks?.length || 0
    }));
    
    res.json({
      success: true,
      message: 'Lessons retrieved successfully',
      data: formattedLessons,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('❌ Error in getAllLessons:', error);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching lessons', 
      error: error.message,
      debug: {
        query: req.query,
        userExists: !!req.user,
        userRole: req.user?.role
      }
    });
  }
};

// @desc    Get all lessons for a tutorial
// @route   GET /api/v1/tutorials/:tutorialId/lessons
// @access  Public
export const getLessonsByTutorial = async (req, res) => {
  try {
    const { tutorialId } = req.params;
    
    // Check if tutorial exists
    const tutorial = await Tutorial.findById(tutorialId).select('title slug isPublished');
    
    if (!tutorial) {
      return res.status(404).json({ 
        success: false,
        message: 'Tutorial not found' 
      });
    }
    
    // Only allow admin to see unpublished tutorials
    if (!tutorial.isPublished && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({ 
        success: false,
        message: 'Tutorial not found' 
      });
    }
    
    // Get lessons
    const query = { tutorial: tutorialId };
    
    // Only show published lessons for regular users
    if (!req.user || req.user.role !== 'admin') {
      query.isPublished = true;
    }
    
    const lessons = await Lesson.find(query)
      .populate('tutorial', 'title slug isPublished')
      .sort({ order: 1 });
    
    res.json({
      success: true,
      message: 'Lessons retrieved successfully',
      data: lessons,
      total: lessons.length
    });
  } catch (error) {
    console.error('Error in getLessonsByTutorial:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get lesson by ID or slug
// @route   GET /api/v1/lessons/:id
// @access  Public
export const getLessonById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let lesson;
    
    // Check if id is a valid ObjectId
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      lesson = await Lesson.findById(id);
    } else {
      // If not, try to find by slug
      lesson = await Lesson.findOne({ slug: id });
    }
    
    if (!lesson) {
      return res.status(404).json({ 
        success: false,
        message: 'Lesson not found' 
      });
    }
    
    // Populate tutorial
    await lesson.populate('tutorial', 'title slug isPublished');
    
    // Only allow admin to see unpublished lessons
    if (!lesson.isPublished && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({ 
        success: false,
        message: 'Lesson not found' 
      });
    }
    
    // Only allow admin to see lessons from unpublished tutorials
    if (!lesson.tutorial.isPublished && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({ 
        success: false,
        message: 'Lesson not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Lesson retrieved successfully',
      data: lesson
    });
  } catch (error) {
    console.error('Error in getLessonById:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Update lesson
// @route   PUT /api/v1/lessons/:id
// @access  Private/Admin
export const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, order, content, duration, isPublished } = req.body;
    
    console.log('📝 Updating lesson with content:', JSON.stringify(content, null, 2));
    
    const lesson = await Lesson.findById(id).populate('tutorial', 'title slug');
    
    if (!lesson) {
      return res.status(404).json({ 
        success: false,
        message: 'Lesson not found' 
      });
    }
    
    // Validate fields if they're being updated
    if (title !== undefined && (!title || !title.trim())) {
      return res.status(400).json({ 
        success: false,
        message: 'Lesson title cannot be empty' 
      });
    }
    
    if (order !== undefined && (order < 1)) {
      return res.status(400).json({ 
        success: false,
        message: 'Order must be a positive number' 
      });
    }
    
    if (duration !== undefined && (duration < 1)) {
      return res.status(400).json({ 
        success: false,
        message: 'Duration must be a positive number' 
      });
    }
    
    // Validate and sanitize content if being updated
    if (content !== undefined) {
      const contentValidation = validateEditorJSContent(content);
      if (!contentValidation.isValid) {
        console.error('❌ Content validation failed:', contentValidation.message);
        return res.status(400).json({ 
          success: false,
          message: `Content validation failed: ${contentValidation.message}` 
        });
      }
    }
    
    // Check for duplicate order if order is being changed
    if (order !== undefined && order !== lesson.order) {
      const duplicateOrder = await checkDuplicateOrder(lesson.tutorial._id, order, lesson._id);
      if (duplicateOrder) {
        return res.status(400).json({ 
          success: false,
          message: `A lesson with order ${order} already exists in this tutorial. Please choose a different order.` 
        });
      }
    }
    
    // Update fields
    if (title !== undefined) lesson.title = title.trim();
    if (order !== undefined) lesson.order = parseInt(order);
    if (content !== undefined) {
      lesson.content = sanitizeEditorJSContent(content);
      console.log('✅ Content sanitized for update:', JSON.stringify(lesson.content, null, 2));
    }
    if (duration !== undefined) lesson.duration = parseInt(duration);
    
    // Handle publishing status
    if (isPublished !== undefined && isPublished !== lesson.isPublished) {
      lesson.isPublished = Boolean(isPublished);
      if (lesson.isPublished) {
        lesson.publishedAt = new Date();
      } else {
        lesson.publishedAt = undefined;
      }
    }
    
    const updatedLesson = await lesson.save();
    
    // Re-populate for response
    await updatedLesson.populate('tutorial', 'title slug isPublished');
    
    console.log('✅ Lesson updated successfully:', updatedLesson._id);
    
    res.json({
      success: true,
      message: 'Lesson updated successfully',
      data: updatedLesson
    });
  } catch (error) {
    console.error('❌ Error in updateLesson:', error);
    
    // Handle validation errors from Mongoose
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'A lesson with this order already exists in the tutorial' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Delete lesson
// @route   DELETE /api/v1/lessons/:id
// @access  Private/Admin
export const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;
    
    const lesson = await Lesson.findById(id).populate('tutorial', 'title');
    
    if (!lesson) {
      return res.status(404).json({ 
        success: false,
        message: 'Lesson not found' 
      });
    }
    
    // Store lesson info for response
    const lessonInfo = {
      title: lesson.title,
      tutorial: lesson.tutorial.title
    };
    
    await Lesson.deleteOne({ _id: id });
    
    res.json({ 
      success: true,
      message: `Lesson "${lessonInfo.title}" removed successfully`,
      data: lessonInfo
    });
  } catch (error) {
    console.error('Error in deleteLesson:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Update lesson content only
// @route   PUT /api/v1/lessons/:id/content
// @access  Private/Admin
export const updateLessonContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    console.log('📝 Updating lesson content:', JSON.stringify(content, null, 2));
    
    const lesson = await Lesson.findById(id);
    
    if (!lesson) {
      return res.status(404).json({ 
        success: false,
        message: 'Lesson not found' 
      });
    }
    
    // Validate EditorJS content structure
    const contentValidation = validateEditorJSContent(content);
    if (!contentValidation.isValid) {
      console.error('❌ Content validation failed:', contentValidation.message);
      return res.status(400).json({ 
        success: false,
        message: `Content validation failed: ${contentValidation.message}` 
      });
    }
    
    lesson.content = sanitizeEditorJSContent(content);
    console.log('✅ Content sanitized:', JSON.stringify(lesson.content, null, 2));
    
    const updatedLesson = await lesson.save();
    
    console.log('✅ Lesson content updated successfully:', updatedLesson._id);
    
    res.json({
      success: true,
      message: 'Lesson content updated successfully',
      data: updatedLesson
    });
  } catch (error) {
    console.error('❌ Error in updateLessonContent:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Duplicate lesson
// @route   POST /api/v1/lessons/:id/duplicate
// @access  Private/Admin
export const duplicateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    
    const originalLesson = await Lesson.findById(id).populate('tutorial');
    
    if (!originalLesson) {
      return res.status(404).json({ 
        success: false,
        message: 'Lesson not found' 
      });
    }
    
    // Find the next available order number in the same tutorial
    const lastLesson = await Lesson.findOne({ tutorial: originalLesson.tutorial._id })
      .sort({ order: -1 });
    
    const nextOrder = lastLesson ? lastLesson.order + 1 : 1;
    
    // Create duplicate lesson with properly structured content
    const duplicateData = {
      title: `${originalLesson.title} (Copy)`,
      order: nextOrder,
      tutorial: originalLesson.tutorial._id,
      content: sanitizeEditorJSContent(originalLesson.content),
      duration: originalLesson.duration,
      isPublished: false // Always create copies as drafts
    };
    
    const duplicatedLesson = await Lesson.create(duplicateData);
    await duplicatedLesson.populate('tutorial', 'title slug isPublished');
    
    res.status(201).json({
      success: true,
      message: 'Lesson duplicated successfully',
      data: duplicatedLesson
    });
  } catch (error) {
    console.error('Error in duplicateLesson:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Reorder lessons within a tutorial
// @route   PUT /api/v1/tutorials/:tutorialId/lessons/reorder
// @access  Private/Admin
export const reorderLessons = async (req, res) => {
  try {
    const { tutorialId } = req.params;
    const { lessonOrders } = req.body; // Array of {lessonId, order}
    
    if (!Array.isArray(lessonOrders)) {
      return res.status(400).json({ 
        success: false,
        message: 'Lesson orders must be an array' 
      });
    }
    
    // Check if tutorial exists
    const tutorial = await Tutorial.findById(tutorialId);
    if (!tutorial) {
      return res.status(404).json({ 
        success: false,
        message: 'Tutorial not found' 
      });
    }
    
    // Update each lesson's order
    const updatePromises = lessonOrders.map(async ({ lessonId, order }) => {
      return Lesson.findOneAndUpdate(
        { _id: lessonId, tutorial: tutorialId },
        { order: parseInt(order) },
        { new: true }
      );
    });
    
    const updatedLessons = await Promise.all(updatePromises);
    
    // Get all lessons for this tutorial with new order
    const allLessons = await Lesson.find({ tutorial: tutorialId })
      .populate('tutorial', 'title slug')
      .sort({ order: 1 });
    
    res.json({
      success: true,
      message: 'Lessons reordered successfully',
      data: allLessons
    });
  } catch (error) {
    console.error('Error in reorderLessons:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};