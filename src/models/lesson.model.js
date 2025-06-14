// src/models/lesson.model.js
import mongoose from 'mongoose';
import slugify from 'slugify';

// Enhanced content block schema with better media support for EditorJS
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
    language: {
      type: String,
      default: 'javascript'
    },
    
    // List block (EditorJS format)
    style: {
      type: String,
      enum: ['ordered', 'unordered', 'checklist'],
      default: 'unordered'
    },
    meta: mongoose.Schema.Types.Mixed,
    items: [mongoose.Schema.Types.Mixed], // EditorJS list items
    
    // Quote block
    caption: String,
    alignment: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'left'
    },
    
    // Warning block
    title: String,
    message: String,
    
    // Table block
    withHeadings: {
      type: Boolean,
      default: false
    },
    stretched: {
      type: Boolean,
      default: false
    },
    content: [[String]], // 2D array for table content
    
    // Enhanced Image block
    url: String,
    alt: String,
    withBorder: {
      type: Boolean,
      default: false
    },
    withBackground: {
      type: Boolean,
      default: false
    },
    
    // Enhanced Video/Embed block
    service: {
      type: String,
      enum: ['youtube', 'vimeo', 'codepen', 'iframe', 'custom'],
      default: 'youtube'
    },
    embed: String, // Processed embed URL
    width: {
      type: Number,
      default: 560
    },
    height: {
      type: Number,
      default: 315
    },
    videoId: String, // For YouTube/Vimeo
    thumbnail: String, // Thumbnail URL
    
    // Quiz block
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String,
    
    // Raw HTML block
    html: String,
    
    // Link Tool block
    link: String,
    
    // Validation flags
    invalid: {
      type: Boolean,
      default: false
    },
    invalidReason: String,
    
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
  // Enhanced content flags
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
  hasImage: {
    type: Boolean,
    default: false
  },
  hasEmbed: {
    type: Boolean,
    default: false
  },
  // Media summary
  mediaSummary: {
    images: {
      type: Number,
      default: 0
    },
    videos: {
      type: Number,
      default: 0
    },
    embeds: {
      type: Number,
      default: 0
    },
    youtubeVideos: {
      type: Number,
      default: 0
    },
    vimeoVideos: {
      type: Number,
      default: 0
    }
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
lessonSchema.index({ hasVideo: 1, hasImage: 1, hasEmbed: 1 }); // Media-based queries

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

// Enhanced virtual for estimated reading time based on content
lessonSchema.virtual('estimatedReadingTime').get(function() {
  if (!this.content || !this.content.blocks) return this.duration;
  
  return safelyProcessBlocks.call(this, (validBlocks) => {
    let wordCount = 0;
    let mediaTime = 0; // Additional time for media content
    
    validBlocks.forEach(block => {
      try {
        switch (block.type) {
          case 'paragraph':
          case 'text':
            if (block.data && block.data.text) {
              wordCount += block.data.text.split(/\s+/).length;
            }
            break;
          case 'header':
            if (block.data && block.data.text) {
              wordCount += block.data.text.split(/\s+/).length;
            }
            break;
          case 'list':
            if (block.data && block.data.items) {
              block.data.items.forEach(item => {
                if (typeof item === 'string') {
                  wordCount += item.split(/\s+/).length;
                } else if (item && item.content) {
                  wordCount += item.content.split(/\s+/).length;
                }
              });
            }
            break;
          case 'quote':
            if (block.data && block.data.text) {
              wordCount += block.data.text.split(/\s+/).length;
            }
            break;
          case 'code':
            // Code blocks take longer to read
            if (block.data && block.data.code) {
              wordCount += block.data.code.split(/\s+/).length * 1.5;
            }
            break;
          case 'image':
            // Images add viewing time
            mediaTime += 0.5; // 30 seconds per image
            break;
          case 'video':
          case 'embed':
            // Videos add significant time
            if (block.data && block.data.service === 'youtube') {
              mediaTime += 2; // Assume 2 minutes average for YouTube videos
            } else {
              mediaTime += 1; // 1 minute for other embeds
            }
            break;
          case 'table':
            // Tables take longer to process
            if (block.data && block.data.content) {
              const cellCount = block.data.content.reduce((total, row) => total + row.length, 0);
              wordCount += cellCount * 2; // Assume 2 words per cell on average
            }
            break;
        }
      } catch (error) {
        console.warn('Error processing block for reading time:', error);
      }
    });
    
    // Average reading speed: 200 words per minute
    const readingTime = Math.ceil(wordCount / 200);
    const totalTime = readingTime + mediaTime;
    return Math.max(totalTime, 1); // Minimum 1 minute
  });
});

// Enhanced virtual for content summary
lessonSchema.virtual('contentSummary').get(function() {
  if (!this.content || !this.content.blocks) {
    return {
      totalBlocks: 0,
      textBlocks: 0,
      codeBlocks: 0,
      imageBlocks: 0,
      videoBlocks: 0,
      embedBlocks: 0,
      quizBlocks: 0,
      listBlocks: 0,
      checklistBlocks: 0,
      tableBlocks: 0,
      hasInteractiveContent: false,
      mediaSummary: {
        images: 0,
        videos: 0,
        embeds: 0,
        youtubeVideos: 0,
        vimeoVideos: 0
      }
    };
  }
  
  return safelyProcessBlocks.call(this, (validBlocks) => {
    const summary = {
      totalBlocks: validBlocks.length,
      textBlocks: 0,
      codeBlocks: 0,
      imageBlocks: 0,
      videoBlocks: 0,
      embedBlocks: 0,
      quizBlocks: 0,
      listBlocks: 0,
      checklistBlocks: 0,
      tableBlocks: 0,
      hasInteractiveContent: false,
      mediaSummary: {
        images: 0,
        videos: 0,
        embeds: 0,
        youtubeVideos: 0,
        vimeoVideos: 0
      }
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
            summary.mediaSummary.images++;
            break;
          case 'video':
            summary.videoBlocks++;
            summary.mediaSummary.videos++;
            if (block.data && block.data.service === 'youtube') {
              summary.mediaSummary.youtubeVideos++;
            } else if (block.data && block.data.service === 'vimeo') {
              summary.mediaSummary.vimeoVideos++;
            }
            break;
          case 'embed':
            summary.embedBlocks++;
            summary.mediaSummary.embeds++;
            if (block.data && block.data.service === 'youtube') {
              summary.mediaSummary.youtubeVideos++;
            } else if (block.data && block.data.service === 'vimeo') {
              summary.mediaSummary.vimeoVideos++;
            }
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
          case 'table':
            summary.tableBlocks++;
            break;
        }
      } catch (error) {
        console.warn('Error processing block for summary:', error);
      }
    });
    
    return summary;
  });
});

// Virtual for media-rich content detection
lessonSchema.virtual('isMediaRich').get(function() {
  const summary = this.contentSummary;
  const totalMedia = summary.imageBlocks + summary.videoBlocks + summary.embedBlocks;
  const totalBlocks = summary.totalBlocks;
  
  // Consider media-rich if more than 25% of blocks are media
  return totalBlocks > 0 && (totalMedia / totalBlocks) > 0.25;
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
    
    // Update content flags and media summary based on content analysis
    if (this.isModified('content')) {
      try {
        const summary = this.contentSummary;
        
        // Update content flags
        this.hasVideo = summary.videoBlocks > 0 || summary.embedBlocks > 0;
        this.hasQuiz = summary.quizBlocks > 0;
        this.hasCode = summary.codeBlocks > 0;
        this.hasImage = summary.imageBlocks > 0;
        this.hasEmbed = summary.embedBlocks > 0;
        
        // Update media summary
        this.mediaSummary = summary.mediaSummary;
        
      } catch (error) {
        console.warn('Error updating content flags:', error);
        // Set defaults if analysis fails
        this.hasVideo = false;
        this.hasQuiz = false;
        this.hasCode = false;
        this.hasImage = false;
        this.hasEmbed = false;
        this.mediaSummary = {
          images: 0,
          videos: 0,
          embeds: 0,
          youtubeVideos: 0,
          vimeoVideos: 0
        };
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
      
      // Check for invalid media blocks
      const invalidMediaBlocks = doc.content.blocks.filter(block => 
        block && 
        (block.type === 'image' || block.type === 'video' || block.type === 'embed') &&
        block.data && 
        block.data.invalid
      );
      
      if (invalidMediaBlocks.length > 0) {
        console.warn(`Lesson ${doc._id} has ${invalidMediaBlocks.length} invalid media blocks`);
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
  
  // Filter out invalid blocks and clean media blocks
  const validBlocks = this.content.blocks.filter(block => 
    block && 
    typeof block === 'object' && 
    block.type && 
    typeof block.type === 'string'
  ).map(block => {
    const cleanBlock = {
      id: block.id || `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: block.type,
      data: block.data || {}
    };
    
    // Clean specific block types
    if (block.type === 'image' && block.data) {
      cleanBlock.data = {
        url: block.data.url || '',
        alt: block.data.alt || '',
        caption: block.data.caption || '',
        stretched: block.data.stretched || false,
        withBorder: block.data.withBorder || false,
        withBackground: block.data.withBackground || false
      };
    } else if ((block.type === 'video' || block.type === 'embed') && block.data) {
      cleanBlock.data = {
        service: block.data.service || 'youtube',
        url: block.data.url || '',
        embed: block.data.embed || '',
        width: block.data.width || 560,
        height: block.data.height || 315,
        caption: block.data.caption || '',
        videoId: block.data.videoId || '',
        thumbnail: block.data.thumbnail || ''
      };
    }
    
    return cleanBlock;
  });
  
  this.content.blocks = validBlocks;
  return this;
};

// Instance method to extract all media URLs
lessonSchema.methods.getMediaUrls = function() {
  const mediaUrls = {
    images: [],
    videos: [],
    embeds: []
  };
  
  if (!this.content || !this.content.blocks) {
    return mediaUrls;
  }
  
  this.content.blocks.forEach(block => {
    if (block && block.type === 'image' && block.data && block.data.url) {
      mediaUrls.images.push({
        url: block.data.url,
        alt: block.data.alt,
        caption: block.data.caption
      });
    } else if (block && (block.type === 'video' || block.type === 'embed') && block.data) {
      const mediaItem = {
        url: block.data.url,
        embedUrl: block.data.embed,
        service: block.data.service,
        caption: block.data.caption
      };
      
      if (block.type === 'video') {
        mediaUrls.videos.push(mediaItem);
      } else {
        mediaUrls.embeds.push(mediaItem);
      }
    }
  });
  
  return mediaUrls;
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
  
  if (options.hasMedia) {
    query.$or = [
      { hasImage: true },
      { hasVideo: true },
      { hasEmbed: true }
    ];
  }
  
  return this.find(query).sort({ order: 1 });
};

// Static method to find media-rich lessons
lessonSchema.statics.findMediaRich = function(options = {}) {
  const query = {
    $or: [
      { hasImage: true },
      { hasVideo: true },
      { hasEmbed: true }
    ]
  };
  
  if (options.published !== undefined) {
    query.isPublished = options.published;
  }
  
  return this.find(query).sort({ createdAt: -1 });
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

// Static method to get media statistics
lessonSchema.statics.getMediaStatistics = async function() {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: null,
          totalLessons: { $sum: 1 },
          lessonsWithImages: { $sum: { $cond: ['$hasImage', 1, 0] } },
          lessonsWithVideos: { $sum: { $cond: ['$hasVideo', 1, 0] } },
          lessonsWithEmbeds: { $sum: { $cond: ['$hasEmbed', 1, 0] } },
          totalImages: { $sum: '$mediaSummary.images' },
          totalVideos: { $sum: '$mediaSummary.videos' },
          totalEmbeds: { $sum: '$mediaSummary.embeds' },
          youtubeVideos: { $sum: '$mediaSummary.youtubeVideos' },
          vimeoVideos: { $sum: '$mediaSummary.vimeoVideos' }
        }
      }
    ]);
    
    return stats[0] || {
      totalLessons: 0,
      lessonsWithImages: 0,
      lessonsWithVideos: 0,
      lessonsWithEmbeds: 0,
      totalImages: 0,
      totalVideos: 0,
      totalEmbeds: 0,
      youtubeVideos: 0,
      vimeoVideos: 0
    };
  } catch (error) {
    console.error('Error getting media statistics:', error);
    throw error;
  }
};

const Lesson = mongoose.model('Lesson', lessonSchema);

export default Lesson;