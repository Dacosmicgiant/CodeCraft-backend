// src/models/lesson.model.js
import mongoose from 'mongoose';
import slugify from 'slugify';

// Content block schema with enhanced validation
const contentBlockSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['text', 'code', 'image', 'video', 'quiz', 'embed', 'delimiter', 'header', 'list'],
    required: true
  },
  data: {
    // Text block
    text: String,
    
    // Code block
    code: String,
    language: String,
    
    // Image block
    url: String,
    alt: String,
    caption: String,
    
    // Video block
    source: String,
    poster: String,
    
    // Quiz block
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String,
    
    // Header block
    level: {
      type: Number,
      min: 1,
      max: 6
    },
    
    // List block
    style: {
      type: String,
      enum: ['ordered', 'unordered']
    },
    items: [String],
    
    // Embed block
    service: String,
    embed: String,
    width: Number,
    height: Number,
    
    // Generic data for custom blocks
    content: mongoose.Schema.Types.Mixed
  }
}, { _id: true });

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

// Virtual for estimated reading time based on content
lessonSchema.virtual('estimatedReadingTime').get(function() {
  if (!this.content || !this.content.blocks) return this.duration;
  
  let wordCount = 0;
  this.content.blocks.forEach(block => {
    if (block.type === 'text' && block.data.text) {
      wordCount += block.data.text.split(/\s+/).length;
    } else if (block.type === 'header' && block.data.text) {
      wordCount += block.data.text.split(/\s+/).length;
    } else if (block.type === 'list' && block.data.items) {
      block.data.items.forEach(item => {
        wordCount += item.split(/\s+/).length;
      });
    }
  });
  
  // Average reading speed: 200 words per minute
  const readingTime = Math.ceil(wordCount / 200);
  return Math.max(readingTime, 1); // Minimum 1 minute
});

// Virtual for content summary
lessonSchema.virtual('contentSummary').get(function() {
  if (!this.content || !this.content.blocks) return {};
  
  const summary = {
    totalBlocks: this.content.blocks.length,
    textBlocks: 0,
    codeBlocks: 0,
    imageBlocks: 0,
    videoBlocks: 0,
    quizBlocks: 0,
    hasInteractiveContent: false
  };
  
  this.content.blocks.forEach(block => {
    switch (block.type) {
      case 'text':
      case 'header':
        summary.textBlocks++;
        break;
      case 'code':
        summary.codeBlocks++;
        this.hasCode = true;
        break;
      case 'image':
        summary.imageBlocks++;
        break;
      case 'video':
        summary.videoBlocks++;
        this.hasVideo = true;
        break;
      case 'quiz':
        summary.quizBlocks++;
        this.hasQuiz = true;
        summary.hasInteractiveContent = true;
        break;
    }
  });
  
  return summary;
});

// Pre-save middleware to handle slug generation and content analysis
lessonSchema.pre('save', function(next) {
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
    const summary = this.contentSummary;
    this.hasVideo = summary.videoBlocks > 0;
    this.hasQuiz = summary.quizBlocks > 0;
    this.hasCode = summary.codeBlocks > 0;
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

const Lesson = mongoose.model('Lesson', lessonSchema);

export default Lesson;