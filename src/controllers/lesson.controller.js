// src/controllers/lesson.controller.js
import Lesson from '../models/lesson.model.js';
import Tutorial from '../models/tutorial.model.js';

// Helper function to validate lesson content structure
const validateLessonContent = (content) => {
  if (!content || typeof content !== 'object') {
    return { isValid: false, message: 'Content must be a valid object' };
  }
  
  if (!content.blocks || !Array.isArray(content.blocks)) {
    return { isValid: false, message: 'Content must have a blocks array' };
  }
  
  // Validate each block
  for (let i = 0; i < content.blocks.length; i++) {
    const block = content.blocks[i];
    if (!block.type) {
      return { isValid: false, message: `Block ${i + 1} is missing a type` };
    }
  }
  
  return { isValid: true };
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
    
    // Check if tutorial exists and populate basic info
    const tutorial = await Tutorial.findById(tutorialId).select('title slug isPublished');
    
    if (!tutorial) {
      return res.status(404).json({ 
        success: false,
        message: 'Tutorial not found' 
      });
    }
    
    // Validate content structure
    const contentValidation = validateLessonContent(content);
    if (!contentValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        message: contentValidation.message 
      });
    }
    
    // Check for duplicate order within the same tutorial
    const duplicateOrder = await checkDuplicateOrder(tutorialId, order);
    if (duplicateOrder) {
      return res.status(400).json({ 
        success: false,
        message: `A lesson with order ${order} already exists in this tutorial. Please choose a different order.` 
      });
    }
    
    // Create lesson with proper content structure
    const lessonData = {
      title: title.trim(),
      order: parseInt(order),
      tutorial: tutorialId,
      content: content || {
        time: Date.now(),
        blocks: [],
        version: "2.28.2"
      },
      duration: parseInt(duration),
      isPublished: isPublished || false
    };
    
    // Set publishedAt if being published
    if (lessonData.isPublished) {
      lessonData.publishedAt = new Date();
    }
    
    const lesson = await Lesson.create(lessonData);
    
    // Populate tutorial information for response
    await lesson.populate('tutorial', 'title slug isPublished');
    
    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: lesson
    });
  } catch (error) {
    console.error('Error in createLesson:', error);
    
    // Handle validation errors from Mongoose
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
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
    
    // Validate content if being updated
    if (content !== undefined) {
      const contentValidation = validateLessonContent(content);
      if (!contentValidation.isValid) {
        return res.status(400).json({ 
          success: false,
          message: contentValidation.message 
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
    if (content !== undefined) lesson.content = content;
    if (duration !== undefined) lesson.duration = parseInt(duration);
    
    // Handle publishing status
    if (isPublished !== undefined && isPublished !== lesson.isPublished) {
      lesson.isPublished = isPublished;
      if (isPublished) {
        lesson.publishedAt = new Date();
      } else {
        lesson.publishedAt = undefined;
      }
    }
    
    const updatedLesson = await lesson.save();
    
    // Re-populate for response
    await updatedLesson.populate('tutorial', 'title slug isPublished');
    
    res.json({
      success: true,
      message: 'Lesson updated successfully',
      data: updatedLesson
    });
  } catch (error) {
    console.error('Error in updateLesson:', error);
    
    // Handle validation errors from Mongoose
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: validationErrors
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
    
    const lesson = await Lesson.findById(id);
    
    if (!lesson) {
      return res.status(404).json({ 
        success: false,
        message: 'Lesson not found' 
      });
    }
    
    // Validate content structure
    const contentValidation = validateLessonContent(content);
    if (!contentValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        message: contentValidation.message 
      });
    }
    
    lesson.content = content;
    const updatedLesson = await lesson.save();
    
    res.json({
      success: true,
      message: 'Lesson content updated successfully',
      data: updatedLesson
    });
  } catch (error) {
    console.error('Error in updateLessonContent:', error);
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
    
    // Create duplicate lesson
    const duplicateData = {
      title: `${originalLesson.title} (Copy)`,
      order: nextOrder,
      tutorial: originalLesson.tutorial._id,
      content: originalLesson.content,
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