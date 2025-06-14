// src/controllers/lesson.controller.js
import Lesson from '../models/lesson.model.js';
import Tutorial from '../models/tutorial.model.js';

// Helper function to validate and extract YouTube video ID
const validateYouTubeUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return {
        videoId: match[1],
        embedUrl: `https://www.youtube.com/embed/${match[1]}`,
        thumbnailUrl: `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`,
        originalUrl: url
      };
    }
  }
  
  return null;
};

// Helper function to validate image URLs
const validateImageUrl = (url) => {
  if (!url || typeof url !== 'string') return { isValid: false, message: 'URL is required' };
  
  try {
    new URL(url);
    
    // Check for image file extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    const hasImageExtension = imageExtensions.some(ext => 
      url.toLowerCase().includes(ext)
    );
    
    // Check for known image hosting domains
    const imageDomains = [
      'imgur.com', 'i.imgur.com',
      'unsplash.com', 'images.unsplash.com',
      'pixabay.com', 'cdn.pixabay.com',
      'pexels.com', 'images.pexels.com',
      'githubusercontent.com', 'raw.githubusercontent.com',
      'cloudinary.com', 'res.cloudinary.com',
      'amazonaws.com', 's3.amazonaws.com',
      'googleusercontent.com',
      'cdn.jsdelivr.net',
      'cdnjs.cloudflare.com',
      'wikimedia.org',
      'freepik.com',
      'shutterstock.com'
    ];
    
    const isFromImageDomain = imageDomains.some(domain => 
      url.includes(domain)
    );
    
    // Additional check for data URLs (base64 images)
    const isDataUrl = url.startsWith('data:image/');
    
    return {
      isValid: hasImageExtension || isFromImageDomain || isDataUrl,
      hasExtension: hasImageExtension,
      isFromTrustedDomain: isFromImageDomain,
      isDataUrl: isDataUrl,
      message: hasImageExtension || isFromImageDomain || isDataUrl
        ? 'Valid image URL' 
        : 'URL should point to an image file or be from a trusted image hosting service'
    };
  } catch (error) {
    return {
      isValid: false,
      hasExtension: false,
      isFromTrustedDomain: false,
      isDataUrl: false,
      message: 'Invalid URL format'
    };
  }
};

// Helper function to validate and process embed URLs
const validateEmbedUrl = (url, service = null) => {
  if (!url || typeof url !== 'string') return { isValid: false, message: 'URL is required' };
  
  try {
    new URL(url);
    
    // YouTube
    const youtubeData = validateYouTubeUrl(url);
    if (youtubeData) {
      return {
        isValid: true,
        service: 'youtube',
        embedUrl: youtubeData.embedUrl,
        thumbnailUrl: youtubeData.thumbnailUrl,
        videoId: youtubeData.videoId,
        originalUrl: url,
        width: 560,
        height: 315
      };
    }
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      return {
        isValid: true,
        service: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
        videoId: vimeoMatch[1],
        originalUrl: url,
        width: 640,
        height: 360
      };
    }
    
    // CodePen
    const codepenMatch = url.match(/codepen\.io\/([^\/]+)\/pen\/([^\/\?]+)/);
    if (codepenMatch) {
      return {
        isValid: true,
        service: 'codepen',
        embedUrl: `https://codepen.io/${codepenMatch[1]}/embed/${codepenMatch[2]}`,
        originalUrl: url,
        width: 800,
        height: 400
      };
    }
    
    // Generic iframe support for other services
    const trustedDomains = [
      'codesandbox.io',
      'stackblitz.com',
      'replit.com',
      'jsfiddle.net',
      'slides.com',
      'docs.google.com',
      'figma.com'
    ];
    
    const domain = new URL(url).hostname;
    const isTrustedDomain = trustedDomains.some(trusted => domain.includes(trusted));
    
    if (isTrustedDomain) {
      return {
        isValid: true,
        service: 'iframe',
        embedUrl: url,
        originalUrl: url,
        width: 800,
        height: 600
      };
    }
    
    return {
      isValid: false,
      message: 'URL is not from a supported embed service'
    };
    
  } catch (error) {
    return {
      isValid: false,
      message: 'Invalid URL format'
    };
  }
};

// Helper function to validate and clean lesson content structure for EditorJS
const validateAndCleanLessonContent = (content) => {
  if (!content || typeof content !== 'object') {
    return { 
      isValid: true, 
      cleanContent: {
        time: Date.now(),
        blocks: [],
        version: "2.28.2"
      }
    };
  }
  
  if (!content.blocks || !Array.isArray(content.blocks)) {
    return { 
      isValid: true, 
      cleanContent: {
        time: content.time || Date.now(),
        blocks: [],
        version: content.version || "2.28.2"
      }
    };
  }
  
  // Clean and validate each block
  const cleanBlocks = [];
  
  for (let i = 0; i < content.blocks.length; i++) {
    const block = content.blocks[i];
    
    // Skip undefined, null, or invalid blocks
    if (!block || typeof block !== 'object') {
      console.warn(`Skipping invalid block at index ${i}:`, block);
      continue;
    }
    
    // Check if block has required properties
    if (!block.type || typeof block.type !== 'string') {
      console.warn(`Block ${i + 1} has invalid or missing type, defaulting to 'paragraph':`, block);
      block.type = 'paragraph';
    }
    
    // Ensure block has data object
    if (!block.data || typeof block.data !== 'object') {
      block.data = {};
    }
    
    // Process and validate specific block types
    let processedBlock = {
      id: block.id || `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: block.type,
      data: { ...block.data }
    };
    
    // Handle different block types with enhanced validation
    switch (block.type) {
      case 'header':
        if (block.data.level && (block.data.level < 1 || block.data.level > 6)) {
          processedBlock.data.level = 2; // Default to h2
        }
        break;
        
      case 'list':
        const validStyles = ['ordered', 'unordered', 'checklist'];
        if (!validStyles.includes(block.data.style)) {
          processedBlock.data.style = 'unordered';
        }
        if (!Array.isArray(block.data.items)) {
          processedBlock.data.items = [];
        }
        break;
        
      case 'image':
        if (block.data.url) {
          const imageValidation = validateImageUrl(block.data.url);
          if (imageValidation.isValid) {
            processedBlock.data.url = block.data.url;
            processedBlock.data.alt = block.data.alt || block.data.caption || '';
            processedBlock.data.caption = block.data.caption || '';
            processedBlock.data.stretched = block.data.stretched || false;
            processedBlock.data.withBorder = block.data.withBorder || false;
            processedBlock.data.withBackground = block.data.withBackground || false;
          } else {
            console.warn(`Invalid image URL in block ${i + 1}:`, imageValidation.message);
            // Keep the block but mark it as invalid
            processedBlock.data.invalid = true;
            processedBlock.data.invalidReason = imageValidation.message;
          }
        }
        break;
        
      case 'video':
      case 'embed':
        if (block.data.url || block.data.source) {
          const url = block.data.url || block.data.source;
          const embedValidation = validateEmbedUrl(url, block.data.service);
          
          if (embedValidation.isValid) {
            processedBlock.data = {
              ...processedBlock.data,
              service: embedValidation.service,
              url: embedValidation.originalUrl,
              embed: embedValidation.embedUrl,
              width: embedValidation.width || block.data.width || 560,
              height: embedValidation.height || block.data.height || 315,
              caption: block.data.caption || ''
            };
            
            // Add YouTube-specific data
            if (embedValidation.service === 'youtube') {
              processedBlock.data.videoId = embedValidation.videoId;
              processedBlock.data.thumbnail = embedValidation.thumbnailUrl;
            }
          } else {
            console.warn(`Invalid embed URL in block ${i + 1}:`, embedValidation.message);
            processedBlock.data.invalid = true;
            processedBlock.data.invalidReason = embedValidation.message;
          }
        }
        break;
        
      case 'code':
        // Ensure code blocks have proper structure
        processedBlock.data.code = block.data.code || '';
        processedBlock.data.language = block.data.language || 'javascript';
        break;
        
      case 'quote':
        processedBlock.data.text = block.data.text || '';
        processedBlock.data.caption = block.data.caption || '';
        processedBlock.data.alignment = block.data.alignment || 'left';
        break;
        
      case 'table':
        if (!Array.isArray(block.data.content)) {
          processedBlock.data.content = [['']];
        }
        processedBlock.data.withHeadings = block.data.withHeadings || false;
        break;
        
      case 'warning':
        processedBlock.data.title = block.data.title || 'Warning';
        processedBlock.data.message = block.data.message || '';
        break;
    }
    
    cleanBlocks.push(processedBlock);
  }
  
  return { 
    isValid: true, 
    cleanContent: {
      time: content.time || Date.now(),
      blocks: cleanBlocks,
      version: content.version || "2.28.2"
    }
  };
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

// Helper function to sanitize EditorJS content
const sanitizeContent = (content) => {
  const validation = validateAndCleanLessonContent(content);
  return validation.cleanContent;
};

// @desc    Validate media URL
// @route   POST /api/v1/lessons/validate-media
// @access  Private/Admin
export const validateMediaUrl = async (req, res) => {
  try {
    const { url, type } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }
    
    let validation;
    
    switch (type) {
      case 'image':
        validation = validateImageUrl(url);
        break;
      case 'video':
      case 'embed':
        validation = validateEmbedUrl(url);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid media type. Use "image", "video", or "embed"'
        });
    }
    
    res.json({
      success: true,
      message: validation.isValid ? 'URL is valid' : 'URL validation failed',
      data: validation
    });
  } catch (error) {
    console.error('Error in validateMediaUrl:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
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
    
    // Sanitize and validate content
    const sanitizedContent = sanitizeContent(content);
    
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
      content: sanitizedContent,
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
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.tutorial && error.keyPattern.order) {
        return res.status(400).json({
          success: false,
          message: 'A lesson with this order already exists in the tutorial'
        });
      }
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
    
    // Clean lesson content before sending response
    const cleanedLessons = lessons.map(lesson => {
      const lessonObj = lesson.toObject();
      if (lessonObj.content) {
        const validation = validateAndCleanLessonContent(lessonObj.content);
        lessonObj.content = validation.cleanContent;
      }
      return lessonObj;
    });
    
    res.json({
      success: true,
      message: 'Lessons retrieved successfully',
      data: cleanedLessons,
      total: cleanedLessons.length
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
    
    // Clean lesson content before sending response
    const lessonObj = lesson.toObject();
    if (lessonObj.content) {
      const validation = validateAndCleanLessonContent(lessonObj.content);
      lessonObj.content = validation.cleanContent;
    }
    
    res.json({
      success: true,
      message: 'Lesson retrieved successfully',
      data: lessonObj
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
    
    // Validate and sanitize content if being updated
    if (content !== undefined) {
      const sanitizedContent = sanitizeContent(content);
      lesson.content = sanitizedContent;
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
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.tutorial && error.keyPattern.order) {
        return res.status(400).json({
          success: false,
          message: 'A lesson with this order already exists in the tutorial'
        });
      }
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
    
    // Sanitize and validate content
    const sanitizedContent = sanitizeContent(content);
    lesson.content = sanitizedContent;
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
    
    // Clean the content before duplicating
    const cleanContent = sanitizeContent(originalLesson.content);
    
    // Create duplicate lesson
    const duplicateData = {
      title: `${originalLesson.title} (Copy)`,
      order: nextOrder,
      tutorial: originalLesson.tutorial._id,
      content: cleanContent,
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

// @desc    Get all lessons with pagination and search
// @route   GET /api/v1/lessons
// @access  Private/Admin
export const getAllLessons = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, tutorial, published } = req.query;
    
    // Build query
    const query = {};
    
    // Only show published lessons for regular users
    if (!req.user || req.user.role !== 'admin') {
      query.isPublished = true;
    } else if (published !== undefined) {
      query.isPublished = published === 'true';
    }
    
    if (tutorial) {
      query.tutorial = tutorial;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Count total lessons
    const total = await Lesson.countDocuments(query);
    
    // Get lessons with pagination
    const lessons = await Lesson.find(query)
      .populate('tutorial', 'title slug isPublished')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Clean lesson content before sending response
    const cleanedLessons = lessons.map(lesson => {
      const lessonObj = lesson.toObject();
      if (lessonObj.content) {
        const validation = validateAndCleanLessonContent(lessonObj.content);
        lessonObj.content = validation.cleanContent;
      }
      return lessonObj;
    });
    
    res.json({
      success: true,
      message: 'Lessons retrieved successfully',
      data: cleanedLessons,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getAllLessons:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Toggle lesson publish status
// @route   PUT /api/v1/lessons/:id/toggle-publish
// @access  Private/Admin
export const togglePublishStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;
    
    const lesson = await Lesson.findById(id);
    
    if (!lesson) {
      return res.status(404).json({ 
        success: false,
        message: 'Lesson not found' 
      });
    }
    
    lesson.isPublished = isPublished;
    if (isPublished) {
      lesson.publishedAt = new Date();
    } else {
      lesson.publishedAt = undefined;
    }
    
    const updatedLesson = await lesson.save();
    
    res.json({
      success: true,
      message: `Lesson ${isPublished ? 'published' : 'unpublished'} successfully`,
      data: updatedLesson
    });
  } catch (error) {
    console.error('Error in togglePublishStatus:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Export lesson in different formats
// @route   GET /api/v1/lessons/:id/export
// @access  Private/Admin
export const exportLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query; // json, html, text
    
    const lesson = await Lesson.findById(id).populate('tutorial', 'title slug');
    
    if (!lesson) {
      return res.status(404).json({ 
        success: false,
        message: 'Lesson not found' 
      });
    }
    
    // Clean content before export
    const cleanContent = sanitizeContent(lesson.content);
    
    let exportData;
    
    switch (format) {
      case 'json':
        exportData = {
          title: lesson.title,
          order: lesson.order,
          duration: lesson.duration,
          content: cleanContent,
          tutorial: lesson.tutorial.title,
          isPublished: lesson.isPublished,
          createdAt: lesson.createdAt,
          updatedAt: lesson.updatedAt
        };
        break;
        
      case 'html':
        const lessonWithCleanContent = { ...lesson.toObject(), content: cleanContent };
        exportData = generateHTMLFromLesson(lessonWithCleanContent);
        break;
        
      case 'text':
        const lessonWithCleanContentText = { ...lesson.toObject(), content: cleanContent };
        exportData = generateTextFromLesson(lessonWithCleanContentText);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export format. Use json, html, or text.'
        });
    }
    
    res.json({
      success: true,
      message: 'Lesson exported successfully',
      data: exportData
    });
  } catch (error) {
    console.error('Error in exportLesson:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Helper function to generate HTML from lesson content
const generateHTMLFromLesson = (lesson) => {
  let html = `<!DOCTYPE html>
<html>
<head>
    <title>${lesson.title}</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3, h4, h5, h6 { color: #333; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
        blockquote { border-left: 4px solid #ddd; margin-left: 0; padding-left: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .embed-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; }
        .embed-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
        img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
    <h1>${lesson.title}</h1>
    <p><strong>Duration:</strong> ${lesson.duration} minutes</p>
    <p><strong>Tutorial:</strong> ${lesson.tutorial.title}</p>
    <hr>
`;

  if (lesson.content && lesson.content.blocks) {
    lesson.content.blocks.forEach(block => {
      if (!block || !block.type) return; // Skip invalid blocks
      
      switch (block.type) {
        case 'header':
          html += `<h${block.data?.level || 2}>${block.data?.text || ''}</h${block.data?.level || 2}>`;
          break;
        case 'paragraph':
          html += `<p>${block.data?.text || ''}</p>`;
          break;
        case 'list':
          const tag = block.data?.style === 'ordered' ? 'ol' : 'ul';
          html += `<${tag}>`;
          if (block.data?.items) {
            block.data.items.forEach(item => {
              const content = typeof item === 'string' ? item : item?.content || '';
              html += `<li>${content}</li>`;
            });
          }
          html += `</${tag}>`;
          break;
        case 'code':
          html += `<pre><code class="language-${block.data?.language || 'javascript'}">${block.data?.code || ''}</code></pre>`;
          break;
        case 'quote':
          html += `<blockquote><p>${block.data?.text || ''}</p>`;
          if (block.data?.caption) {
            html += `<cite>— ${block.data.caption}</cite>`;
          }
          html += `</blockquote>`;
          break;
        case 'image':
          if (block.data?.url && !block.data?.invalid) {
            html += `<figure>`;
            html += `<img src="${block.data.url}" alt="${block.data?.alt || ''}" />`;
            if (block.data?.caption) {
              html += `<figcaption>${block.data.caption}</figcaption>`;
            }
            html += `</figure>`;
          }
          break;
        case 'video':
        case 'embed':
          if (block.data?.embed && !block.data?.invalid) {
            html += `<div class="embed-container">`;
            html += `<iframe src="${block.data.embed}" frameborder="0" allowfullscreen></iframe>`;
            html += `</div>`;
            if (block.data?.caption) {
              html += `<p><em>${block.data.caption}</em></p>`;
            }
          }
          break;
        case 'delimiter':
          html += `<hr>`;
          break;
        case 'table':
          if (block.data?.content) {
            html += `<table>`;
            block.data.content.forEach((row, index) => {
              html += `<tr>`;
              row.forEach(cell => {
                const tag = block.data?.withHeadings && index === 0 ? 'th' : 'td';
                html += `<${tag}>${cell}</${tag}>`;
              });
              html += `</tr>`;
            });
            html += `</table>`;
          }
          break;
        default:
          // Handle other block types or skip
          break;
      }
    });
  }

  html += `
</body>
</html>`;

  return html;
};

// Helper function to generate plain text from lesson content
const generateTextFromLesson = (lesson) => {
  let text = `${lesson.title}\n`;
  text += `${'='.repeat(lesson.title.length)}\n\n`;
  text += `Duration: ${lesson.duration} minutes\n`;
  text += `Tutorial: ${lesson.tutorial.title}\n\n`;

  if (lesson.content && lesson.content.blocks) {
    lesson.content.blocks.forEach(block => {
      if (!block || !block.type) return; // Skip invalid blocks
      
      switch (block.type) {
        case 'header':
          const level = block.data?.level || 2;
          text += `\n${'#'.repeat(level)} ${block.data?.text || ''}\n\n`;
          break;
        case 'paragraph':
          text += `${block.data?.text || ''}\n\n`;
          break;
        case 'list':
          if (block.data?.items) {
            block.data.items.forEach((item, index) => {
              const content = typeof item === 'string' ? item : item?.content || '';
              const prefix = block.data?.style === 'ordered' ? `${index + 1}. ` : '• ';
              text += `${prefix}${content}\n`;
            });
          }
          text += `\n`;
          break;
        case 'code':
          text += `\`\`\`${block.data?.language || ''}\n${block.data?.code || ''}\n\`\`\`\n\n`;
          break;
        case 'quote':
          text += `> ${block.data?.text || ''}\n`;
          if (block.data?.caption) {
            text += `> — ${block.data.caption}\n`;
          }
          text += `\n`;
          break;
        case 'image':
          if (block.data?.url && !block.data?.invalid) {
            text += `[Image: ${block.data?.alt || block.data?.caption || 'Image'}]\n`;
            text += `URL: ${block.data.url}\n\n`;
          }
          break;
        case 'video':
        case 'embed':
          if (block.data?.url && !block.data?.invalid) {
            text += `[${block.data?.service || 'Video'}: ${block.data?.caption || 'Embedded content'}]\n`;
            text += `URL: ${block.data.url}\n\n`;
          }
          break;
        case 'delimiter':
          text += `\n---\n\n`;
          break;
        default:
          // Handle other block types or skip
          break;
      }
    });
  }

  return text;
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