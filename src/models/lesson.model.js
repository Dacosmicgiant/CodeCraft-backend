// src/models/lesson.model.js
import mongoose from 'mongoose';
import slugify from 'slugify';

// Content block schema with enhanced validation for EditorJS format
const contentBlockSchema = new mongoose.Schema({
  id: String, // EditorJS block ID
  type: {
    type: String,
    enum: [
      'paragraph', 'text', 'header', 'list', 'checklist', 'code', 'quote', 
      'warning', 'delimiter', 'table', 'image', 'video', 'quiz', 'embed',
      'raw', 'attaches', 'linkTool', 'marker', 'inlineCode'
    ],
    required: true,
    default: 'paragraph'
  },
  data: {
    // Text/Paragraph block
    text: String,
    
    // Header block
    level: {
      type: Number,
      min: 1,
      max: 6,
      default: 2
    },
    
    // Code block
    code: String,
    language: String,
    
    // List block (EditorJS format)
    style: {
      type: String,
      enum: ['ordered', 'unordered', 'checklist'],
      default: 'unordered'
    },
    meta: mongoose.Schema.Types.Mixed,
    items: [mongoose.Schema.Types.Mixed], // EditorJS list items are objects with content, meta, items
    
    // Quote block
    caption: String,
    alignment: String,
    
    // Warning block
    title: String,
    message: String,
    
    // Table block
    withHeadings: Boolean,
    stretched: Boolean,
    content: [[String]], // 2D array for table content
    
    // Image block
    url: String,
    alt: String,
    
    // Video block
    source: String,
    poster: String,
    
    // Quiz block
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String,
    
    // Embed block
    service: String,
    embed: String,
    width: Number,
    height: Number,
    
    // Raw HTML block
    html: String,
    
    // Generic data for any other blocks
    file: mongoose.Schema.Types.Mixed,
    tool: String,
    // Catch-all for any additional EditorJS properties
    _editorjs: mongoose.Schema.Types.Mixed
  }
}, { 
  _id: true,
  strict: false // Allow additional properties that EditorJS might add
});

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    sparse: true // Allow multiple null values
  },
  order: {
    type: Number,
    required: [true, 'Order is required'],
    min: [1, 'Order must be at least 1']
  },
  tutorial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutorial',
    required: [true, 'Tutorial is required'],
    index: true
  },
  content: {
    time: {
      type: Number,
      default: Date.now
    },
    blocks: [contentBlockSchema],
    version: {
      type: String,
      default: "2.28.2"
    }
  },
  duration: {
    type: Number,  // in minutes
    default: 10,
    min: [1, 'Duration must be at least 1 minute'],
    max: [300, 'Duration cannot exceed 300 minutes']
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true
  },
  publishedAt: {
    type: Date
  },
  // SEO and metadata
  metaDescription: {
    type: String,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  },
  keywords: [{
    type: String,
    trim: true
  }],
  // Analytics and engagement
  views: {
    type: Number,
    default: 0
  },
  completions: {
    type: Number,
    default: 0
  },
  // Content flags
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  hasVideo: {
    type: Boolean,
    default: false
  },
  hasQuiz: {
    type: Boolean,
    default: false
  },
  hasCode: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for tutorial and order (ensures uniqueness within tutorial)
lessonSchema.index({ tutorial: 1, order: 1 }, { unique: true });

// Index for efficient queries
lessonSchema.index({ tutorial: 1, isPublished: 1, order: 1 });
lessonSchema.index({ isPublished: 1, publishedAt: -1 });
lessonSchema.index({ createdAt: -1 });

// Helper function to safely process blocks
const safelyProcessBlocks = function(callback) {
  if (!this.content || !this.content.blocks || !Array.isArray(this.content.blocks)) {
    return callback([]);
  }
  
  // Filter out invalid blocks before processing
  const validBlocks = this.content.blocks.filter(block => 
    block && 
    typeof block === 'object' && 
    block.type && 
    typeof block.type === 'string'
  );
  
  return callback(validBlocks);
};

// Virtual for estimated reading time based on content
lessonSchema.virtual('estimatedReadingTime').get(function() {
  if (!this.content || !this.content.blocks) return this.duration;
  
  return safelyProcessBlocks.call(this, (validBlocks) => {
    let wordCount = 0;
    
    validBlocks.forEach(block => {
      try {
        if (block.type === 'paragraph' && block.data && block.data.text) {
          wordCount += block.data.text.split(/\s+/).length;
        } else if (block.type === 'header' && block.data && block.data.text) {
          wordCount += block.data.text.split(/\s+/).length;
        } else if (block.type === 'list' && block.data && block.data.items) {
          block.data.items.forEach(item => {
            if (typeof item === 'string') {
              wordCount += item.split(/\s+/).length;
            } else if (item && item.content) {
              wordCount += item.content.split(/\s+/).length;
            }
          });
        } else if (block.type === 'quote' && block.data && block.data.text) {
          wordCount += block.data.text.split(/\s+/).length;
        }
      } catch (error) {
        console.warn('Error processing block for reading time:', error);
      }
    });
    
    // Average reading speed: 200 words per minute
    const readingTime = Math.ceil(wordCount / 200);
    return Math.max(readingTime, 1); // Minimum 1 minute
  });
});

// Virtual for content summary
lessonSchema.virtual('contentSummary').get(function() {
  if (!this.content || !this.content.blocks) {
    return {
      totalBlocks: 0,
      textBlocks: 0,
      codeBlocks: 0,
      imageBlocks: 0,
      videoBlocks: 0,
      quizBlocks: 0,
      listBlocks: 0,
      checklistBlocks: 0,
      hasInteractiveContent: false
    };
  }
  
  return safelyProcessBlocks.call(this, (validBlocks) => {
    const summary = {
      totalBlocks: validBlocks.length,
      textBlocks: 0,
      codeBlocks: 0,
      imageBlocks: 0,
      videoBlocks: 0,
      quizBlocks: 0,
      listBlocks: 0,
      checklistBlocks: 0,
      hasInteractiveContent: false
    };
    
    validBlocks.forEach(block => {
      try {
        switch (block.type) {
          case 'paragraph':
          case 'text':
          case 'header':
            summary.textBlocks++;
            break;
          case 'code':
            summary.codeBlocks++;
            break;
          case 'image':
            summary.imageBlocks++;
            break;
          case 'video':
            summary.videoBlocks++;
            break;
          case 'quiz':
            summary.quizBlocks++;
            summary.hasInteractiveContent = true;
            break;
          case 'list':
            if (block.data && block.data.style === 'checklist') {
              summary.checklistBlocks++;
              summary.hasInteractiveContent = true;
            } else {
              summary.listBlocks++;
            }
            break;
        }
      } catch (error) {
        console.warn('Error processing block for summary:', error);
      }
    });
    
    return summary;
  });
});

// Pre-save middleware to handle slug generation and content analysis
lessonSchema.pre('save', function(next) {
  try {
    // Generate slug from title if title is modified
    if (this.isModified('title')) {
      this.slug = slugify(this.title, { 
        lower: true, 
        strict: true,
        remove: /[*+~.()'"!:@]/g
      });
    }
    
    // Update content flags based on content analysis
    if (this.isModified('content')) {
      try {
        const summary = this.contentSummary;
        this.hasVideo = summary.videoBlocks > 0;
        this.hasQuiz = summary.quizBlocks > 0;
        this.hasCode = summary.codeBlocks > 0;
      } catch (error) {
        console.warn('Error updating content flags:', error);
        // Set defaults if analysis fails
        this.hasVideo = false;
        this.hasQuiz = false;
        this.hasCode = false;
      }
    }
    
    // Set publishedAt when publishing for the first time
    if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
      this.publishedAt = new Date();
    }
    
    // Clear publishedAt when unpublishing
    if (this.isModified('isPublished') && !this.isPublished) {
      this.publishedAt = undefined;
    }
    
    next();
  } catch (error) {
    console.error('Error in lesson pre-save middleware:', error);
    next(error);
  }
});

// Post-save middleware to clean up corrupted content
lessonSchema.post('save', function(doc, next) {
  try {
    // If this lesson has corrupted content, log it for debugging
    if (doc.content && doc.content.blocks) {
      const invalidBlocks = doc.content.blocks.filter(block => 
        !block || 
        typeof block !== 'object' || 
        !block.type || 
        typeof block.type !== 'string'
      );
      
      if (invalidBlocks.length > 0) {
        console.warn(`Lesson ${doc._id} has ${invalidBlocks.length} invalid blocks`);
      }
    }
    next();
  } catch (error) {
    console.warn('Error in lesson post-save middleware:', error);
    next();
  }
});

// Instance method to increment view count
lessonSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Instance method to increment completion count
lessonSchema.methods.incrementCompletions = function() {
  this.completions += 1;
  return this.save();
};

// Instance method to clean corrupted content
lessonSchema.methods.cleanContent = function() {
  if (!this.content || !this.content.blocks) {
    this.content = {
      time: Date.now(),
      blocks: [],
      version: "2.28.2"
    };
    return this;
  }
  
  // Filter out invalid blocks
  const validBlocks = this.content.blocks.filter(block => 
    block && 
    typeof block === 'object' && 
    block.type && 
    typeof block.type === 'string'
  ).map(block => ({
    id: block.id || `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: block.type,
    data: block.data || {}
  }));
  
  this.content.blocks = validBlocks;
  return this;
};

// Static method to find lessons by tutorial with optional filters
lessonSchema.statics.findByTutorial = function(tutorialId, options = {}) {
  const query = { tutorial: tutorialId };
  
  if (options.published !== undefined) {
    query.isPublished = options.published;
  }
  
  if (options.difficulty) {
    query.difficulty = options.difficulty;
  }
  
  return this.find(query).sort({ order: 1 });
};

// Static method to get next order number for a tutorial
lessonSchema.statics.getNextOrder = async function(tutorialId) {
  const lastLesson = await this.findOne({ tutorial: tutorialId })
    .sort({ order: -1 })
    .select('order');
  
  return lastLesson ? lastLesson.order + 1 : 1;
};

// Static method to reorder lessons
lessonSchema.statics.reorderInTutorial = async function(tutorialId, lessonOrders) {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      for (const { lessonId, order } of lessonOrders) {
        await this.findOneAndUpdate(
          { _id: lessonId, tutorial: tutorialId },
          { order: order },
          { session }
        );
      }
    });
  } finally {
    await session.endSession();
  }
};

// Static method to clean all corrupted lessons
lessonSchema.statics.cleanAllCorruptedContent = async function() {
  try {
    console.log('Starting cleanup of corrupted lesson content...');
    
    const lessons = await this.find({});
    let cleanedCount = 0;
    
    for (const lesson of lessons) {
      let needsCleaning = false;
      
      if (!lesson.content || !lesson.content.blocks) {
        needsCleaning = true;
      } else {
        const invalidBlocks = lesson.content.blocks.filter(block => 
          !block || 
          typeof block !== 'object' || 
          !block.type || 
          typeof block.type !== 'string'
        );
        
        if (invalidBlocks.length > 0) {
          needsCleaning = true;
        }
      }
      
      if (needsCleaning) {
        lesson.cleanContent();
        await lesson.save();
        cleanedCount++;
      }
    }
    
    console.log(`Cleaned ${cleanedCount} lessons with corrupted content`);
    return { cleanedCount, totalLessons: lessons.length };
  } catch (error) {
    console.error('Error cleaning corrupted content:', error);
    throw error;
  }
};

const Lesson = mongoose.model('Lesson', lessonSchema);

export default Lesson;