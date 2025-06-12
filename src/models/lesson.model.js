// src/models/lesson.model.js - Complete Updated Version
import mongoose from 'mongoose';
import slugify from 'slugify';

// EditorJS block schema - flexible to handle any block type
const editorJSBlockSchema = new mongoose.Schema({
  id: {
    type: String,
    required: false // EditorJS sometimes doesn't include IDs for all blocks
  },
  type: {
    type: String,
    required: [true, 'Block type is required']
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // Allow any structure for block data
    required: [true, 'Block data is required']
  },
  tunes: {
    type: mongoose.Schema.Types.Mixed, // For block tunes/settings
    required: false
  }
}, { 
  _id: false, // Don't create MongoDB _id for blocks
  strict: false // Allow additional fields that might be added by EditorJS
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
  // EditorJS content structure
  content: {
    time: {
      type: Number,
      required: true,
      default: Date.now
    },
    blocks: {
      type: [editorJSBlockSchema],
      required: true,
      default: []
    },
    version: {
      type: String,
      required: true,
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
  // Content flags - computed from content analysis
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
  },
  hasImages: {
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

// Virtual for estimated reading time based on content
lessonSchema.virtual('estimatedReadingTime').get(function() {
  // Defensive check for content existence
  if (!this.content || !this.content.blocks || !Array.isArray(this.content.blocks)) {
    return this.duration || 1;
  }
  
  let wordCount = 0;
  
  try {
    this.content.blocks.forEach(block => {
      // Defensive checks for block structure
      if (!block || typeof block !== 'object') return;
      if (!block.type || !block.data) return;
      
      switch (block.type) {
        case 'paragraph':
        case 'header':
          if (block.data.text && typeof block.data.text === 'string') {
            wordCount += block.data.text.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
          }
          break;
        case 'list':
          if (Array.isArray(block.data.items)) {
            block.data.items.forEach(item => {
              if (typeof item === 'string') {
                wordCount += item.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
              }
            });
          }
          break;
        case 'quote':
          if (block.data.text && typeof block.data.text === 'string') {
            wordCount += block.data.text.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
          }
          if (block.data.caption && typeof block.data.caption === 'string') {
            wordCount += block.data.caption.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
          }
          break;
        case 'table':
          if (Array.isArray(block.data.content)) {
            block.data.content.forEach(row => {
              if (Array.isArray(row)) {
                row.forEach(cell => {
                  if (typeof cell === 'string') {
                    wordCount += cell.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
                  }
                });
              }
            });
          }
          break;
      }
    });
  } catch (error) {
    console.warn('Error calculating reading time for lesson:', this._id, error);
    return this.duration || 1;
  }
  
  // Average reading speed: 200 words per minute
  const readingTime = Math.ceil(wordCount / 200);
  return Math.max(readingTime, 1); // Minimum 1 minute
});

// Virtual for content summary
lessonSchema.virtual('contentSummary').get(function() {
  // Defensive initialization
  const summary = {
    totalBlocks: 0,
    blockTypes: {},
    hasInteractiveContent: false,
    wordCount: 0
  };
  
  // Defensive checks
  if (!this.content || !this.content.blocks || !Array.isArray(this.content.blocks)) {
    return summary;
  }
  
  try {
    summary.totalBlocks = this.content.blocks.length;
    
    this.content.blocks.forEach(block => {
      // Defensive block checks
      if (!block || typeof block !== 'object' || !block.type) {
        return; // Skip invalid blocks
      }
      
      // Count block types
      summary.blockTypes[block.type] = (summary.blockTypes[block.type] || 0) + 1;
      
      // Check for interactive content
      if (['quiz', 'checklist', 'poll', 'embed'].includes(block.type)) {
        summary.hasInteractiveContent = true;
      }
      
      // Count words for text-based blocks
      let blockText = '';
      
      try {
        switch (block.type) {
          case 'paragraph':
          case 'header':
            blockText = block.data?.text || '';
            break;
          case 'list':
            if (Array.isArray(block.data?.items)) {
              blockText = block.data.items.filter(item => typeof item === 'string').join(' ');
            }
            break;
          case 'quote':
            blockText = (block.data?.text || '') + ' ' + (block.data?.caption || '');
            break;
        }
        
        if (blockText && typeof blockText === 'string') {
          summary.wordCount += blockText.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
        }
      } catch (blockError) {
        console.warn('Error processing block in lesson:', this._id, 'block type:', block.type, blockError);
      }
    });
  } catch (error) {
    console.warn('Error calculating content summary for lesson:', this._id, error);
  }
  
  return summary;
});

// Pre-save middleware to handle slug generation and content analysis
lessonSchema.pre('save', function(next) {
  try {
    // Generate slug from title if title is modified
    if (this.isModified('title') && this.title) {
      this.slug = slugify(this.title, { 
        lower: true, 
        strict: true,
        remove: /[*+~.()'"!:@]/g
      });
    }
    
    // Update content flags based on content analysis
    if (this.isModified('content')) {
      // Reset flags
      this.hasVideo = false;
      this.hasQuiz = false;
      this.hasCode = false;
      this.hasImages = false;
      
      // Safely analyze content
      if (this.content && this.content.blocks && Array.isArray(this.content.blocks)) {
        try {
          this.content.blocks.forEach(block => {
            if (!block || !block.type) return;
            
            switch (block.type) {
              case 'video':
              case 'embed':
                this.hasVideo = true;
                break;
              case 'quiz':
              case 'checklist':
                this.hasQuiz = true;
                break;
              case 'code':
                this.hasCode = true;
                break;
              case 'image':
              case 'imageGallery':
                this.hasImages = true;
                break;
            }
          });
        } catch (contentError) {
          console.warn('Error analyzing content flags for lesson:', this._id, contentError);
        }
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

// Instance method to validate content structure
lessonSchema.methods.validateContent = function() {
  if (!this.content) {
    return { isValid: false, message: 'Content is required' };
  }
  
  if (!this.content.blocks || !Array.isArray(this.content.blocks)) {
    return { isValid: false, message: 'Content must have blocks array' };
  }
  
  if (!this.content.time || typeof this.content.time !== 'number') {
    return { isValid: false, message: 'Content must have time field' };
  }
  
  if (!this.content.version || typeof this.content.version !== 'string') {
    return { isValid: false, message: 'Content must have version field' };
  }
  
  // Validate each block
  for (let i = 0; i < this.content.blocks.length; i++) {
    const block = this.content.blocks[i];
    
    if (!block || typeof block !== 'object') {
      return { isValid: false, message: `Block ${i + 1} must be a valid object` };
    }
    
    if (!block.type || typeof block.type !== 'string') {
      return { isValid: false, message: `Block ${i + 1} must have a valid type` };
    }
    
    if (!block.data || typeof block.data !== 'object') {
      return { isValid: false, message: `Block ${i + 1} must have valid data` };
    }
  }
  
  return { isValid: true };
};

// Instance method to safely get content text
lessonSchema.methods.getContentText = function() {
  if (!this.content || !this.content.blocks || !Array.isArray(this.content.blocks)) {
    return '';
  }
  
  let text = '';
  
  try {
    this.content.blocks.forEach(block => {
      if (!block || !block.type || !block.data) return;
      
      switch (block.type) {
        case 'paragraph':
        case 'header':
          if (block.data.text && typeof block.data.text === 'string') {
            text += block.data.text.replace(/<[^>]*>/g, '') + '\n';
          }
          break;
        case 'list':
          if (Array.isArray(block.data.items)) {
            block.data.items.forEach(item => {
              if (typeof item === 'string') {
                text += item.replace(/<[^>]*>/g, '') + '\n';
              }
            });
          }
          break;
        case 'quote':
          if (block.data.text && typeof block.data.text === 'string') {
            text += block.data.text.replace(/<[^>]*>/g, '') + '\n';
          }
          break;
      }
    });
  } catch (error) {
    console.warn('Error extracting content text for lesson:', this._id, error);
  }
  
  return text.trim();
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
  try {
    const lastLesson = await this.findOne({ tutorial: tutorialId })
      .sort({ order: -1 })
      .select('order');
    
    return lastLesson ? lastLesson.order + 1 : 1;
  } catch (error) {
    console.error('Error getting next order for tutorial:', tutorialId, error);
    return 1;
  }
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
  } catch (error) {
    console.error('Error reordering lessons in tutorial:', tutorialId, error);
    throw error;
  } finally {
    await session.endSession();
  }
};

// Static method to find lessons with safe content loading
lessonSchema.statics.findSafe = function(query, options = {}) {
  return this.find(query, null, options)
    .lean() // Use lean to avoid virtual method errors
    .populate('tutorial', 'title slug isPublished');
};

// Static method to count lessons by tutorial
lessonSchema.statics.countByTutorial = async function(tutorialId) {
  try {
    return await this.countDocuments({ tutorial: tutorialId });
  } catch (error) {
    console.error('Error counting lessons for tutorial:', tutorialId, error);
    return 0;
  }
};

// Static method to get lesson statistics
lessonSchema.statics.getStatistics = async function() {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: null,
          totalLessons: { $sum: 1 },
          publishedLessons: {
            $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] }
          },
          totalViews: { $sum: '$views' },
          totalCompletions: { $sum: '$completions' },
          averageDuration: { $avg: '$duration' }
        }
      }
    ]);
    
    return stats[0] || {
      totalLessons: 0,
      publishedLessons: 0,
      totalViews: 0,
      totalCompletions: 0,
      averageDuration: 0
    };
  } catch (error) {
    console.error('Error getting lesson statistics:', error);
    return {
      totalLessons: 0,
      publishedLessons: 0,
      totalViews: 0,
      totalCompletions: 0,
      averageDuration: 0
    };
  }
};

const Lesson = mongoose.model('Lesson', lessonSchema);

export default Lesson;