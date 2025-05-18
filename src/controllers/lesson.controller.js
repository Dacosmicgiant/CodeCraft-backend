import Lesson from '../models/lesson.model.js';
import Tutorial from '../models/tutorial.model.js';

// @desc    Create new lesson
// @route   POST /api/v1/tutorials/:tutorialId/lessons
// @access  Private/Admin
export const createLesson = async (req, res) => {
  try {
    const { tutorialId } = req.params;
    const { title, order, content, duration } = req.body;
    
    // Check if tutorial exists
    const tutorial = await Tutorial.findById(tutorialId);
    
    if (!tutorial) {
      return res.status(404).json({ message: 'Tutorial not found' });
    }
    
    // Create lesson
    const lesson = await Lesson.create({
      title,
      order,
      tutorial: tutorialId,
      content: content || [],
      duration,
      isPublished: false
    });
    
    res.status(201).json(lesson);
  } catch (error) {
    console.error('Error in createLesson:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all lessons for a tutorial
// @route   GET /api/v1/tutorials/:tutorialId/lessons
// @access  Public
export const getLessonsByTutorial = async (req, res) => {
  try {
    const { tutorialId } = req.params;
    
    // Check if tutorial exists
    const tutorial = await Tutorial.findById(tutorialId);
    
    if (!tutorial) {
      return res.status(404).json({ message: 'Tutorial not found' });
    }
    
    // Only allow admin to see unpublished tutorials
    if (!tutorial.isPublished && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({ message: 'Tutorial not found' });
    }
    
    // Get lessons
    const query = { tutorial: tutorialId };
    
    // Only show published lessons for regular users
    if (!req.user || req.user.role !== 'admin') {
      query.isPublished = true;
    }
    
    const lessons = await Lesson.find(query)
      .sort({ order: 1 });
    
    res.json(lessons);
  } catch (error) {
    console.error('Error in getLessonsByTutorial:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    // Populate tutorial
    await lesson.populate('tutorial', 'title slug isPublished');
    
    // Only allow admin to see unpublished lessons
    if (!lesson.isPublished && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    // Only allow admin to see lessons from unpublished tutorials
    if (!lesson.tutorial.isPublished && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    res.json(lesson);
  } catch (error) {
    console.error('Error in getLessonById:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update lesson
// @route   PUT /api/v1/lessons/:id
// @access  Private/Admin
export const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, order, content, duration, isPublished } = req.body;
    
    const lesson = await Lesson.findById(id);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    // Update fields
    if (title !== undefined) lesson.title = title;
    if (order !== undefined) lesson.order = order;
    if (content !== undefined) lesson.content = content;
    if (duration !== undefined) lesson.duration = duration;
    
    // Handle publishing
    if (isPublished !== undefined && isPublished !== lesson.isPublished) {
      lesson.isPublished = isPublished;
      if (isPublished) {
        lesson.publishedAt = Date.now();
      }
    }
    
    const updatedLesson = await lesson.save();
    
    res.json(updatedLesson);
  } catch (error) {
    console.error('Error in updateLesson:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete lesson
// @route   DELETE /api/v1/lessons/:id
// @access  Private/Admin
export const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;
    
    const lesson = await Lesson.findById(id);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    await lesson.remove();
    
    res.json({ message: 'Lesson removed' });
  } catch (error) {
    console.error('Error in deleteLesson:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update lesson content
// @route   PUT /api/v1/lessons/:id/content
// @access  Private/Admin
export const updateLessonContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    const lesson = await Lesson.findById(id);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    lesson.content = content;
    
    const updatedLesson = await lesson.save();
    
    res.json(updatedLesson);
  } catch (error) {
    console.error('Error in updateLessonContent:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};